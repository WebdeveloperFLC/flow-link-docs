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
import { transitionApplicationLifecycle } from "@/lib/application/applicationApi";
import {
  HOLD_REASON_LABELS,
  APPLICATION_LIFECYCLE_STATUS_LABELS,
} from "@/lib/application/constants";
import {
  APPLICATION_HOLD_REASON_CODES,
  type ApplicationLifecycleStatus,
  type StudentApplicationRecord,
} from "@/lib/application/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: StudentApplicationRecord;
  toStatus: ApplicationLifecycleStatus;
  onComplete: () => void;
};

export function ApplicationTransitionDialog({
  open,
  onOpenChange,
  application,
  toStatus,
  onComplete,
}: Props) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [holdReasonCode, setHoldReasonCode] = useState("");
  const [saving, setSaving] = useState(false);

  const needsHoldReason = toStatus === "ON_HOLD";
  const needsReason = ["CANCELLED", "REFUSED", "CLOSED"].includes(toStatus);

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

    setSaving(true);
    try {
      await transitionApplicationLifecycle({
        applicationId: application.id,
        toStatus,
        reasonCode: reasonCode.trim() || null,
        reasonNotes: reasonNotes.trim() || null,
        holdReasonCode: needsHoldReason
          ? (holdReasonCode as StudentApplicationRecord["holdReasonCode"])
          : null,
      });
      toast.success(`Application lifecycle updated to ${APPLICATION_LIFECYCLE_STATUS_LABELS[toStatus]}`);
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
          <DialogTitle>
            Move application lifecycle to {APPLICATION_LIFECYCLE_STATUS_LABELS[toStatus]}
          </DialogTitle>
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
                  {APPLICATION_HOLD_REASON_CODES.map((code) => (
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
