import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Sess { id: string; client_id: string | null; status: string; disposition: string | null; duration_seconds: number | null; start_time: string | null; created_at: string; client_name?: string; }

export function TodayCallsTab() {
  const [rows, setRows] = useState<Sess[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const since = new Date(); since.setHours(0,0,0,0);
      const { data: u } = await supabase.auth.getUser();
      const me = u?.user?.id;
      if (!me) return;
      const { data: agent } = await supabase.from("telephony_agents").select("id").eq("user_id", me).maybeSingle();
      let q = supabase.from("call_sessions")
        .select("id,client_id,status,disposition,duration_seconds,start_time,created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (agent?.id) q = q.eq("agent_id", agent.id);
      const { data: sess } = await q;
      const list = (sess ?? []) as Sess[];
      const ids = Array.from(new Set(list.map((r) => r.client_id).filter(Boolean) as string[]));
      const { data: clients } = ids.length ? await supabase.from("clients").select("id,full_name").in("id", ids) : { data: [] as { id: string; full_name: string }[] };
      const cm = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
      if (!alive) return;
      setRows(list.map((r) => ({ ...r, client_name: r.client_id ? cm.get(r.client_id) : undefined })));
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No calls today yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              {r.client_id ? (
                <Link to={`/clients/${r.client_id}`} className="font-medium hover:underline">{r.client_name ?? "Client"}</Link>
              ) : <span className="font-medium">Outbound call</span>}
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()} {r.duration_seconds != null && `· ${r.duration_seconds}s`}</div>
            </div>
            <div className="flex items-center gap-2">
              {r.disposition && <Badge variant="outline">{r.disposition}</Badge>}
              <Badge variant="secondary">{r.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}