import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceProfitabilityMatrix } from "@/components/performance/PerformanceProfitabilityMatrix";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { useCommercialProfitabilityData } from "@/hooks/useCommercialProfitabilityData";
import {
  PROFITABILITY_DIMENSIONS,
  type ProfitabilityDimension,
} from "@/incentives/lib/commercialProfitabilityLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";
import { Coins } from "lucide-react";

export default function PerformanceProfitability() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel, branchId } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);

  const [dimension, setDimension] = useState<ProfitabilityDimension>("counselor");
  const { rows, totals, loading } = useCommercialProfitabilityData(period, dimension, branchId);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  const costTotal = totals.discountInr + totals.incentiveInr + totals.commissionInr;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Profitability controls"
          subtitle={`Revenue, discount, wallet, incentive and commission impact · ${period} · ${branchLabel}`}
          showModuleLegend={false}
        />

        <PerformancePeriodBar />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Coins className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Configurable commercial base</div>
            <div className="ph-muted text-xs mt-1">
              Net margin = revenue − offer/wallet discounts − incentive cost − commission cost, consolidated to INR via
              fx_rates. Service and country rows allocate period costs proportionally to verified revenue mix.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/analytics" className="hover:underline" style={{ color: "var(--blue)" }}>
            Revenue analytics →
          </Link>
          <Link to="/performance/finance" className="hover:underline" style={{ color: "var(--blue)" }}>
            Finance control →
          </Link>
          <Link to="/performance/client-commercials" className="hover:underline" style={{ color: "var(--blue)" }}>
            Client commercials →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "cash",
              label: "Gross revenue",
              value: formatInr(totals.revenueInr),
              hint: "Invoice revenue in period",
            },
            {
              module: "wallet",
              label: "Discount + wallet",
              value: formatInr(totals.discountInr),
              hint: "Offer + wallet allocations",
            },
            {
              module: "offers",
              label: "Incentives + commissions",
              value: formatInr(totals.incentiveInr + totals.commissionInr),
              hint: "Earned from incentive runs",
            },
            {
              module: "cash",
              label: "Net profit",
              value: formatInr(totals.netInr),
              hint: totals.netMarginPct != null ? `${totals.netMarginPct}% margin` : `Costs ${formatInr(costTotal)}`,
            },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          {PROFITABILITY_DIMENSIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDimension(d.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                dimension === d.id
                  ? "bg-[var(--blue)] text-white border-transparent"
                  : "ph-muted border-border hover:bg-muted/50",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <PerformanceProfitabilityMatrix rows={rows} dimension={dimension} loading={loading} />
      </div>
    </AppLayout>
  );
}
