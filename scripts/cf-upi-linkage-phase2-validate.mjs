/**
 * Post-apply validation + Mark Final institution gate (read-only via SECURITY DEFINER RPCs).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function envVal(key) {
  const m = fs.readFileSync(".env", "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const sb = createClient(envVal("VITE_SUPABASE_URL"), envVal("VITE_SUPABASE_PUBLISHABLE_KEY"));

const { data: stats, error: statsErr } = await sb.rpc("fn_cf_upi_linkage_dashboard_stats");
if (statsErr) {
  console.error(JSON.stringify({ error: statsErr.message }, null, 2));
  process.exit(1);
}

const { data: exactCandidates } = await sb.rpc("fn_cf_upi_linkage_list_candidates", {
  p_run_id: stats?.last_run_id ?? null,
  p_match_method: "exact",
  p_status: null,
  p_limit: 100,
  p_offset: 0,
});

const expected = [
  "Abertay University",
  "Algonquin College",
  "Arizona State University",
  "Conestoga College",
  "Seneca Polytechnic",
  "University of Auckland",
];

const verifySix = expected.map((name) => {
  const c = (exactCandidates ?? []).find((x) => x.cf_name === name);
  const applied = c?.status === "applied";
  return {
    name,
    candidate_status: c?.status ?? "missing",
    upi_institution_id: applied ? c.suggested_upi_institution_id : null,
    populated: applied,
  };
});

const linkedFromCandidates = (exactCandidates ?? []).filter((c) => c.status === "applied").length;

const report = {
  validation: {
    cf_total: stats.cf_total,
    linked_count: stats.linked,
    remaining_unmatched: stats.unlinked,
    mark_final_eligible_pct: stats.mark_final_eligible_pct,
    pending_review: stats.pending_review,
    approved_ready: stats.approved_ready,
    last_dry_run_summary: stats.last_dry_run_summary,
  },
  verify_six: verifySix,
  exact_candidate_statuses: (exactCandidates ?? []).map((c) => ({
    cf_name: c.cf_name,
    status: c.status,
    suggested_upi: c.suggested_upi_name,
    upi_institution_id: c.suggested_upi_institution_id,
  })),
  mark_final_institution_gate: ["Conestoga College", "Seneca Polytechnic", "Algonquin College"].map((name) => {
    const c = (exactCandidates ?? []).find((x) => x.cf_name === name);
    const linked = c?.status === "applied" && !!c.suggested_upi_institution_id;
    return {
      name,
      upi_institution_id: linked ? c.suggested_upi_institution_id : null,
      institution_gate: linked ? "PASS" : "FAIL",
      candidate_status: c?.status ?? "missing",
    };
  }),
  note:
    stats.linked >= 6
      ? "Phase 2 apply complete"
      : "Phase 2 not applied yet — publish migration 20260901120603 or run Apply from /institutions/linkage",
};

console.log(JSON.stringify(report, null, 2));
