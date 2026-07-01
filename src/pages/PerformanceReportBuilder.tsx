import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { ReportIndex } from "@/components/performance/ReportIndex";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceReportBuilderConfig } from "@/components/performance/PerformanceReportBuilderConfig";
import { PerformanceReportPreviewTable } from "@/components/performance/PerformanceReportPreviewTable";
import { useCommercialProfitabilityData } from "@/hooks/useCommercialProfitabilityData";
import type { ProfitabilityDimension } from "@/incentives/lib/commercialProfitabilityLogic";
import {
  buildReportPreviewRows,
  defaultReportMetrics,
  reportBuilderKpis,
  reportCsv,
  reportPreviewTitle,
  toggleReportMetric,
  type ReportMetricId,
} from "@/incentives/lib/reportBuilderCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";

export default function PerformanceReportBuilder() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel, branchId } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);

  const [dimension, setDimension] = useState<ProfitabilityDimension>("branch");
  const [metrics, setMetrics] = useState<Set<ReportMetricId>>(() => defaultReportMetrics());
  const { rows, loading, reload } = useCommercialProfitabilityData(period, dimension, branchId);

  const previewRows = useMemo(() => buildReportPreviewRows(rows, metrics), [rows, metrics]);
  const kpis = useMemo(() => reportBuilderKpis(rows), [rows]);
  const title = reportPreviewTitle(period, dimension);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  function exportCsv() {
    const csv = reportCsv(title, previewRows, metrics);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commercial-report-${period}-${dimension}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Report builder"
          subtitle={`Compose commercial reports across branch, counselor, service and country · ${period} · ${branchLabel}`}
          showModuleLegend={false}
        />

        <ReportIndex />

        <h2 className="text-lg font-semibold ph-heading pt-2">Custom report builder</h2>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/analytics" className="hover:underline" style={{ color: "var(--blue)" }}>
            Revenue analytics →
          </Link>
          <Link to="/performance/profitability" className="hover:underline" style={{ color: "var(--blue)" }}>
            Profitability →
          </Link>
          <Link to="/performance/compare" className="hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            Comparison engine →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "cash",
              label: "Groups",
              value: String(kpis.groups),
              hint: `Grouped by ${dimension}`,
            },
            {
              module: "wallet",
              label: "Revenue",
              value: formatInr(kpis.revenueInr),
              hint: "Period invoice revenue",
            },
            {
              module: "offers",
              label: "Discount",
              value: formatInr(kpis.discountInr),
              hint: "Offer + wallet",
            },
            {
              module: "cash",
              label: "Net margin",
              value: kpis.marginPct != null ? `${kpis.marginPct}%` : "—",
              hint: formatInr(kpis.netInr),
            },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">
          <PerformanceReportBuilderConfig
            dimension={dimension}
            onDimensionChange={setDimension}
            metrics={metrics}
            onToggleMetric={(id) => setMetrics((prev) => toggleReportMetric(prev, id))}
            onBuild={reload}
            loading={loading}
            period={period}
          />
          <PerformanceReportPreviewTable
            title={title}
            rows={previewRows}
            loading={loading}
            onExportCsv={exportCsv}
          />
        </div>
      </div>
    </AppLayout>
  );
}
