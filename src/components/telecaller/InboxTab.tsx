import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRightLeft } from "lucide-react";

interface Row { id: string; client_id: string; from_user: string; task_label: string | null; note: string | null; created_at: string; client_name?: string; from_name?: string; }

export function InboxTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("lead_handoffs").select("id,client_id,from_user,task_label,note,created_at")
        .eq("to_user", user.id)
        .order("created_at", { ascending: false }).limit(50);
      const list = (data ?? []) as Row[];
      const cIds = Array.from(new Set(list.map((r) => r.client_id)));
      const uIds = Array.from(new Set(list.map((r) => r.from_user)));
      const [{ data: clients }, { data: profs }] = await Promise.all([
        cIds.length ? supabase.from("clients").select("id,full_name").in("id", cIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
        uIds.length ? supabase.from("profiles").select("id,full_name,email").in("id", uIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
      ]);
      const cm = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
      const pm = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email]));
      if (!alive) return;
      setRows(list.map((r) => ({ ...r, client_name: cm.get(r.client_id), from_name: pm.get(r.from_user) ?? "teammate" })));
    };
    load();
    const ch = supabase.channel(`inbox:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_handoffs", filter: `to_user=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);

  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No handoffs received.</div>}
        {rows.map((r) => (
          <Link key={r.id} to={`/clients/${r.client_id}`} className="block p-4 hover:bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-muted p-2"><ArrowRightLeft className="size-4 text-muted-foreground" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{r.client_name ?? "Client"}</div>
                  {r.task_label && <Badge variant="secondary">{r.task_label}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">From {r.from_name} · {new Date(r.created_at).toLocaleString()}</div>
                {r.note && <div className="text-sm mt-1 italic text-muted-foreground">{r.note}</div>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}