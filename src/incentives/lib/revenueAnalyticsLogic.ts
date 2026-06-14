import { priorPeriodKey } from "@/incentives/lib/incentiveFinanceExport";

export function rollingPeriodKeys(endPeriod: string, count: number): string[] {
  const keys: string[] = [];
  let cur: string | null = endPeriod;
  for (let i = 0; i < count && cur; i++) {
    keys.unshift(cur);
    cur = priorPeriodKey(cur);
  }
  return keys;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function periodShortLabel(periodKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey.trim());
  if (!m) return periodKey;
  const idx = Number(m[2]) - 1;
  return MONTHS[idx] ?? periodKey;
}

export interface DimensionRow {
  label: string;
  amount: number;
  eventCount: number;
}

export function mapDimensionRows(
  rows: { group_label: string; total_amount: number; event_count: number }[],
): DimensionRow[] {
  return rows.map((r) => ({
    label: r.group_label || "Other",
    amount: Number(r.total_amount ?? 0),
    eventCount: Number(r.event_count ?? 0),
  }));
}

export function firmMarginProxy(netRevenue: number, verifiedRevenue: number): number | null {
  if (verifiedRevenue <= 0) return null;
  return Math.round((netRevenue / verifiedRevenue) * 1000) / 10;
}
