// @ts-nocheck
// Staff outbound WhatsApp — stores in CRM and sends via Meta Cloud API when configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { metaSendEnabled, sendMetaText } from "../_shared/whatsapp/metaApi.ts";

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

  let body: { conversation_id?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const conversationId = body.conversation_id;
  const text = (body.text || "").trim();
  if (!conversationId || !text) {
    return new Response(JSON.stringify({ error: "conversation_id and text required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: canEdit } = await admin.rpc("whatsapp_can_edit_conversation", {
    _uid: uid,
    _conv_id: conversationId,
  });
  if (!canEdit) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: conv, error: convErr } = await admin
    .from("whatsapp_conversations")
    .select("id, phone_e164")
    .eq("id", conversationId)
    .single();
  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: "conversation not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let providerMessageId: string | null = null;
  let metaSent = false;
  let metaError: string | undefined;

  if (metaSendEnabled()) {
    const sent = await sendMetaText(conv.phone_e164, text);
    if (sent.error) {
      return new Response(JSON.stringify({ error: sent.error }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    metaSent = !sent.skipped;
    providerMessageId = sent.messageId ?? null;
  }

  const now = new Date().toISOString();
  const { data: msg, error: insErr } = await admin
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversationId,
      direction: "outbound",
      body: text,
      sent_by: "staff",
      sent_by_user_id: uid,
      provider_message_id: providerMessageId,
    })
    .select("id")
    .single();
  if (insErr) {
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin.from("whatsapp_conversations").update({
    last_message_at: now,
    updated_at: now,
  }).eq("id", conversationId);

  return new Response(JSON.stringify({
    ok: true,
    message_id: msg.id,
    meta_sent: metaSent,
    provider_message_id: providerMessageId,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
