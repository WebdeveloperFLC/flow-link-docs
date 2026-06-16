import { useState } from "react";
import { Check, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PipelineStage } from "@/hooks/useClientStage";

type Props = {
  stages: PipelineStage[];
  isStageDone: (stageId: string) => boolean;
  isStageCurrent: (stageId: string) => boolean;
  completionNotes: Map<string, string | null>;
  displayLabel: (stage: PipelineStage) => string;
  canUpload?: boolean;
  onClearNote?: (stageId: string) => void | Promise<void>;
  clearing?: boolean;
  compact?: boolean;
};

export function StageJourneyBar({
  stages,
  isStageDone,
  isStageCurrent,
  completionNotes,
  displayLabel,
  canUpload,
  onClearNote,
  clearing,
  compact,
}: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(!compact && "px-4 sm:px-8", "pb-3 overflow-x-auto scrollbar-none")}>
        <div className="flex items-start min-w-max gap-0 py-1">
          {stages.map((s, i) => (
            <StageNode
              key={s.id}
              stageId={s.id}
              index={i}
              label={displayLabel(s)}
              isDone={isStageDone(s.id)}
              isCurrent={isStageCurrent(s.id)}
              note={completionNotes.get(s.id) ?? null}
              isLast={i === stages.length - 1}
              canUpload={canUpload}
              onClearNote={onClearNote}
              clearing={clearing}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function StageNode({
  stageId,
  index,
  label,
  isDone,
  isCurrent,
  note,
  isLast,
  canUpload,
  onClearNote,
  clearing,
}: {
  stageId: string;
  index: number;
  label: string;
  isDone: boolean;
  isCurrent: boolean;
  note: string | null;
  isLast: boolean;
  canUpload?: boolean;
  onClearNote?: (stageId: string) => void | Promise<void>;
  clearing?: boolean;
}) {
  const hasNote = Boolean(note?.trim());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const nodeContent = (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 min-w-[4.5rem] max-w-[5.5rem] px-1",
        isDone && hasNote && canUpload && "cursor-pointer",
        isDone && hasNote && !canUpload && "cursor-help",
      )}
    >
      <span
        className={cn(
          "relative flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
          isDone && hasNote && "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-200 ring-offset-1 shadow-sm",
          isDone && !hasNote && "border-emerald-600 bg-emerald-600 text-white",
          isCurrent && !isDone && "border-primary bg-primary text-primary-foreground shadow-sm",
          !isDone && !isCurrent && "border-muted-foreground/25 bg-muted/40 text-muted-foreground",
        )}
      >
        {isDone ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
        {isDone && hasNote && (
          <span
            className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm"
            aria-hidden
          >
            <MessageSquare className="size-2" fill="currentColor" />
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[10px] leading-tight text-center line-clamp-2 w-full",
          isCurrent && "font-semibold text-primary",
          isDone && hasNote && "font-medium text-amber-700 dark:text-amber-400",
          isDone && !hasNote && !isCurrent && "text-emerald-700 dark:text-emerald-400",
          !isDone && !isCurrent && "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex items-start shrink-0">
      {isDone && hasNote && canUpload && onClearNote ? (
        <>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>{nodeContent}</PopoverTrigger>
            <PopoverContent side="top" className="w-64 p-3 space-y-3">
              <div className="text-xs text-foreground leading-snug">{note}</div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-950/30"
                disabled={clearing}
                onClick={() => {
                  setPopoverOpen(false);
                  setConfirmOpen(true);
                }}
              >
                Clear note
              </Button>
            </PopoverContent>
          </Popover>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear stage note?</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove this note from &ldquo;{label}&rdquo;? The stage stays marked done.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={clearing}
                  onClick={(e) => {
                    e.preventDefault();
                    void onClearNote(stageId).then(() => setConfirmOpen(false));
                  }}
                >
                  Clear note
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : isDone && hasNote ? (
        <Tooltip>
          <TooltipTrigger asChild>{nodeContent}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <span className="font-medium text-amber-600 dark:text-amber-400">Note · </span>
            {note}
          </TooltipContent>
        </Tooltip>
      ) : (
        nodeContent
      )}
      {!isLast && (
        <div
          className={cn(
            "h-0.5 w-6 mt-3.5 shrink-0 rounded-full",
            isDone && hasNote && "bg-amber-400",
            isDone && !hasNote && "bg-emerald-500",
            !isDone && "bg-muted-foreground/20",
          )}
          aria-hidden
        />
      )}
    </div>
  );
}
