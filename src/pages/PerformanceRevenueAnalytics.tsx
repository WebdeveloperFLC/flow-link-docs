import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceExecutiveServiceMix } from "@/components/performance/PerformanceExecutiveServiceMix";
import { PerformanceRevenueTrendChart } from "@/components/performance/PerformanceRevenueTrendChart";
import { PerformanceRevenueServiceTable } from "@/components/performance/PerformanceRevenueServiceTable";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { useRevenueAnalyticsData } from "@/hooks/useRevenueAnalyticsData";
import { effectiveDiscountPct } from "@/incentives/lib/financeDashboardLogic";
import { netMarginPct } from "@/incentives/lib/executiveDashboardLogic";
import { formatInr } from "@/lib/performanceHubTheme";

export default function PerformanceRevenueAnalytics() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);

  const { metrics, trend, serviceRows, countryMix, loading } = useRevenueAnalyticsData(period, branchLabel);

  const effDiscount = effectiveDiscountPct(metrics.discountTotal, metrics.verifiedRevenue);
  const margin = netMarginPct(metrics.netRevenue, metrics.verifiedRevenue);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Revenue analytics"
          subtitle={`Profitability and performance trends · ${period} · ${branchLabel}`}
          showModuleLegend={false}
        />

        <PerformancePeriodBar />

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/executive" className="hover:underline" style={{ color: "var(--blue)" }}>
            Executive dashboard →
          </Link>
          <Link to="/performance/finance" className="hover:underline" style={{ color: "var(--blue)" }}>
            Finance control →
          </Link>
          <Link to="/performance/offers/analytics" className="hover:underline" style={{ color: "var(--blue)" }}>
            Offer analytics →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "cash",
              label: "Net revenue",
              value: formatInr(metrics.netRevenue),
              hint: `Verified ${formatInr(metrics.verifiedRevenue)}`,
              testId: "kpi-net-revenue",
            },
            {
              module: "wallet",
              label: "Discount given",
              value: formatInr(metrics.discountTotal),
              hint: `${metrics.offersRedeemed} offer redemptions`,
            },
            {
              module: "wallet",
              label: "Effective discount",
              value: effDiscount != null ? `${effDiscount}%` : "—",
              hint: "Discount ÷ verified revenue",
            },
            {
              module: "cash",
              label: "Net margin",
              value: margin != null ? `${margin}%` : "—",
              hint: "Net revenue ÷ verified revenue",
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PerformanceRevenueTrendChart points={trend} loading={loading} />
          </div>
          <PerformanceRevenueServiceTable
            rows={serviceRows}
            loading={loading}
            netRevenue={metrics.netRevenue}
            verifiedRevenue={metrics.verifiedRevenue}
          />
        </div>

        <PerformanceExecutiveServiceMix slices={countryMix} loading={loading} title="Country revenue mix" />
      </div>
    </AppLayout>
  );
}
