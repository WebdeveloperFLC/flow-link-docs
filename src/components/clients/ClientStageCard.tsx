import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ChevronDown, Workflow, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { subStatusesForStageKey } from "@/lib/stageSubStatuses";
import { ClientRefusalWorkflowDialog } from "@/components/clients/ClientRefusalWorkflowDialog";
import { AddTaskDialog } from "@/components/clients/AddTaskDialog";
import { useClientStage } from "@/hooks/useClientStage";
import { StageCheckboxPicker } from "@/components/clients/StageCheckboxPicker";
import { StageJourneyBar } from "@/components/clients/StageJourneyBar";

interface Pipeline { id: string; name: string; country: string; service_category: string; }

export function ClientStageCard({
  clientId,
  clientCountry,
  destinationCountry,
  activeServiceLabel,
  caseId,
  caseClosed,
}: {
  clientId: string;
  clientCountry?: string | null;
  destinationCountry?: string | null;
  activeServiceLabel?: string | null;
  caseId?: string | null;
  caseClosed?: boolean;
}) {
  const { canUpload } = useAuth();
  const {
    current,
    stages,
    busy,
    stepNumber,
    stepTotal,
    tickStage,
    untickStage,
    clearStageNote,
    displayLabel,
    hasPipeline,
    completedStageIds,
    completionNotes,
    completionLog,
    isStageDone,
    isStageCurrent,
    load,
    derivedCurrentStageId,
  } = useClientStage(clientId, 0, { clientCountry, destinationCountry, caseId, caseClosed });

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [subStatus, setSubStatus] = useState("");
  const [subStatusNote, setSubStatusNote] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refusalOpen, setRefusalOpen] = useState(false);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  const loadClientMeta = async () => {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("internal_sub_status, internal_sub_status_note")
      .eq("id", clientId)
      .maybeSingle();
    setSubStatus((clientRow as { internal_sub_status?: string | null })?.internal_sub_status ?? "");
    setSubStatusNote((clientRow as { internal_sub_status_note?: string | null })?.internal_sub_status_note ?? "");
  };

  useEffect(() => {
    void loadClientMeta();
  }, [clientId]);

  useEffect(() => {
    if (hasPipeline) return;
    (async () => {
      const { data: pls } = await supabase
        .from("stage_pipelines")
        .select("id, name, country, service_category")
        .eq("is_active", true)
        .order("country");
      setPipelines((pls ?? []) as Pipeline[]);
    })();
  }, [hasPipeline]);

  const filteredPipelines = useMemo(() => {
    const filterCountry = (destinationCountry ?? clientCountry)?.trim().toLowerCase();
    if (!filterCountry) return pipelines;
    const matching = pipelines.filter((p) => p.country.trim().toLowerCase() === filterCountry);
    return matching.length ? matching : pipelines;
  }, [pipelines, clientCountry, destinationCountry]);

  const currentStageKey = useMemo(() => {
    if (current?.stage_key) return current.stage_key;
    const stage = stages.find((s) => s.id === derivedCurrentStageId);
    return stage?.key ?? null;
  }, [current, stages, derivedCurrentStageId]);

  const subStatusOptions = useMemo(() => subStatusesForStageKey(currentStageKey), [currentStageKey]);

  const onAssignPipeline = async (pipelineId: string) => {
    setAssignBusy(true);
    try {
      const { data: first } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipelineId)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (!first) { toast.error("Pipeline has no stages"); return; }
      const { error } = await supabase
        .from("clients")
        .update({ pipeline_id: pipelineId, current_stage_id: first.id, internal_sub_status: null, internal_sub_status_note: null })
        .eq("id", clientId);
      if (error) throw error;
      toast.success("Pipeline assigned");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign pipeline");
    } finally { setAssignBusy(false); }
  };

  const onSaveSubStatus = async () => {
    setAssignBusy(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          internal_sub_status: subStatus || null,
          internal_sub_status_note: subStatusNote || null,
        })
        .eq("id", clientId);
      if (error) throw error;
      toast.success("Internal sub-status saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save sub-status");
    } finally { setAssignBusy(false); }
  };

  const onMarkRefused = async () => {
    if (!current?.pipeline_id) return;
    setAssignBusy(true);
    try {
      const { data: refusedStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", current.pipeline_id)
        .eq("key", "visa_refused")
        .maybeSingle();
      if (refusedStage?.id) {
        const { error } = await supabase
          .from("clients")
          .update({
            current_stage_id: refusedStage.id,
            internal_sub_status: "Reviewing refusal",
            status: "rejected",
          })
          .eq("id", clientId);
        if (error) throw error;
        toast.success("Marked as visa refused");
        await load();
      } else {
        setRefusalOpen(true);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to mark refused");
    } finally { setAssignBusy(false); }
  };

  if (!hasPipeline) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="size-4 text-muted-foreground" /> Application stage
        </div>
        {!canUpload ? (
          <p className="text-sm text-muted-foreground">No pipeline assigned.</p>
        ) : (
          <div className="flex items-center gap-2">
            <Select onValueChange={onAssignPipeline} disabled={assignBusy || !filteredPipelines.length}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder={filteredPipelines.length ? "Assign a pipeline…" : "No pipelines available"} />
              </SelectTrigger>
              <SelectContent>
                {filteredPipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} <span className="text-muted-foreground">— {p.country} · {p.service_category}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>
    );
  }

  const showRefusalActions = currentStageKey === "visa_refused" || currentStageKey === "decision_received";
  const pipelineTitle = activeServiceLabel?.trim() || current?.pipeline_name;
  const pipelineSubtitle =
    activeServiceLabel?.trim() &&
    current?.pipeline_name &&
    activeServiceLabel.trim().toLowerCase() !== current.pipeline_name.trim().toLowerCase()
      ? current.pipeline_name
      : null;
  const metaBusy = busy || assignBusy;

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Workflow className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{pipelineTitle}</span>
              <span className="text-xs font-normal text-muted-foreground shrink-0">
                · stage {stepNumber ?? "?"} of {stepTotal} · {current?.progress_percent ?? 0}%
              </span>
            </div>
            {pipelineSubtitle && (
              <div className="text-[11px] text-muted-foreground mt-0.5 pl-6">
                Workflow: {pipelineSubtitle}
              </div>
            )}
          </div>
          {canUpload && stages.length > 0 && (
            <StageCheckboxPicker
              stages={stages}
              completedStageIds={completedStageIds}
              completionNotes={completionNotes}
              displayLabel={displayLabel}
              disabled={metaBusy}
              onTick={tickStage}
              onUntick={untickStage}
              onClearNote={clearStageNote}
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
          compact
          canUpload={canUpload}
          onClearNote={clearStageNote}
          clearing={metaBusy}
        />

        {canUpload && (
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Internal sub-status
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={subStatus || "__none__"} onValueChange={(v) => setSubStatus(v === "__none__" ? "" : v)} disabled={metaBusy}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue placeholder="Sub-status…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {subStatusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-8 text-xs flex-1 min-w-[180px]"
                placeholder="Internal note (optional)"
                value={subStatusNote}
                onChange={(e) => setSubStatusNote(e.target.value)}
                disabled={metaBusy}
              />
              <Button size="sm" variant="secondary" className="h-8" onClick={onSaveSubStatus} disabled={metaBusy}>
                Save
              </Button>
              {!showRefusalActions && (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onMarkRefused} disabled={metaBusy}>
                  <AlertTriangle className="size-3.5" /> Mark refused
                </Button>
              )}
              {showRefusalActions && (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setRefusalOpen(true)} disabled={metaBusy}>
                  <AlertTriangle className="size-3.5" /> Refusal workflow
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAssignTaskOpen(true)} disabled={metaBusy}>
                Assign task
              </Button>
            </div>
          </div>
        )}

        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
              <ChevronDown className={cn("size-3.5 mr-1 transition-transform", historyOpen && "rotate-180")} />
              Stage history ({completionLog.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {completionLog.length === 0 ? (
              <p className="text-xs text-muted-foreground">No history yet.</p>
            ) : (
              <div className="space-y-1.5">
                {completionLog.map((h) => (
                  <div
                    key={h.id}
                    className={cn(
                      "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs border-l-2 pl-2 py-1",
                      h.action === "tick" && "border-emerald-500/50",
                      h.action === "untick" && "border-muted-foreground/30",
                      h.action === "note_cleared" && "border-slate-400/50",
                    )}
                  >
                    <span
                      className={cn(
                        "font-medium",
                        h.action === "tick" && "text-emerald-700 dark:text-emerald-400",
                        h.action === "untick" && "text-muted-foreground",
                        h.action === "note_cleared" && "text-slate-600 dark:text-slate-400",
                      )}
                    >
                      {h.action === "tick" && `✓ ${h.stageLabel ?? "—"}`}
                      {h.action === "untick" && `○ ${h.stageLabel ?? "—"}`}
                      {h.action === "note_cleared" && `✕ Note cleared — ${h.stageLabel ?? "—"}`}
                    </span>
                    <span className="text-muted-foreground">
                      · {formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}
                    </span>
                    {h.actorName && <span className="text-muted-foreground">· {h.actorName}</span>}
                    {h.note && (
                      <span className="text-muted-foreground truncate italic">
                        — &ldquo;{h.note}&rdquo;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {current?.pipeline_id && (
        <ClientRefusalWorkflowDialog
          open={refusalOpen}
          onOpenChange={setRefusalOpen}
          clientId={clientId}
          pipelineId={current.pipeline_id}
          onComplete={load}
        />
      )}
      <AddTaskDialog
        open={assignTaskOpen}
        onOpenChange={setAssignTaskOpen}
        clientId={clientId}
        applicationMode
        pipelineStageId={derivedCurrentStageId ?? undefined}
        prefillTitle={
          current?.stage_label
            ? `Complete: ${current.stage_label}`
            : undefined
        }
      />
    </>
  );
}
