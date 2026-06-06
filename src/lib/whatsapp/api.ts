import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppConversation, WhatsAppMessage } from "./types";

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

async function postEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("You must be signed in");

  const base = functionsBaseUrl();
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base || !apikey) throw new Error("Missing Supabase config");

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
  if (!res.ok) {
    const msg = [data?.error, data?.hint].filter(Boolean).join(" — ")
      || res.statusText
      || `Edge function failed (${res.status})`;
    throw new Error(msg);
  }
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

async function uploadOutboundWhatsAppMedia(conversationId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
  const path = `${conversationId}/outbound-${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from("whatsapp-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    if (error.message?.toLowerCase().includes("policy")) {
      throw new Error("Upload blocked — run whatsapp_outbound_media_upload migration and redeploy");
    }
    throw new Error(error.message || "Failed to upload attachment");
  }
  return path;
}

export async function sendStaffReply(
  conversationId: string,
  _userId: string,
  body: string,
  media?: StaffReplyMedia,
): Promise<{ meta_sent: boolean }> {
  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    text: body.trim(),
  };
  if (media) {
    const storagePath = await uploadOutboundWhatsAppMedia(conversationId, media.file);
    payload.media_storage_path = storagePath;
    payload.mime_type = media.mime_type;
    payload.message_type = media.message_type;
    if (media.filename) payload.filename = media.filename;
  }
  const data = await postEdgeFunction("whatsapp-send", payload);
  if (data?.error) {
    const err = String(data.error);
    if (err.includes("conversation_id and text required")) {
      throw new Error("whatsapp-send needs redeploy — media attachments require the latest edge function");
    }
    throw new Error(err);
  }
  return { meta_sent: !!data?.meta_sent };
}

export async function assignConversation(
  conversationId: string,
  counselorId: string,
  leadId?: string | null,
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

  if (leadId) {
    await supabase
      .from("leads")
      .update({ assigned_counselor_id: counselorId })
      .eq("id", leadId);
  }
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
