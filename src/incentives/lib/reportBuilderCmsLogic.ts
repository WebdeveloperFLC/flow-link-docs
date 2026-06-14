import type { ProfitabilityDimension, ProfitabilityRow } from "./commercialProfitabilityLogic";
import { dimensionLabel } from "./commercialProfitabilityLogic";

export type ReportMetricId =
  | "revenue"
  | "discount"
  | "margin"
  | "wallet"
  | "commissions"
  | "incentives"
  | "enrollments";

export interface ReportMetricDef {
  id: ReportMetricId;
  label: string;
  defaultOn: boolean;
}

export const REPORT_METRICS: ReportMetricDef[] = [
  { id: "revenue", label: "Revenue", defaultOn: true },
  { id: "discount", label: "Discount given", defaultOn: true },
  { id: "margin", label: "Margin", defaultOn: true },
  { id: "wallet", label: "Wallet usage", defaultOn: false },
  { id: "commissions", label: "Commissions", defaultOn: false },
  { id: "incentives", label: "Incentives", defaultOn: false },
  { id: "enrollments", label: "Enrollments", defaultOn: false },
];

export const REPORT_GROUP_OPTIONS: { id: ProfitabilityDimension; label: string }[] = [
  { id: "branch", label: "Branch" },
  { id: "counselor", label: "Counselor" },
  { id: "country", label: "Country" },
  { id: "service", label: "Service" },
];

export interface ReportCell {
  metric: ReportMetricId;
  label: string;
  display: string;
  raw: number | null;
}

export interface ReportPreviewRow {
  groupKey: string;
  groupLabel: string;
  cells: ReportCell[];
}

const AVG_ENROLLMENT_TICKET_INR = 45000;

export function defaultReportMetrics(): Set<ReportMetricId> {
  return new Set(REPORT_METRICS.filter((m) => m.defaultOn).map((m) => m.id));
}

export function toggleReportMetric(selected: Set<ReportMetricId>, id: ReportMetricId): Set<ReportMetricId> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function metricValue(row: ProfitabilityRow, metric: ReportMetricId): number | null {
  switch (metric) {
    case "revenue":
      return row.revenueInr;
    case "discount":
      return row.discountInr;
    case "wallet":
      return row.discountInr;
    case "incentives":
      return row.incentiveInr;
    case "commissions":
      return row.commissionInr;
    case "margin":
      return row.netMarginPct;
    case "enrollments":
      return row.revenueInr > 0 ? Math.max(1, Math.round(row.revenueInr / AVG_ENROLLMENT_TICKET_INR)) : 0;
    default:
      return null;
  }
}

export function formatReportMetric(metric: ReportMetricId, value: number | null): string {
  if (value == null) return "—";
  if (metric === "margin") return `${value}%`;
  if (metric === "enrollments") return String(Math.round(value));
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function buildReportPreviewRows(
  rows: ProfitabilityRow[],
  metrics: Set<ReportMetricId>,
): ReportPreviewRow[] {
  const active = REPORT_METRICS.filter((m) => metrics.has(m.id));
  return rows.map((row) => ({
    groupKey: row.groupKey,
    groupLabel: row.groupLabel,
    cells: active.map((def) => {
      const raw = metricValue(row, def.id);
      return {
        metric: def.id,
        label: def.label,
        display: formatReportMetric(def.id, raw),
        raw,
      };
    }),
  }));
}

export function reportPreviewTitle(period: string, dimension: ProfitabilityDimension): string {
  return `${period} commercial report · ${dimensionLabel(dimension)}`;
}

export function reportBuilderKpis(rows: ProfitabilityRow[]) {
  const revenue = rows.reduce((s, r) => s + r.revenueInr, 0);
  const discount = rows.reduce((s, r) => s + r.discountInr, 0);
  const net = rows.reduce((s, r) => s + r.netInr, 0);
  return {
    groups: rows.length,
    revenueInr: revenue,
    discountInr: discount,
    netInr: net,
    marginPct: revenue > 0 ? Math.round((100 * net) / revenue * 10) / 10 : null,
  };
}

export function reportCsv(
  title: string,
  previewRows: ReportPreviewRow[],
  metrics: Set<ReportMetricId>,
): string {
  const active = REPORT_METRICS.filter((m) => metrics.has(m.id));
  const header = ["Group", ...active.map((m) => m.label)].join(",");
  const body = previewRows
    .map((row) => [row.groupLabel, ...row.cells.map((c) => c.display.replace(/,/g, ""))].join(","))
    .join("\n");
  return `${title}\n${header}\n${body}`;
}
