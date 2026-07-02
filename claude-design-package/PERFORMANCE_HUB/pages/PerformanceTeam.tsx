import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceExecutiveBranchChart } from "@/components/performance/PerformanceExecutiveBranchChart";
import { PerformanceExecutiveApprovalsPanel } from "@/components/performance/PerformanceExecutiveApprovalsPanel";
import {
  PerformanceBranchQuickActions,
  PerformanceBranchTeamTable,
} from "@/components/performance/PerformanceBranchTeamTable";
import { usePerformanceTeamRows } from "@/hooks/usePerformanceTeamRows";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformanceQueueCounts } from "@/hooks/usePerformanceQueueCounts";
import { useExecutiveDashboardExtras } from "@/hooks/useExecutiveDashboardExtras";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import {
  counselorAttainmentRows,
  teamAverageAchievement,
  teamWalletUtilization,
} from "@/incentives/lib/branchDashboardLogic";
import { totalPendingApprovals } from "@/incentives/lib/executiveDashboardLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { supabase } from "@/integrations/supabase/client";

export default function PerformanceTeam() {
  const { user, isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period } = usePerformancePeriod();
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) return;
    supabase
      .from("profiles")
      .select("branch_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setBranchId((data as { branch_id?: string } | null)?.branch_id ?? null));
  }, [user?.id, isAdmin]);

  const isManager = hasRole("manager");
  const allowed = isAdmin || isManager;

  const { rows, loading, effectiveBranch } = usePerformanceTeamRows(
    period,
    isAdmin ? "All branches" : null,
    isManager && !isAdmin ? branchId : null,
  );

  const queues = usePerformanceQueueCounts(period);
  const extras = useExecutiveDashboardExtras(period);

  const teamRevenue = rows.reduce((s, r) => s + r.netRevenue, 0);
  const teamCash = rows.reduce((s, r) => s + (r.cashLocked ?? r.cashProjected), 0);
  const avgAch = teamAverageAchievement(rows);
  const walletUtil = teamWalletUtilization(rows);
  const pendingTotal = totalPendingApprovals(queues);
  const counselorChartRows = useMemo(() => counselorAttainmentRows(rows), [rows]);

  if (authLoading) return null;
  if (!allowed) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <PerformanceHubHeader
          title="Branch manager workspace"
          subtitle={
            effectiveBranch
              ? `${effectiveBranch} · ${period} · ${rows.length} counselor(s)`
              : `All branches · ${period}`
          }
          period={period}
          showModuleLegend={false}
        />

        <PerformancePeriodBar compact />

        {isAdmin && (
          <Link
            to="/performance/executive"
            className="text-sm hover:underline"
            style={{ color: "var(--blue)" }}
          >
            Executive dashboard →
          </Link>
        )}

        <PerformanceExecutiveKpiStrip
          loading={loading || queues.loading}
          items={[
            {
              module: "cash",
              label: "Team net revenue",
              value: formatInr(teamRevenue),
              hint: `${rows.length} team member(s)`,
            },
            {
              module: "cash",
              label: "Avg achievement",
              value: avgAch != null ? `${avgAch}%` : "—",
              hint: "Target attainment across team",
            },
            {
              module: "wallet",
              label: "Wallet utilization",
              value: `${walletUtil}%`,
              hint: "Team wallet spent vs capacity",
            },
            {
              module: "offers",
              label: "Pending approvals",
              value: String(pendingTotal),
              hint: "Discounts · wallet · promotions",
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceExecutiveBranchChart
            rows={counselorChartRows}
            loading={loading}
            title="Counselor attainment"
          />
          <PerformanceBranchQuickActions />
        </div>

        <PerformanceBranchTeamTable rows={rows} loading={loading} />

        <PerformanceExecutiveApprovalsPanel
          items={extras.approvalPreview}
          loading={extras.loading || queues.loading}
          totalPending={pendingTotal}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border ph-period-bar p-4">
            <p className="text-xs ph-muted uppercase tracking-wide">Team cash total</p>
            <p className="text-xl font-semibold tabular-nums ph-heading mt-1">
              {loading ? "…" : formatInr(teamCash)}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
