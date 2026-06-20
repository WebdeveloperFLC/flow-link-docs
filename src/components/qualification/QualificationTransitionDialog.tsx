import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transitionQualificationStatus } from "@/lib/qualification/qualificationApi";
import {
  HOLD_REASON_LABELS,
  QUALIFICATION_STATUS_LABELS,
} from "@/lib/qualification/constants";
import {
  QUALIFICATION_HOLD_REASON_CODES,
  type QualificationLifecycleStatus,
  type QualificationRecord,
} from "@/lib/qualification/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qualification: QualificationRecord;
  toStatus: QualificationLifecycleStatus;
  onComplete: () => void;
};

export function QualificationTransitionDialog({
  open,
  onOpenChange,
  qualification,
  toStatus,
  onComplete,
}: Props) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [holdReasonCode, setHoldReasonCode] = useState("");
  const [transferInstitutionId, setTransferInstitutionId] = useState("");
  const [saving, setSaving] = useState(false);

  const needsHoldReason = toStatus === "ON_HOLD";
  const needsReason = ["CANCELLED", "REFUSED", "CLOSED", "TRANSFERRED"].includes(toStatus);
  const needsTransfer = toStatus === "TRANSFERRED";

  const handleSubmit = async () => {
    if (needsHoldReason && !holdReasonCode) {
      toast.error("Hold reason is required");
      return;
    }
    if (
      needsHoldReason &&
      holdReasonCode === "OTHER_OPERATIONAL" &&
      !reasonNotes.trim()
    ) {
      toast.error("Notes required for other operational blocker");
      return;
    }
    if (needsReason && !reasonCode.trim()) {
      toast.error("Reason code is required");
      return;
    }
    if (needsTransfer && !transferInstitutionId.trim()) {
      toast.error("Transfer target institution id is required");
      return;
    }

    setSaving(true);
    try {
      await transitionQualificationStatus({
        qualificationId: qualification.id,
        toStatus,
        reasonCode: reasonCode.trim() || null,
        reasonNotes: reasonNotes.trim() || null,
        holdReasonCode: holdReasonCode as QualificationRecord["holdReasonCode"],
        transferTargetInstitutionId: transferInstitutionId.trim() || null,
        transferTargetCaseId: null,
      });
      toast.success(`Status updated to ${QUALIFICATION_STATUS_LABELS[toStatus]}`);
      onComplete();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to {QUALIFICATION_STATUS_LABELS[toStatus]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {needsHoldReason && (
            <div className="space-y-2">
              <Label>Hold reason</Label>
              <Select value={holdReasonCode} onValueChange={setHoldReasonCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_HOLD_REASON_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {HOLD_REASON_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsReason && (
            <div className="space-y-2">
              <Label>Reason code</Label>
              <Input value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} />
            </div>
          )}
          {needsTransfer && (
            <div className="space-y-2">
              <Label>Target institution ID</Label>
              <Input
                value={transferInstitutionId}
                onChange={(e) => setTransferInstitutionId(e.target.value)}
                placeholder="UUID of target institution"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
