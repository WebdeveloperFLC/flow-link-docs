import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { UnifiedApprovalItem } from "@/incentives/lib/approvalQueueLogic";
import { formatInr } from "@/lib/performanceHubTheme";

export function PerformanceExecutiveApprovalsPanel({
  items,
  loading,
  totalPending,
}: {
  items: UnifiedApprovalItem[];
  loading?: boolean;
  totalPending: number;
}) {
  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading">Approvals waiting on you</h2>
        {!loading && totalPending > 0 && (
          <Badge variant="destructive">{totalPending} pending</Badge>
        )}
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm ph-muted">No pending approvals for this period.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li key={`${row.kind}-${row.id}`} className="rounded-lg border ph-period-bar p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm ph-heading">{row.itemLabel}</p>
                  <p className="text-xs ph-muted mt-1">
                    {row.requesterName} · {row.ageLabel} ago · {row.risk} risk
                  </p>
                </div>
                <Badge className="ph-badge-wallet border-0 text-[10px]">{row.stageLabel}</Badge>
              </div>
              {row.amount != null && (
                <p className="text-xs tabular-nums mt-2">{formatInr(row.amount, row.currency)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/performance/admin/approvals"
        className="text-sm font-medium mt-4 inline-block hover:underline"
        style={{ color: "var(--blue)" }}
      >
        Open approvals queue →
      </Link>
    </Card>
  );
}
