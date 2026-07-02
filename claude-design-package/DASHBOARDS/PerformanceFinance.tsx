import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceExecutiveBranchChart } from "@/components/performance/PerformanceExecutiveBranchChart";
import { PerformanceExecutiveServiceMix } from "@/components/performance/PerformanceExecutiveServiceMix";
import { PerformanceExecutiveLeaderboards } from "@/components/performance/PerformanceExecutiveLeaderboards";
import { PerformanceExecutiveApprovalsPanel } from "@/components/performance/PerformanceExecutiveApprovalsPanel";
import { PerformanceFinanceQuickActions } from "@/components/performance/PerformanceFinanceQuickActions";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformancePeriodMetrics } from "@/hooks/usePerformancePeriodMetrics";
import { usePerformanceTeamRows } from "@/hooks/usePerformanceTeamRows";
import { usePerformanceQueueCounts } from "@/hooks/usePerformanceQueueCounts";
import { useExecutiveDashboardExtras } from "@/hooks/useExecutiveDashboardExtras";
import {
  netMarginPct,
  totalPendingApprovals,
  walletUtilizationPct,
} from "@/incentives/lib/executiveDashboardLogic";
import { effectiveDiscountPct, payoutWorkflowHint } from "@/incentives/lib/financeDashboardLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { AlertTriangle } from "lucide-react";

export default function PerformanceFinance() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();

  const metrics = usePerformancePeriodMetrics(period, branchLabel);
  const queues = usePerformanceQueueCounts(period);
  const { rows: teamRows, loading: teamLoading } = usePerformanceTeamRows(period, branchLabel);
  const extras = useExecutiveDashboardExtras(period);

  const branchRows = useMemo(() => {
    const map = new Map<string, { revenue: number; achSum: number; achCount: number }>();
    for (const r of teamRows) {
      const key = r.branchName ?? "Unassigned";
      const cur = map.get(key) ?? { revenue: 0, achSum: 0, achCount: 0 };
      cur.revenue += r.netRevenue;
      if (r.targetPct != null) {
        cur.achSum += r.targetPct;
        cur.achCount += 1;
      }
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        revenue: v.revenue,
        achievementPct: v.achCount ? Math.round(v.achSum / v.achCount) : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [teamRows]);

  const counselorRows = useMemo(
    () =>
      [...teamRows]
        .sort((a, b) => b.netRevenue - a.netRevenue)
        .map((r) => ({
          name: r.name,
          branchName: r.branchName,
          netRevenue: r.netRevenue,
          targetPct: r.targetPct,
        })),
    [teamRows],
  );

  const effDiscount = effectiveDiscountPct(metrics.discountTotal, metrics.verifiedRevenue);
  const margin = netMarginPct(metrics.netRevenue, metrics.verifiedRevenue);
  const walletUtil = walletUtilizationPct(metrics.walletUnlocked, metrics.walletPotential);
  const pendingTotal = totalPendingApprovals(queues);
  const payoutHint = payoutWorkflowHint(metrics.runLocked, metrics.payoutCount);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/performance" replace />;

  const alerts = [
    !metrics.runLocked && {
      msg: `Incentive run not locked for ${period}`,
      to: "/incentives/admin",
    },
    metrics.runLocked &&
      metrics.payoutCount === 0 && {
        msg: "Run locked — open payout desk to generate rows",
        to: "/incentives/payouts",
      },
    queues.pendingApprovals > 0 && {
      msg: `${queues.pendingApprovals} discount approval(s) awaiting finance review`,
      to: "/performance/admin/approvals",
    },
  ].filter(Boolean) as { msg: string; to: string }[];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <PerformanceHubHeader
          title="Finance & revenue control"
          subtitle={`Commercial position consolidated to INR · ${period} · ${branchLabel}`}
          period={period}
          showModuleLegend={false}
        />

        <PerformancePeriodBar />

        <Link
          to="/performance/executive"
          className="text-sm hover:underline"
          style={{ color: "var(--blue)" }}
        >
          Executive dashboard →
        </Link>

        <PerformanceExecutiveKpiStrip
          loading={metrics.loading || queues.loading}
          items={[
            {
              module: "cash",
              label: "Net revenue",
              value: formatInr(metrics.netRevenue),
              hint: `Verified ${formatInr(metrics.verifiedRevenue)} · margin ${margin != null ? `${margin}%` : "—"}`,
              testId: "kpi-net-revenue",
            },
            {
              module: "wallet",
              label: "Discount given",
              value: formatInr(metrics.discountTotal),
              hint: `${metrics.offersRedeemed} offer redemption(s) · wallet util ${walletUtil}%`,
              testId: "kpi-discount-given",
            },
            {
              module: "wallet",
              label: "Effective discount",
              value: effDiscount != null ? `${effDiscount}%` : "—",
              hint: "Discount ÷ verified revenue",
            },
            {
              module: "cash",
              label: "Cash incentive due",
              value: formatInr(metrics.cashIncentiveDue),
              hint: payoutHint.label,
              testId: "kpi-cash-incentive",
            },
          ]}
        />

        {alerts.length > 0 && (
          <Card className="p-4 ph-surface-card border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 text-sm font-medium mb-2 ph-heading">
              <AlertTriangle className="size-4 text-amber-600" /> Finance alerts
            </div>
            <ul className="space-y-2 text-sm">
              {alerts.map((a) => (
                <li key={a.msg} className="flex items-center justify-between gap-2">
                  <span>{a.msg}</span>
                  <Link to={a.to} className="font-medium shrink-0" style={{ color: "var(--blue)" }}>
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceExecutiveBranchChart rows={branchRows} loading={teamLoading} />
          <PerformanceExecutiveServiceMix slices={extras.serviceMix} loading={extras.loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PerformanceExecutiveLeaderboards
              branchRows={branchRows}
              counselorRows={counselorRows}
              loading={teamLoading}
            />
          </div>
          <PerformanceFinanceQuickActions />
        </div>

        <PerformanceExecutiveApprovalsPanel
          items={extras.approvalPreview}
          loading={extras.loading || queues.loading}
          totalPending={pendingTotal}
        />

        <div className="flex flex-wrap items-center gap-2 text-sm ph-muted">
          <Badge variant="secondary">Finance workspace</Badge>
          <span>Period lock, FX, and payout export live under Incentives admin routes.</span>
        </div>
      </div>
    </AppLayout>
  );
}
