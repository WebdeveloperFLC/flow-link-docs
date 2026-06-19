import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAttemptSummary } from "@/lib/profile/testAttempts";
import { statusLabel } from "@/lib/profile/testAttemptFormRules";
import type { ProfileTestId, TestAttempt } from "@/lib/profile/types";
import { cn } from "@/lib/utils";
import { Star, Trash2 } from "lucide-react";

interface Props {
  attempts: readonly TestAttempt[];
  testId: ProfileTestId;
  selectedAttemptId: string | null;
  activeAttemptId?: string | null;
  mode: "view" | "edit";
  onSelect?: (attemptId: string) => void;
  onSetActive?: (attemptId: string) => void;
  onRemove?: (attemptId: string) => void;
  className?: string;
}

export function TestAttemptList({
  attempts,
  testId,
  selectedAttemptId,
  activeAttemptId,
  mode,
  onSelect,
  onSetActive,
  onRemove,
  className,
}: Props) {
  const forType = attempts.filter((a) => a.test_id === testId);

  if (forType.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground rounded-lg border border-dashed p-3", className)}>
        No attempts yet. {mode === "edit" ? "Click Add attempt to record a test." : ""}
      </p>
    );
  }

  return (
    <ul className={cn("space-y-1.5", className)} data-testid={`attempt-list-${testId}`}>
      {forType.map((attempt, index) => {
        const isSelected = selectedAttemptId === attempt.attempt_id;
        const isActive = activeAttemptId === attempt.attempt_id;
        return (
          <li key={attempt.attempt_id}>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/40",
              )}
            >
              <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => onSelect?.(attempt.attempt_id)}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">Attempt {index + 1}</span>
                  {attempt.status && (
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] capitalize">
                      {statusLabel(attempt.status)}
                    </Badge>
                  )}
                  {isActive && (
                    <Badge className="h-4 px-1 text-[9px] gap-0.5">
                      <Star className="size-2.5 fill-current" />
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground truncate mt-0.5">{formatAttemptSummary(attempt)}</p>
              </button>
              {mode === "edit" && (
                <div className="flex shrink-0 gap-1">
                  {!isActive && onSetActive && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-2"
                      onClick={() => onSetActive(attempt.attempt_id)}
                    >
                      Set active
                    </Button>
                  )}
                  {onRemove && forType.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => onRemove(attempt.attempt_id)}
                      aria-label="Remove attempt"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
