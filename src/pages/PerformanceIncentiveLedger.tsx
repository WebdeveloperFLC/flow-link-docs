import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceIncentiveLedgerTable } from "@/components/performance/PerformanceIncentiveLedgerTable";
import { PerformanceIncentivePayoutConfigPanel } from "@/components/performance/PerformanceIncentivePayoutConfigPanel";
import { PerformanceIncentiveLiabilityForecast } from "@/components/performance/PerformanceIncentiveLiabilityForecast";
import { useIncentiveLedgerCmsData } from "@/hooks/useIncentiveLedgerCmsData";
import { formatInr } from "@/lib/performanceHubTheme";
import { Banknote, Coins, Download } from "lucide-react";

export default function PerformanceIncentiveLedger() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { period, branchId, branchLabel } = usePerformancePeriod();
  const { rows, kpis, forecast, payoutConfig, loading } = useIncentiveLedgerCmsData(period, branchId);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="Incentive ledger & payouts"
            subtitle={`Full lifecycle per employee — earned, approved, pending, eligible, paid, reversed and clawback · ${period} · ${branchLabel}`}
            showModuleLegend={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/incentives/payouts">
                <Download className="size-4" /> Export to payroll
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1">
              <Link to="/incentives/payouts">
                <Coins className="size-4" /> Run payout cycle
              </Link>
            </Button>
          </div>
        </div>

        <PerformancePeriodBar />

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/incentives/plans" className="hover:underline" style={{ color: "var(--blue)" }}>
            Incentive plans →
          </Link>
          <Link to="/incentives/admin" className="hover:underline" style={{ color: "var(--blue)" }}>
            Runs & lock →
          </Link>
          <Link to="/incentives/payouts" className="hover:underline" style={{ color: "var(--blue)" }}>
            Payout desk →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "cash",
              label: "Earned",
              value: formatInr(kpis.earned),
              hint: "Line items YTD",
            },
            {
              module: "offers",
              label: "Approved",
              value: formatInr(kpis.approved),
              hint: "Payout rows approved",
            },
            {
              module: "cash",
              label: "Eligible",
              value: formatInr(kpis.eligible),
              hint: "Ready for payroll",
            },
            {
              module: "wallet",
              label: "Paid",
              value: formatInr(kpis.paid),
              hint: "Net settled",
            },
            {
              module: "offers",
              label: "Clawback",
              value: formatInr(kpis.clawback),
              hint: "Refund adjustments",
            },
          ]}
        />

        <PerformanceIncentiveLedgerTable rows={rows} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceIncentivePayoutConfigPanel config={payoutConfig} />
          <PerformanceIncentiveLiabilityForecast forecast={forecast} loading={loading} />
        </div>

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Banknote className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Operational payout desk</div>
            <div className="ph-muted text-xs mt-1">
              Generate payouts from locked runs, approve rows, export CSV, and mark payroll handoff in the full payout
              desk. This CMS view is read-only aggregation for finance oversight.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
