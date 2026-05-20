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

    let upserted = 0, rejected = 0;
    for (const raw of courses) {
      try {
        const known: Record<string, unknown> = { institution_id, source_id, job_id };
        const metadata: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (KNOWN.has(k)) known[k] = v; else metadata[k] = v;
        }
        if (!known.course_title) { rejected++; continue; }
        // Dedup hash now includes program_level and campus so multi-campus / multi-level
        // programs with the same title don't collapse into a single staging row.
        const titleKey = canonicalTitle(String(known.course_title), String(known.program_level ?? ""));
        const levelKey = String(known.program_level ?? "").toLowerCase().trim();
        const campusKey = String(known.campus_name ?? "").toLowerCase().trim();
        const urlKey = String(known.source_url ?? "").trim();
        const dedup = await sha256Hex(
          `${known.institution_id ?? ""}||${titleKey}||${levelKey}||${campusKey}||${urlKey}`,
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
