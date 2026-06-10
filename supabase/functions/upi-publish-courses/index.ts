import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COUNTRY_MAP: Record<string, string> = {
  canada: "CA", "united states": "US", usa: "US", us: "US", america: "US",
  "united kingdom": "GB", uk: "GB", britain: "GB", england: "GB",
  australia: "AU", "new zealand": "NZ", ireland: "IE", germany: "DE", france: "FR",
};

const LEVEL_MAP: Record<string, string> = {
  certificate: "diploma", diploma: "diploma", advanced_diploma: "diploma",
  bachelor: "undergraduate", undergraduate: "undergraduate", foundation: "undergraduate", pathway: "undergraduate",
  master: "postgraduate", postgraduate_diploma: "postgraduate", pg_diploma: "postgraduate",
  postgraduate: "postgraduate", phd: "phd", doctorate: "phd",
};

const FIELD_BUCKETS = [
  { bucket: "Business & Management", kw: ["business", "management", "mba", "marketing", "finance", "account", "hr", "human resource", "logistic", "supply"] },
  { bucket: "IT & Computer Science", kw: ["computer", "software", "it ", "information tech", "data", "ai", "cyber", "cloud", "web", "network", "programming"] },
  { bucket: "Engineering", kw: ["engineer", "mechanic", "electric", "civil", "robotics", "mechatron", "automotive", "aero"] },
  { bucket: "Health & Medicine", kw: ["nurs", "health", "medic", "pharma", "dental", "physio", "psycholog", "biomed"] },
  { bucket: "Hospitality & Tourism", kw: ["hospital", "tourism", "culinary", "hotel", "event", "travel"] },
  { bucket: "Arts & Humanities", kw: ["art", "design", "media", "music", "film", "fashion", "communication", "journalism", "language", "history"] },
];

function snapField(s: string | null | undefined): string {
  const t = (s ?? "").toLowerCase();
  if (!t) return "Business & Management";
  for (const b of FIELD_BUCKETS) if (b.kw.some((k) => t.includes(k))) return b.bucket;
  return "Business & Management";
}

function snapLevel(s: string | null | undefined): string {
  const t = (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  for (const [k, v] of Object.entries(LEVEL_MAP)) if (t.includes(k)) return v;
  return "undergraduate";
}

function toMonths(value: number | null, unit: string | null): number | null {
  if (value == null) return null;
  const u = (unit ?? "months").toLowerCase();
  if (u.startsWith("year")) return Math.round(value * 12);
  if (u.startsWith("week")) return Math.max(1, Math.round(value / 4));
  return Math.round(value);
}

function countryCode(name: string | null | undefined): string {
  const t = (name ?? "").toLowerCase().trim();
  return COUNTRY_MAP[t] ?? "CA";
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { staging_ids } = await req.json();
    if (!Array.isArray(staging_ids) || staging_ids.length === 0) throw new Error("staging_ids required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows, error } = await supabase
      .from("upi_courses_staging").select("*").in("id", staging_ids);
    if (error) throw error;

    let published = 0, failed = 0;
    const errors: { id: string; error: string }[] = [];
    const uniCache = new Map<string, string>();

    for (const r of rows ?? []) {
      try {
        if (!r.institution_id) throw new Error("missing institution_id");
        // Load institution
        let uniId = uniCache.get(r.institution_id);
        if (!uniId) {
          const { data: inst } = await supabase
            .from("upi_institutions").select("*").eq("id", r.institution_id).single();
          if (!inst) throw new Error("institution not found");
          const code = countryCode(inst.country_name);
          // Ensure country exists
          await supabase.from("cf_countries").upsert(
            { code, name: inst.country_name ?? code, is_pr_friendly: false },
            { onConflict: "code", ignoreDuplicates: true },
          );
          // Find existing university by name+country
          const { data: existingUni } = await supabase
            .from("cf_universities").select("id").eq("country_code", code)
            .ilike("name", inst.name).maybeSingle();
          if (existingUni?.id) {
            uniId = existingUni.id;
            await supabase.from("cf_universities").update({
              is_partner: inst.is_partner ?? false,
              upi_institution_id: r.institution_id,
              logo_url: inst.logo_url,
              updated_at: new Date().toISOString(),
            }).eq("id", existingUni.id);
          } else {
            const { data: newUni, error: uniErr } = await supabase
              .from("cf_universities").insert({
                name: inst.name, slug: slugify(inst.name + "-" + code),
                country_code: code, city: inst.city, province: inst.state_province,
                logo_url: inst.logo_url, institution_type: inst.institution_type ?? "public",
                is_partner: inst.is_partner ?? false,
                description: inst.notes,
                upi_institution_id: r.institution_id,
              }).select("id").single();
            if (uniErr) throw uniErr;
            uniId = newUni!.id;
          }
          uniCache.set(r.institution_id, uniId);
        }

        const study_level = snapLevel(r.metadata?.program_level ?? r.metadata?.study_level);
        const intakes: string[] = Array.isArray(r.intake_months) ? r.intake_months : [];
        const duration_months = toMonths(r.duration_value, r.duration_unit);
        const mode = r.is_online ? "online" : "full_time";

        const payload = {
          university_id: uniId,
          name: r.course_title,
          study_level,
          field_of_study: snapField(r.metadata?.field_of_study as string),
          specialization: (r.metadata?.specialization as string) ?? null,
          duration_months,
          intake_months: intakes,
          intake_year: (r.metadata?.intake_year as number) ?? null,
          tuition_fee: r.tuition_fee,
          currency: r.currency,
          ielts_overall: r.ielts_overall,
          ielts_no_band_less_than: r.ielts_min_component,
          pte_score: r.pte_overall,
          toefl_score: r.toefl_overall,
          duolingo_accepted: r.duolingo_overall != null,
          scholarship_available: !!r.has_scholarship,
          coop_available: !!r.is_coop,
          pr_friendly: !!r.is_pr_pathway,
          pgwp_eligible: !!r.is_pgwp_eligible,
          stem_eligible: !!(r.metadata?.stem_eligible),
          mode,
          gpa_min: r.gpa_requirement ? Number(String(r.gpa_requirement).replace(/[^0-9.]/g, "")) || null : null,
          backlogs_allowed: (r.metadata?.backlogs_allowed as number) ?? null,
          gap_accepted_years: (r.metadata?.gap_accepted_years as number) ?? null,
          description: r.course_description,
          career_outcomes: (r.metadata?.career_outcomes as string) ?? null,
          scholarship_info: r.scholarship_detail,
          pr_visa_notes: (r.metadata?.pr_visa_notes as string) ?? null,
          apply_url: (r.metadata?.apply_url as string) ?? r.program_url ?? r.source_url,
          updated_at: new Date().toISOString(),
        };

        // Upsert by (university_id, lower(name), study_level) — find first then update/insert
        const { data: existing } = await supabase
          .from("cf_courses").select("id").eq("university_id", uniId)
          .ilike("name", r.course_title).eq("study_level", study_level).maybeSingle();

        let courseId: string;
        if (existing?.id) {
          const { error: updErr } = await supabase.from("cf_courses").update(payload).eq("id", existing.id);
          if (updErr) throw updErr;
          courseId = existing.id;
        } else {
          const { data: ins, error: insErr } = await supabase
            .from("cf_courses").insert(payload).select("id").single();
          if (insErr) throw insErr;
          courseId = ins!.id;
        }

        await supabase.from("upi_courses_staging").update({
          review_status: "published",
          published_course_id: courseId,
          reviewed_at: new Date().toISOString(),
        }).eq("id", r.id);
        published++;
      } catch (e) {
        failed++;
        errors.push({ id: r.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, published, failed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});