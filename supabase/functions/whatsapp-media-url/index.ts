// @ts-nocheck
// Resolve WhatsApp media: sign cached file or lazy-fetch from Meta and store.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ensureWhatsAppMediaStored } from "../_shared/whatsapp/mediaStorage.ts";

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

  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData.user) return json({ error: "invalid session" }, 401);
  const uid = userData.user.id;

  let body: { message_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const messageId = body.message_id;
  if (!messageId) return json({ error: "message_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: msg, error: msgErr } = await admin
    .from("whatsapp_messages")
    .select("id, conversation_id, message_type, media_storage_path, media_provider_id, media_mime, provider_message_id")
    .eq("id", messageId)
    .single();

  if (msgErr || !msg) return json({ error: "message not found" }, 404);

  const { data: canView } = await admin.rpc("whatsapp_can_view_conversation", {
    _uid: uid,
    _conv_id: msg.conversation_id,
  });
  if (!canView) return json({ error: "forbidden" }, 403);

  let storagePath = msg.media_storage_path as string | null;
  let mediaMime = msg.media_mime as string | null;

  if (!storagePath && msg.media_provider_id) {
    const stored = await ensureWhatsAppMediaStored(admin, {
      conversationId: msg.conversation_id,
      providerMessageId: msg.provider_message_id,
      mediaProviderId: msg.media_provider_id,
      mediaMime,
      existingPath: null,
    });

    if (stored.path) {
      storagePath = stored.path;
      mediaMime = stored.mime;
      await admin
        .from("whatsapp_messages")
        .update({
          media_storage_path: storagePath,
          media_mime: mediaMime,
        })
        .eq("id", messageId);
    } else {
      return json({
        error: stored.error || "media_unavailable",
        hint: "Meta media may have expired; ask the client to resend the image.",
      }, 502);
    }
  }

  if (!storagePath) return json({ error: "no_media" }, 404);

  const { data: signed, error: signErr } = await admin.storage
    .from("whatsapp-media")
    .createSignedUrl(storagePath, 3600);

  if (signErr || !signed?.signedUrl) {
    return json({ error: signErr?.message || "sign_failed" }, 500);
  }

  return json({
    url: signed.signedUrl,
    mime: mediaMime,
    message_type: msg.message_type,
  });
});
