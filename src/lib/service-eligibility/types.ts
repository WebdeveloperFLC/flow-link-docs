export type EligibilityOutcome = "can_start" | "conditional_start" | "not_yet" | "senior_review";

export type EligibilityQuestion = {
  id: string;
  library_id: string;
  code: string;
  section: string;
  label: string;
  help_text: string | null;
  q_type: string;
  options: string[] | null;
  conditional_on: { question?: string; equals?: unknown } | null;
  rule: {
    block_if?: { equals?: unknown };
    warn_if?: { equals?: unknown };
    senior_review_if?: { equals?: unknown };
    allows_pending?: boolean;
    outcome_if_fail?: EligibilityOutcome;
  };
  prefill_field: string | null;
  allows_pending_note: boolean;
  sort_order: number;
};

export type PendingItem = {
  code: string;
  label: string;
  expected_by?: string;
  status: "preparing" | "missing";
  note?: string;
};

export type EligibilityEvaluation = {
  outcome: EligibilityOutcome;
  can_enrol: boolean;
  blockers: string[];
  warnings: string[];
  pending_items: PendingItem[];
  summary: string;
};

export const OUTCOME_LABELS: Record<EligibilityOutcome, string> = {
  can_start: "Can start process",
  conditional_start: "Start with conditions",
  not_yet: "Not yet — blockers remain",
  senior_review: "Needs senior review",
};

export const VISA_IMMIGRATION = "visa_immigration";
