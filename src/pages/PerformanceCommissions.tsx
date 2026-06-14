import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceCommissionLedgerTable } from "@/components/performance/PerformanceCommissionLedgerTable";
import { useCommissionTrackingCmsData } from "@/hooks/useCommissionTrackingCmsData";
import { formatCommissionLakh } from "@/incentives/lib/commissionTrackingCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { Download, Receipt } from "lucide-react";

export default function PerformanceCommissions() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);
  const { rows, kpis, loading } = useCommissionTrackingCmsData(period);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="Commission management"
            subtitle={`Institution, partner and referral commissions — received, pending, reversed and forecast · ${period} · ${branchLabel}`}
            showModuleLegend={false}
          />
          <Button asChild size="sm" variant="outline" className="gap-1">
            <Link to="/commissions">
              <Download className="size-4" /> Statement
            </Link>
          </Button>
        </div>

        <PerformancePeriodBar />

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/profitability" className="hover:underline" style={{ color: "var(--blue)" }}>
            Profitability →
          </Link>
          <Link to="/performance/client-commercials" className="hover:underline" style={{ color: "var(--blue)" }}>
            Client commercials →
          </Link>
          <Link to="/commissions" className="hover:underline" style={{ color: "var(--blue)" }}>
            Full commissions module →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "cash",
              label: "Received",
              value: formatCommissionLakh(kpis.receivedInr),
              hint: formatInr(kpis.receivedInr),
            },
            {
              module: "wallet",
              label: "Pending",
              value: formatCommissionLakh(kpis.pendingInr),
              hint: "Eligible, not yet paid",
            },
            {
              module: "offers",
              label: "Reversed",
              value: formatCommissionLakh(kpis.reversedInr),
              hint: "Blocked or rejected",
            },
            {
              module: "cash",
              label: "Forecast",
              value: formatCommissionLakh(kpis.forecastInr),
              hint: "Pipeline pending eligibility",
            },
          ]}
        />

        <PerformanceCommissionLedgerTable rows={rows} loading={loading} />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Receipt className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Institution commission module</div>
            <div className="ph-muted text-xs mt-1">
              Claim cycles, student eligibility, invoice submission and payment recording remain in the full commissions
              workspace. This CMS view consolidates partner-level totals for finance oversight with FX from period rates.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
