import { supabase } from "@/integrations/supabase/client";

export interface VoiceNote {
  id: string;
  client_id: string;
  context_type: string;
  context_id: string | null;
  author_id: string | null;
  storage_path: string;
  duration_ms: number | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  created_at: string;
}

export async function uploadVoiceNote(opts: {
  clientId: string;
  blob: Blob;
  durationMs: number;
  contextType?: "timeline" | "chat" | "task" | "handoff" | "remark";
  contextId?: string | null;
}): Promise<VoiceNote> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("Not authenticated");
  const ext = opts.blob.type.includes("mp4") ? "m4a" : "webm";
  const path = `${opts.clientId}/${u.user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("voice-notes").upload(path, opts.blob, {
    contentType: opts.blob.type || "audio/webm",
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("voice_notes")
    .insert({
      client_id: opts.clientId,
      author_id: u.user.id,
      storage_path: path,
      duration_ms: Math.round(opts.durationMs),
      mime_type: opts.blob.type || "audio/webm",
      size_bytes: opts.blob.size,
      context_type: opts.contextType ?? "timeline",
      context_id: opts.contextId ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as VoiceNote;
}

export async function listVoiceNotes(clientId: string, contextType?: string, contextId?: string | null): Promise<VoiceNote[]> {
  let q = supabase.from("voice_notes").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (contextType) q = q.eq("context_type", contextType);
  if (contextId) q = q.eq("context_id", contextId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as VoiceNote[];
}

export async function getVoiceNoteUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("voice-notes").createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export function subscribeVoiceNotes(clientId: string, onChange: () => void) {
  const ch = supabase
    .channel(`voice:${clientId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "voice_notes", filter: `client_id=eq.${clientId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}