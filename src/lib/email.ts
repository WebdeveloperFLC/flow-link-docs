import { supabase } from "@/integrations/supabase/client";

export interface EmailThread {
  id: string;
  client_id: string;
  subject: string;
  status: string;
  message_count: number;
  last_message_at: string | null;
  internal_only: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ClientEmail {
  id: string;
  thread_id: string;
  client_id: string;
  direction: "inbound" | "outbound";
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  subject: string;
  body_html: string | null;
  body_text: string | null;
  in_reply_to: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  received_at: string | null;
  sender_user_id: string | null;
  internal_only: boolean;
  created_at: string;
}

export async function listThreads(clientId: string): Promise<EmailThread[]> {
  const { data, error } = await supabase
    .from("email_threads")
    .select("*")
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as EmailThread[];
}

export async function listMessages(threadId: string): Promise<ClientEmail[]> {
  const { data, error } = await supabase
    .from("client_emails")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClientEmail[];
}

export async function sendEmail(payload: {
  client_id: string;
  thread_id?: string | null;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  internal_only?: boolean;
  in_reply_to?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("email-send", { body: payload });
  if (error) throw error;
  return data as { email_id: string; thread_id: string; status: string };
}

export async function markThreadRead(threadId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return;
  await supabase.from("email_read_receipts").upsert({
    thread_id: threadId,
    user_id: u.user.id,
    last_read_at: new Date().toISOString(),
  } as never);
}

export function subscribeThread(threadId: string, onChange: () => void) {
  const ch = supabase
    .channel(`email-thread:${threadId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_emails", filter: `thread_id=eq.${threadId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export function subscribeClientEmails(clientId: string, onChange: () => void) {
  const ch = supabase
    .channel(`emails:${clientId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "email_threads", filter: `client_id=eq.${clientId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "client_emails", filter: `client_id=eq.${clientId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}