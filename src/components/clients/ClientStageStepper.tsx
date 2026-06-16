import { Workflow } from "lucide-react";
import { useClientStage } from "@/hooks/useClientStage";
import { StageJourneyBar } from "@/components/clients/StageJourneyBar";
import { StageCheckboxPicker } from "@/components/clients/StageCheckboxPicker";
import { OUTCOME_BADGE } from "@/lib/caseOutcomeStyles";
import type { CaseOutcome } from "@/lib/clientServiceCase";

type Props = {
  clientId: string;
  refreshKey?: number;
  activeServiceLabel?: string | null;
  caseId?: string | null;
  caseClosed?: boolean;
  caseOutcome?: CaseOutcome | null;
  onStageChanged?: () => void;
};

export function ClientStageStepper({
  clientId,
  refreshKey = 0,
  activeServiceLabel,
  caseId,
  caseClosed,
  caseOutcome,
  onStageChanged,
}: Props) {
  const {
    stages,
    busy,
    canUpload,
    stepNumber,
    stepTotal,
    tickStage,
    untickStage,
    clearStageNote,
    displayLabel,
    hasPipeline,
    completedStageIds,
    completionNotes,
    isStageDone,
    isStageCurrent,
  } = useClientStage(clientId, refreshKey, { caseId, caseClosed });

  const afterChange = async (fn: () => Promise<void>) => {
    await fn();
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

  const pipelineTitle = activeServiceLabel?.trim() || "Application pipeline";

  return (
    <div className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
      {caseClosed && (
        <div
          className={`px-4 sm:px-8 py-1.5 text-xs border-b flex flex-wrap gap-x-3 font-medium ${
            caseOutcome && OUTCOME_BADGE[caseOutcome]
              ? OUTCOME_BADGE[caseOutcome].className
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <span>
            Case closed
            {caseOutcome && OUTCOME_BADGE[caseOutcome]
              ? ` — ${OUTCOME_BADGE[caseOutcome].label}`
              : caseOutcome
                ? ` — ${caseOutcome}`
                : ""}
            . Journey is read-only.
          </span>
        </div>
      )}
      <div className="px-4 sm:px-8 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground truncate">
          {pipelineTitle}
          <span className="ml-2 text-foreground/80">
            · {stepNumber ?? "?"} / {stepTotal}
          </span>
        </div>
        {canUpload && stages.length > 0 && (
          <StageCheckboxPicker
            stages={stages}
            completedStageIds={completedStageIds}
            completionNotes={completionNotes}
            displayLabel={displayLabel}
            disabled={busy}
            onTick={(id, note) => afterChange(() => tickStage(id, note))}
            onUntick={(id) => afterChange(() => untickStage(id))}
            onClearNote={(id) => afterChange(() => clearStageNote(id))}
            triggerClassName="flex"
          />
        )}
      </div>
      <StageJourneyBar
        stages={stages}
        isStageDone={isStageDone}
        isStageCurrent={isStageCurrent}
        completionNotes={completionNotes}
        displayLabel={displayLabel}
        canUpload={canUpload}
        onClearNote={(id) => afterChange(() => clearStageNote(id))}
        clearing={busy}
      />
    </div>
  );
}
