import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ShieldCheck, ArrowUpRight, X } from "lucide-react";
import { FraudFlag } from "../../types/fraud";
import { getSimilarTxns } from "../../data/mockFraud";
import { formatCurrency } from "../../lib/format";
import FraudFlagBadge from "./FraudFlagBadge";

interface Props {
  flag: FraudFlag | null;
  onClose: () => void;
  onAction: (flagId: string, action: "confirm" | "false_positive" | "escalate" | "dismiss") => void;
}

export default function FlagDetailModal({ flag, onClose, onAction }: Props) {
  if (!flag) return null;
  const similar = getSimilarTxns(flag.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">{flag.txnRef}</DialogTitle>
            <FraudFlagBadge type={flag.type} />
          </div>
          <DialogDescription>
            Flagged {new Date(flag.flaggedAt).toLocaleString()} · risk score{" "}
            <span className="font-semibold tabular-nums text-foreground">{flag.riskScore}</span>/100
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Vendor</div>
            <div className="font-medium mt-1">{flag.vendor}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</div>
            <div className="font-semibold tabular-nums mt-1">{formatCurrency(flag.amount, flag.currency)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Entity</div>
            <div className="mt-1">{flag.entity}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="mt-1 capitalize">{flag.status.replace(/_/g, " ")}</div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200/50 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5 p-4">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Why flagged</div>
              <p className="text-sm mt-1 text-foreground">{flag.reason}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Similar transactions ({similar.length})
          </div>
          {similar.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-3">No similar transactions detected.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9">Reference</TableHead>
                    <TableHead className="h-9">Vendor</TableHead>
                    <TableHead className="h-9 text-right">Amount</TableHead>
                    <TableHead className="h-9 text-right">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {similar.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="py-2 font-mono text-xs">{s.txnRef}</TableCell>
                      <TableCell className="py-2">{s.vendor}</TableCell>
                      <TableCell className="py-2 text-right tabular-nums">{formatCurrency(s.amount, s.currency)}</TableCell>
                      <TableCell className="py-2 text-right tabular-nums">{s.riskScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => onAction(flag.id, "dismiss")}>
            <X className="size-4" /> Dismiss
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction(flag.id, "false_positive")}>
            <ShieldCheck className="size-4" /> False positive
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction(flag.id, "escalate")}>
            <ArrowUpRight className="size-4" /> Escalate
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onAction(flag.id, "confirm")}>
            <AlertTriangle className="size-4" /> Confirm fraud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}