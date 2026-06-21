import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatApplicationDuplicateMessage,
  type ApplicationDuplicateMatch,
} from "@/lib/application/applicationDuplicate";
import { APPLICATION_LIFECYCLE_STATUS_LABELS } from "@/lib/application/constants";

type Props = {
  open: boolean;
  match: ApplicationDuplicateMatch | null;
  onClose: () => void;
  onUseExisting: (applicationId: string) => void;
  onOverride: (reason: string) => void;
  busy?: boolean;
};

export function ApplicationDuplicateWarningDialog({
  open,
  match,
  onClose,
  onUseExisting,
  onOverride,
  busy = false,
}: Props) {
  const [overrideReason, setOverrideReason] = useState("");

  if (!match) return null;

  const handleOpenChange = (next: boolean) => {
    if (!next && !busy) {
      setOverrideReason("");
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate application detected</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{formatApplicationDuplicateMessage(match)}</p>
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-foreground space-y-1">
              <p>
                <span className="text-muted-foreground">Institution:</span>{" "}
                {match.institutionName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Program:</span>{" "}
                {match.programName?.trim() || "Unnamed program"}
              </p>
              <p>
                <span className="text-muted-foreground">Campus:</span>{" "}
                {match.campusName?.trim() || "Not specified"}
              </p>
              <p>
                <span className="text-muted-foreground">Intake:</span> {match.intakeTerm}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {APPLICATION_LIFECYCLE_STATUS_LABELS[match.status]}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Same institution with a different program is allowed. This match uses institution +
              program + campus + intake for this client.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="duplicate-override-reason">
            Override reason (required to create anyway)
          </Label>
          <Textarea
            id="duplicate-override-reason"
            rows={3}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="e.g. Re-applying after deferral; counselor confirmed intentional duplicate"
          />
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onUseExisting(match.applicationId)}
          >
            Open existing application
          </Button>
          <Button
            type="button"
            disabled={busy || !overrideReason.trim()}
            onClick={() => onOverride(overrideReason.trim())}
          >
            {busy ? "Creating…" : "Create anyway"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
