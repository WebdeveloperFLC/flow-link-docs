import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceKpiGrid, PerformanceMoneyRail } from "@/components/performance/PerformanceMoneyRail";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformancePeriodMetrics } from "@/hooks/usePerformancePeriodMetrics";
import { usePerformanceTeamRows } from "@/hooks/usePerformanceTeamRows";
import { formatInr } from "@/lib/performanceHubTheme";
import { AlertTriangle } from "lucide-react";

export default function PerformanceExecutive() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();
  const readOnly = !isAdmin && hasRole(["viewer"]);
  const canView = isAdmin || hasRole(["viewer"]);

  const metrics = usePerformancePeriodMetrics(period, branchLabel);
  const { rows: teamRows, loading: teamLoading } = usePerformanceTeamRows(period, branchLabel);

  const branchRows = useMemo(() => {
    const map = new Map<
      string,
      { revenue: number; walletSpent: number; headcount: number; achSum: number; achCount: number }
    >();
    for (const r of teamRows) {
      const key = r.branchName ?? "Unassigned";
      const cur = map.get(key) ?? { revenue: 0, walletSpent: 0, headcount: 0, achSum: 0, achCount: 0 };
      cur.revenue += r.netRevenue;
      cur.walletSpent += r.walletSpent;
      cur.headcount += 1;
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
        walletSpent: v.walletSpent,
        achievementPct: v.achCount ? Math.round(v.achSum / v.achCount) : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [teamRows]);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  const alerts = [
    !readOnly &&
      !metrics.runLocked && {
        msg: `Run not locked for ${period}${metrics.cashIncentiveDue > 0 ? " — preview exists" : ""}`,
        to: "/incentives/admin",
      },
    !readOnly &&
      metrics.payoutCount === 0 &&
      metrics.runLocked && {
        msg: "Run locked — generate payouts",
        to: "/incentives/payouts",
      },
  ].filter(Boolean) as { msg: string; to: string }[];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Executive dashboard"
          subtitle={`Firm-wide performance · ${period} · ${branchLabel}`}
          period={period}
          showModuleLegend={false}
        />

        {readOnly && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Read-only</Badge>
            <span>Director view — operational actions live on the command center (admin/finance).</span>
          </div>
        )}

        <PerformancePeriodBar />

        {!readOnly && (
          <Link to="/performance/admin" className="text-sm text-primary hover:underline">
            Open command center →
          </Link>
        )}

        <PerformanceKpiGrid
          loading={metrics.loading}
          items={[
            {
              label: "Verified revenue",
              value: formatInr(metrics.verifiedRevenue),
              module: "cash",
              hint: "Qualifying achievement",
            },
            {
              label: "Net after discounts",
              value: formatInr(metrics.netRevenue),
              module: "cash",
            },
            {
              label: "Cash incentive due",
              value: metrics.runLocked
                ? formatInr(metrics.cashIncentiveDue)
                : metrics.cashIncentiveDue > 0
                  ? `${formatInr(metrics.cashIncentiveDue)} (preview)`
                  : "—",
              module: "cash",
            },
            {
              label: "Wallet unlocked",
              value: formatInr(metrics.walletUnlocked),
              module: "wallet",
              hint: `${formatInr(metrics.walletPotential)} potential`,
            },
            {
              label: "Offers redeemed",
              value: String(metrics.offersRedeemed),
              module: "offers",
            },
            {
              label: "Payouts",
              value: metrics.payoutCount > 0 ? String(metrics.payoutCount) : metrics.runLocked ? "0 pending" : "—",
              module: "cash",
            },
          ]}
        />

        {alerts.length > 0 && (
          <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <AlertTriangle className="size-4 text-amber-600" /> Alerts
            </div>
            <ul className="space-y-2 text-sm">
              {alerts.map((a) => (
                <li key={a.msg} className="flex items-center justify-between gap-2">
                  <span>{a.msg}</span>
                  <Link to={a.to} className="text-primary font-medium shrink-0">
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Branch comparison</h2>
          {teamLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : branchRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branch data this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Branch</th>
                    <th className="py-2 pr-4 text-right">Avg achievement</th>
                    <th className="py-2 pr-4 text-right">Net revenue</th>
                    <th className="py-2 pr-4 text-right">Wallet spent</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRows.map((b) => (
                    <tr key={b.name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{b.name}</td>
                      <td className="py-2 pr-4 text-right">
                        {b.achievementPct != null ? `${b.achievementPct}%` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatInr(b.revenue)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatInr(b.walletSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">All-team performance</h2>
          {teamLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : teamRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members with targets or wallets this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Branch</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3 text-right">Target %</th>
                    <th className="py-2 pr-3 text-right">Net revenue</th>
                    <th className="py-2 pr-3 text-right">Wallet spendable</th>
                    <th className="py-2 pr-3 text-right">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((r, i) => (
                    <tr key={r.counselorId} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3">{r.branchName ?? "—"}</td>
                      <td className="py-2 pr-3 capitalize">{r.roleLabel.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-3 text-right">
                        {r.targetPct != null ? `${Math.round(r.targetPct)}%` : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatInr(r.netRevenue)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatInr(r.walletSpendable)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.cashLocked != null ? formatInr(r.cashLocked) : formatInr(r.cashProjected)}
                        {r.cashLocked == null && (
                          <span className="text-[10px] text-muted-foreground block">projected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {readOnly && (
            <p className="text-xs text-muted-foreground mt-3">
              Finance closes periods and locks runs from the command center — this view is read-only.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-3">Money flow</h2>
          <PerformanceMoneyRail
            loading={metrics.loading}
            steps={[
              { label: "Verified revenue", value: metrics.verifiedRevenue, module: "cash" },
              { label: "− Discounts", value: metrics.discountTotal, module: "offers" },
              { label: "= Net revenue", value: metrics.netRevenue, module: "cash" },
              { label: "Cash due", value: metrics.cashIncentiveDue, module: "cash" },
            ]}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
