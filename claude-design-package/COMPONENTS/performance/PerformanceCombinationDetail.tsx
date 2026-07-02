import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ServiceCombinationRow } from "@/incentives/lib/combinationEngineLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

interface PerformanceCombinationDetailProps {
  row: ServiceCombinationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PerformanceCombinationDetail({ row, open, onOpenChange }: PerformanceCombinationDetailProps) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {row.serviceLabels.map((label) => (
            <Badge key={label} variant="secondary" className="border-0 bg-[var(--blueBg)] text-[var(--blue)]">
              {label}
            </Badge>
          ))}
          <Badge variant="secondary" className="border-0 capitalize">
            {row.combinationType}
          </Badge>
        </div>

        <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="ph-muted">Effective price</span>
            <span className="font-mono font-semibold ph-heading">
              {row.price > 0 ? formatInr(row.price, row.currency) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="ph-muted">Max discount ceiling</span>
            <span className="font-mono">{row.maxDiscountPct != null ? `${row.maxDiscountPct}%` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="ph-muted">Wallet eligible</span>
            <span className={cn(row.walletEligible ? "text-emerald-700" : "text-muted-foreground")}>
              {row.walletEligible ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="ph-muted">Branch scope</span>
            <span>{row.branchName}</span>
          </div>
        </div>

        <div className="rounded-lg border ph-surface-card p-3 flex gap-3 text-sm">
          <Layers className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Per-combination rules</div>
            <div className="text-xs ph-muted mt-1">
              D = discount ceiling · O = linked offer · I = linked incentive scheme. Rules reuse existing offers,
              wallet scopes and incentive schemes — no duplicated logic.
            </div>
            <div className="flex gap-2 mt-2">
              {row.hasDiscountRule && <Badge className="border-0 bg-[var(--blueBg)] text-[var(--blue)]">D</Badge>}
              {row.hasOfferRule && <Badge className="border-0 bg-teal-100 text-teal-800">O</Badge>}
              {row.hasIncentiveRule && <Badge className="border-0 bg-violet-100 text-violet-800">I</Badge>}
              {!row.hasDiscountRule && !row.hasOfferRule && !row.hasIncentiveRule && (
                <span className="text-xs ph-muted">No custom rules linked yet</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
