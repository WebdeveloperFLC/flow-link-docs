import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listHandoffs, type HandoffRow } from "@/lib/handoffs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
};

export function HandoffHistoryCard({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<HandoffRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const refresh = () => listHandoffs(clientId).then(setRows).catch(() => {});
  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`handoffs:${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_handoffs", filter: `client_id=eq.${clientId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.flatMap((r) => [r.from_user, r.to_user]))).filter((id) => !names[id]);
    if (!ids.length) return;
    supabase.from("profiles").select("id,full_name,email").in("id", ids).then(({ data }) => {
      if (!data) return;
      setNames((prev) => {
        const n = { ...prev };
        for (const r of data) n[r.id] = r.full_name || r.email || r.id.slice(0, 6);
        return n;
      });
    });
  }, [rows, names]);

  const respond = async (row: HandoffRow, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("lead_handoffs")
      .update({ status, responded_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("client_timeline").insert({
      client_id: clientId,
      event_type: "handoff",
      actor_id: user?.id,
      summary: `Handoff ${status}`,
      metadata: { handoff_id: row.id, status } as never,
    });
    toast.success(`Handoff ${status}`);
  };

  const currentOwner = rows.find((r) => (r as HandoffRow & { status?: string }).status === "accepted") ?? rows[0];

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b">
        <div className="font-semibold flex items-center gap-2"><ArrowRightLeft className="size-4" /> Handoff history</div>
        {currentOwner && (
          <div className="text-xs text-muted-foreground mt-1">
            Current owner: <span className="font-medium text-foreground">{names[currentOwner.to_user] ?? "…"}</span>
            <span className="ml-1 text-[10px] uppercase tracking-wider">({currentOwner.to_role})</span>
          </div>
        )}
      </div>
      <div className="divide-y max-h-80 overflow-y-auto">
        {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No handoffs yet.</div>}
        {rows.map((r) => {
          const status = (r as HandoffRow & { status?: string }).status ?? "pending";
          const canRespond = status === "pending" && r.to_user === user?.id;
          return (
            <div key={r.id} className="px-6 py-3">
              <div className="text-sm flex items-center gap-2 flex-wrap">
                <span className="font-medium">{names[r.from_user] ?? "…"}</span>
                <span className="text-muted-foreground text-xs">({r.from_role})</span>
                <ArrowRightLeft className="size-3 text-muted-foreground" />
                <span className="font-medium">{names[r.to_user] ?? "…"}</span>
                <span className="text-muted-foreground text-xs">({r.to_role})</span>
                <span className={cn("ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold", STATUS_TONE[status])}>{status}</span>
              </div>
              {(r.task_label || r.note) && (
                <div className="text-xs text-muted-foreground mt-1">
                  {r.task_label && <span className="font-medium text-foreground">{r.task_label}</span>}
                  {r.task_label && r.note && <span> · </span>}
                  {r.note}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
              {canRespond && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => respond(r, "accepted")}><Check className="size-3.5 mr-1" /> Accept</Button>
                  <Button size="sm" variant="ghost" onClick={() => respond(r, "rejected")}><X className="size-3.5 mr-1" /> Reject</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
