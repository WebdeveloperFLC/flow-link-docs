import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { InstitutionStatus, UpiInstitution } from "../types/upi";
import { InstitutionStatusBadge } from "./InstitutionStatusBadge";
import {
  setInstitutionStatus,
  type GovernanceCheckItem,
} from "../lib/institutionGovernanceApi";

type Props = {
  institution: UpiInstitution;
  canEdit: boolean;
  onStatusApplied: (patch: Pick<UpiInstitution, "institution_status" | "is_active">) => void;
};

function ChecklistBlock({
  title,
  items,
  variant,
}: {
  title: string;
  items: GovernanceCheckItem[];
  variant: "error" | "warning";
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium flex items-center gap-2">
        {variant === "error" ? (
          <AlertTriangle className="size-4 text-destructive" />
        ) : (
          <AlertTriangle className="size-4 text-amber-500" />
        )}
        {title}
      </div>
      <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item.code}>{item.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function InstitutionGovernancePanel({ institution, canEdit, onStatusApplied }: Props) {
  const [busy, setBusy] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateErrors, setActivateErrors] = useState<GovernanceCheckItem[]>([]);
  const [activateWarnings, setActivateWarnings] = useState<GovernanceCheckItem[]>([]);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const status = institution.institution_status ?? "Draft";
  const score = Math.round(Number(institution.completeness_score ?? 0));

  const transition = async (next: InstitutionStatus, forceWarnings = false) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const result = await setInstitutionStatus(institution.id, next, forceWarnings);
      if (!result.ok) {
        setActivateErrors(result.errors);
        setActivateWarnings(result.warnings);
        setNeedsConfirm(Boolean(result.needs_confirmation));
        setActivateOpen(true);
        return;
      }
      onStatusApplied({
        institution_status: result.institution_status ?? next,
        is_active: result.is_active ?? next === "Active",
      });
      toast.success(`Status updated to ${result.institution_status ?? next}`);
      setActivateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  };

  const openActivate = () => {
    void transition("Active");
  };

  const confirmActivateWithWarnings = () => {
    void transition("Active", true);
  };

  return (
    <>
      <Card className="p-6 space-y-4 max-w-3xl">
        <div>
          <div className="text-sm font-medium">Governance</div>
          <p className="text-xs text-muted-foreground mt-1">
            Institution status controls operational readiness. Course Finder catalog visibility is managed separately below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InstitutionStatusBadge status={status} className="text-xs px-2 py-0.5" />
          <Badge variant="outline" className="text-xs">
            Operational: {institution.is_active ? "Active" : "Inactive"}
          </Badge>
          <span className="text-xs text-muted-foreground">(derived — not editable directly)</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Profile completeness</span>
            <span className="font-medium tabular-nums">{score} / 100</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-1">
            {status === "Draft" && (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => transition("Review")}>
                  Move to Review
                </Button>
                <Button size="sm" disabled={busy} onClick={openActivate}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Activate…"}
                </Button>
              </>
            )}
            {status === "Review" && (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => transition("Draft")}>
                  Back to Draft
                </Button>
                <Button size="sm" disabled={busy} onClick={openActivate}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Activate…"}
                </Button>
              </>
            )}
            {status === "Active" && (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => transition("Inactive")}>
                  Set Inactive
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => transition("Archived")}>
                  Archive
                </Button>
              </>
            )}
            {status === "Inactive" && (
              <>
                <Button size="sm" disabled={busy} onClick={openActivate}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Reactivate…"}
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => transition("Archived")}>
                  Archive
                </Button>
              </>
            )}
            {status === "Archived" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => transition("Draft")}>
                Restore to Draft
              </Button>
            )}
          </div>
        )}
      </Card>

      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {needsConfirm ? "Activate with warnings?" : activateErrors.length ? "Cannot activate" : "Activation checklist"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {activateErrors.length === 0 && activateWarnings.length === 0 && busy && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Checking requirements…
              </div>
            )}
            {activateErrors.length === 0 && !needsConfirm && !busy && activateWarnings.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-4" /> All activation requirements met.
              </div>
            )}
            <ChecklistBlock title="Must fix before activation" items={activateErrors} variant="error" />
            <ChecklistBlock title="Recommended (does not block)" items={activateWarnings} variant="warning" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActivateOpen(false)}>
              Close
            </Button>
            {needsConfirm && activateErrors.length === 0 && (
              <Button onClick={confirmActivateWithWarnings} disabled={busy}>
                Activate anyway
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
