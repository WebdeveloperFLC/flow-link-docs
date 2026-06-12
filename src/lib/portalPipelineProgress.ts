import { supabase } from "@/integrations/supabase/client";

export type PortalPipelineStage = {
  id: string;
  label: string;
  sort_order: number;
  color: string | null;
};

export type PortalPipelineProgress = {
  pipelineId: string | null;
  pipelineName: string | null;
  currentStageId: string | null;
  currentStageLabel: string | null;
  progressPercent: number;
  stages: PortalPipelineStage[];
};

/** Load client-visible pipeline stages for the portal progress bar. */
export async function fetchPortalPipelineProgress(clientId: string): Promise<PortalPipelineProgress> {
  const empty: PortalPipelineProgress = {
    pipelineId: null,
    pipelineName: null,
    currentStageId: null,
    currentStageLabel: null,
    progressPercent: 0,
    stages: [],
  };

  const { data: current } = await supabase
    .from("vw_client_current_stage")
    .select(
      "pipeline_id, pipeline_name, current_stage_id, client_label, stage_label, client_progress_percent, progress_percent",
    )
    .eq("client_id", clientId)
    .maybeSingle();

  if (!current?.pipeline_id) return empty;

  const { data: stages } = await supabase
    .from("vw_portal_stages")
    .select("id, label, sort_order, color")
    .eq("pipeline_id", current.pipeline_id)
    .order("sort_order");

  const stageList = (stages ?? []) as PortalPipelineStage[];
  const progress =
    current.client_progress_percent ??
    current.progress_percent ??
    (stageList.length && current.current_stage_id
      ? Math.round(
          ((stageList.findIndex((s) => s.id === current.current_stage_id) + 1) / stageList.length) * 100,
        )
      : 0);

  return {
    pipelineId: current.pipeline_id,
    pipelineName: current.pipeline_name,
    currentStageId: current.current_stage_id,
    currentStageLabel: current.client_label ?? current.stage_label,
    progressPercent: progress ?? 0,
    stages: stageList,
  };
}
