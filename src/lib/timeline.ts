import { supabase } from "@/integrations/supabase/client";

export type TimelineEventType =
  | "call" | "remark" | "handoff" | "chat" | "note" | "task" | "file" | "recording";

export interface TimelineRow {
  id: string;
  client_id: string;
  event_type: TimelineEventType | string;
  actor_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function listTimeline(clientId: string, limit = 100): Promise<TimelineRow[]> {
  const { data, error } = await supabase
    .from("client_timeline")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TimelineRow[];
}

export async function appendTimeline(opts: {
  clientId: string;
  eventType: TimelineEventType | string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: u } = await supabase.auth.getUser();
  const actor = u?.user?.id ?? null;
  await supabase.from("client_timeline").insert({
    client_id: opts.clientId,
    event_type: opts.eventType,
    actor_id: actor,
    summary: opts.summary ?? null,
    metadata: (opts.metadata ?? {}) as never,
  });
}

export function subscribeTimeline(clientId: string, onEvent: (row: TimelineRow) => void) {
  const ch = supabase
    .channel(`timeline:${clientId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "client_timeline", filter: `client_id=eq.${clientId}` },
      (payload) => onEvent(payload.new as TimelineRow),
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
