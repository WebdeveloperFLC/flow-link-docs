import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TeamPerformanceRow } from "@/hooks/usePerformanceTeamRows";
import { formatInr } from "@/lib/performanceHubTheme";
import { ClipboardCheck, Gift, Users, Wallet } from "lucide-react";

export function PerformanceBranchTeamTable({
  rows,
  loading,
}: {
  rows: TeamPerformanceRow[];
  loading?: boolean;
}) {
  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading flex items-center gap-2">
          <Users className="size-5" />
          Counselor ranking
        </h2>
        <Link
          to="/performance/admin/approvals"
          className="text-sm hover:underline"
          style={{ color: "var(--blue)" }}
        >
          Discount approvals →
        </Link>
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading team…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No team data for this branch and period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">#</th>
                <th className="py-3 pr-3">Counselor</th>
                <th className="py-3 pr-3 text-right">Target %</th>
                <th className="py-3 pr-3 text-right">Net revenue</th>
                <th className="py-3 pr-3 text-right">Wallet spendable</th>
                <th className="py-3 pr-3 text-right">Wallet spent</th>
                <th className="py-3 pr-3 text-right">Cash</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.counselorId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 pr-3 ph-muted">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <p className="font-medium ph-heading">{r.name}</p>
                    <p className="text-xs ph-muted capitalize">{r.roleLabel.replace(/_/g, " ")}</p>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {r.targetPct != null ? `${Math.round(r.targetPct)}%` : "—"}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums font-medium">
                    {formatInr(r.netRevenue)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatInr(r.walletSpendable)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatInr(r.walletSpent)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {formatInr(r.cashLocked ?? r.cashProjected)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function PerformanceBranchQuickActions() {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Branch actions</h2>
      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" className="justify-start">
          <Link to="/performance/admin/approvals">
            <ClipboardCheck className="size-4 mr-2" />
            Review discount approvals
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/performance/wallet/branch-pool">
            <Wallet className="size-4 mr-2" />
            Branch wallet pool
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/performance/give-discount">
            <Gift className="size-4 mr-2" />
            Give discount
          </Link>
        </Button>
      </div>
    </Card>
  );
}
