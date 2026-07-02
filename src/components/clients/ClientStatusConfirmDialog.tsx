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
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLabel: string;
  nextLabel: string;
  nextCode: string;
  busy?: boolean;
  onConfirm: (reason?: string) => void;
};

const STATUS_SIDE_EFFECTS: Record<string, string[]> = {
  enrolled: ["May sync accounting client records", "Visible on enrollment reports"],
  visa_approved: ["Updates visa milestone on client profile", "May affect pipeline stage reporting"],
  closed: ["Case marked closed — some edits may be restricted", "Team notifications may fire"],
  lost: ["Case marked lost", "Follow-up tasks may need review"],
};

export function ClientStatusConfirmDialog({
  open,
  onOpenChange,
  currentLabel,
  nextLabel,
  nextCode,
  busy = false,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const effects = STATUS_SIDE_EFFECTS[nextCode] ?? [
    "Status change is logged on the client activity timeline",
    "Downstream dashboards use the new status on next refresh",
  ];

  return (
    <AlertDialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change client status?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="text-foreground font-medium">{currentLabel}</span>
                {" → "}
                <span className="text-foreground font-medium">{nextLabel}</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                {effects.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="space-y-2">
                <Label htmlFor="status-change-reason">Reason (optional)</Label>
                <Textarea
                  id="status-change-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Client deferred intake — keep file active"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              onConfirm(reason.trim() || undefined);
              setReason("");
            }}
          >
            {busy ? "Saving…" : "Confirm status change"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
