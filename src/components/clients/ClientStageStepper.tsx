import { useClientStage } from "@/hooks/useClientStage";
import { StageJourneyBar } from "@/components/clients/StageJourneyBar";
import { StageCheckboxPicker } from "@/components/clients/StageCheckboxPicker";
import { ClientStageInternalPanel } from "@/components/clients/ClientStageInternalPanel";
import { OUTCOME_BADGE } from "@/lib/caseOutcomeStyles";
import type { CaseOutcome } from "@/lib/clientServiceCase";
import type { ReactNode } from "react";

type Props = {
  clientId: string;
  clientCountry?: string | null;
  destinationCountry?: string | null;
  refreshKey?: number;
  activeServiceLabel?: string | null;
  caseId?: string | null;
  caseClosed?: boolean;
  caseOutcome?: CaseOutcome | null;
  onStageChanged?: () => void;
  onServiceSwitched?: () => void;
};

export function ClientStageStepper({
  clientId,
  clientCountry,
  destinationCountry,
  refreshKey = 0,
  activeServiceLabel,
  caseId,
  caseClosed,
  caseOutcome,
  onStageChanged,
}: Props) {
  const {
    current,
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
    load,
    derivedCurrentStageId,
  } = useClientStage(clientId, refreshKey, { clientCountry, destinationCountry, caseId, caseClosed });

  const afterChange = async (fn: () => Promise<void>) => {
    await fn();
    onStageChanged?.();
  };

  const pipelineTitle = activeServiceLabel?.trim() || "Application workflow";
  const currentStageKey =
    current?.stage_key ?? stages.find((s) => s.id === derivedCurrentStageId)?.key ?? null;

  const headerActions: ReactNode =
    canUpload && hasPipeline && stages.length > 0 && !caseClosed ? (
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
    ) : null;

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
      {hasPipeline && (
        <>
          <div className="px-4 sm:px-8 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground truncate min-w-0">
              {pipelineTitle}
              <span className="ml-2 text-foreground/80">
                · stage {stepNumber ?? "?"} of {stepTotal}
              </span>
            </div>
            {headerActions}
          </div>
          <StageJourneyBar
            stages={stages}
            isStageDone={isStageDone}
            isStageCurrent={isStageCurrent}
            completionNotes={completionNotes}
            displayLabel={displayLabel}
            canUpload={canUpload && !caseClosed}
            onClearNote={(id) => afterChange(() => clearStageNote(id))}
            clearing={busy}
          />
        </>
      )}
      <ClientStageInternalPanel
        clientId={clientId}
        clientCountry={clientCountry}
        destinationCountry={destinationCountry}
        caseClosed={caseClosed}
        hasPipeline={hasPipeline}
        pipelineId={current?.pipeline_id}
        currentStageKey={currentStageKey}
        derivedCurrentStageId={derivedCurrentStageId}
        currentStageLabel={current?.stage_label}
        busy={busy}
        onReload={() => {
          void load();
          onStageChanged?.();
        }}
      />
    </div>
  );
}
