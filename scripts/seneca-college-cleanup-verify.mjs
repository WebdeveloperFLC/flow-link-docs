/**
 * Pre/post verification for Seneca College CF cleanup.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env for dependency counts and post-checks.
 *
 * Usage:
 *   node scripts/seneca-college-cleanup-verify.mjs           # preflight
 *   node scripts/seneca-college-cleanup-verify.mjs --post    # after migration publish
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function envVal(key) {
  const m = fs.readFileSync(".env", "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const COLLEGE_ID = "ee75f8e4-b6fe-485e-bde4-bf51459ecd5c";
const POLY_ID = "300db4aa-ce52-433e-bd71-39e4b54a87ac";
const UPI_ID = "11111111-1111-1111-1111-111111110001";
const COLLEGE_COURSE_IDS = [
  "6e2a1c3e-296e-4f13-9016-adfa35a1f2fb",
  "ca9fddb0-f49e-459f-8088-a206a6d22828",
];

const post = process.argv.includes("--post");
const url = envVal("VITE_SUPABASE_URL");
const serviceKey = envVal("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = envVal("VITE_SUPABASE_PUBLISHABLE_KEY");
const key = serviceKey || anonKey;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or API key in .env");
  process.exit(1);
}

const sb = createClient(url, key);
const auth = serviceKey ? "service_role" : "anon";

async function countCollegeDependencies() {
  const { data: collegeCourses, error: courseErr } = await sb
    .from("cf_courses")
    .select("id,name,study_level,university_id")
    .eq("university_id", COLLEGE_ID);
  if (courseErr) throw courseErr;

  const courseIds = (collegeCourses ?? []).map((c) => c.id);
  let programs = [];
  let qualifications = [];

  if (courseIds.length) {
    const { data: progData, error: progErr } = await sb
      .from("cf_client_programs")
      .select("id,client_id,course_id,status,qualification_id")
      .in("course_id", courseIds);
    if (progErr) throw progErr;
    programs = progData ?? [];

    const { data: qualData, error: qualErr } = await sb
      .from("client_institution_qualifications")
      .select("id,client_id,cf_course_id,status,institution_id,program_name,application_source")
      .in("cf_course_id", courseIds);
    if (qualErr) throw qualErr;
    qualifications = qualData ?? [];
  }

  return {
    courses: collegeCourses ?? [],
    course_count: collegeCourses?.length ?? 0,
    programs,
    program_count: programs.length,
    programs_shortlisted: programs.filter((p) => p.status === "shortlisted").length,
    programs_final: programs.filter((p) => p.status === "final").length,
    qualifications,
    qualification_count: qualifications.length,
  };
}

async function senecaSnapshot() {
  const { data: unis } = await sb.from("cf_universities").select("id,name,upi_institution_id").ilike("name", "%Seneca%");
  const { data: senecaCourses } = await sb
    .from("cf_courses")
    .select("id,name,university_id,university:cf_universities(id,name,upi_institution_id)")
    .in("university_id", (unis ?? []).map((u) => u.id));

  const legacyCourses = (senecaCourses ?? []).filter(
    (c) => c.university?.name === "Seneca College" || c.university_id === COLLEGE_ID,
  );
  const polyCourses = (senecaCourses ?? []).filter(
    (c) => c.university?.name === "Seneca Polytechnic" || c.university_id === POLY_ID,
  );

  const { data: stats } = await sb.rpc("fn_cf_upi_linkage_dashboard_stats");

  return {
    seneca_universities: unis ?? [],
    college_cf_exists: (unis ?? []).some((u) => u.id === COLLEGE_ID),
    polytechnic_cf_exists: (unis ?? []).some((u) => u.id === POLY_ID),
    college_course_count: legacyCourses.length,
    polytechnic_course_count: polyCourses.length,
    total_seneca_courses: senecaCourses?.length ?? 0,
    legacy_course_ids_on_college: legacyCourses.map((c) => c.id),
    linkage_dashboard: stats,
  };
}

async function probeMarkFinal(programId, caseId) {
  const { data, error } = await sb.rpc("fn_mark_final_and_create_application", {
    p_client_program_id: programId,
    p_client_service_case_id: caseId,
    p_intake_term: "Sep 2026",
    p_campus_name: null,
    p_owner_user_id: "00000000-0000-0000-0000-000000000003",
    p_set_primary: true,
    p_allow_duplicate_override: false,
    p_duplicate_override_reason: null,
  });
  return {
    ok: !error,
    error: error ? { code: error.code, message: error.message } : null,
    data,
  };
}

async function probeFeeSchedule() {
  const { data, error } = await sb
    .from("institution_fee_schedule")
    .select("id,fee_type,amount,currency,status")
    .eq("upi_institution_id", UPI_ID)
    .eq("status", "ACTIVE");
  return { rows: data?.length ?? 0, error: error?.message ?? null, fees: data ?? [] };
}

const report = {
  phase: post ? "post" : "pre",
  auth,
  generated_at: new Date().toISOString(),
  migration: "20261002120000_seneca_college_cf_cleanup.sql",
};

if (post) {
  report.snapshot = await senecaSnapshot();
  report.fee_schedule = await probeFeeSchedule();
  report.pass =
    !report.snapshot.college_cf_exists &&
    report.snapshot.polytechnic_cf_exists &&
    report.snapshot.college_course_count === 0 &&
    report.snapshot.legacy_course_ids_on_college.length === 0;
} else {
  report.dependencies = await countCollegeDependencies();
  report.snapshot = await senecaSnapshot();
  report.fee_schedule = await probeFeeSchedule();
  report.blockers = {
    qualifications: report.dependencies.qualification_count,
    final_programs: report.dependencies.programs_final,
  };
  report.safe_to_proceed =
    report.dependencies.qualification_count === 0 && report.dependencies.programs_final === 0;
  report.note =
    auth === "anon"
      ? "Dependency counts may be 0 due to RLS — use SUPABASE_SERVICE_ROLE_KEY for authoritative preflight."
      : null;

  if (serviceKey && report.dependencies.programs_shortlisted > 0) {
    const prog = report.dependencies.programs.find((p) => p.status === "shortlisted");
    const { data: cases } = await sb
      .from("client_service_cases")
      .select("id,client_id,status")
      .eq("client_id", prog.client_id)
      .limit(5);
    const openCase = cases?.find((c) => c.status !== "closed") ?? cases?.[0];
    if (openCase) {
      report.mark_final_dry_run = await probeMarkFinal(prog.id, openCase.id);
    }
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(post ? (report.pass ? 0 : 1) : 0);
