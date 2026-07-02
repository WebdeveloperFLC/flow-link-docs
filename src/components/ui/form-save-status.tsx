import { format } from "date-fns";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FormSaveStatusState = "idle" | "saving" | "saved" | "unsaved" | "error";

type Props = {
  state: FormSaveStatusState;
  savedAt?: Date | null;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
};

export function FormSaveStatus({ state, savedAt, error, onRetry, className }: Props) {
  if (state === "idle") return null;

  const savedLabel =
    savedAt != null ? `Saved · ${format(savedAt, "h:mm a")}` : "Saved";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        state === "saving" && "border-border bg-muted/50 text-muted-foreground",
        state === "saved" && "border-success/30 bg-success/10 text-success",
        state === "unsaved" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        state === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {state === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="size-3" aria-hidden />
          {savedLabel}
        </>
      )}
      {state === "unsaved" && <>Unsaved</>}
      {state === "error" && (
        <>
          <AlertCircle className="size-3" aria-hidden />
          {error?.trim() || "Unsaved — retry"}
          {onRetry && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-destructive underline"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}
