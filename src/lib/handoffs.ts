import { supabase } from "@/integrations/supabase/client";
import { notifyUsers } from "@/lib/appNotifications";
import type { AppRole } from "@/contexts/AuthContext";

export type HandoffDirection = "tc_to_co" | "co_to_tc" | "tc_to_tc" | "co_to_co";

export interface HandoffRow {
  id: string;
  client_id: string;
  from_user: string;
  to_user: string;
  from_role: string | null;
  to_role: string | null;
  direction: HandoffDirection;
  note: string | null;
  task_label: string | null;
  created_at: string;
}

export const TASK_LABELS = [
  "Call tomorrow",
  "Callback after 3 days",
  "Collect documents",
  "Ask for IELTS score",
  "Fee discussion",
  "Parent call needed",
] as const;

function deriveDirection(from: AppRole | string, to: AppRole | string): HandoffDirection | null {
  const map: Record<string, HandoffDirection> = {
    "telecaller-counselor": "tc_to_co",
    "counselor-telecaller": "co_to_tc",
    "telecaller-telecaller": "tc_to_tc",
    "counselor-counselor": "co_to_co",
  };
  return map[`${from}-${to}`] ?? null;
}

export async function pushHandoff(opts: {
  clientId: string;
  toUserId: string;
  toRole: AppRole | string;
  fromRole: AppRole | string;
  note?: string;
  taskLabel?: string;
  clientName?: string;
}): Promise<HandoffRow> {
  const { data: u } = await supabase.auth.getUser();
  const fromUser = u?.user?.id;
  if (!fromUser) throw new Error("Not signed in");
  const direction = deriveDirection(opts.fromRole, opts.toRole);
  if (!direction) throw new Error("Handoffs only between counselors and telecallers");

  const { data, error } = await supabase
    .from("lead_handoffs")
    .insert({
      client_id: opts.clientId,
      from_user: fromUser,
      to_user: opts.toUserId,
      from_role: opts.fromRole,
      to_role: opts.toRole,
      direction,
      note: opts.note?.trim() || null,
      task_label: opts.taskLabel?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Notify the recipient (best-effort — must not block)
  notifyUsers({
    userIds: [opts.toUserId],
    category: "client_assigned",
    severity: "info",
    title: `Lead handed off to you${opts.clientName ? `: ${opts.clientName}` : ""}`,
    body: opts.taskLabel ? `Task: ${opts.taskLabel}${opts.note ? ` — ${opts.note}` : ""}` : (opts.note ?? undefined),
    link: `/clients/${opts.clientId}`,
    entityType: "lead_handoff",
    entityId: data.id,
    dedupeKey: `handoff:${data.id}`,
  });

  // Append timeline event (best-effort)
  await supabase.from("client_timeline").insert({
    client_id: opts.clientId,
    event_type: "handoff",
    actor_id: fromUser,
    summary: `Handoff (${direction})${opts.taskLabel ? ` · ${opts.taskLabel}` : ""}`,
    metadata: { note: opts.note ?? null, taskLabel: opts.taskLabel ?? null, direction, toUser: opts.toUserId },
  });

  return data as HandoffRow;
}

export async function listHandoffs(clientId: string): Promise<HandoffRow[]> {
  const { data, error } = await supabase
    .from("lead_handoffs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HandoffRow[];
}
