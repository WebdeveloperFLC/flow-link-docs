/**
 * Pure commission calculator driven entirely by rule rows.
 * No hard-coded business logic. Safe to use with both mock and live rules.
 */

export interface CommissionInput {
  tuition: number;
  currency: string;
  country?: string;
  intake?: string;
  program_level?: string;
  program_code?: string;
  student_count?: number;
}

export interface RuleLike {
  rule_type: string;
  rule_name?: string | null;
  payout_amount: number | null;
  payout_type: "percentage" | "fixed" | "multiplier" | null;
  payout_currency?: string | null;
  condition_field?: string | null;
  condition_operator?: string | null;
  condition_value?: string | null;
  min_value?: number | null;
  max_value?: number | null;
}

export interface CommissionBase {
  base_rate_percent?: number | null;
  currency: string;
}

export interface PayoutLine {
  label: string;
  amount: number;
  currency: string;
  source: "base" | "rule";
  ruleType?: string;
}

export interface PayoutBreakdown {
  total: number;
  currency: string;
  lines: PayoutLine[];
}

function matches(rule: RuleLike, input: CommissionInput): boolean {
  if (rule.rule_type === "slab_tier") {
    const n = input.student_count ?? 0;
    if (rule.min_value != null && n < rule.min_value) return false;
    if (rule.max_value != null && n > rule.max_value) return false;
    return true;
  }
  if (!rule.condition_field) return true; // unconditional bonus
  const fieldVal = String((input as any)[rule.condition_field] ?? "").toLowerCase();
  const target = String(rule.condition_value ?? "").toLowerCase();
  switch (rule.condition_operator) {
    case "in": {
      const list = target.split(",").map((s) => s.trim());
      return list.includes(fieldVal);
    }
    case "!=":
      return fieldVal !== target;
    case ">":
      return Number(fieldVal) > Number(target);
    case "<":
      return Number(fieldVal) < Number(target);
    case "=":
    default:
      return fieldVal === target;
  }
}

function applyPayout(rule: RuleLike, tuition: number, currency: string): { amount: number; currency: string } {
  const amt = rule.payout_amount ?? 0;
  const cur = rule.payout_currency || currency;
  if (rule.payout_type === "fixed") return { amount: amt, currency: cur };
  if (rule.payout_type === "multiplier") return { amount: tuition * amt, currency: cur };
  return { amount: tuition * (amt / 100), currency: cur };
}

export function simulateCommission(
  base: CommissionBase,
  rules: RuleLike[],
  input: CommissionInput,
): PayoutBreakdown {
  const lines: PayoutLine[] = [];
  const baseRate = base.base_rate_percent ?? 0;
  const baseAmount = input.tuition * (baseRate / 100);
  if (baseRate > 0) {
    lines.push({
      label: `Base ${baseRate}% of tuition`,
      amount: baseAmount,
      currency: base.currency,
      source: "base",
    });
  }
  for (const rule of rules) {
    if (!matches(rule, input)) continue;
    const { amount, currency } = applyPayout(rule, input.tuition, base.currency);
    lines.push({
      label: rule.rule_name || rule.rule_type,
      amount,
      currency,
      source: "rule",
      ruleType: rule.rule_type,
    });
  }
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { total, currency: base.currency, lines };
}