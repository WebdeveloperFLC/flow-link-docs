import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STAGE_ORDER, stageProgressPercent } from "@/lib/portal";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortalApplication() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null} />;
}

function Inner({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<{ full_name: string|null; lead_stage: string|null; application_type: string|null; intake: string|null; interested_country: string|null; interested_course: string|null; owner_id: string|null }|null>(null);
  const [counselor, setCounselor] = useState<{ full_name: string|null; email: string|null }|null>(null);
  const [timeline, setTimeline] = useState<{ id: string; summary: string; event_type: string; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const c = await supabase.from("clients").select("full_name,lead_stage,application_type,intake,interested_country,interested_course,owner_id").eq("id", clientId).maybeSingle();
      setClient(c.data ?? null);
      if (c.data?.owner_id) {
        const p = await supabase.from("profiles").select("full_name,email").eq("id", c.data.owner_id).maybeSingle();
        setCounselor(p.data ?? null);
      }
      const tl = await supabase.from("client_timeline").select("id,summary,event_type,created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50);
      setTimeline((tl.data ?? []) as { id: string; summary: string; event_type: string; created_at: string }[]);
    })();
  }, [clientId]);

  const cur = STAGE_ORDER.findIndex(x => x.toLowerCase() === (client?.lead_stage ?? "").toLowerCase());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Application</h1>
        <p className="text-sm text-muted-foreground">Progress: {stageProgressPercent(client?.lead_stage)}%</p>
      </div>
      <Card className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Field label="Service" value={client?.application_type}/>
          <Field label="Country" value={client?.interested_country}/>
          <Field label="Course" value={client?.interested_course}/>
          <Field label="Intake" value={client?.intake}/>
          <Field label="Counselor" value={counselor?.full_name ?? counselor?.email}/>
        </div>
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {STAGE_ORDER.map((s, idx) => {
            const done = cur >= 0 && idx <= cur;
            return (
              <div key={s} className="flex flex-col items-center flex-1 min-w-[80px]">
                <div className={cn("size-9 rounded-full flex items-center justify-center text-sm font-bold",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {done ? <CheckCircle2 className="size-5"/> : idx+1}
                </div>
                <div className="text-xs mt-1 text-center font-medium">{s}</div>
              </div>
            );
          })}
        </div>
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