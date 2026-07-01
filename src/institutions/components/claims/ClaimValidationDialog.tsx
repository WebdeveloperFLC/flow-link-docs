import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ValidationIssue } from "../../lib/claimBusinessView";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  periodLabel: string;
  issues: ValidationIssue[];
};

export function ClaimValidationDialog({
  open,
  onClose,
  onConfirm,
  periodLabel,
  issues,
}: Props) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const passed = errors.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Validate claim — {periodLabel}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Mandatory business checkpoint before submission. Confirms eligibility, snapshots, amounts, and holds.
        </p>
        {passed ? (
          <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
            <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Validation passed</div>
              <div className="text-xs mt-1">You may proceed to preview submission and submit the claim.</div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">{errors.length} issue(s) must be resolved</div>
            </div>
          </div>
        )}
        <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
          {errors.map((i, idx) => (
            <li key={`e-${idx}`} className="text-red-800 flex gap-2">
              <span className="font-medium shrink-0">Error:</span> {i.message}
            </li>
          ))}
          {warnings.map((i, idx) => (
            <li key={`w-${idx}`} className="text-amber-800 flex gap-2">
              <span className="font-medium shrink-0">Warning:</span> {i.message}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {passed && (
            <Button onClick={() => { onConfirm(); onClose(); }}>
              Confirm validation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
