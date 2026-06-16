import { Check, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
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
  /** Omit outer padding when nested inside a card */
  compact?: boolean;
};

export function StageJourneyBar({
  stages,
  isStageDone,
  isStageCurrent,
  completionNotes,
  displayLabel,
  compact,
}: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(!compact && "px-4 sm:px-8", "pb-3 overflow-x-auto scrollbar-none")}>
        <div className="flex items-start min-w-max gap-0 py-1">
          {stages.map((s, i) => (
            <StageNode
              key={s.id}
              index={i}
              label={displayLabel(s)}
              isDone={isStageDone(s.id)}
              isCurrent={isStageCurrent(s.id)}
              note={completionNotes.get(s.id) ?? null}
              isLast={i === stages.length - 1}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function StageNode({
  index,
  label,
  isDone,
  isCurrent,
  note,
  isLast,
}: {
  index: number;
  label: string;
  isDone: boolean;
  isCurrent: boolean;
  note: string | null;
  isLast: boolean;
}) {
  const hasNote = Boolean(note?.trim());

  const circle = (
    <span
      className={cn(
        "relative flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
        isDone && hasNote && "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-200 ring-offset-1 shadow-sm cursor-help",
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
  );

  const labelEl = (
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
  );

  return (
    <div className="flex items-start shrink-0">
      <div className="flex flex-col items-center gap-1.5 min-w-[4.5rem] max-w-[5.5rem] px-1">
        {isDone && hasNote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{circle}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <span className="font-medium text-amber-600 dark:text-amber-400">Note · </span>
              {note}
            </TooltipContent>
          </Tooltip>
        ) : (
          circle
        )}
        {isDone && hasNote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{labelEl}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              <span className="font-medium text-amber-600 dark:text-amber-400">Note · </span>
              {note}
            </TooltipContent>
          </Tooltip>
        ) : (
          labelEl
        )}
      </div>
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
