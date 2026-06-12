import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalPipelineProgress } from "@/lib/portalPipelineProgress";
import { STAGE_ORDER, stageProgressPercent } from "@/lib/portal";

type Props = {
  progress: PortalPipelineProgress;
  /** Legacy lead_stage when no pipeline assigned */
  legacyLeadStage?: string | null;
  compact?: boolean;
};

export function PortalPipelineProgressBar({ progress, legacyLeadStage, compact }: Props) {
  if (progress.stages.length > 0) {
    const currentIdx = progress.stages.findIndex((s) => s.id === progress.currentStageId);
    return (
      <div className="space-y-2">
        {!compact && progress.pipelineName && (
          <p className="text-sm text-muted-foreground">
            {progress.pipelineName}
            {progress.currentStageLabel ? ` · ${progress.currentStageLabel}` : ""}
            {" · "}
            {progress.progressPercent}%
          </p>
        )}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          {progress.stages.map((stage, idx) => {
            const done = currentIdx >= 0 && idx <= currentIdx;
            const isCurrent = stage.id === progress.currentStageId;
            return (
              <StageChip
                key={stage.id}
                done={done}
                isCurrent={isCurrent}
                label={stage.label}
                index={idx}
                color={stage.color}
                compact={compact}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const cur = STAGE_ORDER.findIndex((x) => x.toLowerCase() === (legacyLeadStage ?? "").toLowerCase());
  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-sm text-muted-foreground">
          Progress: {stageProgressPercent(legacyLeadStage)}%
        </p>
      )}
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {STAGE_ORDER.map((s, idx) => {
          const done = cur >= 0 && idx <= cur;
          const isCurrent = idx === cur;
          return (
            <StageChip
              key={s}
              done={done}
              isCurrent={isCurrent}
              label={s}
              index={idx}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}

function StageChip({
  done,
  isCurrent,
  label,
  index,
  color,
  compact,
}: {
  done: boolean;
  isCurrent: boolean;
  label: string;
  index: number;
  color?: string | null;
  compact?: boolean;
}) {
  const ring = color && isCurrent ? { boxShadow: `0 0 0 2px ${color}` } : undefined;
  return (
    <div className={cn("flex flex-col items-center flex-1", compact ? "min-w-[64px]" : "min-w-[80px]")}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold",
          compact ? "size-8 text-xs" : "size-9 text-sm",
          done ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground",
        )}
        style={ring}
      >
        {done ? <CheckCircle2 className={compact ? "size-4" : "size-5"} /> : index + 1}
      </div>
      <div className={cn("mt-1 text-center font-medium", compact ? "text-[10px]" : "text-xs")}>{label}</div>
    </div>
  );
}

export function portalProgressPercent(
  progress: PortalPipelineProgress,
  legacyLeadStage?: string | null,
): number {
  if (progress.stages.length > 0) {
    return progress.progressPercent;
  }
  return stageProgressPercent(legacyLeadStage);
}
