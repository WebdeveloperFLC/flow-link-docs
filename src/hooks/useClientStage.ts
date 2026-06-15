import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { subStatusesForStageKey } from "@/lib/stageSubStatuses";
import { useAuth } from "@/contexts/AuthContext";

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  key: string;
  label: string;
  client_label: string | null;
  sort_order: number;
  color: string | null;
}

export interface ClientCurrentStage {
  client_id: string;
  pipeline_id: string | null;
  pipeline_name: string | null;
  current_stage_id: string | null;
  stage_label: string | null;
  stage_key: string | null;
  stage_order: number | null;
  total_stages: number | null;
  progress_percent: number | null;
}

export function useClientStage(
  clientId: string,
  refreshKey = 0,
  options?: { clientCountry?: string | null; destinationCountry?: string | null },
) {
  const { canUpload } = useAuth();
  const [current, setCurrent] = useState<ClientCurrentStage | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    const { data: cur } = await supabase
      .from("vw_client_current_stage")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    setCurrent((cur as ClientCurrentStage) ?? null);

    if (cur?.pipeline_id) {
      const { data: st } = await supabase
        .from("pipeline_stages")
        .select("id, pipeline_id, key, label, client_label, sort_order, color")
        .eq("pipeline_id", cur.pipeline_id)
        .order("sort_order");
      setStages((st ?? []) as PipelineStage[]);
    } else {
      setStages([]);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const currentIdx = useMemo(
    () => stages.findIndex((s) => s.id === current?.current_stage_id),
    [stages, current?.current_stage_id],
  );

  const onChangeStage = useCallback(
    async (stageId: string) => {
      if (stageId === current?.current_stage_id) return;
      setBusy(true);
      try {
        const nextStage = stages.find((s) => s.id === stageId);
        const { data: clientRow } = await supabase
          .from("clients")
          .select("internal_sub_status")
          .eq("id", clientId)
          .maybeSingle();
        const subStatus = (clientRow as { internal_sub_status?: string | null })?.internal_sub_status ?? "";
        const patch: Record<string, unknown> = { current_stage_id: stageId };
        if (nextStage && subStatus && !subStatusesForStageKey(nextStage.key).includes(subStatus)) {
          patch.internal_sub_status = null;
          patch.internal_sub_status_note = null;
        }
        const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
        if (error) throw error;
        toast.success("Stage updated");
        await load();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to update stage");
      } finally {
        setBusy(false);
      }
    },
    [clientId, current?.current_stage_id, stages, load],
  );

  const advance = useCallback(async () => {
    if (currentIdx < 0 || currentIdx >= stages.length - 1) return;
    await onChangeStage(stages[currentIdx + 1]!.id);
  }, [currentIdx, stages, onChangeStage]);

  const canAdvance = canUpload && currentIdx >= 0 && currentIdx < stages.length - 1 && !busy;

  const displayLabel = (stage: PipelineStage) =>
    stage.client_label?.trim() || stage.label;

  const stepNumber = currentIdx >= 0 ? currentIdx + 1 : null;
  const stepTotal = stages.length > 0 ? stages.length : (current?.total_stages ?? 0);

  return {
    current,
    stages,
    busy,
    canUpload,
    currentIdx,
    stepNumber,
    stepTotal,
    canAdvance,
    load,
    onChangeStage,
    advance,
    displayLabel,
    hasPipeline: !!current?.pipeline_id,
  };
}
