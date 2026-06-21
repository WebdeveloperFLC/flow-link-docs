import { supabase } from "@/integrations/supabase/client";

export type LinkageCandidate = {
  id: string;
  run_id: string;
  cf_university_id: string;
  cf_name: string;
  cf_country_code: string;
  cf_course_count: number;
  suggested_upi_institution_id: string | null;
  suggested_upi_name: string | null;
  match_method: string;
  confidence: number;
  status: string;
  is_ambiguous: boolean;
  ambiguous_candidates: unknown;
  review_notes: string | null;
  created_at: string;
};

export type LinkageDryRunSummary = {
  run_id: string;
  dry_run: boolean;
  cf_total: number;
  cf_linked_before: number;
  cf_unlinked_before: number;
  already_linked: number;
  exact: number;
  normalized: number;
  alias: number;
  ambiguous: number;
  unmatched: number;
  auto_link_eligible_if_approved: number;
  estimated_mark_final_pct_after_apply: number;
};

export type LinkageDashboardStats = {
  cf_total: number;
  linked: number;
  unlinked: number;
  mark_final_eligible_pct: number;
  pending_review: number;
  approved_ready: number;
  ambiguous: number;
  unmatched: number;
  last_dry_run_at: string | null;
  last_run_id: string | null;
  last_dry_run_summary: {
    exact: number;
    normalized: number;
    alias: number;
    ambiguous: number;
    unmatched: number;
  } | null;
};

export async function fetchLinkageDashboardStats(): Promise<LinkageDashboardStats> {
  const { data, error } = await supabase.rpc("fn_cf_upi_linkage_dashboard_stats" as never);
  if (error) throw error;
  return data as LinkageDashboardStats;
}

export async function runLinkageDryRun(): Promise<LinkageDryRunSummary> {
  const { data, error } = await supabase.rpc("fn_cf_upi_linkage_refresh" as never, {
    p_dry_run: true,
  } as never);
  if (error) throw error;
  return data as LinkageDryRunSummary;
}

export async function listLinkageCandidates(opts?: {
  runId?: string;
  matchMethod?: string;
  status?: string;
}): Promise<LinkageCandidate[]> {
  const { data, error } = await supabase.rpc("fn_cf_upi_linkage_list_candidates" as never, {
    p_run_id: opts?.runId ?? null,
    p_match_method: opts?.matchMethod ?? null,
    p_status: opts?.status ?? null,
    p_limit: 100,
    p_offset: 0,
  } as never);
  if (error) throw error;
  return (data ?? []) as LinkageCandidate[];
}

export async function setLinkageReview(
  candidateId: string,
  status: "approved" | "rejected",
  upiInstitutionId?: string | null,
  notes?: string,
): Promise<void> {
  const { error } = await supabase.rpc("fn_cf_upi_linkage_set_review" as never, {
    p_candidate_id: candidateId,
    p_status: status,
    p_upi_institution_id: upiInstitutionId ?? null,
    p_notes: notes ?? null,
  } as never);
  if (error) throw error;
}

export async function applyLinkageCandidates(candidateIds?: string[]): Promise<{
  applied: number;
  cf_linked_after: number;
  mark_final_eligible_pct: number;
}> {
  const { data, error } = await supabase.rpc("fn_cf_upi_linkage_apply" as never, {
    p_candidate_ids: candidateIds ?? null,
  } as never);
  if (error) throw error;
  return data as { applied: number; cf_linked_after: number; mark_final_eligible_pct: number };
}
