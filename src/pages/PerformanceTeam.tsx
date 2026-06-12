import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { usePerformanceTeamRows } from "@/hooks/usePerformanceTeamRows";
import { currentPeriodKey, formatInr } from "@/lib/performanceHubTheme";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Users } from "lucide-react";

export default function PerformanceTeam() {
  const { user, isAdmin, hasRole, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState(currentPeriodKey());
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("branch_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setBranchId((data as { branch_id?: string } | null)?.branch_id ?? null));
  }, [user?.id]);

  const isManager = hasRole("manager");
  const allowed = isAdmin || isManager;

  const { rows, loading, effectiveBranch } = usePerformanceTeamRows(
    period,
    isAdmin ? "All branches" : null,
    isManager && !isAdmin ? branchId : null,
  );

  const teamRevenue = rows.reduce((s, r) => s + r.netRevenue, 0);
  const teamCash = rows.reduce((s, r) => s + (r.cashLocked ?? r.cashProjected), 0);
  const avgAch =
    rows.filter((r) => r.targetPct != null).length > 0
      ? Math.round(
          rows.filter((r) => r.targetPct != null).reduce((s, r) => s + (r.targetPct ?? 0), 0) /
            rows.filter((r) => r.targetPct != null).length,
        )
      : null;

  if (authLoading) return null;
  if (!allowed) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Team · branch"
          subtitle={
            effectiveBranch
              ? `${effectiveBranch} · ${period} · ${rows.length} member(s)`
              : `All branches · ${period}`
          }
          period={period}
          showModuleLegend={false}
        />

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Period</label>
            <Input className="w-32 mt-1" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          {isAdmin && (
            <Link to="/performance/executive" className="text-sm text-primary hover:underline ml-auto pb-2">
              Executive dashboard →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <p className="text-xs uppercase text-muted-foreground">Team net revenue</p>
            <p className="text-2xl font-semibold mt-1">{loading ? "…" : formatInr(teamRevenue)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-xs uppercase text-muted-foreground">Avg achievement</p>
            <p className="text-2xl font-semibold mt-1">{loading || avgAch == null ? "…" : `${avgAch}%`}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <p className="text-xs uppercase text-muted-foreground">Cash (team total)</p>
            <p className="text-2xl font-semibold mt-1">{loading ? "…" : formatInr(teamCash)}</p>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="size-5" /> Team members
            </h2>
            <Link to="/incentives/give-discount" className="text-sm text-primary hover:underline">
              Approvals → Give discount queue (5C)
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team data for this branch and period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3 text-right">Target %</th>
                    <th className="py-2 pr-3 text-right">Net revenue</th>
                    <th className="py-2 pr-3 text-right">Spendable</th>
                    <th className="py-2 pr-3 text-right">Spent</th>
                    <th className="py-2 pr-3 text-right">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.counselorId} className="border-b last:border-0">
                      <td className="py-2 pr-3">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3 text-right">
                        {r.targetPct != null ? `${Math.round(r.targetPct)}%` : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatInr(r.netRevenue)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatInr(r.walletSpendable)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatInr(r.walletSpent)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatInr(r.cashLocked ?? r.cashProjected)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
