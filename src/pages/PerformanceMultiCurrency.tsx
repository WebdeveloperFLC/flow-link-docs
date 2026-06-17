import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceCurrencyConfigTable } from "@/components/performance/PerformanceCurrencyConfigTable";
import { PerformanceCurrencyMixPanel } from "@/components/performance/PerformanceCurrencyMixPanel";
import { PerformanceFxHistoryPanel } from "@/components/performance/PerformanceFxHistoryPanel";
import { useMultiCurrencyCmsData } from "@/hooks/useMultiCurrencyCmsData";
import { formatInr } from "@/lib/performanceHubTheme";
import { CURRENCY_MASTER_PATH } from "@/lib/currencyMaster";
import { DollarSign, Plus, Settings } from "lucide-react";

export default function PerformanceMultiCurrency() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchId, branchLabel } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);
  const { rows, mix, history, kpis, loading } = useMultiCurrencyCmsData(period, branchId);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="Multi-currency system"
            subtitle={`Original and converted amounts with historical rates · ${period} · ${branchLabel}`}
            showModuleLegend={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to={CURRENCY_MASTER_PATH}>
                <Settings className="size-4" /> Currency Master
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1">
              <Link to="/incentives/fx-rates">
                <Plus className="size-4" /> Performance override
              </Link>
            </Button>
          </div>
        </div>

        <PerformancePeriodBar />

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/client-commercials" className="hover:underline" style={{ color: "var(--blue)" }}>
            Client commercials →
          </Link>
          <Link to="/performance/profitability" className="hover:underline" style={{ color: "var(--blue)" }}>
            Profitability →
          </Link>
          <Link to={CURRENCY_MASTER_PATH} className="hover:underline" style={{ color: "var(--blue)" }}>
            Currency Master →
          </Link>
          <Link to="/incentives/fx-rates" className="hover:underline" style={{ color: "var(--blue)" }}>
            Performance FX overrides →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "cash",
              label: "Live currencies",
              value: String(kpis.liveCurrencies),
              hint: "INR base + CAD live",
            },
            {
              module: "wallet",
              label: "CAD → INR",
              value: kpis.cadRate != null ? kpis.cadRate.toFixed(2) : "—",
              hint: kpis.cadSource,
            },
            {
              module: "offers",
              label: "Period revenue",
              value: formatInr(kpis.totalRevenueInr),
              hint: "Invoices in INR equiv.",
            },
            {
              module: "cash",
              label: "Base currency",
              value: "INR",
              hint: "Settlement default",
            },
          ]}
        />

        <PerformanceCurrencyConfigTable rows={rows} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceCurrencyMixPanel mix={mix} loading={loading} />
          <PerformanceFxHistoryPanel history={history} loading={loading} />
        </div>

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <DollarSign className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">FX rate management</div>
            <div className="ph-muted text-xs mt-1">
              CRM base rates, buffers, and effective rates are configured in Currency Master. This CMS view consolidates
              general rates, invoice revenue mix, and CAD history for finance oversight. Purpose-specific overrides
              (billing, incentives, payouts) remain in Performance FX overrides.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
