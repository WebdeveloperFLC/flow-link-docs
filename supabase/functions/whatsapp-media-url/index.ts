// @ts-nocheck
// Resolve WhatsApp media: sign cached file or lazy-fetch from Meta and store.
// Returns HTTP 200 with { url } or { url: null, error } so CRM UI never crashes on expected failures.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ensureWhatsAppMediaStored } from "../_shared/whatsapp/mediaStorage.ts";
import { whatsappUserCanViewConversation } from "../_shared/whatsapp/permissions.ts";

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

function fail(error: string, hint?: string) {
  return json({ url: null, error, hint });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return fail("unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData.user) return fail("invalid session");
    const uid = userData.user.id;

    let body: { message_id?: string };
    try {
      body = await req.json();
    } catch {
      return fail("invalid json");
    }

    const messageId = body.message_id;
    if (!messageId) return fail("message_id required");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: msg, error: msgErr } = await admin
      .from("whatsapp_messages")
      .select("id, conversation_id, message_type, media_storage_path, media_provider_id, media_mime, provider_message_id")
      .eq("id", messageId)
      .maybeSingle();

    if (msgErr) return fail(msgErr.message);
    if (!msg) return fail("message not found");

    const allowed = await whatsappUserCanViewConversation(admin, uid, msg.conversation_id);
    if (!allowed) return fail("forbidden");

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
        return fail(
          stored.error || "media_unavailable",
          stored.hint || "Meta media may have expired. Ask the client to resend the image.",
        );
      }
    }

    if (!storagePath) return fail("no_media");

    const { data: signed, error: signErr } = await admin.storage
      .from("whatsapp-media")
      .createSignedUrl(storagePath, 3600);

    if (signErr || !signed?.signedUrl) {
      return fail(signErr?.message || "sign_failed");
    }

    return json({
      url: signed.signedUrl,
      mime: mediaMime,
      message_type: msg.message_type,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-media-url]", msg);
    return fail(msg);
  }
});
