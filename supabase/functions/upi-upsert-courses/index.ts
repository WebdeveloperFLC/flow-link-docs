import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KNOWN = new Set([
  "institution_id","campus_id","source_id","job_id","study_area_id","discipline_area_id","program_level_id",
  "source_identifier","course_title","course_description","campus_name","country_name","state_province","city",
  "program_url","source_url","duration_value","duration_unit","tuition_fee","tuition_fee_per","application_fee",
  "currency","intake_months","ielts_overall","ielts_min_component","pte_overall","toefl_overall","duolingo_overall",
  "cambridge_overall","gpa_requirement","work_experience_years","age_requirement","has_scholarship",
  "scholarship_amount","scholarship_currency","scholarship_detail","is_coop","is_pr_pathway","is_pgwp_eligible",
  "is_online","is_part_time","commission_info","bonus_info","confidence_score","source_last_updated",
]);

// Map free-text program level (from extractor) to a canonical level name
// matching rows in upi_program_levels. Returns null if no confident match.
function normalizeLevelName(raw: string): string | null {
  const s = String(raw || "").toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  // Order matters: more specific patterns first.
  if (/\bmba\b/.test(s)) return "MBA";
  if (/\b(phd|ph\.?d|doctorate|doctoral|dphil)\b/.test(s)) return "PhD / Doctorate";
  if (/\bpost\s*doc(toral)?\b/.test(s)) return "Postdoctoral";
  if (/\b(graduate|grad|postgraduate|pg)\s+certificate\b/.test(s) || /\bontario college graduate certificate\b/.test(s)) return "Graduate Certificate";
  if (/\b(graduate|grad|postgraduate|pg)\s+diploma\b/.test(s) || /\bpostgraduate diploma\b/.test(s)) return "Graduate Diploma";
  if (/\bassociate\b/.test(s)) return "Associate Degree";
  if (/\badvanced\s+diploma\b/.test(s)) return "Advanced Diploma";
  if (/\b(master|masters|master's|m\.?a|m\.?sc|m\.?ed|m\.?eng|meng|mres)\b/.test(s) || /\bmaster of\b/.test(s)) return "Master";
  if (/\b(bachelor|bachelors|bachelor's|undergrad(uate)?|b\.?a|b\.?sc|b\.?ed|b\.?eng|beng|bcom|honou?rs)\b/.test(s) || /\bbachelor of\b/.test(s)) return "Bachelor";
  if (/\bdiploma\b/.test(s)) return "Diploma";
  if (/\bcertificate\b/.test(s)) return "Certificate";
  return null;
}

function buildLevelResolver(levels: Array<{ id: string; name: string }>) {
  const byId = new Map(levels.map((l) => [l.id, l.name]));
  const byName = new Map(levels.map((l) => [l.name.toLowerCase(), l.id]));
  const resolveId = (raw: unknown): string | null => {
    const text = String(raw ?? "").trim();
    if (!text) return null;
    const direct = byName.get(text.toLowerCase());
    if (direct) return direct;
    const canonical = normalizeLevelName(text);
    if (!canonical) return null;
    return byName.get(canonical.toLowerCase()) ?? null;
  };
  const resolveText = (
    metadata: Record<string, unknown>,
    programLevelId: unknown,
  ): string => {
    const fromMeta = String((metadata as any).program_level ?? "").trim();
    if (fromMeta) return fromMeta;
    const fromFk = byId.get(String(programLevelId ?? "")) ?? "";
    return fromFk.trim();
  };
  return { resolveId, resolveText };
}

async function sha256Hex(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Canonicalize a printed program title for dedup. Strips AI-added suffixes
// such as "(Master)" or "@ Oshawa", collapses whitespace, and lowercases.
function canonicalTitle(title: string, level?: string): string {
  let s = String(title || "").trim();
  s = s.replace(/\s*@\s*[A-Za-z][\w\s.&'-]+$/, "");
  if (level) {
    const lvl = String(level).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`\\s*\\(\\s*${lvl}\\s*\\)\\s*$`, "i"), "");
  }
  s = s.replace(/\s*\((Bachelor|Master|Diploma|Certificate|PhD|Doctorate|Doctoral|Graduate Certificate|Postgraduate)\s*\)\s*$/i, "");
  s = s.replace(/\s{2,}/g, " ").trim().toLowerCase();
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { courses, job_id, institution_id, source_id } = await req.json();
    if (!Array.isArray(courses)) throw new Error("courses array required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: levelRows } = await supabase
      .from("upi_program_levels").select("id,name");
    const { resolveId, resolveText } = buildLevelResolver((levelRows ?? []) as any);

    let upserted = 0, rejected = 0;
    for (const raw of courses) {
      try {
        const known: Record<string, unknown> = { institution_id, source_id, job_id };
        const metadata: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (KNOWN.has(k)) known[k] = v; else metadata[k] = v;
        }
        if (!known.course_title) { rejected++; continue; }
        // Resolve free-text program_level (kept in metadata) to FK so the
        // Course Review level filter can find these rows.
        if (!known.program_level_id) {
          const fromMeta = (metadata as any).program_level;
          const lvlId = resolveId(fromMeta);
          if (lvlId) known.program_level_id = lvlId;
        }
        const levelRaw = resolveText(metadata, known.program_level_id);
        const levelText = levelRaw.toLowerCase().trim();
        const titleKey = canonicalTitle(String(known.course_title), levelRaw);
        const campusKey = String(known.campus_name ?? "").toLowerCase().trim();
        // Dedup by institution + canonical title + level + campus (not source_url).
        const dedup = await sha256Hex(
          `${known.institution_id ?? ""}||${titleKey}||${known.program_level_id ?? ""}||${levelText}||${campusKey}`,
        );

        const { data: existing } = await supabase.from("upi_courses_staging")
          .select("id, review_status, metadata").eq("dedup_hash", dedup).maybeSingle();

        const review_status = existing?.review_status === "published" ? "needs_update" : "pending_review";
        // Merge metadata: keep prior keys, overwrite with new non-null values.
        const mergedMeta = { ...((existing?.metadata as any) ?? {}), ...metadata };
        const payload = { ...known, dedup_hash: dedup, metadata: mergedMeta, review_status, updated_at: new Date().toISOString() };

        const { error } = await supabase.from("upi_courses_staging").upsert(payload, { onConflict: "dedup_hash" });
        if (error) {
          rejected++;
          if (job_id) await supabase.from("upi_sync_logs").insert({ job_id, level: "error", message: error.message, detail: { course_title: known.course_title } });
        } else {
          upserted++;
        }
      } catch (e) {
        rejected++;
        if (job_id) await supabase.from("upi_sync_logs").insert({ job_id, level: "error", message: String(e) });
      }
    }

    if (job_id) {
      await supabase.from("upi_sync_jobs").update({
        records_extracted: courses.length, records_upserted: upserted, records_rejected: rejected,
      }).eq("id", job_id);
    }

    return new Response(JSON.stringify({ ok: true, upserted, rejected }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
