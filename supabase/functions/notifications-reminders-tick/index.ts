// Scheduled reminder + escalation engine.
// Runs every N minutes via pg_cron. Idempotent via notification_reminder_state.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Recipient = { user_id: string };

// Escalation thresholds (minutes after due/started)
const TASK_ESCALATION = [
  { level: 0, minutes: 0,    role: "assignee" },   // primary
  { level: 1, minutes: 60,   role: "team_lead" },  // overdue 1h → team lead
  { level: 2, minutes: 240,  role: "admin" },      // overdue 4h → admin
];
const PAYMENT_VERIFY_SLA_MIN = 120;   // 2h
const URGENT_REVIEW_SLA_MIN  = 30;    // 30m
const PORTAL_MSG_SLA_MIN     = 60;    // 1h

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

async function logDelivery(
  sb: ReturnType<typeof admin>,
  row: { user_id?: string | null; category: string; channel: string; status: string; error?: string; metadata?: Record<string, unknown> },
) {
  await sb.from("notification_delivery_log").insert({
    user_id: row.user_id ?? null,
    category: row.category,
    channel: row.channel,
    status: row.status,
    error: row.error ?? null,
    metadata: (row.metadata ?? {}) as never,
  });
}

async function isMuted(sb: ReturnType<typeof admin>, userId: string, category: string) {
  const { data } = await sb.from("user_notification_prefs").select("muted_categories,escalation_alerts").eq("user_id", userId).maybeSingle();
  if (!data) return false;
  const muted = (data.muted_categories ?? []) as string[];
  return muted.includes(category);
}

async function sendReminder(
  sb: ReturnType<typeof admin>,
  args: {
    userIds: string[];
    category: string;
    title: string;
    body?: string;
    link?: string;
    entityType: string;
    entityId: string;
    kind: string;
    escalationLevel: number;
    severity?: string;
    clientId?: string | null;
  },
) {
  const uniq = Array.from(new Set(args.userIds.filter(Boolean)));
  if (uniq.length === 0) return;

  // Filter muted
  const allowed: string[] = [];
  for (const u of uniq) {
    if (!(await isMuted(sb, u, args.category))) allowed.push(u);
    else await logDelivery(sb, { user_id: u, category: args.category, channel: "reminder", status: "skipped", error: "muted" });
  }
  if (allowed.length === 0) return;

  const dedupeBase = `reminder:${args.kind}:${args.entityId}:L${args.escalationLevel}`;
  const rows = allowed.map((uid) => ({
    user_id: uid,
    category: args.category,
    severity: args.severity ?? "warning",
    title: args.title,
    body: args.body ?? null,
    link: args.link ?? null,
    entity_type: args.entityType,
    entity_id: args.entityId,
    dedupe_key: `${uid}:${dedupeBase}`,
    metadata: { escalation_level: args.escalationLevel, kind: args.kind } as never,
  }));
  const { error } = await sb.from("app_notifications").upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
  for (const uid of allowed) {
    await logDelivery(sb, { user_id: uid, category: args.category, channel: args.escalationLevel > 0 ? "escalation" : "reminder", status: error ? "failed" : "sent", error: error?.message, metadata: { entity_id: args.entityId, kind: args.kind, level: args.escalationLevel } });
  }

  // Update reminder state
  await sb.from("notification_reminder_state").upsert({
    entity_type: args.entityType,
    entity_id: args.entityId,
    kind: args.kind,
    escalation_level: args.escalationLevel,
    last_sent_at: new Date().toISOString(),
    next_eligible_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    metadata: { recipients: allowed.length } as never,
  });

  // Timeline audit
  if (args.clientId) {
    await sb.from("client_timeline").insert({
      client_id: args.clientId,
      event_type: args.escalationLevel > 0 ? "notification.escalation" : "notification.reminder",
      actor_id: null,
      summary: args.title,
      metadata: { kind: args.kind, level: args.escalationLevel, recipients: allowed.length, entity_id: args.entityId } as never,
    });
  }
}

async function findTeamLeads(sb: ReturnType<typeof admin>): Promise<string[]> {
  const { data } = await sb.from("user_roles").select("user_id").in("role", ["admin", "counselor"]);
  return (data ?? []).map((r: any) => r.user_id);
}
async function findAdmins(sb: ReturnType<typeof admin>): Promise<string[]> {
  const { data } = await sb.from("user_roles").select("user_id").eq("role", "admin");
  return (data ?? []).map((r: any) => r.user_id);
}

/** Notify assignees 1 hour before task due (once per task). */
async function processDueSoonTasks(sb: ReturnType<typeof admin>) {
  const now = Date.now();
  const inOneHour = new Date(now + 60 * 60 * 1000).toISOString();
  const { data: tasks } = await sb
    .from("client_tasks")
    .select("id,title,client_id,assigned_to,due_at,status,reminder_sent_at")
    .in("status", ["open", "in_progress"])
    .not("due_at", "is", null)
    .not("assigned_to", "is", null)
    .gt("due_at", new Date().toISOString())
    .lte("due_at", inOneHour)
    .is("reminder_sent_at", null)
    .limit(200);
  if (!tasks?.length) return 0;

  let count = 0;
  for (const t of tasks as any[]) {
    if (!t.assigned_to) continue;
    await sendReminder(sb, {
      userIds: [t.assigned_to],
      category: "new_task_assigned",
      title: `Task due soon: ${t.title}`,
      body: `Due at ${new Date(t.due_at).toLocaleString()}`,
      link: `/clients/${t.client_id}`,
      entityType: "client_task",
      entityId: t.id,
      kind: "due_soon",
      escalationLevel: 0,
      severity: "info",
      clientId: t.client_id,
    });
    await sb.from("client_tasks").update({ reminder_sent_at: new Date().toISOString() }).eq("id", t.id);
    count++;
  }
  return count;
}

/** Overdue tasks with escalation */
async function processOverdueTasks(sb: ReturnType<typeof admin>) {
  const { data: tasks } = await sb
    .from("client_tasks")
    .select("id,title,client_id,assigned_to,priority,due_at,status")
    .in("status", ["open", "in_progress"])
    .not("due_at", "is", null)
    .lt("due_at", new Date().toISOString())
    .limit(200);
  if (!tasks?.length) return 0;

  let count = 0;
  for (const t of tasks as any[]) {
    const overdueMin = Math.floor((Date.now() - new Date(t.due_at).getTime()) / 60000);
    // pick highest escalation reached
    const tier = [...TASK_ESCALATION].reverse().find((x) => overdueMin >= x.minutes) ?? TASK_ESCALATION[0];
    let userIds: string[] = [];
    if (tier.role === "assignee" && t.assigned_to) userIds = [t.assigned_to];
    else if (tier.role === "team_lead") userIds = await findTeamLeads(sb);
    else if (tier.role === "admin") userIds = await findAdmins(sb);

    // skip if state at this level already sent recently (<1h)
    const { data: st } = await sb.from("notification_reminder_state")
      .select("escalation_level,last_sent_at")
      .eq("entity_type", "client_task").eq("entity_id", t.id).eq("kind", "overdue").maybeSingle();
    if (st && (st as any).escalation_level >= tier.level && Date.now() - new Date((st as any).last_sent_at).getTime() < 60 * 60 * 1000) continue;

    await sendReminder(sb, {
      userIds,
      category: tier.level >= 2 ? "urgent_review_required" : "new_task_assigned",
      title: tier.level === 0 ? `Task overdue: ${t.title}` : tier.level === 1 ? `Escalation: overdue task "${t.title}"` : `Admin escalation: task "${t.title}" still overdue`,
      body: `Overdue by ${overdueMin} minute(s).`,
      link: `/clients/${t.client_id}`,
      entityType: "client_task",
      entityId: t.id,
      kind: "overdue",
      escalationLevel: tier.level,
      severity: tier.level >= 2 ? "critical" : "warning",
      clientId: t.client_id,
    });
    count++;
  }
  return count;
}

/** Pending payment verification (older than SLA) */
async function processPendingPayments(sb: ReturnType<typeof admin>) {
  const cutoff = new Date(Date.now() - PAYMENT_VERIFY_SLA_MIN * 60_000).toISOString();
  const { data: pays } = await sb
    .from("client_invoice_payments")
    .select("id,client_id,invoice_id,amount,currency,payment_status,created_at")
    .eq("payment_status", "pending_verification")
    .lt("created_at", cutoff)
    .is("archived_at", null)
    .limit(200);
  if (!pays?.length) return 0;
  const admins = await findAdmins(sb);
  let count = 0;
  for (const p of pays as any[]) {
    const { data: st } = await sb.from("notification_reminder_state")
      .select("last_sent_at").eq("entity_type", "client_invoice_payment").eq("entity_id", p.id).eq("kind", "pending_verification").maybeSingle();
    if (st && Date.now() - new Date((st as any).last_sent_at).getTime() < 4 * 60 * 60 * 1000) continue;
    await sendReminder(sb, {
      userIds: admins,
      category: "urgent_review_required",
      title: `Payment pending verification: ${p.currency} ${p.amount}`,
      link: `/clients/${p.client_id}`,
      entityType: "client_invoice_payment",
      entityId: p.id,
      kind: "pending_verification",
      escalationLevel: 0,
      severity: "warning",
      clientId: p.client_id,
    });
    count++;
  }
  return count;
}

/** Unread portal messages older than SLA */
async function processPortalMessages(sb: ReturnType<typeof admin>) {
  const cutoff = new Date(Date.now() - PORTAL_MSG_SLA_MIN * 60_000).toISOString();
  // Best-effort: chat_messages with unread count from client side
  const { data: msgs } = await sb
    .from("chat_messages")
    .select("id,client_id,sender_id,created_at")
    .lt("created_at", cutoff)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString())
    .limit(200);
  if (!msgs?.length) return 0;
  let count = 0;
  for (const m of msgs as any[]) {
    // notify any staff with access (owner + assigned)
    const { data: client } = await sb.from("clients").select("owner_id,assigned_counselor_id").eq("id", m.client_id).maybeSingle();
    const staff = [client?.owner_id, (client as any)?.assigned_counselor_id].filter(Boolean) as string[];
    if (!staff.length) continue;
    const { data: st } = await sb.from("notification_reminder_state")
      .select("last_sent_at").eq("entity_type", "chat_message").eq("entity_id", m.id).eq("kind", "unread_portal_message").maybeSingle();
    if (st && Date.now() - new Date((st as any).last_sent_at).getTime() < 6 * 60 * 60 * 1000) continue;
    await sendReminder(sb, {
      userIds: staff,
      category: "portal_message",
      title: `Unread portal message from client`,
      link: `/clients/${m.client_id}`,
      entityType: "chat_message",
      entityId: m.id,
      kind: "unread_portal_message",
      escalationLevel: 0,
      severity: "info",
      clientId: m.client_id,
    });
    count++;
  }
  return count;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Shared-secret gate. pg_cron passes `x-cron-secret`. Service-role JWT
  // (or absence of CRON_SECRET in older deployments) is also accepted so
  // existing rollout flows keep working.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const incoming = req.headers.get("x-cron-secret") ?? "";
    const auth = req.headers.get("Authorization") ?? "";
    const serviceRoleOk = auth === `Bearer ${SERVICE_ROLE}`;
    if (incoming !== cronSecret && !serviceRoleOk) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  const sb = admin();
  const started = Date.now();
  const result: Record<string, unknown> = { ok: true };
  try {
    result.due_soon_tasks = await processDueSoonTasks(sb);
    result.overdue_tasks   = await processOverdueTasks(sb);
    result.pending_payments = await processPendingPayments(sb);
    result.portal_messages = await processPortalMessages(sb);
    result.elapsed_ms = Date.now() - started;
    console.info("[reminders] tick", result);
  } catch (e) {
    result.ok = false;
    result.error = (e as Error).message;
    console.error("[reminders] error", e);
    await logDelivery(sb, { category: "reminder", channel: "reminder", status: "failed", error: (e as Error).message });
  }
  return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});