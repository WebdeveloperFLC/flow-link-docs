/** Phase 4 — WhatsApp in-app notifications (assignment, inbound, queue). */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export function whatsAppNotifyEnabled(): boolean {
  const v = (Deno.env.get("WHATSAPP_NOTIFY") || "true").toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

async function upsertNotif(
  admin: SupabaseClient,
  row: {
    user_id: string;
    category: string;
    title: string;
    body: string;
    dedupe_key: string;
    conversation_id: string;
    severity?: string;
  },
): Promise<void> {
  try {
    await admin.from("app_notifications").upsert({
      user_id: row.user_id,
      category: row.category,
      severity: row.severity ?? "info",
      title: row.title,
      body: row.body,
      link: "/whatsapp",
      entity_type: "whatsapp_conversation",
      entity_id: row.conversation_id,
      dedupe_key: row.dedupe_key,
      is_read: false,
    }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
  } catch (e) {
    console.warn("[whatsappNotifications]", e);
  }
}

export async function listQueueStaffUserIds(admin: SupabaseClient): Promise<string[]> {
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["telecaller", "admin", "administrator"]);

  return [...new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id))];
}

export async function notifyCounselorWhatsAppAssigned(
  admin: SupabaseClient,
  opts: {
    counselorId: string;
    conversationId: string;
    contactName?: string | null;
    branchLabel?: string | null;
  },
): Promise<void> {
  if (!whatsAppNotifyEnabled()) return;

  const name = opts.contactName?.trim() || "New contact";
  const branch = opts.branchLabel ? ` (${opts.branchLabel})` : "";

  await upsertNotif(admin, {
    user_id: opts.counselorId,
    category: "client_assigned",
    title: "WhatsApp helpline assigned",
    body: `${name}${branch} — new WhatsApp thread assigned to you.`,
    dedupe_key: `wa_assign:${opts.conversationId}:${opts.counselorId}`,
    conversation_id: opts.conversationId,
  });
}

export async function notifyCounselorInboundMessage(
  admin: SupabaseClient,
  opts: {
    counselorId: string;
    conversationId: string;
    contactLabel: string;
    preview: string;
    providerMessageId?: string | null;
  },
): Promise<void> {
  if (!whatsAppNotifyEnabled()) return;

  const dedupe = opts.providerMessageId
    ? `wa_inbound:${opts.conversationId}:${opts.providerMessageId}`
    : `wa_inbound:${opts.conversationId}:${Date.now()}`;

  await upsertNotif(admin, {
    user_id: opts.counselorId,
    category: "portal_message",
    title: "New WhatsApp message",
    body: `${opts.contactLabel}: ${opts.preview.slice(0, 120)}`,
    dedupe_key: dedupe,
    conversation_id: opts.conversationId,
    severity: "info",
  });
}

export async function notifyQueueUnassignedThread(
  admin: SupabaseClient,
  opts: {
    conversationId: string;
    contactLabel: string;
    reason: "intake_complete" | "new_message";
  },
): Promise<void> {
  if (!whatsAppNotifyEnabled()) return;

  const staffIds = await listQueueStaffUserIds(admin);
  if (!staffIds.length) return;

  const title = opts.reason === "intake_complete"
    ? "WhatsApp lead needs assignment"
    : "Unassigned WhatsApp message";

  const body = opts.reason === "intake_complete"
    ? `${opts.contactLabel} completed intake — assign a counselor.`
    : `${opts.contactLabel} messaged the helpline — thread unassigned.`;

  const dedupeSuffix = opts.reason === "intake_complete" ? "intake" : "msg";

  for (const uid of staffIds) {
    await upsertNotif(admin, {
      user_id: uid,
      category: "new_task_assigned",
      title,
      body,
      dedupe_key: `wa_queue:${opts.conversationId}:${dedupeSuffix}:${uid}`,
      conversation_id: opts.conversationId,
      severity: "warning",
    });
  }
}
