import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FINANCIAL_TRANSFER_REASONS,
  type FinancialTransferReason,
} from "@/lib/serviceFinancialDependencies";

type TargetService = { code: string; label: string; caseId: string | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  sourceServiceCode: string;
  sourceServiceLabel: string;
  targetServices: TargetService[];
  onSubmitted?: (payload: {
    sourceServiceCode: string;
    targetServiceCode: string;
    targetCaseId: string | null;
    reason: FinancialTransferReason;
    reasonNotes: string;
  }) => void;
}

/** Phase A1 skeleton — captures transfer intent + audit; posting deferred to Phase A3. */
export function FinancialTransferWizard({
  open,
  onOpenChange,
  clientId,
  sourceServiceCode,
  sourceServiceLabel,
  targetServices,
  onSubmitted,
}: Props) {
  const [reason, setReason] = useState<FinancialTransferReason>("wrong_service_selected");
  const [reasonNotes, setReasonNotes] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const [busy, setBusy] = useState(false);

  const target = targetServices.find((s) => s.code === targetCode);

  const handleSubmit = async () => {
    if (!targetCode) {
      toast.error("Select a target service");
      return;
    }
    if (reason === "other" && !reasonNotes.trim()) {
      toast.error("Please describe the reason for Other");
      return;
    }
    setBusy(true);
    try {
      onSubmitted?.({
        sourceServiceCode,
        targetServiceCode: targetCode,
        targetCaseId: target?.caseId ?? null,
        reason,
        reasonNotes: reasonNotes.trim(),
      });
      toast.info(
        "Transfer request recorded. Full financial transfer posting will be available in Phase A3.",
      );
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer financial records</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Move invoice, payment, and allocation records from{" "}
            <strong>{sourceServiceLabel}</strong> to another active service. Audit history is
            preserved — nothing is deleted.
          </p>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <Label>Transfer reason *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as FinancialTransferReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_TRANSFER_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "other" ? (
            <div className="space-y-1.5">
              <Label>Details *</Label>
              <Textarea
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                placeholder="Explain why this transfer is needed"
                rows={3}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                placeholder="Additional context for the audit log"
                rows={2}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Transfer to service *</Label>
            <Select value={targetCode} onValueChange={setTargetCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select target service" />
              </SelectTrigger>
              <SelectContent>
                {targetServices.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3 bg-muted/30">
            Client: {clientId.slice(0, 8)}… · Phase A1 records this request only. Accounting
            entries will move in Phase A3 after approval.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={busy || !targetCode}>
            {busy ? "Saving…" : "Record transfer request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
