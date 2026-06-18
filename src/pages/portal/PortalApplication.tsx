import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPortalPipelineProgress, type PortalPipelineProgress } from "@/lib/portalPipelineProgress";
import { PortalPipelineProgressBar, portalProgressPercent } from "@/components/portal/PortalPipelineProgressBar";
import { fetchMasterItemsAll } from "@/lib/masters";
import { portalClientStatusLabel } from "@/lib/clientStatus";

export default function PortalApplication() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null} />;
}

function Inner({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<{
    full_name: string | null;
    lead_stage: string | null;
    status: string | null;
    application_type: string | null;
    intake: string | null;
    interested_country: string | null;
    interested_course: string | null;
    owner_id: string | null;
  } | null>(null);
  const [portalStatusLabel, setPortalStatusLabel] = useState<string | null>(null);
  const [counselor, setCounselor] = useState<{ full_name: string|null; email: string|null }|null>(null);
  const [timeline, setTimeline] = useState<{ id: string; summary: string; event_type: string; created_at: string }[]>([]);
  const [pipelineProgress, setPipelineProgress] = useState<PortalPipelineProgress>({
    pipelineId: null,
    pipelineName: null,
    currentStageId: null,
    currentStageLabel: null,
    progressPercent: 0,
    stages: [],
  });

  useEffect(() => {
    (async () => {
      const c = await supabase
        .from("clients")
        .select(
          "full_name,lead_stage,status,application_type,intake,interested_country,interested_course,owner_id",
        )
        .eq("id", clientId)
        .maybeSingle();
      setClient(c.data ?? null);
      const statusItems = await fetchMasterItemsAll("client_statuses");
      setPortalStatusLabel(portalClientStatusLabel(c.data?.status ?? null, statusItems));
      if (c.data?.owner_id) {
        const p = await supabase.from("profiles").select("full_name,email").eq("id", c.data.owner_id).maybeSingle();
        setCounselor(p.data ?? null);
      }
      const tl = await supabase.from("client_timeline").select("id,summary,event_type,created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50);
      setTimeline((tl.data ?? []) as { id: string; summary: string; event_type: string; created_at: string }[]);
      setPipelineProgress(await fetchPortalPipelineProgress(clientId));
    })();
  }, [clientId]);

  const progressLabel = `${portalProgressPercent(pipelineProgress, client?.lead_stage)}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Application</h1>
        <p className="text-sm text-muted-foreground">Progress: {progressLabel}</p>
      </div>
      <Card className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {portalStatusLabel && <Field label="Status" value={portalStatusLabel} />}
          <Field label="Service" value={client?.application_type}/>
          <Field label="Country" value={client?.interested_country}/>
          <Field label="Course" value={client?.interested_course}/>
          <Field label="Intake" value={client?.intake}/>
          <Field label="Counselor" value={counselor?.full_name ?? counselor?.email}/>
        </div>
        <PortalPipelineProgressBar
          progress={pipelineProgress}
          legacyLeadStage={client?.lead_stage}
        />
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Activity Timeline</h3>
        <ul className="divide-y">
          {timeline.length === 0 && <li className="text-sm text-muted-foreground py-4">No activity yet.</li>}
          {timeline.map((t) => (
            <li key={t.id} className="py-2.5 flex items-start gap-3">
              <span className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded mt-0.5">{t.event_type}</span>
              <div className="flex-1 text-sm">{t.summary}</div>
              <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}
