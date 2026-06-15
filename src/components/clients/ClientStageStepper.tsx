import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientStage, type PipelineStage } from "@/hooks/useClientStage";

type Props = {
  clientId: string;
  refreshKey?: number;
  activeServiceLabel?: string | null;
  onStageChanged?: () => void;
};

export function ClientStageStepper({ clientId, refreshKey = 0, activeServiceLabel, onStageChanged }: Props) {
  const {
    current,
    stages,
    busy,
    canUpload,
    currentIdx,
    stepNumber,
    stepTotal,
    onChangeStage,
    displayLabel,
    hasPipeline,
  } = useClientStage(clientId, refreshKey);

  const handleStage = async (stageId: string) => {
    await onChangeStage(stageId);
    onStageChanged?.();
  };

  if (!hasPipeline) {
    return (
      <div className="border-b bg-muted/30 px-4 sm:px-8 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Workflow className="size-4 shrink-0" />
          No pipeline assigned — assign one from Stage & Setup.
        </div>
      </div>
    );
  }

  const pipelineTitle = activeServiceLabel?.trim() || current?.pipeline_name || "Application pipeline";

  return (
    <div className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="px-4 sm:px-8 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground truncate">
          {pipelineTitle}
          <span className="ml-2 text-foreground/80">
            · {stepNumber ?? "?"} / {stepTotal}
          </span>
        </div>
        {canUpload && stages.length > 0 && (
          <Select
            value={current?.current_stage_id ?? undefined}
            onValueChange={(v) => void handleStage(v)}
            disabled={busy}
          >
            <SelectTrigger className="h-8 w-[200px] text-xs hidden md:flex">
              <SelectValue placeholder="Jump to stage…" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {displayLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="px-4 sm:px-8 pb-3 overflow-x-auto scrollbar-none">
        <div className="flex items-start min-w-max gap-0 py-1">
          {stages.map((s, i) => (
            <StageNode
              key={s.id}
              stage={s}
              index={i}
              isCurrent={s.id === current?.current_stage_id}
              isPassed={i < currentIdx}
              isLast={i === stages.length - 1}
              disabled={!canUpload || busy}
              label={displayLabel(s)}
              onSelect={() => void handleStage(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StageNode({
  stage,
  index,
  isCurrent,
  isPassed,
  isLast,
  disabled,
  label,
  onSelect,
}: {
  stage: PipelineStage;
  index: number;
  isCurrent: boolean;
  isPassed: boolean;
  isLast: boolean;
  disabled: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-start shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        title={label}
        className={cn(
          "flex flex-col items-center gap-1.5 min-w-[4.5rem] max-w-[5.5rem] px-1 group",
          !disabled && "cursor-pointer",
          disabled && "cursor-default",
        )}
      >
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
            isCurrent && "border-primary bg-primary text-primary-foreground shadow-sm",
            !isCurrent && isPassed && "border-primary bg-primary/10 text-primary",
            !isCurrent && !isPassed && "border-muted-foreground/25 bg-muted/40 text-muted-foreground",
          )}
        >
          {isPassed && !isCurrent ? <Check className="size-3.5" /> : index + 1}
        </span>
        <span
          className={cn(
            "text-[10px] leading-tight text-center line-clamp-2 w-full",
            isCurrent && "font-semibold text-primary",
            isPassed && !isCurrent && "text-foreground/80",
            !isPassed && !isCurrent && "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </button>
      {!isLast && (
        <div
          className={cn(
            "h-0.5 w-6 mt-3.5 shrink-0 rounded-full",
            isPassed ? "bg-primary" : "bg-muted-foreground/20",
          )}
          aria-hidden
        />
      )}
    </div>
  );
}
