import { Button } from "@/components/ui/button";
import { CheckCircle2, Calculator, ClipboardCheck, Package, Send, FileText, Banknote, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStepId =
  | "recalculate"
  | "validate"
  | "preview"
  | "snapshot"
  | "package"
  | "submit"
  | "review"
  | "invoice"
  | "payment"
  | "reconcile";

const STEPS: { id: WorkflowStepId; label: string; icon: typeof Calculator }[] = [
  { id: "recalculate", label: "Recalculate", icon: Calculator },
  { id: "validate", label: "Validate claim", icon: ClipboardCheck },
  { id: "preview", label: "Preview submission", icon: CheckCircle2 },
  { id: "snapshot", label: "Freeze snapshot", icon: CheckCircle2 },
  { id: "package", label: "Submission package", icon: Package },
  { id: "submit", label: "Submit claim", icon: Send },
  { id: "review", label: "Institution review", icon: FileText },
  { id: "invoice", label: "Generate invoice", icon: FileText },
  { id: "payment", label: "Record payment", icon: Banknote },
  { id: "reconcile", label: "Reconciliation", icon: Scale },
];

type Props = {
  activeStep?: WorkflowStepId;
  validated: boolean;
  canSubmit: boolean;
  onRecalculate: () => void;
  onValidate: () => void;
  onPreview: () => void;
  onPackage: () => void;
  onSubmit: () => void;
  onInvoice: () => void;
  onPayment: () => void;
  recalcBusy?: boolean;
};

export function ClaimWorkflowStrip({
  validated,
  canSubmit,
  onRecalculate,
  onValidate,
  onPreview,
  onPackage,
  onSubmit,
  onInvoice,
  onPayment,
  recalcBusy,
}: Props) {
  const handlers: Partial<Record<WorkflowStepId, () => void>> = {
    recalculate: onRecalculate,
    validate: onValidate,
    preview: onPreview,
    package: onPackage,
    submit: onSubmit,
    invoice: onInvoice,
    payment: onPayment,
  };

  return (
    <div className="rounded-md border bg-background p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Claim workflow
      </div>
      <div className="flex flex-wrap gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const handler = handlers[step.id];
          const disabled =
            (step.id === "submit" && !canSubmit) ||
            (step.id === "validate" && false) ||
            (step.id === "recalculate" && recalcBusy) ||
            (!handler && !["snapshot", "review", "reconcile"].includes(step.id));

          return (
            <div key={step.id} className="flex items-center gap-1">
              {idx > 0 && <span className="text-muted-foreground text-xs hidden sm:inline">→</span>}
              <Button
                type="button"
                size="sm"
                variant={step.id === "validate" && validated ? "default" : "outline"}
                disabled={disabled}
                onClick={handler}
                className={cn(
                  step.id === "validate" && !validated && "border-amber-400",
                  step.id === "submit" && canSubmit && "border-green-600",
                )}
              >
                <Icon className="size-3.5 mr-1 shrink-0" />
                {step.label}
                {step.id === "validate" && validated && " ✓"}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Per-student: use row actions to mark eligible (freeze snapshot), apply hold, or transfer.
        Validation is required before submission.
      </p>
    </div>
  );
}
