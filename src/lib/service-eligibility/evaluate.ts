import type { EligibilityEvaluation, EligibilityOutcome, EligibilityQuestion, PendingItem } from "./types";

function matchesRule(answer: unknown, expected: unknown): boolean {
  if (expected === false && (answer === false || answer === "no" || answer === "No")) return true;
  if (expected === true && (answer === true || answer === "yes" || answer === "Yes")) return true;
  return answer === expected;
}

function isVisible(q: EligibilityQuestion, answers: Record<string, unknown>): boolean {
  const c = q.conditional_on;
  if (!c?.question) return true;
  return matchesRule(answers[c.question], c.equals);
}

export function evaluateEligibility(
  questions: EligibilityQuestion[],
  answers: Record<string, unknown>,
  prospectNotes?: string | null,
  pendingItems?: PendingItem[],
): EligibilityEvaluation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let worst: EligibilityOutcome = "can_start";

  const rank = (o: EligibilityOutcome) =>
    ({ can_start: 0, conditional_start: 1, senior_review: 2, not_yet: 3 })[o];

  for (const q of questions) {
    if (!isVisible(q, answers)) continue;
    const ans = answers[q.code];
    if (ans === undefined || ans === null || ans === "") {
      warnings.push(`${q.label} — not answered`);
      continue;
    }

    const rule = q.rule ?? {};
    if (rule.block_if && matchesRule(ans, rule.block_if.equals)) {
      blockers.push(q.label);
      const fail = rule.outcome_if_fail ?? "not_yet";
      if (rank(fail) > rank(worst)) worst = fail;
    }
    if (rule.senior_review_if && matchesRule(ans, rule.senior_review_if.equals)) {
      warnings.push(`${q.label} — escalate to senior counselor`);
      if (rank("senior_review") > rank(worst)) worst = "senior_review";
    }
    if (rule.warn_if && matchesRule(ans, rule.warn_if.equals)) {
      warnings.push(q.label);
      if (worst === "can_start") worst = "conditional_start";
    }
  }

  const pending = pendingItems ?? [];
  if (pending.length > 0 && worst === "can_start") {
    worst = "conditional_start";
  }
  if (prospectNotes?.trim() && worst === "can_start") {
    worst = "conditional_start";
  }

  const can_enrol = worst === "can_start" || worst === "conditional_start";

  const summary =
    worst === "can_start"
      ? "All key eligibility criteria appear met. Confirm documents before lodging."
      : worst === "conditional_start"
        ? "Process may begin with noted conditions or items still in preparation."
        : worst === "senior_review"
          ? "Review with a senior counselor before proceeding."
          : "Do not start until blockers are resolved.";

  return { outcome: worst, can_enrol, blockers, warnings, pending_items: pending, summary };
}

export function parseQuestionOptions(raw: unknown): string[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map(String);
  return null;
}

export function questionVisible(q: EligibilityQuestion, answers: Record<string, unknown>): boolean {
  return isVisible(q, answers);
}
