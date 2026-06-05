import type { AgingRow, CallDaily, FunnelRow } from "../types";

export function aggregateCallsByDay(rows: CallDaily[]): CallDaily[] {
  const byDay = rows.reduce<Record<string, CallDaily>>((acc, row) => {
    const key = row.day;
    if (!acc[key]) {
      acc[key] = { day: key, answered: 0, unanswered: 0, total_calls: 0, avg_duration: 0 };
    }
    acc[key].answered += row.answered || 0;
    acc[key].unanswered += row.unanswered || 0;
    acc[key].total_calls += row.total_calls || 0;
    return acc;
  }, {});
  return Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));
}

export function computeCallKpis(rows: CallDaily[]) {
  const totalCalls = rows.reduce((sum, row) => sum + (row.total_calls || 0), 0);
  const totalAnswered = rows.reduce((sum, row) => sum + (row.answered || 0), 0);
  const answerRate = totalCalls ? Math.round((totalAnswered / totalCalls) * 100) : 0;
  return { totalCalls, totalAnswered, answerRate };
}

export function buildLeadTemperatureData(funnel: FunnelRow[]) {
  return (["hot", "warm", "cold"] as const).map((name) => ({
    name,
    value: funnel.filter((row) => row.temperature === name).reduce((sum, row) => sum + (row.leads || 0), 0),
  }));
}

export function computeLeadTotals(funnel: FunnelRow[]) {
  const totalLeads = funnel.reduce((sum, row) => sum + (row.leads || 0), 0);
  const hotLeads = funnel.filter((row) => row.temperature === "hot").reduce((sum, row) => sum + (row.leads || 0), 0);
  return { totalLeads, hotLeads };
}

const AGING_ORDER = ["current", "0-7", "8-15", "16-30", "30+"] as const;

export function aggregateAgingBuckets(rows: AgingRow[]) {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    const bucket = row.aging_bucket || "current";
    const due = Number(row.balance_due) || 0;
    if (due <= 0) return acc;
    acc[bucket] = (acc[bucket] || 0) + due;
    return acc;
  }, {});

  return AGING_ORDER.map((name) => ({
    name,
    value: totals[name] || 0,
  }));
}

export function computeArTotals(rows: AgingRow[]) {
  let outstandingAr = 0;
  let overdueInvoices = 0;
  for (const row of rows) {
    const due = Number(row.balance_due) || 0;
    if (due <= 0) continue;
    outstandingAr += due;
    if (row.aging_bucket && row.aging_bucket !== "current") overdueInvoices += 1;
  }
  return { outstandingAr, overdueInvoices };
}

export function aggregateClientStatuses(rows: { status: string | null }[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.status?.trim() || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeLeadConversionPct(total: number, converted: number) {
  if (!total) return 0;
  return Math.round((converted / total) * 100);
}

export function sumAmounts(rows: { amount: number | null }[]) {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export function computeCollectionRatePct(
  invoices: { amount: number | null; amount_paid: number | null }[],
) {
  let billed = 0;
  let paid = 0;
  for (const row of invoices) {
    billed += Number(row.amount) || 0;
    paid += Number(row.amount_paid) || 0;
  }
  if (!billed) return 0;
  return Math.round((paid / billed) * 100);
}

export function sumOfferInfluencedRevenue(
  rows: { influenced_revenue: number | null }[],
) {
  return rows.reduce((sum, row) => sum + (Number(row.influenced_revenue) || 0), 0);
}
