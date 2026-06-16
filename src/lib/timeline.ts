import { supabase } from "@/integrations/supabase/client";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

export type TimelineEventType = "call" | "remark" | "handoff" | "chat" | "note" | "task" | "file" | "recording";

const STAFF_ONLY_EVENT_TYPES = new Set([
  "remark",
  "handoff",
  "call",
  "recording",
  "note",
  "ai_summary",
  "services_updated",
]);

export interface TimelineRow {
  id: string;
  client_id: string;
  event_type: TimelineEventType | string;
  actor_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  is_staff_only?: boolean;
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
  isStaffOnly?: boolean;
}) {
  const { data: u } = await supabase.auth.getUser();
  const actor = u?.user?.id ?? null;
  const isStaffOnly = opts.isStaffOnly ?? STAFF_ONLY_EVENT_TYPES.has(opts.eventType);
  await supabase.from("client_timeline").insert({
    client_id: opts.clientId,
    event_type: opts.eventType,
    actor_id: actor,
    summary: opts.summary ?? null,
    metadata: (opts.metadata ?? {}) as never,
    is_staff_only: isStaffOnly,
  } as never);
  await appendClientActivityLog({
    clientId: opts.clientId,
    action: opts.eventType,
    summary: opts.summary ?? opts.eventType.replace(/_/g, " "),
    previousValue:
      typeof opts.metadata?.previous_value === "string" ? opts.metadata.previous_value : null,
    newValue: typeof opts.metadata?.new_value === "string" ? opts.metadata.new_value : opts.summary ?? null,
    metadata: opts.metadata ?? {},
  }).catch(() => {});
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
  return () => {
    supabase.removeChannel(ch);
  };
}
