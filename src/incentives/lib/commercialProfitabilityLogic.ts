export type ProfitabilityDimension = "counselor" | "branch" | "service" | "country";

export interface ProfitabilityRow {
  dimension: ProfitabilityDimension;
  groupKey: string;
  groupLabel: string;
  revenueInr: number;
  discountInr: number;
  incentiveInr: number;
  commissionInr: number;
  netInr: number;
  netMarginPct: number | null;
}

export interface ProfitabilityTotals {
  revenueInr: number;
  discountInr: number;
  incentiveInr: number;
  commissionInr: number;
  netInr: number;
  netMarginPct: number | null;
}

export const PROFITABILITY_DIMENSIONS: { id: ProfitabilityDimension; label: string }[] = [
  { id: "counselor", label: "By counselor" },
  { id: "branch", label: "By branch" },
  { id: "service", label: "By service" },
  { id: "country", label: "By country" },
];

export function mapProfitabilityRow(raw: {
  dimension: string;
  group_key: string;
  group_label: string;
  revenue_inr: number;
  discount_inr: number;
  incentive_inr: number;
  commission_inr: number;
  net_inr: number;
  net_margin_pct: number | null;
}): ProfitabilityRow {
  return {
    dimension: raw.dimension as ProfitabilityDimension,
    groupKey: raw.group_key,
    groupLabel: raw.group_label,
    revenueInr: Number(raw.revenue_inr ?? 0),
    discountInr: Number(raw.discount_inr ?? 0),
    incentiveInr: Number(raw.incentive_inr ?? 0),
    commissionInr: Number(raw.commission_inr ?? 0),
    netInr: Number(raw.net_inr ?? 0),
    netMarginPct: raw.net_margin_pct != null ? Number(raw.net_margin_pct) : null,
  };
}

export function profitabilityTotals(rows: ProfitabilityRow[]): ProfitabilityTotals {
  const revenueInr = rows.reduce((s, r) => s + r.revenueInr, 0);
  const discountInr = rows.reduce((s, r) => s + r.discountInr, 0);
  const incentiveInr = rows.reduce((s, r) => s + r.incentiveInr, 0);
  const commissionInr = rows.reduce((s, r) => s + r.commissionInr, 0);
  const netInr = rows.reduce((s, r) => s + r.netInr, 0);
  return {
    revenueInr,
    discountInr,
    incentiveInr,
    commissionInr,
    netInr,
    netMarginPct: revenueInr > 0 ? Math.round((100 * netInr) / revenueInr * 10) / 10 : null,
  };
}

export function marginHeatClass(pct: number | null): string {
  if (pct == null) return "bg-muted text-muted-foreground";
  if (pct >= 45) return "bg-emerald-100 text-emerald-800";
  if (pct >= 35) return "bg-teal-100 text-teal-800";
  if (pct >= 25) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function dimensionLabel(id: ProfitabilityDimension): string {
  return PROFITABILITY_DIMENSIONS.find((d) => d.id === id)?.label ?? id;
}
