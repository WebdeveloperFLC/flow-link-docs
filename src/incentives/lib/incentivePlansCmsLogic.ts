export type IncentiveBasisKey =
  | "Revenue"
  | "Service"
  | "Margin"
  | "Enrollment"
  | "Commission"
  | "Referral"
  | "Hybrid";

export interface IncentivePlanCmsRow {
  id: string;
  name: string;
  basis: IncentiveBasisKey;
  basisClass: string;
  ruleSummary: string;
  appliesTo: string;
  payoutYtd: number;
  currency: string;
  status: "Active" | "Inactive";
  isActive: boolean;
}

export interface IncentivePlansCmsKpis {
  totalPayoutYtd: number;
  activePlans: number;
  staffEarning: number;
  avgPerHead: number;
}

export const STRUCTURE_BASIS_CHIPS = [
  "Revenue",
  "Enrollment",
  "Margin",
  "Profit",
  "Commission",
  "Service",
  "Country",
  "Institution",
  "Branch",
  "Department",
  "Team",
  "Referral",
  "Campaign",
  "Hybrid",
] as const;

export const CLIENT_TYPE_RULES = [
  { clientType: "Full-fee client", treatment: "100% of slab" },
  { clientType: "Wallet-discount client", treatment: "On net after wallet" },
  { clientType: "Offer-code client", treatment: "On net after offer" },
  { clientType: "Promotional/campaign client", treatment: "Flat campaign rate" },
  { clientType: "Combination-offer client", treatment: "Per-combination rule" },
] as const;

export const BASE_CONFIG_ITEMS = [
  { label: "Wallet discounts", reducesBase: true },
  { label: "Offer-code discounts", reducesBase: true },
  { label: "Promotional discounts", reducesBase: false },
] as const;

const BASIS_CLASS: Record<IncentiveBasisKey, string> = {
  Revenue: "bg-[var(--blueBg)] text-[var(--blue)]",
  Service: "bg-teal-100 text-teal-800",
  Margin: "bg-violet-100 text-violet-800",
  Enrollment: "bg-amber-100 text-amber-800",
  Commission: "bg-emerald-100 text-emerald-800",
  Referral: "bg-emerald-100 text-emerald-800",
  Hybrid: "bg-muted text-muted-foreground",
};

export function inferPlanBasis(
  revenueBasis: string | null,
  sourceTypes: string[],
): IncentiveBasisKey {
  if (sourceTypes.includes("direct_visa_commission") || sourceTypes.includes("b2b_admission_commission")) {
    return "Commission";
  }
  if (sourceTypes.includes("ancillary")) return "Service";
  if (revenueBasis === "gross") return "Revenue";
  if (revenueBasis === "margin") return "Margin";
  return "Revenue";
}

export function summarizeSlabRule(slabs: {
  rate_type: string;
  rate_value: number;
  metric: string;
  min_threshold: number;
  max_threshold: number | null;
}[]): string {
  if (!slabs.length) return "No slabs configured";
  const s = slabs[0];
  if (s.rate_type === "percent") {
    return `${s.rate_value}% of ${s.metric.replace(/_/g, " ")}`;
  }
  if (s.rate_type === "slab") {
    return `Slab from ${s.min_threshold}${s.max_threshold != null ? `–${s.max_threshold}` : "+"}`;
  }
  if (s.rate_type === "flat") return `Flat ${s.rate_value}`;
  return `${s.rate_type} ${s.rate_value}`;
}

export function planAppliesLabel(input: {
  scope_type: string;
  branch_name?: string | null;
  role_key?: string | null;
  plan_stack_role?: string | null;
}): string {
  if (input.scope_type === "branch" && input.branch_name) return input.branch_name;
  if (input.scope_type === "role" && input.role_key) return `${input.role_key}s`;
  if (input.plan_stack_role && input.plan_stack_role !== "base") {
    return `Global · ${input.plan_stack_role} stack`;
  }
  return "All counselors";
}

export function buildIncentivePlanCmsRow(input: {
  plan: {
    id: string;
    name: string;
    is_active: boolean;
    revenue_basis: string;
    scope_type: string;
    role_key: string | null;
    settlement_currency: string;
    plan_stack_role?: string | null;
  };
  slabs: { source_type: string; rate_type: string; rate_value: number; metric: string; min_threshold: number; max_threshold: number | null }[];
  branchName?: string | null;
  payoutYtd?: number;
}): IncentivePlanCmsRow {
  const sourceTypes = [...new Set(input.slabs.map((s) => s.source_type))];
  const basis = inferPlanBasis(input.plan.revenue_basis, sourceTypes);
  return {
    id: input.plan.id,
    name: input.plan.name,
    basis,
    basisClass: BASIS_CLASS[basis],
    ruleSummary: summarizeSlabRule(input.slabs),
    appliesTo: planAppliesLabel({
      scope_type: input.plan.scope_type,
      branch_name: input.branchName,
      role_key: input.plan.role_key,
      plan_stack_role: input.plan.plan_stack_role,
    }),
    payoutYtd: input.payoutYtd ?? 0,
    currency: input.plan.settlement_currency || "INR",
    status: input.plan.is_active ? "Active" : "Inactive",
    isActive: input.plan.is_active,
  };
}

export function incentivePlansCmsKpis(rows: IncentivePlanCmsRow[], staffEarning: number): IncentivePlansCmsKpis {
  const totalPayoutYtd = rows.reduce((s, r) => s + r.payoutYtd, 0);
  return {
    totalPayoutYtd,
    activePlans: rows.filter((r) => r.isActive).length,
    staffEarning,
    avgPerHead: staffEarning > 0 ? Math.round(totalPayoutYtd / staffEarning) : 0,
  };
}
