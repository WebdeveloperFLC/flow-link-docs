import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { listTimeline, subscribeTimeline, type TimelineRow } from "@/lib/timeline";
import { supabase } from "@/integrations/supabase/client";
import { Phone, ArrowRightLeft, MessageSquare, FileText, StickyNote, CheckCircle2, Mic, History } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  call: Phone, handoff: ArrowRightLeft, chat: MessageSquare, file: FileText,
  note: StickyNote, task: CheckCircle2, recording: Mic, remark: History,
};

export function ClientTimelineCard({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    listTimeline(clientId).then((r) => { if (alive) setRows(r); }).catch(() => {});
    const off = subscribeTimeline(clientId, (row) => {
      setRows((prev) => prev.some((x) => x.id === row.id) ? prev : [row, ...prev]);
    });
    return () => { alive = false; off(); };
  }, [clientId]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])).filter((id) => !names[id]);
    if (!ids.length) return;
    supabase.from("profiles").select("id,full_name,email").in("id", ids).then(({ data }) => {
      if (!data) return;
      setNames((prev) => {
        const next = { ...prev };
        for (const r of data) next[r.id] = r.full_name || r.email || r.id.slice(0, 6);
        return next;
      });
    });
  }, [rows, names]);

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b font-semibold flex items-center gap-2">
        <History className="size-4" /> Activity timeline
      </div>
      <div className="divide-y max-h-[480px] overflow-y-auto">
        {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No activity yet.</div>}
        {rows.map((row) => {
          const Icon = ICONS[row.event_type] ?? History;
          return (
            <div key={row.id} className="px-6 py-3 flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-muted p-1.5"><Icon className="size-3.5 text-muted-foreground" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{row.summary || row.event_type}</div>
                <div className="text-[11px] text-muted-foreground">
                  {row.actor_id ? (names[row.actor_id] ?? "…") : "system"} · {new Date(row.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
