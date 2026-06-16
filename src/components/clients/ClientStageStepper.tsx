import { useClientStage } from "@/hooks/useClientStage";
import { StageJourneyBar } from "@/components/clients/StageJourneyBar";
import { StageCheckboxPicker } from "@/components/clients/StageCheckboxPicker";
import { ClientServiceSwitcher } from "@/components/clients/ClientServiceSwitcher";
import { OUTCOME_BADGE } from "@/lib/caseOutcomeStyles";
import type { CaseOutcome } from "@/lib/clientServiceCase";
import type { ReactNode } from "react";

type Props = {
  clientId: string;
  clientCountry?: string | null;
  refreshKey?: number;
  activeServiceLabel?: string | null;
  caseId?: string | null;
  caseClosed?: boolean;
  caseOutcome?: CaseOutcome | null;
  onStageChanged?: () => void;
  onServiceSwitched?: () => void;
  /** When false, render nothing (non-visa active service). */
  visible?: boolean;
};

export function ClientStageStepper({
  clientId,
  clientCountry,
  refreshKey = 0,
  activeServiceLabel,
  caseId,
  caseClosed,
  caseOutcome,
  onStageChanged,
  onServiceSwitched,
  visible = true,
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

  if (!visible || !hasPipeline) {
    return null;
  }

  const pipelineTitle = activeServiceLabel?.trim() || "Visa application";

  const headerActions: ReactNode = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ClientServiceSwitcher
        clientId={clientId}
        clientCountry={clientCountry}
        onSwitched={onServiceSwitched}
        visaOnly
        variant="compact"
      />
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
  );

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
        canUpload={canUpload}
        onClearNote={(id) => afterChange(() => clearStageNote(id))}
        clearing={busy}
      />
    </div>
  );
}
