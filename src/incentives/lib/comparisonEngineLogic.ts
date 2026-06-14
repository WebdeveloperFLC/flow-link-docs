import type { TeamPerformanceRow } from "@/hooks/usePerformanceTeamRows";
import type { PerformancePeriodMetrics } from "@/hooks/usePerformancePeriodMetrics";
import { effectiveDiscountPct } from "@/incentives/lib/financeDashboardLogic";
import { formatInr } from "@/lib/performanceHubTheme";

export type ComparisonMode = "counselor" | "branch" | "country" | "mom";

export interface ComparisonEntityOption {
  id: string;
  label: string;
  subtitle?: string;
}

export interface ComparisonMetricRow {
  label: string;
  valueA: string;
  valueB: string;
  winner: "a" | "b" | "tie" | null;
}

export interface ComparisonEntityCard {
  title: string;
  subtitle?: string;
}

function winnerForNumbers(a: number, b: number, higherIsBetter = true): "a" | "b" | "tie" {
  if (a === b) return "tie";
  if (higherIsBetter) return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function pct(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n)}%`;
}

export function counselorComparison(a: TeamPerformanceRow, b: TeamPerformanceRow): ComparisonMetricRow[] {
  const incentiveA = a.cashLocked ?? a.cashProjected;
  const incentiveB = b.cashLocked ?? b.cashProjected;
  const discA = effectiveDiscountPct(a.walletSpent, a.netRevenue + a.walletSpent);
  const discB = effectiveDiscountPct(b.walletSpent, b.netRevenue + b.walletSpent);

  const defs = [
    { label: "Net revenue", na: a.netRevenue, nb: b.netRevenue, fmt: formatInr, higher: true },
    {
      label: "Target achievement",
      na: a.targetPct ?? -1,
      nb: b.targetPct ?? -1,
      fmt: (n: number) => (n < 0 ? "—" : pct(n)),
      higher: true,
    },
    { label: "Wallet spent", na: a.walletSpent, nb: b.walletSpent, fmt: formatInr, higher: false },
    {
      label: "Effective discount",
      na: discA ?? -1,
      nb: discB ?? -1,
      fmt: (n: number) => (n < 0 ? "—" : `${n}%`),
      higher: false,
    },
    { label: "Incentive earned", na: incentiveA, nb: incentiveB, fmt: formatInr, higher: true },
  ];

  return defs.map((d) => ({
    label: d.label,
    valueA: d.fmt(d.na),
    valueB: d.fmt(d.nb),
    winner: winnerForNumbers(d.na, d.nb, d.higher),
  }));
}

export function branchComparison(
  branchA: string,
  branchB: string,
  rows: TeamPerformanceRow[],
): ComparisonMetricRow[] {
  const agg = (name: string) => {
    const subset = rows.filter((r) => r.branchName === name);
    const revenue = subset.reduce((s, r) => s + r.netRevenue, 0);
    const spent = subset.reduce((s, r) => s + r.walletSpent, 0);
    const incentive = subset.reduce((s, r) => s + (r.cashLocked ?? r.cashProjected), 0);
    const withTarget = subset.filter((r) => r.targetPct != null);
    const avgTarget =
      withTarget.length > 0
        ? withTarget.reduce((s, r) => s + (r.targetPct ?? 0), 0) / withTarget.length
        : -1;
    return { revenue, spent, incentive, avgTarget, count: subset.length };
  };
  const a = agg(branchA);
  const b = agg(branchB);
  const defs = [
    { label: "Net revenue", na: a.revenue, nb: b.revenue, fmt: formatInr, higher: true },
    { label: "Counselors", na: a.count, nb: b.count, fmt: (n: number) => String(n), higher: true },
    {
      label: "Avg achievement",
      na: a.avgTarget,
      nb: b.avgTarget,
      fmt: (n: number) => (n < 0 ? "—" : pct(n)),
      higher: true,
    },
    { label: "Wallet spent", na: a.spent, nb: b.spent, fmt: formatInr, higher: false },
    { label: "Incentive total", na: a.incentive, nb: b.incentive, fmt: formatInr, higher: true },
  ];
  return defs.map((d) => ({
    label: d.label,
    valueA: d.fmt(d.na),
    valueB: d.fmt(d.nb),
    winner: winnerForNumbers(d.na, d.nb, d.higher),
  }));
}

export function countryComparison(
  a: { label: string; amount: number; eventCount: number },
  b: { label: string; amount: number; eventCount: number },
): ComparisonMetricRow[] {
  return [
    {
      label: "Qualifying revenue",
      valueA: formatInr(a.amount),
      valueB: formatInr(b.amount),
      winner: winnerForNumbers(a.amount, b.amount, true),
    },
    {
      label: "Qualifying events",
      valueA: String(a.eventCount),
      valueB: String(b.eventCount),
      winner: winnerForNumbers(a.eventCount, b.eventCount, true),
    },
  ];
}

export function periodComparison(
  current: PerformancePeriodMetrics,
  prior: PerformancePeriodMetrics,
): ComparisonMetricRow[] {
  const discA = effectiveDiscountPct(current.discountTotal, current.verifiedRevenue);
  const discB = effectiveDiscountPct(prior.discountTotal, prior.verifiedRevenue);
  const defs = [
    { label: "Net revenue", na: current.netRevenue, nb: prior.netRevenue, fmt: formatInr, higher: true },
    { label: "Verified revenue", na: current.verifiedRevenue, nb: prior.verifiedRevenue, fmt: formatInr, higher: true },
    { label: "Discount given", na: current.discountTotal, nb: prior.discountTotal, fmt: formatInr, higher: false },
    {
      label: "Effective discount",
      na: discA ?? -1,
      nb: discB ?? -1,
      fmt: (n: number) => (n < 0 ? "—" : `${n}%`),
      higher: false,
    },
    { label: "Cash incentive due", na: current.cashIncentiveDue, nb: prior.cashIncentiveDue, fmt: formatInr, higher: true },
  ];
  return defs.map((d) => ({
    label: d.label,
    valueA: d.fmt(d.na),
    valueB: d.fmt(d.nb),
    winner: winnerForNumbers(d.na, d.nb, d.higher),
  }));
}

export function counselorOptions(rows: TeamPerformanceRow[]): ComparisonEntityOption[] {
  return rows.map((r) => ({
    id: r.counselorId,
    label: r.name,
    subtitle: r.branchName ?? undefined,
  }));
}

export function branchOptions(rows: TeamPerformanceRow[]): ComparisonEntityOption[] {
  return [...new Set(rows.map((r) => r.branchName).filter(Boolean) as string[])].map((name) => ({
    id: name,
    label: name,
  }));
}

export function entityCardForCounselor(row: TeamPerformanceRow): ComparisonEntityCard {
  return {
    title: row.name,
    subtitle: [row.branchName, row.roleLabel.replace(/_/g, " ")].filter(Boolean).join(" · "),
  };
}
