// @ts-nocheck
// Resolve WhatsApp media: sign cached file or lazy-fetch from Meta and store.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ensureWhatsAppMediaStored } from "../_shared/whatsapp/mediaStorage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const uid = userData.user.id;

  let body: { message_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messageId = body.message_id;
  if (!messageId) {
    return new Response(JSON.stringify({ error: "message_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: msg, error: msgErr } = await admin
    .from("whatsapp_messages")
    .select("id, conversation_id, message_type, media_storage_path, media_provider_id, media_mime, provider_message_id")
    .eq("id", messageId)
    .single();

  if (msgErr || !msg) {
    return new Response(JSON.stringify({ error: "message not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: canView } = await admin.rpc("whatsapp_can_view_conversation", {
    _uid: uid,
    _conv_id: msg.conversation_id,
  });
  if (!canView) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let storagePath = msg.media_storage_path as string | null;
  let mediaMime = msg.media_mime as string | null;

  if (!storagePath && msg.media_provider_id) {
    const stored = await ensureWhatsAppMediaStored(admin, {
      conversationId: msg.conversation_id,
      providerMessageId: msg.provider_message_id,
      mediaProviderId: msg.media_provider_id,
      mediaMime: mediaMime,
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
      return new Response(JSON.stringify({
        error: stored.error || "media_unavailable",
        hint: "Meta media may have expired; ask the client to resend the image.",
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!storagePath) {
    return new Response(JSON.stringify({ error: "no_media" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from("whatsapp-media")
    .createSignedUrl(storagePath, 3600);

  if (signErr || !signed?.signedUrl) {
    return new Response(JSON.stringify({ error: signErr?.message || "sign_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    url: signed.signedUrl,
    mime: mediaMime,
    message_type: msg.message_type,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
