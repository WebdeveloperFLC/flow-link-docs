import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { WalletListRow } from "@/incentives/lib/walletListLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

function statusBadge(status: WalletListRow["status"]) {
  if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
  if (status === "scheduled") return <Badge className="ph-badge-offers border-0">Scheduled</Badge>;
  return <Badge className="ph-badge-cash border-0">Active</Badge>;
}

export function PerformanceWalletMobileList({
  rows,
  showCounselor,
}: {
  rows: WalletListRow[];
  showCounselor?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm ph-muted py-6 text-center">No wallets in this view.</p>;
  }

  return (
    <ul className="space-y-3 md:hidden" data-testid="performance-wallet-mobile-list">
      {rows.map((row) => (
        <li key={row.id}>
          <Card className="p-4 ph-surface-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold ph-heading">{row.shortId}</p>
                <p className="text-xs ph-muted truncate">{row.name ?? row.typeLabel}</p>
                {showCounselor && (
                  <p className="text-xs ph-muted mt-1">{row.counselor_name}</p>
                )}
              </div>
              {statusBadge(row.status)}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="ph-muted">{row.typeLabel}</span>
              <span className="font-semibold tabular-nums">{formatInr(row.potential_wallet, row.currency)}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="ph-util-bar flex-1">
                <span
                  className={cn("ph-util-used", row.utilizationPct >= 90 && "bg-destructive")}
                  style={{ width: `${row.utilizationPct}%` }}
                />
              </div>
              <span className="text-xs tabular-nums w-8">{row.utilizationPct}%</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="ph-muted">{row.expiryLabel ?? "No expiry"}</span>
              <Link
                to={`/performance/give-discount?wallet=${row.id}`}
                className="font-medium hover:underline"
                style={{ color: "var(--blue)" }}
              >
                Apply →
              </Link>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
