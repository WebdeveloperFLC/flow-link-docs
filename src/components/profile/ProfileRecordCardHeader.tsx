import { useState, type MouseEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Trash2 } from "lucide-react";

export type ProfileRecordBadge = {
  label: string;
  variant?: "default" | "secondary" | "outline";
};

interface Props {
  headline: string;
  preview?: string;
  expanded: boolean;
  badges?: ProfileRecordBadge[];
  onToggle?: () => void;
  onRemove?: () => void;
  confirmRemove?: boolean;
}

export function ProfileRecordCardHeader({
  headline,
  preview,
  expanded,
  badges = [],
  onToggle,
  onRemove,
  confirmRemove = true,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleRemoveClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (confirmRemove) {
      setDeleteOpen(true);
    } else {
      onRemove?.();
    }
  };

  return (
    <>
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
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold truncate">{headline}</p>
                {badges.map((b) => (
                  <Badge
                    key={b.label}
                    variant={b.variant ?? "secondary"}
                    className="h-4 px-1 text-[9px] font-normal shrink-0"
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
              {!expanded && preview ? (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preview}</p>
              ) : null}
            </div>
          </div>
        </button>
        {onRemove ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={handleRemoveClick}
            aria-label="Delete record"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {onRemove && confirmRemove ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete record?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this record?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onRemove();
                  setDeleteOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
