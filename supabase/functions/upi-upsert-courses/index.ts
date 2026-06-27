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

function normalizeCountry(country: string): string {
  const c = String(country || "").toLowerCase().trim();
  if (c === "uk" || c === "u.k." || c === "great britain" || c === "england") return "united kingdom";
  if (c === "usa" || c === "u.s.a." || c === "us" || c === "u.s.") return "united states";
  if (c === "uae") return "united arab emirates";
  return c;
}

// Canonicalize a printed program title for dedup. Strips AI-added suffixes
// such as "(Master)" or "@ Oshawa", collapses whitespace, and lowercases.
function parseCampusList(value: unknown): string[] {
  if (!value) return [];
  const text = String(value).trim();
  if (!text) return [];
  return [...new Set(text.split(/[,;|]/).map((s) => s.trim()).filter(Boolean))].sort();
}

function campusNamesFromRow(row: { campus_name?: unknown; metadata?: Record<string, unknown> | null }): string[] {
  const fromMeta = row.metadata?.campus_names;
  if (Array.isArray(fromMeta) && fromMeta.length) {
    return [...new Set(fromMeta.map(String).map((s) => s.trim()).filter(Boolean))].sort();
  }
  return parseCampusList(row.campus_name);
}

function mergeCampusLists(...sources: (unknown)[]): string[] {
  const set = new Set<string>();
  for (const source of sources) {
    if (Array.isArray(source)) source.forEach((c) => { const t = String(c).trim(); if (t) set.add(t); });
    else parseCampusList(source).forEach((c) => set.add(c));
  }
  return [...set].sort();
}

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

function normalizeProgramCode(code: unknown): string | null {
  const c = String(code ?? "").trim().toUpperCase();
  return c || null;
}

function normalizeCredential(credential: unknown): string {
  return String(credential ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

type StagingExisting = {
  id: string;
  review_status: string | null;
  metadata: Record<string, unknown> | null;
  campus_name: string | null;
  dedup_hash?: string | null;
  course_title?: string | null;
  program_level_id?: string | null;
};

function findSmartImportExisting(
  rows: StagingExisting[],
  institutionId: string,
  courseTitle: string,
  metadata: Record<string, unknown>,
  resolveText: (metadata: Record<string, unknown>, programLevelId: unknown) => string,
  programLevelId: unknown,
): StagingExisting | null {
  const code = normalizeProgramCode(metadata.program_code);
  if (code) {
    const byCode = rows.find((row) =>
      normalizeProgramCode((row.metadata as Record<string, unknown> | null)?.program_code) === code
    );
    if (byCode) return byCode;
  }
  const levelRaw = resolveText(metadata, programLevelId);
  const titleKey = canonicalTitle(courseTitle, levelRaw);
  const credKey = normalizeCredential(levelRaw);
  return rows.find((row) => {
    const rowLevel = resolveText((row.metadata as Record<string, unknown>) ?? {}, row.program_level_id);
    return canonicalTitle(String(row.course_title ?? ""), rowLevel) === titleKey
      && normalizeCredential(rowLevel) === credKey;
  }) ?? null;
}

async function loadInstitutionStagingRows(
  supabase: ReturnType<typeof createClient>,
  institutionId: string,
): Promise<StagingExisting[]> {
  const { data } = await supabase
    .from("upi_courses_staging")
    .select("id, review_status, metadata, campus_name, dedup_hash, course_title, program_level_id")
    .eq("institution_id", institutionId);
  return (data ?? []) as StagingExisting[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { courses, job_id, institution_id, source_id } = await req.json();
    if (!Array.isArray(courses)) throw new Error("courses array required");
    if (!institution_id) throw new Error("institution_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: institution, error: instErr } = await supabase
      .from("upi_institutions")
      .select("id,country_name,name")
      .eq("id", institution_id)
      .maybeSingle();
    if (instErr) throw instErr;
    if (!institution) throw new Error("institution not found");

    const { data: levelRows } = await supabase
      .from("upi_program_levels").select("id,name");
    const { resolveId, resolveText } = buildLevelResolver((levelRows ?? []) as any);

    const hasSmartImport = courses.some((c: Record<string, unknown>) =>
      (c.metadata as Record<string, unknown> | undefined)?.import_source === "smart_program_import"
      || c._staging_id
    );
    let institutionRowsCache: StagingExisting[] | null = null;
    const getInstitutionRows = async () => {
      if (!institutionRowsCache) {
        institutionRowsCache = await loadInstitutionStagingRows(supabase, institution_id);
      }
      return institutionRowsCache;
    };

    let upserted = 0, rejected = 0;
    for (const rawCourse of courses) {
      try {
        const raw = { ...(rawCourse as Record<string, unknown>) };
        const stagingIdOverride = String(raw._staging_id ?? raw.staging_id ?? "").trim() || null;
        delete raw._staging_id;
        delete raw.staging_id;

        const known: Record<string, unknown> = { institution_id, source_id, job_id };
        const metadata: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (KNOWN.has(k)) known[k] = v; else metadata[k] = v;
        }
        if (!known.course_title) { rejected++; continue; }

        const rowCountry = String(known.country_name ?? "").trim();
        const instCountry = String(institution.country_name ?? "").trim();
        if (rowCountry && instCountry && normalizeCountry(rowCountry) !== normalizeCountry(instCountry)) {
          rejected++;
          if (job_id) {
            await supabase.from("upi_sync_logs").insert({
              job_id,
              level: "warn",
              message: `Skipped ${known.course_title}: country ${rowCountry} does not match institution ${institution.name} (${instCountry})`,
            });
          }
          continue;
        }
        if (!rowCountry && instCountry) known.country_name = instCountry;
        if (!known.program_level_id) {
          const fromMeta = (metadata as any).program_level;
          const lvlId = resolveId(fromMeta);
          if (lvlId) known.program_level_id = lvlId;
        }
        const levelRaw = resolveText(metadata, known.program_level_id);
        const levelText = levelRaw.toLowerCase().trim();
        const titleKey = canonicalTitle(String(known.course_title), levelRaw);
        const dedup = await sha256Hex(
          `${known.institution_id ?? ""}||${titleKey}||${known.program_level_id ?? ""}||${levelText}`,
        );

        let existing: StagingExisting | null = null;
        if (stagingIdOverride) {
          const { data: byId } = await supabase.from("upi_courses_staging")
            .select("id, review_status, metadata, campus_name, dedup_hash, course_title, program_level_id")
            .eq("id", stagingIdOverride)
            .eq("institution_id", institution_id)
            .maybeSingle();
          existing = (byId as StagingExisting | null) ?? null;
        } else if (metadata.import_source === "smart_program_import") {
          const rows = await getInstitutionRows();
          existing = findSmartImportExisting(
            rows,
            institution_id,
            String(known.course_title),
            metadata,
            resolveText,
            known.program_level_id,
          );
        } else {
          const { data: byDedup } = await supabase.from("upi_courses_staging")
            .select("id, review_status, metadata, campus_name, dedup_hash, course_title, program_level_id")
            .eq("dedup_hash", dedup)
            .maybeSingle();
          existing = (byDedup as StagingExisting | null) ?? null;
        }

        const review_status = existing?.review_status === "published" ? "needs_update" : "pending_review";
        const mergedCampuses = mergeCampusLists(
          campusNamesFromRow(existing ?? {}),
          known.campus_name,
        );
        if (mergedCampuses.length) {
          known.campus_name = mergedCampuses.join(", ");
        }
        const mergedMeta = {
          ...((existing?.metadata as any) ?? {}),
          ...metadata,
          campus_names: mergedCampuses,
        };
        const payload = {
          ...known,
          dedup_hash: dedup,
          metadata: mergedMeta,
          review_status,
          updated_at: new Date().toISOString(),
        };

        let error: { message: string } | null = null;
        if (existing?.id) {
          const result = await supabase.from("upi_courses_staging").update(payload).eq("id", existing.id);
          error = result.error;
          if (!error && hasSmartImport && institutionRowsCache) {
            const idx = institutionRowsCache.findIndex((r) => r.id === existing!.id);
            if (idx >= 0) institutionRowsCache[idx] = { ...existing, ...payload, id: existing.id } as StagingExisting;
          }
        } else {
          const result = await supabase.from("upi_courses_staging").upsert(payload, { onConflict: "dedup_hash" });
          error = result.error;
          if (!error && hasSmartImport && institutionRowsCache) {
            institutionRowsCache.push({ id: "", review_status, metadata: mergedMeta, campus_name: String(known.campus_name ?? null), dedup_hash: dedup, course_title: String(known.course_title), program_level_id: known.program_level_id as string | null });
          }
        }

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
