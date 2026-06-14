export interface MixSlice {
  label: string;
  amount: number;
  pct: number;
}

export function walletUtilizationPct(unlocked: number, potential: number): number {
  if (potential <= 0) return unlocked > 0 ? 100 : 0;
  return Math.min(100, Math.round((unlocked / potential) * 100));
}

export function netMarginPct(netRevenue: number, verifiedRevenue: number): number | null {
  if (verifiedRevenue <= 0) return null;
  return Math.round((netRevenue / verifiedRevenue) * 1000) / 10;
}

export function branchAttainmentPct(revenue: number, maxRevenue: number): number {
  if (maxRevenue <= 0) return revenue > 0 ? 100 : 0;
  return Math.min(100, Math.round((revenue / maxRevenue) * 100));
}

export function toMixSlices(
  rows: { label: string; amount: number }[],
  totalOverride?: number,
): MixSlice[] {
  const total = totalOverride ?? (rows.reduce((s, r) => s + r.amount, 0) || 1);
  return rows
    .filter((r) => r.amount > 0)
    .map((r) => ({
      label: r.label,
      amount: r.amount,
      pct: Math.round((r.amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function totalPendingApprovals(counts: {
  pendingApprovals: number;
  walletExceptions: number;
  promotionRequests: number;
}): number {
  return counts.pendingApprovals + counts.walletExceptions + counts.promotionRequests;
}
