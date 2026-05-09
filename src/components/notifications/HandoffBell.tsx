import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface HandoffNotice {
  id: string;
  client_id: string;
  from_user: string;
  task_label: string | null;
  note: string | null;
  created_at: string;
  client_name?: string;
  from_name?: string;
}

const STORAGE_KEY = "handoffs:lastSeen";

export function HandoffBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<HandoffNotice[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const load = async () => {
      const { data } = await supabase
        .from("lead_handoffs")
        .select("id,client_id,from_user,task_label,note,created_at")
        .eq("to_user", user.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (!alive || !data) return;
      const enriched = await enrich(data as HandoffNotice[]);
      setItems(enriched);
      const lastSeen = localStorage.getItem(STORAGE_KEY) ?? "1970-01-01";
      setUnread(enriched.filter((n) => n.created_at > lastSeen).length);
    };

    const enrich = async (rows: HandoffNotice[]) => {
      const cIds = Array.from(new Set(rows.map((r) => r.client_id)));
      const uIds = Array.from(new Set(rows.map((r) => r.from_user)));
      const [{ data: clients }, { data: profiles }] = await Promise.all([
        supabase.from("clients").select("id,full_name").in("id", cIds),
        supabase.from("profiles").select("id,full_name,email").in("id", uIds),
      ]);
      const cm = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
      const pm = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
      return rows.map((r) => ({ ...r, client_name: cm.get(r.client_id) ?? "client", from_name: pm.get(r.from_user) ?? "teammate" }));
    };

    load();
    const ch = supabase
      .channel(`handoffs:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_handoffs", filter: `to_user=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as HandoffNotice;
          const [enriched] = await enrich([row]);
          if (!alive) return;
          setItems((prev) => [enriched, ...prev].slice(0, 15));
          setUnread((u) => u + 1);
          toast(`Lead assigned: ${enriched.client_name}`, {
            description: `From ${enriched.from_name}${enriched.task_label ? ` · ${enriched.task_label}` : ""}`,
          });
        },
      )
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);

  const markAllRead = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setUnread(0);
  };

  if (!user) return null;

  return (
    <Popover onOpenChange={(o) => { if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b text-sm font-semibold">Handoff notifications</div>
        <div className="max-h-80 overflow-y-auto divide-y">
          {items.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">Nothing yet.</div>}
          {items.map((n) => (
            <Link
              key={n.id}
              to={`/clients/${n.client_id}`}
              className="block px-3 py-2 hover:bg-muted/50"
            >
              <div className="text-sm"><span className="font-medium">{n.client_name}</span> assigned by {n.from_name}</div>
              {n.task_label && <div className="text-[11px] text-muted-foreground mt-0.5">{n.task_label}</div>}
              {n.note && <div className="text-[11px] text-muted-foreground italic line-clamp-2">{n.note}</div>}
              <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
