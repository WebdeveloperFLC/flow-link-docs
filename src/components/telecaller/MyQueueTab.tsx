import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, ChevronRight, Search, Clock, Forward } from "lucide-react";
import { listMyQueue, snoozeItem, type QueueItemWithClient } from "@/lib/telecallerQueue";
import { applyContactMask } from "@/lib/masking";
import { CallDrawer } from "./CallDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_TONES: Record<string, string> = {
  hot: "bg-red-500/15 text-red-700 border-red-500/30",
  warm: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  cold: "bg-blue-500/15 text-blue-700 border-blue-500/30",
};

export function MyQueueTab({ mask }: { mask: boolean }) {
  const [items, setItems] = useState<QueueItemWithClient[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<QueueItemWithClient | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try { setItems(await listMyQueue({ limit: 200 })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load queue"); }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("queue-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_queue_items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) =>
      !q || i.client.full_name.toLowerCase().includes(q) || (i.client.country ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const next = filtered[0] ?? null;

  return (
    <div className="space-y-4">
      {next && (
        <Card className="p-4 border-primary/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Next up</div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold text-lg">{next.client.full_name}</div>
              <div className="text-sm text-muted-foreground font-mono">
                {applyContactMask({ phone: next.client.phone, email: next.client.email, mask }).phone}
              </div>
              <div className="text-xs text-muted-foreground">{next.client.country} · {next.client.application_type}</div>
              {next.notes && <div className="text-xs italic mt-1 text-muted-foreground">{next.notes.slice(0, 120)}</div>}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setActive(next); setOpen(true); }}><Phone className="size-4 mr-1.5" />Call</Button>
              <Button variant="outline" onClick={async () => { await snoozeItem(next.id, 1); load(); }}><Clock className="size-4 mr-1.5" />Skip 1h</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search queue..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y">
          {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No leads in queue.</div>}
          {filtered.slice(1).map((it) => {
            const masked = applyContactMask({ phone: it.client.phone, email: it.client.email, mask });
            return (
              <div key={it.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/30 cursor-pointer"
                   onClick={() => { setActive(it); setOpen(true); }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{it.client.full_name}</div>
                    {it.lead_status && <Badge variant="outline" className={STATUS_TONES[it.lead_status] ?? "text-xs"}>{it.lead_status}</Badge>}
                    {it.status === "callback" && <Badge variant="secondary" className="text-[10px]">Callback</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{masked.phone}</span> · {it.client.country}
                    {it.next_call_at && ` · due ${new Date(it.next_call_at).toLocaleString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setActive(it); setOpen(true); }}><Forward className="size-4" /></Button>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <CallDrawer item={active} mask={mask} open={open} onOpenChange={setOpen} onChanged={load} />
    </div>
  );
}