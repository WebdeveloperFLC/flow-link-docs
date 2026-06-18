import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  deriveCurrentStageId,
  deriveCurrentStageIndex,
  deriveStepNumber,
  type StageCompletion,
  type StageCompletionLogEntry,
  type StageCompletionLogAction,
} from "@/lib/clientStageCompletions";
import { useAuth } from "@/contexts/AuthContext";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

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
  options?: {
    clientCountry?: string | null;
    destinationCountry?: string | null;
    caseId?: string | null;
    caseClosed?: boolean;
  },
) {
  const { canUpload: authCanUpload, user } = useAuth();
  const caseId = options?.caseId ?? null;
  const caseClosed = options?.caseClosed ?? false;
  const canUpload = authCanUpload && !caseClosed;
  const [current, setCurrent] = useState<ClientCurrentStage | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [completions, setCompletions] = useState<StageCompletion[]>([]);
  const [completionLog, setCompletionLog] = useState<StageCompletionLogEntry[]>([]);
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
      const compQuery = supabase
        .from("client_stage_completions")
        .select("stage_id, note, completed_at, completed_by")
        .eq("client_id", clientId);
      if (caseId) compQuery.eq("case_id", caseId);

      const logQuery = supabase
        .from("client_stage_completion_log")
        .select("id, stage_id, action, note, actor_id, created_at, pipeline_stages(label)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (caseId) logQuery.eq("case_id", caseId);

      const [{ data: st }, { data: compRows }, { data: logRows }] = await Promise.all([
        supabase
          .from("pipeline_stages")
          .select("id, pipeline_id, key, label, client_label, sort_order, color")
          .eq("pipeline_id", cur.pipeline_id)
          .order("sort_order"),
        compQuery,
        logQuery,
      ]);
      setStages((st ?? []) as PipelineStage[]);
      setCompletions(
        ((compRows ?? []) as Array<{
          stage_id: string;
          note: string | null;
          completed_at: string;
          completed_by: string | null;
        }>).map((r) => ({
          stageId: r.stage_id,
          note: r.note,
          completedAt: r.completed_at,
          completedBy: r.completed_by,
        })),
      );

      const rawLog = (logRows ?? []) as Array<{
        id: string;
        stage_id: string;
        action: string;
        note: string | null;
        actor_id: string | null;
        created_at: string;
        pipeline_stages?: { label?: string } | null;
      }>;
      const actorIds = [...new Set(rawLog.map((r) => r.actor_id).filter(Boolean))] as string[];
      let actorNames = new Map<string, string>();
      if (actorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds);
        actorNames = new Map(
          ((profs ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [
            p.id,
            p.full_name ?? "Staff",
          ]),
        );
      }
      setCompletionLog(
        rawLog.map((r) => ({
          id: r.id,
          stageId: r.stage_id,
          action: r.action as StageCompletionLogAction,
          note: r.note,
          actorId: r.actor_id,
          createdAt: r.created_at,
          stageLabel: r.pipeline_stages?.label,
          actorName: r.actor_id ? (actorNames.get(r.actor_id) ?? null) : null,
        })),
      );
    } else {
      setStages([]);
      setCompletions([]);
      setCompletionLog([]);
    }
  }, [clientId, caseId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const completedStageIds = useMemo(
    () => new Set(completions.map((c) => c.stageId)),
    [completions],
  );

  const completionNotes = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of completions) map.set(c.stageId, c.note);
    return map;
  }, [completions]);

  const derivedCurrentStageId = useMemo(
    () => deriveCurrentStageId(stages, completedStageIds),
    [stages, completedStageIds],
  );

  const currentIdx = useMemo(
    () => deriveCurrentStageIndex(stages, derivedCurrentStageId),
    [stages, derivedCurrentStageId],
  );

  const syncCurrentStage = useCallback(
    async (nextStageId: string | null) => {
      if (!nextStageId || nextStageId === current?.current_stage_id) return;
      const nextStage = stages.find((s) => s.id === nextStageId);
      const patch: Record<string, unknown> = { current_stage_id: nextStageId };
      const prevStage = stages.find((s) => s.id === current?.current_stage_id);
      const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
      if (error) throw error;
      if (nextStage && prevStage?.id !== nextStage.id) {
        await appendClientActivityLog({
          clientId,
          action: "stage_changed",
          summary: "Current stage updated",
          previousValue: prevStage ? (prevStage.client_label?.trim() || prevStage.label) : "—",
          newValue: nextStage.client_label?.trim() || nextStage.label,
          metadata: { stage_id: nextStageId, pipeline_id: current?.pipeline_id },
        });
      }
    },
    [clientId, current?.current_stage_id, current?.pipeline_id, stages],
  );

  const tickStage = useCallback(
    async (stageId: string, note?: string | null) => {
      if (!current?.pipeline_id || completedStageIds.has(stageId)) return;
      setBusy(true);
      try {
        const { error: compErr } = await supabase.from("client_stage_completions").insert({
          client_id: clientId,
          case_id: caseId,
          pipeline_id: current.pipeline_id,
          stage_id: stageId,
          note: note?.trim() || null,
          completed_by: user?.id ?? null,
        });
        if (compErr) throw compErr;

        const { error: logErr } = await supabase.from("client_stage_completion_log").insert({
          client_id: clientId,
          case_id: caseId,
          pipeline_id: current.pipeline_id,
          stage_id: stageId,
          action: "tick",
          note: note?.trim() || null,
          actor_id: user?.id ?? null,
        });
        if (logErr) throw logErr;

        const tickStageRow = stages.find((s) => s.id === stageId);
        const tickLabel = tickStageRow ? (tickStageRow.client_label?.trim() || tickStageRow.label) : "Stage";
        await appendClientActivityLog({
          clientId,
          action: "stage_completed",
          summary: `Stage completed: ${tickLabel}`,
          newValue: note?.trim() ? `${tickLabel}\nNote: ${note.trim()}` : tickLabel,
          metadata: { stage_id: stageId, note: note?.trim() || null },
        });

        const nextCompleted = new Set(completedStageIds);
        nextCompleted.add(stageId);
        await syncCurrentStage(deriveCurrentStageId(stages, nextCompleted));
        toast.success("Stage marked done");
        await load();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to mark stage");
      } finally {
        setBusy(false);
      }
    },
    [clientId, caseId, current?.pipeline_id, completedStageIds, stages, syncCurrentStage, load, user?.id],
  );

  const untickStage = useCallback(
    async (stageId: string) => {
      if (!current?.pipeline_id || !completedStageIds.has(stageId)) return;
      setBusy(true);
      try {
        const existingNote = completionNotes.get(stageId) ?? null;
        let delQuery = supabase
          .from("client_stage_completions")
          .delete()
          .eq("client_id", clientId)
          .eq("stage_id", stageId);
        if (caseId) delQuery = delQuery.eq("case_id", caseId);
        const { error: delErr } = await delQuery;
        if (delErr) throw delErr;

        const { error: logErr } = await supabase.from("client_stage_completion_log").insert({
          client_id: clientId,
          case_id: caseId,
          pipeline_id: current.pipeline_id,
          stage_id: stageId,
          action: "untick",
          note: existingNote,
          actor_id: user?.id ?? null,
        });
        if (logErr) throw logErr;

        const stage = stages.find((s) => s.id === stageId);
        const stageLabel = stage ? (stage.client_label?.trim() || stage.label) : "Stage";
        await appendClientActivityLog({
          clientId,
          action: "stage_uncompleted",
          summary: `Stage unmarked: ${stageLabel}`,
          previousValue: stageLabel,
          metadata: { stage_id: stageId, note: existingNote },
        });

        const nextCompleted = new Set(completedStageIds);
        nextCompleted.delete(stageId);
        await syncCurrentStage(deriveCurrentStageId(stages, nextCompleted));
        toast.success("Stage unmarked");
        await load();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to unmark stage");
      } finally {
        setBusy(false);
      }
    },
    [
      clientId,
      caseId,
      current?.pipeline_id,
      completedStageIds,
      completionNotes,
      stages,
      syncCurrentStage,
      load,
      user?.id,
    ],
  );

  const clearStageNote = useCallback(
    async (stageId: string) => {
      if (!current?.pipeline_id || !completedStageIds.has(stageId)) return;
      const existingNote = completionNotes.get(stageId)?.trim();
      if (!existingNote) return;
      setBusy(true);
      try {
        let noteQuery = supabase
          .from("client_stage_completions")
          .update({ note: null })
          .eq("client_id", clientId)
          .eq("stage_id", stageId);
        if (caseId) noteQuery = noteQuery.eq("case_id", caseId);
        const { error: updErr } = await noteQuery;
        if (updErr) throw updErr;

        const { error: logErr } = await supabase.from("client_stage_completion_log").insert({
          client_id: clientId,
          case_id: caseId,
          pipeline_id: current.pipeline_id,
          stage_id: stageId,
          action: "note_cleared",
          note: existingNote,
          actor_id: user?.id ?? null,
        });
        if (logErr) throw logErr;

        const stage = stages.find((s) => s.id === stageId);
        const stageLabel = stage ? (stage.client_label?.trim() || stage.label) : "Stage";
        await appendClientActivityLog({
          clientId,
          action: "stage_note_cleared",
          summary: `Stage note cleared: ${stageLabel}`,
          previousValue: existingNote ?? undefined,
          metadata: { stage_id: stageId },
        });

        toast.success("Note cleared — stage stays done");
        await load();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to clear note");
      } finally {
        setBusy(false);
      }
    },
    [clientId, caseId, current?.pipeline_id, completedStageIds, completionNotes, load, user?.id],
  );

  const displayLabel = (stage: PipelineStage) => stage.client_label?.trim() || stage.label;

  const stepNumber = deriveStepNumber(currentIdx, stages.length);
  const stepTotal = stages.length > 0 ? stages.length : (current?.total_stages ?? 0);

  const isStageDone = useCallback(
    (stageId: string) => completedStageIds.has(stageId),
    [completedStageIds],
  );

  const isStageCurrent = useCallback(
    (stageId: string) => stageId === derivedCurrentStageId,
    [derivedCurrentStageId],
  );

  return {
    current,
    stages,
    busy,
    canUpload,
    currentIdx,
    stepNumber,
    stepTotal,
    load,
    tickStage,
    untickStage,
    clearStageNote,
    displayLabel,
    hasPipeline: !!current?.pipeline_id,
    completedStageIds,
    completionNotes,
    completionLog,
    derivedCurrentStageId,
    isStageDone,
    isStageCurrent,
    caseClosed,
  };
}
