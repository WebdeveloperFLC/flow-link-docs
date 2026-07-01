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
import { formatInr } from "@/lib/performanceHubTheme";
import { DIRECTOR_READ_ONLY_TOAST } from "@/lib/performanceDirectorReadOnly";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceExecutive() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();
  const isDirectorOnly =
    hasRole("director") && !isAdmin && !hasRole(["manager", "administrator"]);
  const readOnly = isDirectorOnly || (!isAdmin && hasRole(["viewer"]));
  const canView = isAdmin || hasRole(["viewer", "director"]);

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

  const margin = netMarginPct(metrics.netRevenue, metrics.verifiedRevenue);
  const walletUtil = walletUtilizationPct(metrics.walletUnlocked, metrics.walletPotential);
  const pendingTotal = totalPendingApprovals(queues);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  const alerts = [
    !metrics.runLocked && {
      msg: `Run not locked for ${period}${metrics.cashIncentiveDue > 0 ? " — preview exists" : ""}`,
      to: "/incentives/admin",
    },
    metrics.payoutCount === 0 &&
      metrics.runLocked && {
        msg: "Run locked — generate payouts",
        to: "/incentives/payouts",
      },
  ].filter(Boolean) as { msg: string; to: string }[];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <PerformanceHubHeader
          title="Executive command center"
          subtitle={`Firm-wide commercial performance · ${period} · ${branchLabel}`}
          period={period}
          showModuleLegend={false}
        />

        {readOnly && (
          <div className="flex items-center gap-2 text-sm ph-muted">
            <Badge variant="secondary">Read-only</Badge>
            <span>
              {isDirectorOnly
                ? "Director view — operational actions live on the command center (admin/finance)."
                : "Viewer access — operational actions live on the command center (admin/finance)."}
            </span>
          </div>
        )}

        {!readOnly && (
          <Link
            to="/performance/admin"
            className="text-sm hover:underline"
            style={{ color: "var(--blue)" }}
          >
            Open command center →
          </Link>
        )}

        {(isDirectorOnly || !readOnly) && alerts.length > 0 && (
          <Card className="p-4 ph-surface-card border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 text-sm font-medium mb-2 ph-heading">
              <AlertTriangle className="size-4 text-amber-600" /> Exceptions &amp; alerts
            </div>
            <ul className="space-y-2 text-sm">
              {alerts.map((a) => (
                <li key={a.msg} className="flex items-center justify-between gap-2">
                  <span>{a.msg}</span>
                  {isDirectorOnly ? (
                    <button
                      type="button"
                      className="font-medium shrink-0 hover:underline"
                      style={{ color: "var(--blue)" }}
                      onClick={() => toast.info(DIRECTOR_READ_ONLY_TOAST)}
                    >
                      Open in Finance workflow
                    </button>
                  ) : (
                    <Link to={a.to} className="font-medium shrink-0" style={{ color: "var(--blue)" }}>
                      Open →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <PerformanceExecutiveKpiStrip
          loading={metrics.loading || queues.loading}
          items={[
            {
              module: "cash",
              label: "Total revenue (INR base)",
              value: formatInr(metrics.verifiedRevenue),
              hint: `Net ${formatInr(metrics.netRevenue)} after discounts`,
              testId: "kpi-revenue",
            },
            {
              module: "cash",
              label: "Net margin",
              value: margin != null ? `${margin}%` : "—",
              hint: "Net revenue ÷ verified revenue",
            },
            {
              module: "wallet",
              label: "Wallet unlocked",
              value: formatInr(metrics.walletUnlocked),
              hint: `${walletUtil}% utilization · ${formatInr(metrics.walletPotential)} potential`,
              testId: "kpi-wallet-unlocked",
            },
            {
              module: "offers",
              label: "Pending approvals",
              value: String(pendingTotal),
              hint: `${queues.pendingApprovals} discounts · ${queues.walletExceptions} wallet · ${queues.promotionRequests} promos`,
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceExecutiveBranchChart rows={branchRows} loading={teamLoading} />
          <PerformanceExecutiveServiceMix slices={extras.serviceMix} loading={extras.loading} />
        </div>

        <PerformanceExecutiveLeaderboards
          branchRows={branchRows}
          counselorRows={counselorRows}
          loading={teamLoading}
        />

        <PerformanceExecutiveApprovalsPanel
          items={extras.approvalPreview}
          loading={extras.loading || queues.loading}
          totalPending={pendingTotal}
        />
      </div>
    </AppLayout>
  );
}
