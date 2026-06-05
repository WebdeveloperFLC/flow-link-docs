// @ts-nocheck
// Phase 0: mock inbound + rules-based intake. Meta Cloud API wiring comes in Phase 1.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizePhoneE164, phonesMatch } from "../_shared/whatsapp/phone.ts";
import { nextRulesReply, splitName } from "../_shared/whatsapp/rulesIntake.ts";

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
  body: string,
  sentBy: "ai" | "system" = "ai",
) {
  const now = new Date().toISOString();
  await admin.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    body,
    sent_by: sentBy,
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

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mock = payload.mock === true;
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
  } else if (expectedSecret && secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "invalid secret" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Normalize inbound text + phone from mock payload or Meta shape (stub)
  let phoneRaw = String(payload.phone || payload.from || "");
  let text = String(payload.text || payload.body || "");
  const providerMessageId = payload.message_id ? String(payload.message_id) : null;

  const metaEntry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
  const metaChange = ((metaEntry?.changes as unknown[])?.[0] as Record<string, unknown>)?.value as Record<string, unknown> | undefined;
  const metaMsg = (metaChange?.messages as unknown[])?.[0] as Record<string, unknown> | undefined;
  if (metaMsg) {
    phoneRaw = String(metaMsg.from || phoneRaw);
    text = String((metaMsg.text as Record<string, string>)?.body || text);
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

  await admin.from("whatsapp_messages").insert({
    conversation_id: conv.id,
    direction: "inbound",
    body: text || "(empty)",
    sent_by: "contact",
    provider_message_id: providerMessageId,
  });

  await admin.from("whatsapp_conversations").update({
    last_message_at: now,
    last_inbound_at: now,
    unread_count_staff: (conv.unread_count_staff ?? 0) + 1,
    updated_at: now,
  }).eq("id", conv.id);

  const replies: string[] = [];

  if (conv.status === "existing_client" || conv.status === "assigned_active") {
    // Known contact — no auto-reply; counselor handles in CRM
  } else if (conv.status === "awaiting_assignment_confirm") {
    replies.push("Thank you for your message. A counselor will respond shortly.");
  } else if (conv.status === "unmatched_ai_intake" && aiMode !== "off") {
    const intake = (conv.intake_data || {}) as Record<string, unknown>;
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
  }

  for (const reply of replies) {
    await insertOutbound(admin, conv.id, reply, "ai");
  }

  return new Response(JSON.stringify({
    ok: true,
    conversation_id: conv.id,
    replies,
    mock,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
