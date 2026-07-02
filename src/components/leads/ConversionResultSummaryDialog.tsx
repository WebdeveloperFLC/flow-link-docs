import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CircleAlert, Loader2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  conversionHasFailures,
  primaryConversionFailures,
  retryConversionStep,
  type ConversionStepId,
  type ConversionStepStatus,
  type ConvertLeadResult,
} from "@/lib/convertLeadToClient";

const RETRYABLE: ConversionStepId[] = [
  "backgroundSync",
  "serviceEnrollment",
  "invoice",
  "notifications",
  "activityHistory",
  "followupTask",
];

type Props = {
  open: boolean;
  result: ConvertLeadResult | null;
  clientHref: string;
  onClose: () => void;
  onResultChange: (result: ConvertLeadResult) => void;
};

function StepIcon({ status }: { status: ConversionStepStatus["status"] }) {
  if (status === "success") return <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden />;
  if (status === "failed") return <CircleAlert className="size-4 text-destructive shrink-0" aria-hidden />;
  return <MinusCircle className="size-4 text-muted-foreground shrink-0" aria-hidden />;
}

export function ConversionResultSummaryDialog({
  open,
  result,
  clientHref,
  onClose,
  onResultChange,
}: Props) {
  const [retrying, setRetrying] = useState<ConversionStepId | null>(null);

  if (!result) return null;

  const hasFailures = conversionHasFailures(result);
  const primaryFailures = primaryConversionFailures(result);
  const headline = hasFailures
    ? primaryFailures.length
      ? "Client created — some steps need attention"
      : "Client created — minor steps incomplete"
    : result.alreadyConverted
      ? "Opening existing client file"
      : "Client file created";

  const onRetry = async (stepId: ConversionStepId) => {
    setRetrying(stepId);
    try {
      const next = await retryConversionStep(result, stepId);
      onResultChange(next);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{headline}</DialogTitle>
          <DialogDescription>
            {result.registrationNumber
              ? `Registration ${result.registrationNumber}`
              : `Client ID ${result.clientId.slice(0, 8)}`}
            {result.invoiceLinesCreated > 0 && ` · ${result.invoiceLinesCreated} invoice line(s)`}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2" aria-label="Conversion steps">
          {result.steps.map((step) => {
            const canRetry = step.status === "failed" && RETRYABLE.includes(step.id);
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                  step.status === "failed" && "border-destructive/30 bg-destructive/5",
                  step.status === "success" && "border-border bg-muted/30",
                  step.status === "skipped" && "border-border bg-muted/20 text-muted-foreground",
                )}
              >
                <StepIcon status={step.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{step.label}</div>
                  {step.error && (
                    <p className="text-xs text-destructive mt-0.5">{step.error}</p>
                  )}
                </div>
                {canRetry && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-7 text-xs"
                    disabled={retrying != null}
                    onClick={() => void onRetry(step.id)}
                  >
                    {retrying === step.id ? (
                      <>
                        <Loader2 className="size-3 mr-1 animate-spin" aria-hidden />
                        Retrying…
                      </>
                    ) : (
                      "Retry"
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" asChild>
            <Link to={clientHref} onClick={onClose}>
              View client
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
