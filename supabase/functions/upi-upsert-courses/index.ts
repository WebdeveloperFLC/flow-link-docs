import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.168.0/hash/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KNOWN = new Set([
  "institution_id","campus_id","source_id","job_id","study_area_id","discipline_area_id","program_level_id",
  "source_identifier","course_title","course_description","campus_name","country_name","state_province","city",
  "program_url","source_url","duration_value","duration_unit","tuition_fee","tuition_fee_per","application_fee",
  "currency","intake_months","ielts_overall","ielts_min_component","pte_overall","toefl_overall","duolingo_overall",
  "cambridge_overall","gpa_requirement","work_experience_years","age_requirement","has_scholarship",
  "scholarship_amount","scholarship_currency","scholarship_detail","is_coop","is_pr_pathway","is_online",
  "is_part_time","commission_info","bonus_info","confidence_score","source_last_updated",
]);

function md5(s: string) {
  // deno-lint-ignore no-explicit-any
  const h = (createHash as any)("md5");
  h.update(s); return h.toString();
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
        const dedup = md5(`${known.institution_id ?? ""}||${String(known.course_title).toLowerCase()}||${known.source_url ?? ""}`);

        const { data: existing } = await supabase.from("upi_courses_staging")
          .select("id, review_status").eq("dedup_hash", dedup).maybeSingle();

        const review_status = existing?.review_status === "published" ? "needs_update" : "pending_review";
        const payload = { ...known, dedup_hash: dedup, metadata, review_status, updated_at: new Date().toISOString() };

        const { error } = await supabase.from("upi_courses_staging").upsert(payload, { onConflict: "dedup_hash" });
        if (error) { rejected++; if (job_id) await supabase.from("upi_sync_logs").insert({ job_id, level: "error", message: error.message }); }
        else upserted++;
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