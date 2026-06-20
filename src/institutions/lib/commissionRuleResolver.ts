/**
 * Commission rule resolver — mirrors fn_resolve_commission_rule precedence.
 * Client-side for simulator + Claims recalc; DB RPC is source of truth for writes.
 *
 * Precedence: Promotion → Intake → Program → Category → Campus → Country → Default
 */

export interface ResolveCommissionInput {
  institutionId: string;
  partnershipRouteId?: string | null;
  country?: string | null;
  campus?: string | null;
  programCategory?: string | null;
  programCode?: string | null;
  intake?: string | null;
  promotionId?: string | null;
  asOf?: string; // ISO date
}

export interface CommissionRuleScope {
  id: string;
  commission_id: string;
  rule_type?: string | null;
  rule_name?: string | null;
  scope_country?: string | null;
  scope_campus?: string | null;
  scope_program_category?: string | null;
  scope_program_code?: string | null;
  scope_intake?: string | null;
  scope_promotion_id?: string | null;
  precedence_rank?: number | null;
}

export interface CommissionRecord {
  id: string;
  name: string;
  base_rate_percent?: number | null;
  currency?: string | null;
  agreement_version_id?: string | null;
  is_active?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
}

export type MatchLevel =
  | "promotion"
  | "intake"
  | "program"
  | "category"
  | "campus"
  | "country"
  | "default";

export interface ResolvedCommissionRule {
  commissionId: string;
  matchedRuleId: string | null;
  commissionName: string;
  baseRatePercent: number | null;
  currency: string;
  agreementVersionId: string | null;
  matchLevel: MatchLevel;
}

const LEVEL_ORDER: MatchLevel[] = [
  "promotion",
  "intake",
  "program",
  "category",
  "campus",
  "country",
  "default",
];

function norm(s: string | null | undefined): string {
  return String(s ?? "").trim().toLowerCase();
}

function isActiveOnDate(c: CommissionRecord, asOf: Date): boolean {
  if (c.is_active === false) return false;
  if (c.effective_from && new Date(c.effective_from) > asOf) return false;
  if (c.effective_to && new Date(c.effective_to) < asOf) return false;
  return true;
}

function matchLevel(
  rule: CommissionRuleScope,
  input: ResolveCommissionInput,
): MatchLevel | null {
  if (rule.scope_promotion_id && input.promotionId && rule.scope_promotion_id === input.promotionId) {
    return "promotion";
  }
  if (rule.scope_intake && norm(rule.scope_intake) === norm(input.intake)) return "intake";
  if (rule.scope_program_code && norm(rule.scope_program_code) === norm(input.programCode)) return "program";
  if (rule.scope_program_category && norm(rule.scope_program_category) === norm(input.programCategory)) {
    return "category";
  }
  if (rule.scope_campus && norm(rule.scope_campus) === norm(input.campus)) return "campus";
  if (rule.scope_country && norm(rule.scope_country) === norm(input.country)) return "country";
  const isDefault =
    rule.rule_type === "base" ||
    (!rule.scope_promotion_id &&
      !rule.scope_intake &&
      !rule.scope_program_code &&
      !rule.scope_program_category &&
      !rule.scope_campus &&
      !rule.scope_country);
  if (isDefault) return "default";
  return null;
}

/** Pick commission from route default or institution active list. */
export function pickCommission(
  commissions: CommissionRecord[],
  routeDefaultCommissionId: string | null | undefined,
  institutionId: string,
  asOf: Date,
): CommissionRecord | null {
  if (routeDefaultCommissionId) {
    const routed = commissions.find((c) => c.id === routeDefaultCommissionId);
    if (routed && isActiveOnDate(routed, asOf)) return routed;
  }
  const instCommissions = commissions
    .filter((c) => c.id && isActiveOnDate(c, asOf))
    .sort((a, b) => {
      const af = a.effective_from ? new Date(a.effective_from).getTime() : 0;
      const bf = b.effective_from ? new Date(b.effective_from).getTime() : 0;
      return bf - af;
    });
  return instCommissions[0] ?? null;
}

/** Resolve best-matching rule for a commission + student context. */
export function resolveCommissionRule(
  commission: CommissionRecord,
  rules: CommissionRuleScope[],
  input: ResolveCommissionInput,
): ResolvedCommissionRule | null {
  const commissionRules = rules.filter((r) => r.commission_id === commission.id);
  let best: { rule: CommissionRuleScope | null; level: MatchLevel } | null = null;

  for (const rule of commissionRules) {
    const level = matchLevel(rule, input);
    if (!level) continue;
    const levelIdx = LEVEL_ORDER.indexOf(level);
    const bestIdx = best ? LEVEL_ORDER.indexOf(best.level) : 99;
    if (levelIdx < bestIdx) {
      best = { rule, level };
    } else if (levelIdx === bestIdx && best?.rule) {
      const pr = rule.precedence_rank ?? 100;
      const bpr = best.rule.precedence_rank ?? 100;
      if (pr < bpr) best = { rule, level };
    }
  }

  if (!best) {
    // No scoped rule — still return commission with default level
    return {
      commissionId: commission.id,
      matchedRuleId: null,
      commissionName: commission.name,
      baseRatePercent: commission.base_rate_percent ?? null,
      currency: commission.currency ?? "CAD",
      agreementVersionId: commission.agreement_version_id ?? null,
      matchLevel: "default",
    };
  }

  return {
    commissionId: commission.id,
    matchedRuleId: best.rule?.id ?? null,
    commissionName: commission.name,
    baseRatePercent: commission.base_rate_percent ?? null,
    currency: commission.currency ?? "CAD",
    agreementVersionId: commission.agreement_version_id ?? null,
    matchLevel: best.level,
  };
}

/** Full resolver: pick commission + match rule. */
export function resolveCommissionForStudent(
  commissions: CommissionRecord[],
  rules: CommissionRuleScope[],
  input: ResolveCommissionInput,
  routeDefaultCommissionId?: string | null,
): ResolvedCommissionRule | null {
  const asOf = input.asOf ? new Date(input.asOf) : new Date();
  const commission = pickCommission(commissions, routeDefaultCommissionId, input.institutionId, asOf);
  if (!commission) return null;
  return resolveCommissionRule(commission, rules, input);
}
