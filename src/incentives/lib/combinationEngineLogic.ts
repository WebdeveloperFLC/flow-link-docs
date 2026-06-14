export type CombinationType = "logical" | "package";

export interface ServiceCombinationRow {
  id: string;
  name: string;
  combinationType: CombinationType;
  serviceCodes: string[];
  serviceLabels: string[];
  branchId: string | null;
  branchName: string;
  price: number;
  currency: string;
  maxDiscountPct: number | null;
  walletEligible: boolean;
  hasOfferRule: boolean;
  hasIncentiveRule: boolean;
  hasDiscountRule: boolean;
  isActive: boolean;
}

export interface CombinationKpis {
  total: number;
  logical: number;
  package: number;
  withRules: number;
}

export interface ResolvedCombination {
  combination_id: string;
  combination_type: CombinationType;
  name: string;
  price: number;
  currency: string;
  composed_sum?: number;
  package_price?: number | null;
  offer_id?: string | null;
  incentive_scheme_id?: string | null;
  wallet_eligible?: boolean;
  max_discount_pct?: number | null;
  service_codes?: string[];
  service_labels?: string[];
}

export function buildCombinationRow(input: {
  id: string;
  name: string;
  combination_type: string;
  service_codes: string[] | null;
  branch_id: string | null;
  branchName: string;
  package_price: number | null;
  package_currency: string | null;
  max_discount_pct: number | null;
  wallet_eligible: boolean;
  linked_offer_id: string | null;
  linked_incentive_scheme_id: string | null;
  is_active: boolean;
  labelMap: Map<string, string>;
  resolvedPrice?: number;
  resolvedCurrency?: string;
  resolvedLabels?: string[];
}): ServiceCombinationRow {
  const codes = input.service_codes ?? [];
  const labels =
    input.resolvedLabels ??
    codes.map((c) => input.labelMap.get(splitLibraryId(c)) ?? c);
  const price =
    input.resolvedPrice ??
    (input.combination_type === "package" && input.package_price != null
      ? Number(input.package_price)
      : 0);

  return {
    id: input.id,
    name: input.name,
    combinationType: input.combination_type === "package" ? "package" : "logical",
    serviceCodes: codes,
    serviceLabels: labels,
    branchId: input.branch_id,
    branchName: input.branchName,
    price,
    currency: input.resolvedCurrency ?? input.package_currency ?? "INR",
    maxDiscountPct: input.max_discount_pct != null ? Number(input.max_discount_pct) : null,
    walletEligible: input.wallet_eligible,
    hasOfferRule: Boolean(input.linked_offer_id),
    hasIncentiveRule: Boolean(input.linked_incentive_scheme_id),
    hasDiscountRule: input.max_discount_pct != null && input.max_discount_pct > 0,
    isActive: input.is_active,
  };
}

export function splitLibraryId(code: string): string {
  return code.split("::")[0] ?? code;
}

export function combinationKpis(rows: ServiceCombinationRow[]): CombinationKpis {
  return {
    total: rows.length,
    logical: rows.filter((r) => r.combinationType === "logical").length,
    package: rows.filter((r) => r.combinationType === "package").length,
    withRules: rows.filter((r) => r.hasOfferRule || r.hasIncentiveRule || r.hasDiscountRule).length,
  };
}

export function discountUtilPct(maxPct: number | null, usedPct = 0): number {
  if (maxPct == null || maxPct <= 0) return 0;
  return Math.min(100, Math.round((usedPct / maxPct) * 100));
}
