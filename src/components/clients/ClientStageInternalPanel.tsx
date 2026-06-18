import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Workflow } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import { useMasterItems } from "@/lib/masters";
import { resolveClientStatusLabel } from "@/lib/clientStatus";

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
  busy?: boolean;
  onReload?: () => void;
};

/** Pipeline assign (no pipeline) + client status panel under the journey bar. Refusal next steps: Case outcome only. */
export function ClientStageInternalPanel({
  clientId,
  clientCountry,
  destinationCountry,
  caseClosed,
  hasPipeline,
  busy = false,
  onReload,
}: Props) {
  const { canUpload } = useAuth();
  const statusOptions = useMasterItems("client_statuses");
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [clientStatus, setClientStatus] = useState("in_progress");
  const [savedStatus, setSavedStatus] = useState("in_progress");
  const [assignBusy, setAssignBusy] = useState(false);

  const loadClientMeta = async () => {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("status")
      .eq("id", clientId)
      .maybeSingle();
    const st = (clientRow as { status?: string | null })?.status?.trim() || "in_progress";
    setClientStatus(st);
    setSavedStatus(st);
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

  const metaBusy = busy || assignBusy;
  const defaultStatusCode = statusOptions[0]?.code ?? "in_progress";

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

  const onSaveStatus = async () => {
    const next = clientStatus || defaultStatusCode;
    if (!next) {
      toast.error("Select a client status");
      return;
    }
    setAssignBusy(true);
    try {
      const { error } = await supabase.from("clients").update({ status: next }).eq("id", clientId);
      if (error) throw error;
      await appendClientActivityLog({
        clientId,
        action: "client_status_changed",
        summary: "Client status updated",
        previousValue: resolveClientStatusLabel(savedStatus, statusOptions),
        newValue: resolveClientStatusLabel(next, statusOptions),
        metadata: { status: next },
      });
      setSavedStatus(next);
      setClientStatus(next);
      toast.success("Client status saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save client status");
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
    <div className="px-4 sm:px-8 py-2 border-b bg-muted/10">
      <div className="rounded-md border bg-muted/20 p-3 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client status</div>
        <div className="flex flex-wrap gap-2">
          <Select value={clientStatus || defaultStatusCode} onValueChange={setClientStatus} disabled={metaBusy}>
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <SelectValue placeholder="Select status…" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.length === 0 ? (
                <SelectItem value="in_progress" disabled>
                  No statuses configured — add in Masters
                </SelectItem>
              ) : (
                statusOptions.map((opt) => (
                  <SelectItem key={opt.code} value={opt.code}>
                    {opt.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" className="h-8" onClick={onSaveStatus} disabled={metaBusy}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
