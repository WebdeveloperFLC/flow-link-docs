import { supabase } from "@/integrations/supabase/client";
import { notifyUsers } from "@/lib/appNotifications";
import { normalizePhoneE164 } from "./phone";
import type {
  WhatsAppAssignment,
  WhatsAppBusinessLine,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppMessageTemplate,
} from "./types";

export const DEFAULT_HELPLINE_LINE_ID = "a0000000-0000-4000-8000-000000000001";

const WA_SESSION_MS = 24 * 60 * 60 * 1000;

export function isWhatsAppSessionOpen(lastInboundAt: string | null | undefined): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < WA_SESSION_MS;
}

export function isWhatsAppInboxEnabled(): boolean {
  return import.meta.env.VITE_WHATSAPP_ENABLED !== "false";
}

export function buildWhatsAppInboxUrl(conversationId: string): string {
  return `/whatsapp?conversation=${encodeURIComponent(conversationId)}`;
}

export async function findConversationForContact(opts: {
  phone?: string | null;
  leadId?: string | null;
  clientId?: string | null;
}): Promise<WhatsAppConversation | null> {
  if (opts.leadId) {
    const { data, error } = await supabase
      .from("whatsapp_conversations" as any)
      .select("*")
      .eq("lead_id", opts.leadId)
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as WhatsAppConversation;
  }

  if (opts.clientId) {
    const { data, error } = await supabase
      .from("whatsapp_conversations" as any)
      .select("*")
      .eq("client_id", opts.clientId)
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as WhatsAppConversation;
  }

  const e164 = opts.phone ? normalizePhoneE164(opts.phone) : "";
  if (!e164) return null;

  const { data: exact, error: exactErr } = await supabase
    .from("whatsapp_conversations" as any)
    .select("*")
    .eq("phone_e164", e164)
    .neq("status", "closed")
    .maybeSingle();
  if (exactErr) throw exactErr;
  if (exact) return exact as WhatsAppConversation;

  const tail = e164.slice(-10);
  if (tail.length < 10) return null;

  const { data: rows, error: listErr } = await supabase
    .from("whatsapp_conversations" as any)
    .select("*")
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (listErr) throw listErr;

  for (const row of rows ?? []) {
    const digits = String((row as WhatsAppConversation).phone_e164 || "").replace(/\D/g, "");
    if (digits.endsWith(tail)) return row as WhatsAppConversation;
  }

  return null;
}

export async function listConversations(): Promise<WhatsAppConversation[]> {
  const { data, error } = await supabase
    .from("whatsapp_conversations" as any)
    .select("*")
    .neq("status", "closed")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as WhatsAppConversation[];
}

export async function listMessages(conversationId: string): Promise<WhatsAppMessage[]> {
  const { data, error } = await supabase
    .from("whatsapp_messages" as any)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WhatsAppMessage[];
}

function functionsBaseUrl(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (url) return url.replace(/\/$/, "");
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  return projectId ? `https://${projectId}.supabase.co` : null;
}

async function edgeAuthHeaders(): Promise<{ base: string; token: string; apikey: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("You must be signed in");

  const base = functionsBaseUrl();
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base || !apikey) throw new Error("Missing Supabase config");
  return { base, token, apikey };
}

function parseEdgeError(data: Record<string, unknown>, status: number, statusText: string): string {
  const err = String(data?.error || "");
  if (err.includes("conversation_id and text required")) {
    return "whatsapp-send needs redeploy — pull latest code and redeploy the whatsapp-send edge function";
  }
  if (err.includes("invalid json") && status === 400) {
    return "whatsapp-send needs redeploy — media attachments require the latest edge function";
  }
  return [data?.error, data?.hint].filter(Boolean).join(" — ")
    || statusText
    || `Edge function failed (${status})`;
}

async function postEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { base, token, apikey } = await edgeAuthHeaders();

  const res = await fetch(`${base}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseEdgeError(data, res.status, res.statusText));
  return data;
}

async function postEdgeFunctionMultipart(
  functionName: string,
  form: FormData,
): Promise<Record<string, unknown>> {
  const { base, token, apikey } = await edgeAuthHeaders();

  const res = await fetch(`${base}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey,
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseEdgeError(data, res.status, res.statusText));
  return data;
}

export async function resolveWhatsAppMediaUrl(
  messageId: string,
  storagePath?: string | null,
  mediaProviderId?: string | null,
): Promise<{
  url: string | null;
  error?: string;
  hint?: string;
}> {
  try {
    if (storagePath) {
      const { data, error } = await supabase.storage
        .from("whatsapp-media")
        .createSignedUrl(storagePath, 3600);
      if (!error && data?.signedUrl) return { url: data.signedUrl };
    }

    if (!mediaProviderId) {
      return { url: null, error: storagePath ? "sign failed" : "no media" };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { url: null, error: "not signed in" };

    const base = functionsBaseUrl();
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!base || !apikey) return { url: null, error: "missing supabase config" };

    const res = await fetch(`${base}/functions/v1/whatsapp-media-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey,
      },
      body: JSON.stringify({ message_id: messageId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { url: null, error: String(data?.error || res.statusText) };
    if (data?.error) {
      return {
        url: null,
        error: String(data.error),
        hint: data.hint ? String(data.hint) : undefined,
      };
    }
    return { url: data?.url ?? null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_conversations" as any)
    .update({ unread_count_staff: 0 })
    .eq("id", conversationId);
  if (error) throw error;
}

export type StaffReplyMedia = {
  file: File;
  mime_type: string;
  message_type: "image" | "document";
  filename?: string;
};

export async function sendStaffReply(
  conversationId: string,
  _userId: string,
  body: string,
  media?: StaffReplyMedia,
): Promise<{ meta_sent: boolean }> {
  let data: Record<string, unknown>;

  if (media) {
    const form = new FormData();
    form.append("conversation_id", conversationId);
    form.append("text", body.trim());
    form.append("file", media.file, media.filename || media.file.name);
    form.append("mime_type", media.mime_type);
    form.append("message_type", media.message_type);
    if (media.filename) form.append("filename", media.filename);
    data = await postEdgeFunctionMultipart("whatsapp-send", form);
  } else {
    data = await postEdgeFunction("whatsapp-send", {
      conversation_id: conversationId,
      text: body.trim(),
    });
  }

  if (data?.error) throw new Error(String(data.error));
  return { meta_sent: !!data?.meta_sent };
}

export async function listMessageTemplates(): Promise<WhatsAppMessageTemplate[]> {
  const { data, error } = await supabase
    .from("whatsapp_message_templates" as any)
    .select("*")
    .eq("active", true)
    .order("label", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as WhatsAppMessageTemplate[]).map((row) => ({
    ...row,
    param_labels: Array.isArray(row.param_labels) ? row.param_labels : [],
  }));
}

export async function sendStaffTemplate(
  conversationId: string,
  templateName: string,
  templateLanguage: string,
  templateParams: string[],
): Promise<{ meta_sent: boolean }> {
  const data = await postEdgeFunction("whatsapp-send", {
    conversation_id: conversationId,
    template_name: templateName,
    template_language: templateLanguage,
    template_params: templateParams,
  });
  if (data?.error) throw new Error(String(data.error));
  return { meta_sent: !!data?.meta_sent };
}

export function whatsAppSlaBadge(
  c: WhatsAppConversation,
): { text: string; tone: "warning" | "destructive" } | null {
  const ref = c.last_inbound_at || c.created_at;
  if (!ref) return null;
  const hours = (Date.now() - new Date(ref).getTime()) / (60 * 60 * 1000);

  if (
    (c.status === "awaiting_assignment_confirm" || c.status === "ai_counseling")
    && !c.assigned_user_id
    && hours >= 2
  ) {
    const h = Math.floor(hours);
    return {
      text: `Unassigned ${h}h`,
      tone: hours >= 24 ? "destructive" : "warning",
    };
  }

  if (c.status === "assigned_active" && (c.unread_count_staff ?? 0) > 0 && hours >= 4) {
    return { text: `Waiting ${Math.floor(hours)}h`, tone: "warning" };
  }

  return null;
}

export async function assignConversation(
  conversationId: string,
  counselorId: string,
  leadId?: string | null,
  assignedByUserId?: string | null,
  contactLabel?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = {
    assigned_user_id: counselorId,
    status: "assigned_active",
    updated_at: new Date().toISOString(),
  };
  const { error: convErr } = await supabase
    .from("whatsapp_conversations" as any)
    .update(patch)
    .eq("id", conversationId);
  if (convErr) throw convErr;

  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("whatsapp_conversation_assignments" as any).insert({
    conversation_id: conversationId,
    assigned_user_id: counselorId,
    assigned_by_user_id: assignedByUserId ?? user?.id ?? null,
  });

  if (leadId) {
    await supabase
      .from("leads")
      .update({ assigned_counselor_id: counselorId })
      .eq("id", leadId);
  }

  const label = contactLabel?.trim() || "Helpline contact";
  await notifyUsers({
    userIds: [counselorId],
    category: "client_assigned",
    title: "WhatsApp thread assigned",
    body: `${label} — assigned to you in the helpline inbox.`,
    link: "/whatsapp",
    entityType: "whatsapp_conversation",
    entityId: conversationId,
    dedupeKey: `wa_assign:${conversationId}:${counselorId}`,
  });
}

export async function listAssignmentHistory(conversationId: string): Promise<WhatsAppAssignment[]> {
  const { data, error } = await supabase
    .from("whatsapp_conversation_assignments" as any)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as WhatsAppAssignment[];
}

export async function listBusinessLines(): Promise<WhatsAppBusinessLine[]> {
  const { data, error } = await supabase
    .from("whatsapp_business_lines" as any)
    .select("*")
    .eq("active", true)
    .order("is_default", { ascending: false })
    .order("label", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WhatsAppBusinessLine[];
}

export async function saveBusinessLine(
  line: Partial<WhatsAppBusinessLine> & { label: string; meta_phone_number_id: string; line_type: "helpline" | "counselor" },
): Promise<void> {
  const row = {
    label: line.label,
    meta_waba_id: line.meta_waba_id?.trim() || null,
    meta_phone_number_id: line.meta_phone_number_id,
    display_phone: line.display_phone ?? null,
    line_type: line.line_type,
    assigned_user_id: line.assigned_user_id ?? null,
    is_default: line.is_default ?? false,
    active: line.active ?? true,
    updated_at: new Date().toISOString(),
  };
  if (line.id) {
    const { error } = await supabase
      .from("whatsapp_business_lines" as any)
      .update(row)
      .eq("id", line.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("whatsapp_business_lines" as any).insert(row);
    if (error) throw error;
  }
}

export async function updateDefaultHelpline(patch: {
  meta_phone_number_id?: string;
  meta_waba_id?: string;
}): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.meta_phone_number_id?.trim()) {
    row.meta_phone_number_id = patch.meta_phone_number_id.trim();
  }
  if (patch.meta_waba_id !== undefined) {
    row.meta_waba_id = patch.meta_waba_id.trim() || null;
  }
  if (Object.keys(row).length === 1) return;
  const { error } = await supabase
    .from("whatsapp_business_lines" as any)
    .update(row)
    .eq("id", DEFAULT_HELPLINE_LINE_ID);
  if (error) throw error;
}

/** @deprecated Use updateDefaultHelpline */
export async function updateDefaultHelplineMetaId(metaPhoneNumberId: string): Promise<void> {
  await updateDefaultHelpline({ meta_phone_number_id: metaPhoneNumberId });
}

export async function deleteBusinessLine(id: string): Promise<void> {
  if (id === DEFAULT_HELPLINE_LINE_ID) {
    throw new Error("The default helpline cannot be removed.");
  }
  const { error } = await supabase
    .from("whatsapp_business_lines" as any)
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function removeConversationMedia(conversationId: string): Promise<void> {
  const paths = new Set<string>();

  const { data: msgs } = await supabase
    .from("whatsapp_messages" as any)
    .select("media_storage_path")
    .eq("conversation_id", conversationId);
  for (const row of msgs ?? []) {
    const p = (row as { media_storage_path?: string | null }).media_storage_path;
    if (p) paths.add(p);
  }

  const { data: listed } = await supabase.storage.from("whatsapp-media").list(conversationId);
  for (const f of listed ?? []) {
    if (f.name) paths.add(`${conversationId}/${f.name}`);
  }

  if (paths.size) {
    await supabase.storage.from("whatsapp-media").remove([...paths]).catch(() => {});
  }
}

/** Hide thread from inbox without deleting messages. */
export async function closeConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_conversations" as any)
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw error;
}

/** Permanently delete a conversation and its messages (admin). */
export async function deleteConversation(
  conversationId: string,
  options?: { deleteLinkedLead?: boolean; leadId?: string | null },
): Promise<void> {
  await removeConversationMedia(conversationId);

  if (options?.deleteLinkedLead && options.leadId) {
    const { error: leadErr } = await supabase
      .from("leads")
      .delete()
      .eq("id", options.leadId)
      .eq("lead_source", "whatsapp_helpline");
    if (leadErr) throw leadErr;
  }

  const { error } = await supabase
    .from("whatsapp_conversations" as any)
    .delete()
    .eq("id", conversationId);
  if (error) throw error;
}

/** Delete all open WhatsApp threads (admin test cleanup). */
export async function clearAllTestConversations(
  options?: { deleteLinkedLeads?: boolean },
): Promise<number> {
  const { data: convs, error: listErr } = await supabase
    .from("whatsapp_conversations" as any)
    .select("id, lead_id")
    .neq("status", "closed");
  if (listErr) throw listErr;

  const rows = (convs ?? []) as { id: string; lead_id: string | null }[];
  for (const row of rows) {
    await deleteConversation(row.id, {
      deleteLinkedLead: options?.deleteLinkedLeads,
      leadId: row.lead_id,
    });
  }
  return rows.length;
}

export async function simulateInbound(
  phone: string,
  text: string,
  conversationId?: string,
): Promise<void> {
  await postEdgeFunction("whatsapp-webhook", {
    phone,
    text,
    mock: true,
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });
}

export async function listCounselors(): Promise<{ id: string; full_name: string | null; email: string | null }[]> {
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["counselor", "telecaller", "admin", "administrator"]);
  const ids = [...new Set((roleRows ?? []).map((r) => r.user_id))];
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  return profiles ?? [];
}
