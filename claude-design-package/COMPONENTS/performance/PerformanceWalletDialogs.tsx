import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  WALLET_LIFECYCLE_ACTIONS,
  formatWalletRuleLine,
  walletDetailSummary,
  walletScopeLimits,
} from "@/incentives/lib/walletDetailModalLogic";
import type { WalletListRow } from "@/incentives/lib/walletListLogic";
import { formatInr } from "@/lib/performanceHubTheme";

export function PerformanceWalletDetailDialog({
  row,
  open,
  onOpenChange,
}: {
  row: WalletListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;
  const summary = walletDetailSummary(row);
  const scopeLimits = walletScopeLimits(row);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{row.shortId}</span>
            <span className="text-base font-normal ph-muted">{row.name ?? row.typeLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{row.typeLabel}</Badge>
          <Badge variant="secondary">{row.scopeLabel}</Badge>
          <Badge variant="secondary">{row.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border ph-period-bar p-3">
            <p className="text-xs ph-muted">Allocation</p>
            <p className="font-semibold tabular-nums">{formatInr(row.potential_wallet, row.currency)}</p>
          </div>
          <div className="rounded-lg border ph-period-bar p-3">
            <p className="text-xs ph-muted">Consumed</p>
            <p className="font-semibold tabular-nums">{formatInr(row.spent, row.currency)}</p>
          </div>
          <div className="rounded-lg border ph-period-bar p-3">
            <p className="text-xs ph-muted">Remaining</p>
            <p className="font-semibold tabular-nums">{formatInr(summary.remaining, row.currency)}</p>
          </div>
          <div className="rounded-lg border ph-period-bar p-3">
            <p className="text-xs ph-muted">Utilization</p>
            <p className="font-semibold tabular-nums">{row.utilizationPct}%</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold ph-muted uppercase tracking-wide mb-2">Lifecycle actions</p>
          <div className="flex flex-wrap gap-2">
            {WALLET_LIFECYCLE_ACTIONS.map((action) => (
              <Button key={action.id} asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to={action.to} onClick={() => onOpenChange(false)}>
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
          <p className="font-semibold ph-heading text-sm">Rule limits</p>
          <p className="ph-muted">{formatWalletRuleLine(row)}</p>
          {scopeLimits.length > 0 && (
            <p className="ph-muted">{scopeLimits.join(" · ")}</p>
          )}
          {row.expiryLabel && <p className="ph-muted">Expires {row.expiryLabel}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <Link to={`/performance/give-discount?wallet=${row.id}`}>Apply discount</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PerformanceNewWalletDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New discount wallet</DialogTitle>
        </DialogHeader>
        <p className="text-sm ph-muted">
          Wallet creation uses the existing top-ups desk — type, scope, allocation, expiry and carry-forward rules are
          configured there (no duplicate CRM data).
        </p>
        <ul className="text-xs ph-muted space-y-1 list-disc pl-4">
          <li>Monthly, festival, campaign and scoped wallet types</li>
          <li>Auto / manager / director approval routing</li>
          <li>Per-client caps and rollover policy</li>
        </ul>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button asChild>
            <Link to="/incentives/wallet-topups" onClick={() => onOpenChange(false)}>
              Continue in top-ups desk
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
