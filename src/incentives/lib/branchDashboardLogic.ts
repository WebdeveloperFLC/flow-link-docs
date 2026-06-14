import type { TeamPerformanceRow } from "@/hooks/usePerformanceTeamRows";

export function teamWalletUtilization(rows: Pick<TeamPerformanceRow, "walletSpent" | "walletSpendable">[]): number {
  const spent = rows.reduce((s, r) => s + r.walletSpent, 0);
  const capacity = rows.reduce((s, r) => s + r.walletSpent + r.walletSpendable, 0);
  if (capacity <= 0) return spent > 0 ? 100 : 0;
  return Math.min(100, Math.round((spent / capacity) * 100));
}

export function teamAverageAchievement(rows: Pick<TeamPerformanceRow, "targetPct">[]): number | null {
  const withTarget = rows.filter((r) => r.targetPct != null);
  if (!withTarget.length) return null;
  return Math.round(withTarget.reduce((s, r) => s + (r.targetPct ?? 0), 0) / withTarget.length);
}

export function counselorAttainmentRows(rows: TeamPerformanceRow[]) {
  return [...rows]
    .sort((a, b) => b.netRevenue - a.netRevenue)
    .map((r) => ({
      name: r.name,
      revenue: r.netRevenue,
      achievementPct: r.targetPct != null ? Math.round(r.targetPct) : null,
    }));
}
