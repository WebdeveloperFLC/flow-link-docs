import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Workflow, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { subStatusesForStageKey } from "@/lib/stageSubStatuses";
import { ClientRefusalWorkflowDialog } from "@/components/clients/ClientRefusalWorkflowDialog";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

interface Pipeline {
  id: string;
  name: string;
  country: string;
  service_category: string;
}

type Props = {
  clientId: string;
  clientCountry?: string | null;
  destinationCountry?: string | null;
  caseClosed?: boolean;
  hasPipeline: boolean;
  pipelineId?: string | null;
  currentStageKey?: string | null;
  derivedCurrentStageId?: string | null;
  currentStageLabel?: string | null;
  busy?: boolean;
  onReload?: () => void;
};

/** Pipeline assign (no pipeline) + internal sub-status panel under the journey bar. */
export function ClientStageInternalPanel({
  clientId,
  clientCountry,
  destinationCountry,
  caseClosed,
  hasPipeline,
  pipelineId,
  currentStageKey,
  derivedCurrentStageId,
  currentStageLabel,
  busy = false,
  onReload,
}: Props) {
  const { canUpload } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [subStatus, setSubStatus] = useState("");
  const [subStatusNote, setSubStatusNote] = useState("");
  const [savedSubStatus, setSavedSubStatus] = useState("");
  const [savedSubStatusNote, setSavedSubStatusNote] = useState("");
  const [refusalOpen, setRefusalOpen] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  const loadClientMeta = async () => {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("internal_sub_status, internal_sub_status_note")
      .eq("id", clientId)
      .maybeSingle();
    const row = clientRow as { internal_sub_status?: string | null; internal_sub_status_note?: string | null };
    const st = row?.internal_sub_status ?? "";
    const note = row?.internal_sub_status_note ?? "";
    setSubStatus(st);
    setSubStatusNote(note);
    setSavedSubStatus(st);
    setSavedSubStatusNote(note);
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

  const subStatusOptions = useMemo(
    () => subStatusesForStageKey(currentStageKey ?? null),
    [currentStageKey],
  );

  const metaBusy = busy || assignBusy;
  const showRefusalActions = currentStageKey === "visa_refused" || currentStageKey === "decision_received";

  const onAssignPipeline = async (pipelineIdVal: string) => {
    setAssignBusy(true);
    try {
      const { data: first } = await supabase
        .from("pipeline_stages")
        .select("id, label")
        .eq("pipeline_id", pipelineIdVal)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (!first) {
        toast.error("Pipeline has no stages");
        return;
      }
      const pl = pipelines.find((p) => p.id === pipelineIdVal);
      const { error } = await supabase
        .from("clients")
        .update({
          pipeline_id: pipelineIdVal,
          current_stage_id: first.id,
          internal_sub_status: null,
          internal_sub_status_note: null,
        })
        .eq("id", clientId);
      if (error) throw error;
      await appendClientActivityLog({
        clientId,
        action: "pipeline_assigned",
        summary: "Pipeline assigned",
        newValue: pl?.name ?? pipelineIdVal,
        metadata: { pipeline_id: pipelineIdVal, first_stage: first.label },
      });
      toast.success("Pipeline assigned");
      onReload?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign pipeline");
    } finally {
      setAssignBusy(false);
    }
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
      await appendClientActivityLog({
        clientId,
        action: "internal_sub_status_changed",
        summary: "Internal sub-status updated",
        previousValue: [savedSubStatus, savedSubStatusNote].filter(Boolean).join(" — ") || "—",
        newValue: [subStatus, subStatusNote].filter(Boolean).join(" — ") || "—",
        metadata: {
          internal_sub_status: subStatus || null,
          internal_sub_status_note: subStatusNote || null,
        },
      });
      setSavedSubStatus(subStatus);
      setSavedSubStatusNote(subStatusNote);
      toast.success("Internal sub-status saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save sub-status");
    } finally {
      setAssignBusy(false);
    }
  };

  const onMarkRefused = async () => {
    if (!pipelineId) return;
    setAssignBusy(true);
    try {
      const { data: refusedStage } = await supabase
        .from("pipeline_stages")
        .select("id, label")
        .eq("pipeline_id", pipelineId)
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
        await appendClientActivityLog({
          clientId,
          action: "stage_changed",
          summary: "Marked as visa refused",
          newValue: refusedStage.label ?? "Visa refused",
        });
        toast.success("Marked as visa refused");
        onReload?.();
      } else {
        setRefusalOpen(true);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to mark refused");
    } finally {
      setAssignBusy(false);
    }
  };

  if (!hasPipeline) {
    return (
      <div className="px-4 sm:px-8 py-3 border-b bg-muted/20">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Workflow className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium">No pipeline assigned</span>
          {canUpload && !caseClosed && (
            <Select onValueChange={onAssignPipeline} disabled={metaBusy || !filteredPipelines.length}>
              <SelectTrigger className="max-w-sm h-8 text-xs">
                <SelectValue placeholder={filteredPipelines.length ? "Assign a pipeline…" : "No pipelines available"} />
              </SelectTrigger>
              <SelectContent>
                {filteredPipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{" "}
                    <span className="text-muted-foreground">
                      — {p.country} · {p.service_category}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    );
  }

  if (!canUpload || caseClosed) return null;

  return (
    <>
      <div className="px-4 sm:px-8 py-2 border-b bg-muted/10">
        <div className="rounded-md border bg-muted/20 p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Internal sub-status
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={subStatus || "__none__"}
              onValueChange={(v) => setSubStatus(v === "__none__" ? "" : v)}
              disabled={metaBusy}
            >
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue placeholder="Sub-status…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {subStatusOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
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
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => setRefusalOpen(true)}
                disabled={metaBusy}
              >
                <AlertTriangle className="size-3.5" /> Refusal workflow
              </Button>
            )}
          </div>
        </div>
      </div>
      {pipelineId && (
        <ClientRefusalWorkflowDialog
          open={refusalOpen}
          onOpenChange={setRefusalOpen}
          clientId={clientId}
          pipelineId={pipelineId}
          onComplete={onReload}
        />
      )}
    </>
  );
}
