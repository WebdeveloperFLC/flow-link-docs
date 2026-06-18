import { supabase } from "@/integrations/supabase/client";
import { resolvePrimaryUserName } from "@/lib/leadAssignment";

export interface ClientActivityLogRow {
  id: string;
  client_id: string;
  lead_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  summary: string | null;
  previous_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ROLE_PRIORITY = ["admin", "counselor", "documentation", "telecaller", "viewer"] as const;

let cachedRoles: { userId: string; roles: string[]; at: number } | null = null;

function pickPrimaryRole(roles: string[]): string {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? "staff";
}

async function resolveActorRole(userId: string | null): Promise<string | null> {
  if (!userId) return "system";
  const now = Date.now();
  if (cachedRoles?.userId === userId && now - cachedRoles.at < 60_000) {
    return pickPrimaryRole(cachedRoles.roles);
  }
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => String(r.role));
  cachedRoles = { userId, roles, at: now };
  return pickPrimaryRole(roles);
}

export function formatActivityAction(action: string): string {
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function listClientActivityLog(
  clientId: string,
  limit = 100,
): Promise<ClientActivityLogRow[]> {
  const { data, error } = await supabase
    .from("client_activity_log" as never)
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ClientActivityLogRow[];
}

export function subscribeClientActivityLog(
  clientId: string,
  onRow: (row: ClientActivityLogRow) => void,
): () => void {
  const ch = supabase
    .channel(`client-activity:${clientId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "client_activity_log",
        filter: `client_id=eq.${clientId}`,
      },
      (payload) => onRow(payload.new as ClientActivityLogRow),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

export async function appendClientActivityLog(opts: {
  clientId: string;
  action: string;
  summary?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
  leadId?: string | null;
  actorId?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  createdAt?: string | null;
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const actorId = opts.actorId ?? u?.user?.id ?? null;
  const actorRole = await resolveActorRole(actorId);
  const row: Record<string, unknown> = {
    client_id: opts.clientId,
    lead_id: opts.leadId ?? null,
    actor_id: actorId,
    actor_role: actorRole,
    action: opts.action,
    summary: opts.summary ?? null,
    previous_value: opts.previousValue ?? null,
    new_value: opts.newValue ?? null,
    metadata: opts.metadata ?? {},
  };
  if (opts.sourceTable) row.source_table = opts.sourceTable;
  if (opts.sourceId) row.source_id = opts.sourceId;
  if (opts.createdAt) row.created_at = opts.createdAt;
  const { error } = await supabase.from("client_activity_log" as never).insert(row as never);
  if (error) console.warn("[clientActivityLog]", error.message);
}

/** Copy lead lifecycle entries onto a newly converted client record. */
export async function copyLeadHistoryToClientActivity(
  leadId: string,
  clientId: string,
): Promise<void> {
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return;

  const l = lead as {
    id: string;
    lead_number: string;
    first_name: string;
    last_name: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    lead_temperature: string;
    notes: string | null;
    converted_at: string | null;
    assigned_counselor_id: string | null;
  };

  const name = [l.first_name, l.last_name].filter(Boolean).join(" ");
  const actorId = l.created_by;

  await appendClientActivityLog({
    clientId,
    leadId,
    action: "lead_created",
    summary: "Lead created",
    newValue: `${l.lead_number} — ${name}`,
    metadata: { lead_number: l.lead_number, lead_temperature: l.lead_temperature },
    actorId,
  });

  if (l.assigned_counselor_id) {
    const ownerName = await resolvePrimaryUserName(l.assigned_counselor_id);
    await appendClientActivityLog({
      clientId,
      leadId,
      action: "lead.primary_user_assigned",
      summary: "Primary user assigned",
      newValue: ownerName ?? l.assigned_counselor_id,
      metadata: { assigned_counselor_id: l.assigned_counselor_id },
      actorId,
    });
  }

  if (l.updated_at && l.updated_at !== l.created_at) {
    await appendClientActivityLog({
      clientId,
      leadId,
      action: "lead_updated",
      summary: "Lead updated",
      metadata: { updated_at: l.updated_at },
      actorId,
    });
  }

  if (l.notes?.trim()) {
    await appendClientActivityLog({
      clientId,
      leadId,
      action: "note_added",
      summary: "Lead notes",
      newValue: l.notes.trim(),
      actorId,
    });
  }

  const { copyLeadFollowupLogToClientActivity } = await import("@/lib/leadFollowupLog");
  await copyLeadFollowupLogToClientActivity(leadId, clientId);

  await appendClientActivityLog({
    clientId,
    leadId,
    action: "lead_converted",
    summary: "Lead converted to client",
    newValue: name,
    metadata: { lead_number: l.lead_number, converted_at: l.converted_at },
    actorId,
  });

  const { data: leadActivityRows } = await supabase
    .from("activity_logs")
    .select("id, action, details, user_id, created_at")
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .order("created_at", { ascending: true });
  for (const row of leadActivityRows ?? []) {
    const r = row as {
      id: string;
      action: string;
      details: Record<string, unknown> | null;
      user_id: string | null;
      created_at: string;
    };
    await appendClientActivityLog({
      clientId,
      leadId,
      action: r.action,
      summary: r.action.replace(/[._]/g, " "),
      newValue: typeof r.details?.summary === "string" ? r.details.summary : null,
      metadata: { ...(r.details ?? {}), source_activity_log_id: r.id },
      actorId: r.user_id,
    });
  }
}

/** Shallow diff helper for profile / contact saves. */
export function diffRecordFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): { field: string; previous: string; next: string }[] {
  const changes: { field: string; previous: string; next: string }[] = [];
  for (const field of fields) {
    const prev = before[field];
    const next = after[field];
    const prevStr = prev == null || prev === "" ? "" : String(prev);
    const nextStr = next == null || next === "" ? "" : String(next);
    if (prevStr !== nextStr) {
      changes.push({ field, previous: prevStr || "—", next: nextStr || "—" });
    }
  }
  return changes;
}

export function formatFieldChanges(
  changes: { field: string; previous: string; next: string }[],
): { previousValue: string; newValue: string } {
  const previousValue = changes.map((c) => `${c.field}: ${c.previous}`).join("\n");
  const newValue = changes.map((c) => `${c.field}: ${c.next}`).join("\n");
  return { previousValue, newValue };
}
