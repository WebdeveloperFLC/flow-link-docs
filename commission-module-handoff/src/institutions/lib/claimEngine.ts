// Eligibility classification is currently driven directly by
// upi_commission_students.commission_status in ClaimsPanel.tsx using
// the live vocabulary: 'eligible', 'paid', 'blocked' (or block_reason
// IS NOT NULL), 'carried_forward' (or is_carried_forward = true),
// 'pending'. Legacy mock-only statuses (pending_dues, missing_consent,
// withdrawn, deferred) have no live equivalent and were dropped in
// Phase 2.1. A typed classifier will be reintroduced in Phase 2.2 once
// write-back paths are designed.

export interface RuleConflict {
  ruleAId: string;
  ruleBId: string;
  reason: string;
}

/** Detect overlapping condition rules within a single commission. */
export function detectRuleConflicts(rules: any[]): RuleConflict[] {
  const out: RuleConflict[] = [];
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (a.rule_type === "slab_tier" && b.rule_type === "slab_tier") {
        const aMin = a.min_value ?? 0, aMax = a.max_value ?? Infinity;
        const bMin = b.min_value ?? 0, bMax = b.max_value ?? Infinity;
        if (aMin <= bMax && bMin <= aMax) {
          out.push({ ruleAId: a.id, ruleBId: b.id, reason: `Slab ${aMin}-${aMax} overlaps ${bMin}-${bMax}` });
        }
      } else if (
        a.condition_field &&
        a.condition_field === b.condition_field &&
        String(a.condition_value).toLowerCase() === String(b.condition_value).toLowerCase()
      ) {
        out.push({ ruleAId: a.id, ruleBId: b.id, reason: `Both target ${a.condition_field}=${a.condition_value}` });
      }
    }
  }
  return out;
}