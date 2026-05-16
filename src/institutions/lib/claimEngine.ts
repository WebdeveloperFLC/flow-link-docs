import type { MockStudent } from "../mock/types";

export interface CycleEligibility {
  eligible: MockStudent[];
  blocked: MockStudent[];
  carried: MockStudent[];
  carryToNext: MockStudent[];
  duplicates: string[];
  amount: number;
}

const BLOCKED: MockStudent["status"][] = ["pending_dues", "missing_consent", "withdrawn"];

export function classifyForCycle(all: MockStudent[], cycleId: string): CycleEligibility {
  const rows = all.filter((s) => s.claim_cycle_id === cycleId);
  const eligible: MockStudent[] = [];
  const blocked: MockStudent[] = [];
  const carried: MockStudent[] = [];
  const carryToNext: MockStudent[] = [];
  const seen = new Map<string, string>();
  const duplicates: string[] = [];

  for (const s of rows) {
    const key = `${s.full_name}|${s.intake_processed}`;
    if (seen.has(key)) duplicates.push(s.id);
    else seen.set(key, s.id);

    if (s.status === "carried_forward") carried.push(s);
    else if (s.status === "deferred") carryToNext.push(s);
    else if (BLOCKED.includes(s.status)) blocked.push(s);
    else if (s.status === "eligible") eligible.push(s);
  }

  const amount = eligible.reduce((sum, s) => sum + (s.tuition ?? 0), 0);
  return { eligible, blocked, carried, carryToNext, duplicates, amount };
}

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