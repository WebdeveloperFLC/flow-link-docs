import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listTimeline, subscribeTimeline, type TimelineRow } from "@/lib/timeline";
import { supabase } from "@/integrations/supabase/client";
import { Phone, ArrowRightLeft, MessageSquare, FileText, StickyNote, CheckCircle2, Mic, History, Search, Activity, UserCog, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  call: Phone, handoff: ArrowRightLeft, chat: MessageSquare, file: FileText,
  note: StickyNote, task: CheckCircle2, recording: Mic, remark: History,
  status_change: Activity, assignment: UserCog, reminder: Bell,
};

const FILTERS: Array<{ key: string; label: string; types: string[] }> = [
  { key: "all", label: "All", types: [] },
  { key: "call", label: "Calls", types: ["call", "recording"] },
  { key: "chat", label: "Chat", types: ["chat"] },
  { key: "handoff", label: "Handoffs", types: ["handoff", "assignment"] },
  { key: "task", label: "Tasks", types: ["task", "reminder"] },
  { key: "file", label: "Documents", types: ["file"] },
  { key: "note", label: "Notes", types: ["note", "remark"] },
  { key: "status", label: "Status", types: ["status_change"] },
];
const PAGE_SIZE = 50;

export function ClientTimelineCard({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listTimeline(clientId, limit + 1).then((r) => {
      if (!alive) return;
      setHasMore(r.length > limit);
      setRows(r.slice(0, limit));
    }).catch(() => {}).finally(() => setLoading(false));
    const off = subscribeTimeline(clientId, (row) => {
      setRows((prev) => prev.some((x) => x.id === row.id) ? prev : [row, ...prev]);
    });
    return () => { alive = false; off(); };
  }, [clientId, limit]);

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

  const filtered = useMemo(() => {
    const allowed = FILTERS.find((f) => f.key === filter)?.types ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (allowed.length && !allowed.includes(r.event_type)) return false;
      if (q && !((r.summary ?? "").toLowerCase().includes(q) || r.event_type.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, filter, search]);

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b">
        <div className="font-semibold flex items-center gap-2">
          <History className="size-4" /> Activity timeline
          <span className="text-xs text-muted-foreground font-normal ml-auto">{filtered.length} event{filtered.length === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider font-semibold transition",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}>
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto min-w-[180px]">
            <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-7 h-8 text-xs" />
          </div>
        </div>
      </div>
      <div className="divide-y max-h-[480px] overflow-y-auto">
        {filtered.length === 0 && !loading && <div className="p-6 text-sm text-muted-foreground text-center">No activity matches your filters.</div>}
        {filtered.map((row) => {
          const Icon = ICONS[row.event_type] ?? History;
          return (
            <div key={row.id} className="px-6 py-3 flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-muted p-1.5"><Icon className="size-3.5 text-muted-foreground" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">{row.event_type.replace("_", " ")}</span>
                  <span>{row.summary || row.event_type}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {row.actor_id ? (names[row.actor_id] ?? "…") : "system"} · {new Date(row.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div className="p-3 text-center">
            <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)} disabled={loading}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
