/**
 * vw_client_current_stage.stage_order is pipeline_stages.sort_order (10, 20, 50…),
 * not a 1-based step index. Use array position for "step N of M" UI.
 */
export function pipelineStepDisplay(
  currentIdx: number,
  stagesLength: number,
  totalStagesFromView?: number | null,
): { step: number | null; total: number } {
  const total = stagesLength > 0 ? stagesLength : Math.max(totalStagesFromView ?? 0, 0);
  const step = currentIdx >= 0 ? currentIdx + 1 : null;
  return { step, total };
}
