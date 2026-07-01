import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceIncentivePlansTable } from "@/components/performance/PerformanceIncentivePlansTable";
import { PerformanceIncentiveStructurePanel } from "@/components/performance/PerformanceIncentiveStructurePanel";
import { PerformanceIncentiveBaseRulesPanel } from "@/components/performance/PerformanceIncentiveBaseRulesPanel";
import { PerformanceSetupWizard } from "@/components/performance/PerformanceSetupWizard";
import { useIncentivePlansCmsData } from "@/hooks/useIncentivePlansCmsData";
import { formatInr } from "@/lib/performanceHubTheme";
import { Layers, Plus, Sparkles } from "lucide-react";

export default function PerformanceIncentivePlans() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { rows, kpis, loading } = useIncentivePlansCmsData();
  const [wizardOpen, setWizardOpen] = useState(false);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="Incentive management"
            subtitle="Revenue, enrollment, margin, service, team, referral and hybrid structures running simultaneously"
            showModuleLegend={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setWizardOpen(true)}>
              <Sparkles className="size-4" /> Setup wizard
            </Button>
            <Button asChild size="sm" className="gap-1">
              <Link to="/incentives/plans">
                <Plus className="size-4" /> New plan
              </Link>
            </Button>
          </div>
        </div>

        <PerformanceSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} />

        <PerformancePeriodBar />

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/incentives/plans" className="hover:underline" style={{ color: "var(--blue)" }}>
            Full plan editor →
          </Link>
          <Link to="/incentives/admin" className="hover:underline" style={{ color: "var(--blue)" }}>
            Runs & lock →
          </Link>
          <Link to="/performance/incentives/payouts" className="hover:underline" style={{ color: "var(--blue)" }}>
            Ledger & payouts →
          </Link>
          <Link to="/incentives/payouts" className="hover:underline" style={{ color: "var(--blue)" }}>
            Payout desk →
          </Link>
          <Link to="/performance/combinations" className="hover:underline" style={{ color: "var(--blue)" }}>
            Combination engine →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "cash",
              label: "Total payout (YTD)",
              value: formatInr(kpis.totalPayoutYtd),
              hint: "From locked incentive runs",
            },
            {
              module: "offers",
              label: "Active plans",
              value: String(kpis.activePlans),
              hint: "Stackable per staff",
            },
            {
              module: "wallet",
              label: "Staff earning",
              value: String(kpis.staffEarning),
              hint: "Assigned to active plans",
            },
            {
              module: "cash",
              label: "Avg per head",
              value: kpis.avgPerHead > 0 ? formatInr(kpis.avgPerHead) : "—",
              hint: "YTD payout ÷ staff",
            },
          ]}
        />

        <PerformanceIncentivePlansTable rows={rows} loading={loading} />
        <PerformanceIncentiveStructurePanel />
        <PerformanceIncentiveBaseRulesPanel />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Layers className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Plan stacking</div>
            <div className="ph-muted text-xs mt-1">
              Base, overlay and bonus plans stack per counselor via incentive_counselor_plan_assignments. Use the full
              plan editor for slabs, targets, attribution splits and scheme templates.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
