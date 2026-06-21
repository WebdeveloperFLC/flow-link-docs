/**
 * Phase 2: auto-approve exact linkage candidates and apply to cf_universities.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env for writes.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function envVal(key) {
  const m = fs.readFileSync(".env", "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const url = envVal("VITE_SUPABASE_URL");
const serviceKey = envVal("SUPABASE_SERVICE_ROLE_KEY");
if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY required for Phase 2 apply");
  process.exit(1);
}

const sb = createClient(url, serviceKey);
const report = { phase: "phase2", steps: [] };
const log = (step, data) => report.steps.push({ step, ...data });

const { data: exact, error: listErr } = await sb.rpc("fn_cf_upi_linkage_list_candidates", {
  p_run_id: null,
  p_match_method: "exact",
  p_status: "pending_review",
  p_limit: 100,
  p_offset: 0,
});

if (listErr) {
  log("list_exact_failed", { error: listErr.message });
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

log("exact_candidates", { count: exact.length, names: exact.map((e) => e.cf_name) });

const now = new Date().toISOString();
const ids = exact.map((e) => e.id);

const { error: approveErr } = await sb
  .from("cf_upi_linkage_candidates")
  .update({ status: "approved", reviewed_at: now, review_notes: "Phase 2 auto-approve exact matches" })
  .in("id", ids)
  .eq("match_method", "exact")
  .in("status", ["pending_review", "approved"]);

log("direct_approve", { error: approveErr?.message ?? null, count: ids.length });

const applied = [];
for (const row of exact) {
  const { data: upd, error: uErr } = await sb
    .from("cf_universities")
    .update({ upi_institution_id: row.suggested_upi_institution_id, updated_at: now })
    .eq("id", row.cf_university_id)
    .is("upi_institution_id", null)
    .select("id,name,upi_institution_id");

  if (uErr) {
    log("link_failed", { cf: row.cf_name, error: uErr.message });
    continue;
  }
  if (upd?.length) {
    applied.push({
      cf_name: row.cf_name,
      cf_id: row.cf_university_id,
      upi_id: row.suggested_upi_institution_id,
      upi_name: row.suggested_upi_name,
    });
  }

  await sb.from("cf_upi_linkage_candidates").update({ status: "applied", applied_at: now }).eq("id", row.id);
}

log("direct_apply", { applied_count: applied.length, applied });

const { data: aliases } = await sb
  .from("cf_upi_name_aliases")
  .select("id,cf_name_pattern")
  .ilike("cf_name_pattern", "%seneca%");
if (aliases?.length) {
  const { error: delErr } = await sb.from("cf_upi_name_aliases").delete().ilike("cf_name_pattern", "%seneca%");
  log("remove_seneca_aliases", { removed: aliases.length, error: delErr?.message ?? null });
} else {
  log("remove_seneca_aliases", { removed: 0, note: "no alias rows present" });
}

const { data: unis } = await sb.from("cf_universities").select("id,name,country_code,upi_institution_id").order("name");
const linked = unis?.filter((u) => u.upi_institution_id) ?? [];
const unlinked = unis?.filter((u) => !u.upi_institution_id) ?? [];
const { data: stats } = await sb.rpc("fn_cf_upi_linkage_dashboard_stats");

const expected = [
  "Abertay University",
  "Algonquin College",
  "Arizona State University",
  "Conestoga College",
  "Seneca Polytechnic",
  "University of Auckland",
];

report.validation = {
  cf_total: unis?.length ?? 0,
  linked_count: linked.length,
  remaining_unmatched: unlinked.length,
  mark_final_eligible_pct: unis?.length ? +((linked.length / unis.length) * 100).toFixed(1) : 0,
  dashboard: stats,
  linked_institutions: linked.map((u) => ({
    name: u.name,
    country: u.country_code,
    upi_institution_id: u.upi_institution_id,
  })),
  still_unlinked: unlinked.map((u) => u.name),
};

report.verify_six = expected.map((name) => {
  const u = unis?.find((x) => x.name === name);
  return { name, populated: !!u?.upi_institution_id, upi_institution_id: u?.upi_institution_id ?? null };
});

report.mark_final_tests = [];
for (const name of ["Conestoga College", "Seneca Polytechnic", "Algonquin College"]) {
  const uni = unis?.find((u) => u.name === name);
  if (!uni) {
    report.mark_final_tests.push({ name, result: "SKIP", reason: "cf_university_not_found" });
    continue;
  }

  const { data: upi } = await sb
    .from("upi_institutions")
    .select("id,name,country_name")
    .eq("id", uni.upi_institution_id)
    .maybeSingle();

  const { data: courses } = await sb.from("cf_courses").select("id,name").eq("university_id", uni.id);
  const courseIds = courses?.map((c) => c.id) ?? [];
  let prog = null;
  if (courseIds.length) {
    const { data: progs } = await sb
      .from("cf_client_programs")
      .select("id,client_id,status,course_id")
      .in("course_id", courseIds)
      .eq("status", "shortlisted")
      .limit(1);
    prog = progs?.[0] ?? null;
  }

  const institutionGate = uni.upi_institution_id && upi?.id ? "PASS" : "FAIL";

  if (!prog) {
    report.mark_final_tests.push({
      name,
      result: institutionGate === "PASS" ? "READY_NO_SHORTLIST" : "BLOCKED_INSTITUTION",
      institution_gate: institutionGate,
      upi_institution_id: uni.upi_institution_id,
      upi_name: upi?.name ?? null,
      note: "No shortlisted cf_client_program — Mark Final UI test requires manual shortlist",
    });
    continue;
  }

  const { data: cases } = await sb
    .from("client_service_cases")
    .select("id,client_id,status")
    .eq("client_id", prog.client_id)
    .limit(5);

  const openCase = cases?.find((c) => c.status !== "closed") ?? cases?.[0] ?? null;

  if (!openCase) {
    report.mark_final_tests.push({
      name,
      result: "READY_NO_CASE",
      institution_gate: institutionGate,
      program_id: prog.id,
      note: "Shortlist exists but no service case for RPC",
    });
    continue;
  }

  const { data: mfData, error: mfErr } = await sb.rpc("fn_mark_final_and_create_application", {
    p_client_program_id: prog.id,
    p_client_service_case_id: openCase.id,
    p_intake_term: "Sep 2026",
    p_campus_name: "Main",
    p_set_primary: true,
  });

  report.mark_final_tests.push({
    name,
    result: mfErr ? "RPC_FAIL" : "RPC_SUCCESS",
    institution_gate: institutionGate,
    program_id: prog.id,
    case_id: openCase.id,
    error: mfErr ? { code: mfErr.code, message: mfErr.message, details: mfErr.details } : null,
    response: mfData ?? null,
  });
}

console.log(JSON.stringify(report, null, 2));
