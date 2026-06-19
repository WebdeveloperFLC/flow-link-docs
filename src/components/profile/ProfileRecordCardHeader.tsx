import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Trash2 } from "lucide-react";

interface Props {
  headline: string;
  preview?: string;
  expanded: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}

export function ProfileRecordCardHeader({
  headline,
  preview,
  expanded,
  onToggle,
  onRemove,
}: Props) {
  return (
    <div className={cn("flex items-center gap-2", expanded ? "mb-0" : "p-0.5")}>
      <button
        type="button"
        className="flex-1 min-w-0 text-left rounded-md hover:bg-accent/40 transition-colors px-1 py-0.5"
        onClick={onToggle}
      >
        <div className="flex items-start gap-2">
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform mt-0.5",
              expanded && "rotate-180",
            )}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{headline}</p>
            {!expanded && preview ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
            ) : null}
          </div>
        </div>
      </button>
      {onRemove ? (
        <Button type="button" size="icon" variant="ghost" onClick={onRemove}>
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
