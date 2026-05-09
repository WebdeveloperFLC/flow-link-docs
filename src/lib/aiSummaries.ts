import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";

export interface AiSummary {
  id: string;
  client_id: string;
  scope: string;
  source_id: string | null;
  status: "suggested" | "approved" | "rejected" | "edited";
  title: string;
  summary_md: string;
  key_points: string[];
  next_action: string | null;
  follow_up_role: string | null;
  client_intent: string | null;
  urgency: string | null;
  generated_by_model: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export async function listSummaries(clientId: string): Promise<AiSummary[]> {
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AiSummary[];
}

export async function generateSummary(opts: {
  clientId: string;
  scope: "call" | "email_thread" | "voice_note" | "chat_burst" | "client_overview";
  sourceId?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("ai-summarize", {
    body: { client_id: opts.clientId, scope: opts.scope, source_id: opts.sourceId ?? null },
  });
  if (error) throw error;
  return data as { summary_id: string };
}

export async function approveSummary(id: string, edits?: Partial<AiSummary>) {
  const { data: u } = await supabase.auth.getUser();
  const patch: Record<string, unknown> = {
    status: edits ? "edited" : "approved",
    approved_by: u?.user?.id ?? null,
    approved_at: new Date().toISOString(),
    ...(edits ?? {}),
  };
  const { error } = await supabase.from("ai_summaries").update(patch as never).eq("id", id);
  if (error) throw error;
  await supabase.from("ai_summary_feedback").insert({ summary_id: id, user_id: u?.user?.id, action: edits ? "edit" : "approve" } as never);
  await logActivity("ai_summary.approved", "ai_summary", id);
}

export async function rejectSummary(id: string, note?: string) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("ai_summaries").update({ status: "rejected" } as never).eq("id", id);
  if (error) throw error;
  await supabase.from("ai_summary_feedback").insert({ summary_id: id, user_id: u?.user?.id, action: "reject", note } as never);
  await logActivity("ai_summary.rejected", "ai_summary", id);
}

export function subscribeSummaries(clientId: string, onChange: () => void) {
  const ch = supabase
    .channel(`ai-summaries:${clientId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "ai_summaries", filter: `client_id=eq.${clientId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}