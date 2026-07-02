import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { payoutRunPreview } from "@/incentives/lib/payoutRunModalLogic";
import type { PayoutCycleConfigSummary } from "@/incentives/lib/incentiveLedgerCmsLogic";

export function PerformanceRunPayoutDialog({
  open,
  onOpenChange,
  period,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: string;
  config: PayoutCycleConfigSummary;
}) {
  const preview = payoutRunPreview(config);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Run payout cycle</DialogTitle>
        </DialogHeader>
        <p className="text-sm ph-muted">
          Preview for {period} — execution uses the payout desk and writes to payroll export + audit trail.
        </p>
        <div className="rounded-lg border ph-period-bar p-3 text-sm space-y-2">
          <div className="flex justify-between gap-2">
            <span className="ph-muted">Frequency</span>
            <span className="font-medium ph-heading">{preview.periodTypes}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="ph-muted">Min threshold</span>
            <span className="font-medium ph-heading">{preview.minThresholdLabel}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="ph-muted">Below threshold</span>
            <span className="font-medium ph-heading">{preview.carryLabel}</span>
          </div>
          {preview.planCount > 0 && (
            <div className="flex justify-between gap-2">
              <span className="ph-muted">Active plans</span>
              <span className="font-medium ph-heading">{preview.planCount}</span>
            </div>
          )}
        </div>
        {config.thresholdNote && (
          <p className="text-xs ph-muted">{config.thresholdNote}</p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button asChild>
            <Link to="/incentives/payouts" onClick={() => onOpenChange(false)}>
              Open payout desk
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
