import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ChevronDown, Workflow, Check, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { subStatusesForStageKey } from "@/lib/stageSubStatuses";
import { ClientRefusalWorkflowDialog } from "@/components/clients/ClientRefusalWorkflowDialog";
import { AddTaskDialog } from "@/components/clients/AddTaskDialog";
import { pipelineStepDisplay } from "@/lib/pipelineStageDisplay";

interface Pipeline { id: string; name: string; country: string; service_category: string; }
interface Stage {
  id: string;
  pipeline_id: string;
  key: string;
  label: string;
  client_label: string | null;
  sort_order: number;
  color: string | null;
}
interface CurrentStage {
  client_id: string; pipeline_id: string | null; pipeline_name: string | null;
  current_stage_id: string | null; stage_label: string | null; stage_key: string | null;
  stage_order: number | null; total_stages: number | null; progress_percent: number | null;
}
interface HistoryRow {
  id: string; stage_id: string; entered_at: string; entered_by: string | null; notes: string | null;
  label?: string; color?: string | null;
}

export function ClientStageCard({
  clientId,
  clientCountry,
  destinationCountry,
  activeServiceLabel,
}: {
  clientId: string;
  clientCountry?: string | null;
  destinationCountry?: string | null;
  /** Active visa/service label — shown instead of generic pipeline name when set. */
  activeServiceLabel?: string | null;
}) {
  const { canUpload } = useAuth();
  const [current, setCurrent] = useState<CurrentStage | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [subStatus, setSubStatus] = useState("");
  const [subStatusNote, setSubStatusNote] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refusalOpen, setRefusalOpen] = useState(false);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: cur }, { data: clientRow }] = await Promise.all([
      supabase.from("vw_client_current_stage").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("clients").select("internal_sub_status, internal_sub_status_note").eq("id", clientId).maybeSingle(),
    ]);
    setCurrent((cur as CurrentStage) ?? null);
    setSubStatus((clientRow as { internal_sub_status?: string | null })?.internal_sub_status ?? "");
    setSubStatusNote((clientRow as { internal_sub_status_note?: string | null })?.internal_sub_status_note ?? "");

    if (cur?.pipeline_id) {
      const { data: st } = await supabase
        .from("pipeline_stages")
        .select("id, pipeline_id, key, label, client_label, sort_order, color")
        .eq("pipeline_id", cur.pipeline_id)
        .order("sort_order");
      setStages((st ?? []) as Stage[]);

      const { data: hist } = await supabase
        .from("client_stage_history")
        .select("id, stage_id, entered_at, entered_by, notes, pipeline_stages(label, color)")
        .eq("client_id", clientId)
        .order("entered_at", { ascending: false })
        .limit(50);
      setHistory(((hist ?? []) as any[]).map((r) => ({
        id: r.id, stage_id: r.stage_id, entered_at: r.entered_at,
        entered_by: r.entered_by, notes: r.notes,
        label: r.pipeline_stages?.label, color: r.pipeline_stages?.color,
      })));
    } else {
      setStages([]); setHistory([]);
      const { data: pls } = await supabase
        .from("stage_pipelines")
        .select("id, name, country, service_category")
        .eq("is_active", true)
        .order("country");
      setPipelines((pls ?? []) as Pipeline[]);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId]);

  const filteredPipelines = useMemo(() => {
    const filterCountry = (destinationCountry ?? clientCountry)?.trim().toLowerCase();
    if (!filterCountry) return pipelines;
    const matching = pipelines.filter((p) => p.country.trim().toLowerCase() === filterCountry);
    return matching.length ? matching : pipelines;
  }, [pipelines, clientCountry, destinationCountry]);

  const currentStageKey = useMemo(() => {
    if (current?.stage_key) return current.stage_key;
    const stage = stages.find((s) => s.id === current?.current_stage_id);
    return stage?.key ?? null;
  }, [current, stages]);

  const subStatusOptions = useMemo(() => subStatusesForStageKey(currentStageKey), [currentStageKey]);

  const currentIdx = useMemo(
    () => stages.findIndex((s) => s.id === current?.current_stage_id),
    [stages, current?.current_stage_id],
  );
  const { step: stepNumber, total: stepTotal } = pipelineStepDisplay(
    currentIdx,
    stages.length,
    current?.total_stages,
  );

  const onAssignPipeline = async (pipelineId: string) => {
    setBusy(true);
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to assign pipeline");
    } finally { setBusy(false); }
  };

  const onChangeStage = async (stageId: string) => {
    if (stageId === current?.current_stage_id) return;
    setBusy(true);
    try {
      const nextStage = stages.find((s) => s.id === stageId);
      const patch: Record<string, unknown> = { current_stage_id: stageId };
      if (nextStage && subStatus && !subStatusesForStageKey(nextStage.key).includes(subStatus)) {
        patch.internal_sub_status = null;
        patch.internal_sub_status_note = null;
      }
      const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
      if (error) throw error;
      toast.success("Stage updated");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update stage");
    } finally { setBusy(false); }
  };

  const onSaveSubStatus = async () => {
    setBusy(true);
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save sub-status");
    } finally { setBusy(false); }
  };

  const onMarkRefused = async () => {
    if (!current?.pipeline_id) return;
    setBusy(true);
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to mark refused");
    } finally { setBusy(false); }
  };

  if (!current?.pipeline_id) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="size-4 text-muted-foreground" /> Application stage
        </div>
        {!canUpload ? (
          <p className="text-sm text-muted-foreground">No pipeline assigned.</p>
        ) : (
          <div className="flex items-center gap-2">
            <Select onValueChange={onAssignPipeline} disabled={busy || !filteredPipelines.length}>
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
  const pipelineTitle = activeServiceLabel?.trim() || current.pipeline_name;
  const pipelineSubtitle =
    activeServiceLabel?.trim() &&
    current.pipeline_name &&
    activeServiceLabel.trim().toLowerCase() !== current.pipeline_name.trim().toLowerCase()
      ? current.pipeline_name
      : null;

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Workflow className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{pipelineTitle}</span>
              <span className="text-xs font-normal text-muted-foreground shrink-0">
                · stage {stepNumber ?? "?"} of {stepTotal} · {current.progress_percent ?? 0}%
              </span>
            </div>
            {pipelineSubtitle && (
              <div className="text-[11px] text-muted-foreground mt-0.5 pl-6">
                Workflow: {pipelineSubtitle}
              </div>
            )}
          </div>
          {canUpload && (
            <Select value={current.current_stage_id ?? undefined} onValueChange={onChangeStage} disabled={busy}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Change stage…" /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="inline-block size-2 rounded-full mr-2 align-middle" style={{ background: s.color ?? "#6366f1" }} />
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {stages.map((s, i) => {
            const passed = i <= currentIdx;
            const isCurrent = s.id === current.current_stage_id;
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <div className={cn("h-0.5 w-4", passed ? "bg-primary" : "bg-muted")} />}
                <button
                  type="button"
                  disabled={!canUpload || busy}
                  onClick={() => onChangeStage(s.id)}
                  title={s.label}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors",
                    isCurrent && "border-primary bg-primary/10 font-semibold",
                    !isCurrent && passed && "border-primary/40 bg-primary/5",
                    !passed && "border-muted bg-muted/30 text-muted-foreground",
                    canUpload && !busy && "hover:bg-accent cursor-pointer",
                    (!canUpload || busy) && "cursor-default",
                  )}
                >
                  <span className="inline-block size-2 rounded-full" style={{ background: s.color ?? "#6366f1" }} />
                  {passed && !isCurrent && <Check className="size-3" />}
                  <span>{s.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {canUpload && (
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Internal sub-status
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={subStatus || "__none__"} onValueChange={(v) => setSubStatus(v === "__none__" ? "" : v)} disabled={busy}>
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
                disabled={busy}
              />
              <Button size="sm" variant="secondary" className="h-8" onClick={onSaveSubStatus} disabled={busy}>
                Save
              </Button>
              {!showRefusalActions && (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onMarkRefused} disabled={busy}>
                  <AlertTriangle className="size-3.5" /> Mark refused
                </Button>
              )}
              {showRefusalActions && (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setRefusalOpen(true)} disabled={busy}>
                  <AlertTriangle className="size-3.5" /> Refusal workflow
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAssignTaskOpen(true)} disabled={busy}>
                Assign task
              </Button>
            </div>
          </div>
        )}

        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
              <ChevronDown className={cn("size-3.5 mr-1 transition-transform", historyOpen && "rotate-180")} />
              Stage history ({history.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No history yet.</p>
            ) : (
              <div className="space-y-1.5">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs border-l-2 pl-2 py-1"
                    style={{ borderColor: h.color ?? "#6366f1" }}>
                    <span className="font-medium">{h.label ?? "—"}</span>
                    <span className="text-muted-foreground">· {formatDistanceToNow(new Date(h.entered_at), { addSuffix: true })}</span>
                    {h.notes && <span className="text-muted-foreground truncate">— {h.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {current.pipeline_id && (
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
        pipelineStageId={current?.current_stage_id}
        prefillTitle={
          current?.stage_label
            ? `Complete: ${current.stage_label}`
            : undefined
        }
      />
    </>
  );
}
