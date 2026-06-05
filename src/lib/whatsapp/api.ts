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

export async function resolveWhatsAppMediaUrl(messageId: string): Promise<{
  url: string | null;
  error?: string;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const { data, error } = await supabase.functions.invoke("whatsapp-media-url", {
    body: { message_id: messageId },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) return { url: null, error: error.message };
  if (data?.error) return { url: null, error: String(data.error) };
  return { url: data?.url ?? null };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_conversations" as any)
    .update({ unread_count_staff: 0 })
    .eq("id", conversationId);
  if (error) throw error;
}

export async function sendStaffReply(conversationId: string, _userId: string, body: string): Promise<{
  meta_sent: boolean;
}> {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { conversation_id: conversationId, text: body },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
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

export async function simulateInbound(phone: string, text: string): Promise<void> {
  const { error } = await supabase.functions.invoke("whatsapp-webhook", {
    body: { phone, text, mock: true },
  });
  if (error) throw error;
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
