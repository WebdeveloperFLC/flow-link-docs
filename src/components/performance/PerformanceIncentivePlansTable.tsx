import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { IncentivePlanCmsRow } from "@/incentives/lib/incentivePlansCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface PerformanceIncentivePlansTableProps {
  rows: IncentivePlanCmsRow[];
  loading?: boolean;
}

export function PerformanceIncentivePlansTable({ rows, loading }: PerformanceIncentivePlansTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-1">Incentive plans</h2>
      <p className="text-xs ph-muted mb-4">Multiple plans stack per staff member</p>
      {loading ? (
        <p className="text-sm ph-muted">Loading plans…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No incentive plans yet — create one in the full plan editor.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Plan</th>
                <th className="py-3 pr-3">Basis</th>
                <th className="py-3 pr-3">Rule</th>
                <th className="py-3 pr-3">Applies to</th>
                <th className="py-3 pr-3 text-right">Payout YTD</th>
                <th className="py-3 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <div className="font-mono text-xs ph-muted">{r.id.slice(0, 8)}</div>
                    <div className="font-semibold ph-heading">{r.name}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className={cn("border-0", r.basisClass)}>
                      {r.basis}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-xs ph-muted max-w-[180px]">{r.ruleSummary}</td>
                  <td className="py-3 pr-3 text-xs ph-muted">{r.appliesTo}</td>
                  <td className="py-3 pr-3 text-right font-mono font-semibold tabular-nums ph-heading">
                    {formatInr(r.payoutYtd, r.currency)}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border-0",
                        r.isActive ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.status}
                    </Badge>
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
