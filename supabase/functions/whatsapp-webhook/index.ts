// @ts-nocheck
// WhatsApp helpline: mock simulate (Phase 0) + Meta Cloud API webhook (Phase 1).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizePhoneE164, phonesMatch } from "../_shared/whatsapp/phone.ts";
import { nextRulesReply, splitName } from "../_shared/whatsapp/rulesIntake.ts";
import {
  fetchMetaMedia,
  isMetaWebhookPayload,
  mediaStoragePath,
  metaSendEnabled,
  parseMetaInbound,
  sendMetaText,
  verifyMetaSignature,
  type MetaMessageType,
} from "../_shared/whatsapp/metaApi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

async function staffFromAuth(req: Request, admin: ReturnType<typeof createClient>) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const uid = data.user.id;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
  const allowed = new Set(["admin", "administrator", "counselor", "telecaller", "documentation"]);
  const ok = (roles ?? []).some((r: { role: string }) => allowed.has(r.role));
  return ok ? uid : null;
}

async function matchClientOrLead(admin: ReturnType<typeof createClient>, phoneE164: string) {
  const { data: clients } = await admin
    .from("clients")
    .select("id, phone, whatsapp, alternate_phone, assigned_counselor_id, full_name")
    .limit(500);

  for (const c of clients ?? []) {
    const nums = [c.phone, c.whatsapp, c.alternate_phone].filter(Boolean);
    if (nums.some((n: string) => phonesMatch(n, phoneE164))) {
      return { type: "client" as const, record: c };
    }
  }

  const { data: leads } = await admin
    .from("leads")
    .select("id, phone, assigned_counselor_id, first_name, last_name")
    .limit(500);

  for (const l of leads ?? []) {
    if (l.phone && phonesMatch(l.phone, phoneE164)) {
      return { type: "lead" as const, record: l };
    }
  }

  return null;
}

async function insertOutbound(
  admin: ReturnType<typeof createClient>,
  conversationId: string,
  phoneE164: string,
  body: string,
  sentBy: "ai" | "system" = "ai",
) {
  const now = new Date().toISOString();
  let providerMessageId: string | null = null;

  if (metaSendEnabled()) {
    const sent = await sendMetaText(phoneE164, body);
    if (sent.error) console.warn("[whatsapp-webhook] meta send:", sent.error);
    else providerMessageId = sent.messageId ?? null;
  }

  await admin.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    body,
    sent_by: sentBy,
    provider_message_id: providerMessageId,
  });
  await admin.from("whatsapp_conversations").update({
    last_message_at: now,
    updated_at: now,
  }).eq("id", conversationId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Meta hub verification (Phase 1)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fromMeta = isMetaWebhookPayload(payload);
  const mock = payload.mock === true;

  if (fromMeta) {
    const sig = req.headers.get("x-hub-signature-256");
    const ok = await verifyMetaSignature(rawBody, sig);
    if (!ok) {
      return new Response(JSON.stringify({ error: "invalid meta signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = parseMetaInbound(payload);
    if (parsed?.isStatusOnly) {
      return new Response(JSON.stringify({ ok: true, status_event: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const secret = req.headers.get("x-webhook-secret") || String(payload.secret || "");
  const expectedSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");

  if (mock) {
    const staffId = await staffFromAuth(req, admin);
    if (!staffId) {
      return new Response(JSON.stringify({ error: "staff auth required for mock" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (!fromMeta && expectedSecret && secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "invalid secret" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let phoneRaw = String(payload.phone || payload.from || "");
  let text = String(payload.text || payload.body || "");
  let providerMessageId = payload.message_id ? String(payload.message_id) : null;
  let messageType: MetaMessageType = "text";
  let mediaId: string | null = null;
  let mediaMime: string | null = null;
  let fileName: string | null = null;

  if (fromMeta) {
    const parsed = parseMetaInbound(payload);
    if (!parsed?.phoneRaw) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    phoneRaw = parsed.phoneRaw;
    text = parsed.text;
    providerMessageId = parsed.providerMessageId;
    messageType = parsed.messageType;
    mediaId = parsed.mediaId;
    mediaMime = parsed.mediaMime;
    fileName = parsed.fileName;
  }

  const phoneE164 = normalizePhoneE164(phoneRaw);
  if (!phoneE164) {
    return new Response(JSON.stringify({ error: "phone required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (providerMessageId) {
    const { data: dupe } = await admin
      .from("whatsapp_messages")
      .select("id")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();
    if (dupe) {
      return new Response(JSON.stringify({ ok: true, deduped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const now = new Date().toISOString();
  const aiMode = Deno.env.get("WHATSAPP_AI_MODE") || "rules";

  let { data: conv } = await admin
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_e164", phoneE164)
    .neq("status", "closed")
    .maybeSingle();

  if (!conv) {
    const match = await matchClientOrLead(admin, phoneE164);
    const base: Record<string, unknown> = {
      phone_e164: phoneE164,
      phone_display: phoneRaw || phoneE164,
      ai_mode: aiMode,
      last_message_at: now,
      last_inbound_at: now,
      unread_count_staff: 1,
    };

    if (match?.type === "client") {
      base.client_id = match.record.id;
      base.assigned_user_id = match.record.assigned_counselor_id;
      base.status = "existing_client";
    } else if (match?.type === "lead") {
      base.lead_id = match.record.id;
      base.assigned_user_id = match.record.assigned_counselor_id;
      base.status = match.record.assigned_counselor_id ? "assigned_active" : "awaiting_assignment_confirm";
    } else {
      base.status = "unmatched_ai_intake";
      base.intake_data = { step: "welcome" };
    }

    const { data: created, error: createErr } = await admin
      .from("whatsapp_conversations")
      .insert(base)
      .select("*")
      .single();
    if (createErr) throw createErr;
    conv = created;
  }

  let mediaStoragePathValue: string | null = null;
  if (fromMeta && mediaId && messageType !== "text") {
    const downloaded = await fetchMetaMedia(mediaId);
    if (downloaded) {
      const path = mediaStoragePath(conv.id, providerMessageId, downloaded.mime);
      const { error: upErr } = await admin.storage
        .from("whatsapp-media")
        .upload(path, downloaded.bytes, { contentType: downloaded.mime, upsert: true });
      if (upErr) console.error("[whatsapp-webhook] media upload:", upErr.message);
      else {
        mediaStoragePathValue = path;
        mediaMime = downloaded.mime;
      }
    }
  }

  const displayBody = text.trim()
    || (messageType === "image" ? "[Image]" : "")
    || (messageType === "document" ? `[Document${fileName ? `: ${fileName}` : ""}]` : "")
    || (messageType === "video" ? "[Video]" : "")
    || (messageType === "audio" ? "[Audio]" : "")
    || "(empty)";

  await admin.from("whatsapp_messages").insert({
    conversation_id: conv.id,
    direction: "inbound",
    body: displayBody,
    sent_by: "contact",
    provider_message_id: providerMessageId,
    message_type: messageType,
    media_storage_path: mediaStoragePathValue,
    media_mime: mediaMime,
    media_provider_id: mediaId,
  });

  await admin.from("whatsapp_conversations").update({
    last_message_at: now,
    last_inbound_at: now,
    unread_count_staff: (conv.unread_count_staff ?? 0) + 1,
    updated_at: now,
  }).eq("id", conv.id);

  const replies: string[] = [];
  const intake = (conv.intake_data || {}) as Record<string, unknown>;
  const intakeStep = intake?.step as string | undefined;
  const intakeInProgress = !!intakeStep && intakeStep !== "done";

  if (/^restart$/i.test(text.trim())) {
    await admin.from("whatsapp_conversations").update({
      status: "unmatched_ai_intake",
      intake_data: { step: "country" },
      updated_at: now,
    }).eq("id", conv.id);
    replies.push("Starting over. Which country are you interested in? (e.g. Canada, UK)");
  } else if (
    aiMode !== "off"
    && (conv.status === "unmatched_ai_intake" || intakeInProgress)
    && text.trim()
    && messageType === "text"
  ) {
    const { intake: nextIntake, replies: botReplies, confirmed } = nextRulesReply(intake as any, text);

    if (confirmed) {
      const { first_name, last_name } = splitName(String(nextIntake.full_name || "WhatsApp Lead"));
      const { data: lead, error: leadErr } = await admin
        .from("leads")
        .insert({
          first_name,
          last_name,
          phone: conv.phone_display || phoneE164,
          lead_type: "warm",
          lead_temperature: "warm",
          lead_source: "whatsapp_helpline",
          interested_countries: nextIntake.country ? [nextIntake.country] : [],
          notes: `WhatsApp intake — level: ${nextIntake.level ?? "n/a"}`,
          status: "new",
        })
        .select("id")
        .single();
      if (leadErr) console.error("[whatsapp-webhook] lead insert:", leadErr.message);

      await admin.from("whatsapp_conversations").update({
        intake_data: nextIntake,
        lead_id: lead?.id ?? null,
        status: "awaiting_assignment_confirm",
        updated_at: now,
      }).eq("id", conv.id);
    } else {
      await admin.from("whatsapp_conversations").update({
        intake_data: nextIntake,
        updated_at: now,
      }).eq("id", conv.id);
    }

    replies.push(...botReplies);
  } else if (conv.status === "existing_client" || conv.status === "assigned_active") {
    // Known contact — counselor handles in CRM (intake already finished)
  } else if (conv.status === "awaiting_assignment_confirm") {
    replies.push("Thank you for your message. A counselor will respond shortly.");
  }

  for (const reply of replies) {
    await insertOutbound(admin, conv.id, phoneE164, reply, "ai");
  }

  return new Response(JSON.stringify({
    ok: true,
    conversation_id: conv.id,
    replies,
    mock,
    meta: fromMeta,
    meta_send_enabled: metaSendEnabled(),
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
