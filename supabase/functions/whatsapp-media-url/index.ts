// @ts-nocheck
// Returns a short-lived signed URL for a WhatsApp media file, gated by
// whatsapp_can_view_conversation. Falls back to re-downloading from Meta
// using the stored media_provider_id when the bucket object is missing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchMetaMedia, mediaStoragePath } from "../_shared/whatsapp/metaApi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "auth required" }, 401);
  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) return json({ error: "auth required" }, 401);
  const uid = userRes.user.id;

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const messageId = typeof payload.message_id === "string" ? payload.message_id : "";
  if (!messageId) return json({ error: "message_id required" }, 400);

  const { data: msg, error: msgErr } = await admin
    .from("whatsapp_messages")
    .select("id, conversation_id, media_storage_path, media_provider_id, media_mime, provider_message_id")
    .eq("id", messageId)
    .maybeSingle();
  if (msgErr || !msg) return json({ error: "message not found" }, 404);

  const { data: canView } = await admin.rpc("whatsapp_can_view_conversation", {
    _user: uid,
    _conversation: msg.conversation_id,
  });
  if (!canView) return json({ error: "forbidden" }, 403);

  let path = msg.media_storage_path as string | null;

  if (!path && msg.media_provider_id) {
    const downloaded = await fetchMetaMedia(msg.media_provider_id);
    if (!downloaded) return json({ error: "media unavailable" }, 502);
    path = mediaStoragePath(msg.conversation_id, msg.provider_message_id, downloaded.mime);
    const { error: upErr } = await admin.storage
      .from("whatsapp-media")
      .upload(path, downloaded.bytes, { contentType: downloaded.mime, upsert: true });
    if (upErr) return json({ error: "upload failed: " + upErr.message }, 500);
    await admin.from("whatsapp_messages").update({
      media_storage_path: path,
      media_mime: downloaded.mime,
    }).eq("id", msg.id);
  }

  if (!path) return json({ error: "no media" }, 404);

  const { data: signed, error: signErr } = await admin.storage
    .from("whatsapp-media")
    .createSignedUrl(path, 3600);
  if (signErr || !signed?.signedUrl) return json({ error: "sign failed" }, 500);

  return json({ url: signed.signedUrl, mime: msg.media_mime, path });
});