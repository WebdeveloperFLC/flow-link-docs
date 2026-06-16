import type { PipelineStage } from "@/hooks/useClientStage";

export type StageCompletion = {
  stageId: string;
  note: string | null;
  completedAt: string;
  completedBy: string | null;
};

export type StageCompletionLogAction = "tick" | "untick" | "note_cleared";

export type StageCompletionLogEntry = {
  id: string;
  stageId: string;
  action: StageCompletionLogAction;
  note: string | null;
  actorId: string | null;
  createdAt: string;
  stageLabel?: string;
  actorName?: string | null;
};

/** First unticked stage in sort order; if all ticked, last stage. */
export function deriveCurrentStageId(
  stages: PipelineStage[],
  completedStageIds: Set<string>,
): string | null {
  if (!stages.length) return null;
  const firstOpen = stages.find((s) => !completedStageIds.has(s.id));
  return firstOpen?.id ?? stages[stages.length - 1]!.id;
}

export function deriveCurrentStageIndex(
  stages: PipelineStage[],
  currentStageId: string | null,
): number {
  if (!currentStageId) return -1;
  return stages.findIndex((s) => s.id === currentStageId);
}

export function deriveStepNumber(currentIdx: number, total: number): number | null {
  if (total === 0) return null;
  if (currentIdx < 0) return 1;
  return currentIdx + 1;
}
