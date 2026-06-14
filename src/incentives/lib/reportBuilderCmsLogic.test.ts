import { describe, expect, it } from "vitest";
import {
  buildReportPreviewRows,
  defaultReportMetrics,
  metricValue,
  reportBuilderKpis,
  reportPreviewTitle,
  toggleReportMetric,
} from "./reportBuilderCmsLogic";
import type { ProfitabilityRow } from "./commercialProfitabilityLogic";

const sampleRow: ProfitabilityRow = {
  dimension: "branch",
  groupKey: "vadodara",
  groupLabel: "Vadodara",
  revenueInr: 90000,
  discountInr: 5400,
  incentiveInr: 3000,
  commissionInr: 2000,
  netInr: 79600,
  netMarginPct: 88.4,
};

describe("reportBuilderCmsLogic", () => {
  it("builds preview rows for selected metrics", () => {
    const metrics = defaultReportMetrics();
    const preview = buildReportPreviewRows([sampleRow], metrics);
    expect(preview).toHaveLength(1);
    expect(preview[0].cells).toHaveLength(3);
    expect(preview[0].cells[0].metric).toBe("revenue");
  });

  it("toggles metrics", () => {
    let metrics = defaultReportMetrics();
    metrics = toggleReportMetric(metrics, "commissions");
    expect(metrics.has("commissions")).toBe(true);
    metrics = toggleReportMetric(metrics, "revenue");
    expect(metrics.has("revenue")).toBe(false);
  });

  it("estimates enrollments from revenue", () => {
    expect(metricValue(sampleRow, "enrollments")).toBe(2);
  });

  it("builds KPI totals and title", () => {
    const kpis = reportBuilderKpis([sampleRow]);
    expect(kpis.groups).toBe(1);
    expect(kpis.revenueInr).toBe(90000);
    expect(reportPreviewTitle("2026-06", "branch")).toContain("2026-06");
  });
});
