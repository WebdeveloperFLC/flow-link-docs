import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CommissionExplanation } from "../../lib/claimBusinessView";

const TYPE_LABELS: Record<string, string> = {
  expected: "Expected commission",
  approved: "Institution approved",
  received: "Commission received",
  outstanding: "Outstanding",
  commissionable: "Commissionable tuition",
};

type Props = {
  open: boolean;
  onClose: () => void;
  explanation: CommissionExplanation | null;
};

export function CommissionAmountExplainDialog({ open, onClose, explanation }: Props) {
  if (!explanation) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {TYPE_LABELS[explanation.amountType] ?? "Amount"} — {explanation.studentName}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-md border bg-muted/30 px-3 py-2 mb-3">
          <div className="text-xs text-muted-foreground">Final amount</div>
          <div className="text-xl font-semibold">
            {explanation.currency} {explanation.finalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {explanation.lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-3 border-b pb-2 last:border-0">
              <div>
                <div className="font-medium">{line.label}</div>
                {line.detail && <div className="text-xs text-muted-foreground mt-0.5">{line.detail}</div>}
              </div>
              <div className="text-right shrink-0 font-medium">{line.value}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Amounts derive from agreement rules, student row data, snapshots, and commission payments. No calculation engine changes.
        </p>
      </DialogContent>
    </Dialog>
  );
}
