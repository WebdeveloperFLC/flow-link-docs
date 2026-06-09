// @ts-nocheck
// WhatsApp helpline: mock simulate (Phase 0) + Meta Cloud API webhook (Phase 1).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizePhoneE164, phonesMatch } from "../_shared/whatsapp/phone.ts";
import { DEFAULT_HELPLINE_LINE_ID, resolveBusinessLine, resolveBusinessLineById } from "../_shared/whatsapp/businessLines.ts";
import {
  applyWhatsAppAutoAssignment,
  autoAssignEnabled,
  pickCounselorForAssignment,
  resolveBranchFromPreference,
} from "../_shared/whatsapp/autoAssign.ts";
import { counselingBeforeAssignEnabled, clientRequestsCounselor } from "../_shared/whatsapp/counselingHandoff.ts";
import {
  counselingWelcomeMessage,
  nextGeminiCounseling,
} from "../_shared/whatsapp/geminiCounseling.ts";
import { geminiKeysAvailable, isGeminiAiMode } from "../_shared/whatsapp/geminiClient.ts";
import {
  notifyCounselorInboundMessage,
  notifyCounselorWhatsAppAssigned,
  notifyQueueUnassignedThread,
} from "../_shared/whatsapp/whatsappNotifications.ts";
import { nextGeminiReply } from "../_shared/whatsapp/geminiIntake.ts";
import {
  buildLeadCaptureNotes,
  initialFlMenuIntake,
  isFlMenuFlow,
  leadCaptureRestart,
  nextLeadCaptureReply,
  shouldForceLeadCaptureConfirm,
} from "../_shared/whatsapp/leadCaptureFlow.ts";
import { nextRulesReply, normalizeIntakeFields, shouldForceIntakeConfirm, splitName, type IntakeData } from "../_shared/whatsapp/rulesIntake.ts";
import { ensureWhatsAppMediaStored } from "../_shared/whatsapp/mediaStorage.ts";
import {
  isMetaWebhookPayload,
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

function resolveAiMode(): string {
  const configured = Deno.env.get("WHATSAPP_AI_MODE")?.trim();
  if (configured) return configured;
  return geminiKeysAvailable() ? "gemini" : "rules";
}

/** Scripted FL menu intake (default) | legacy gemini/rules free-form intake */
function resolveIntakeFlow(): "fl_menu" | "gemini" | "rules" {
  const flow = Deno.env.get("WHATSAPP_INTAKE_FLOW")?.trim().toLowerCase();
  if (flow === "fl_menu" || flow === "menu") return "fl_menu";
  if (flow === "gemini") return "gemini";
  if (flow === "rules") return "rules";
  return "fl_menu";
}

async function assignCounselorAfterIntake(
  admin: ReturnType<typeof createClient>,
  opts: {
    conversationId: string;
    leadId: string | null;
    branchId: string | null;
    branchLabel: string | null;
    contactName: string;
    firstName: string;
    businessLineType?: string | null;
  },
): Promise<{ assigned: boolean; counselorName?: string }> {
  if (!autoAssignEnabled() || opts.businessLineType === "counselor") {
    return { assigned: false };
  }

  const pick = await pickCounselorForAssignment(admin, { branchId: opts.branchId });
  if (!pick) return { assigned: false };

  await applyWhatsAppAutoAssignment(admin, {
    conversationId: opts.conversationId,
    leadId: opts.leadId,
    counselorId: pick.userId,
    branchLabel: opts.branchLabel,
    contactName: opts.contactName,
  });
  await notifyCounselorWhatsAppAssigned(admin, {
    counselorId: pick.userId,
    conversationId: opts.conversationId,
    contactName: opts.contactName,
    branchLabel: opts.branchLabel,
  });

  return { assigned: true, counselorName: pick.fullName };
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
  phoneNumberId?: string | null,
) {
  const now = new Date().toISOString();
  let providerMessageId: string | null = null;

  if (metaSendEnabled()) {
    const sent = await sendMetaText(phoneE164, body, phoneNumberId);
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
  if (mock && payload.conversation_id) {
    const { data: mockConv } = await admin
      .from("whatsapp_conversations")
      .select("phone_e164, phone_display")
      .eq("id", String(payload.conversation_id))
      .maybeSingle();
    if (mockConv?.phone_e164) phoneRaw = mockConv.phone_e164;
    else if (mockConv?.phone_display) phoneRaw = mockConv.phone_display;
  }
  let text = String(payload.text || payload.body || "");
  let providerMessageId = payload.message_id ? String(payload.message_id) : null;
  let messageType: MetaMessageType = "text";
  let mediaId: string | null = null;
  let mediaMime: string | null = null;
  let fileName: string | null = null;
  let metaPhoneNumberId: string | null = null;

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
    metaPhoneNumberId = parsed.metaPhoneNumberId;
  }

  if (mock) {
    if (payload.meta_phone_number_id) {
      metaPhoneNumberId = String(payload.meta_phone_number_id);
    }
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

  const mockBusinessLineId = mock && payload.business_line_id
    ? String(payload.business_line_id)
    : null;
  let businessLine = mockBusinessLineId
    ? await resolveBusinessLineById(admin, mockBusinessLineId)
    : null;
  if (!businessLine) {
    businessLine = await resolveBusinessLine(admin, metaPhoneNumberId);
  }
  const businessLineId = businessLine?.id ?? DEFAULT_HELPLINE_LINE_ID;

  if (fromMeta && metaPhoneNumberId) {
    const registered = businessLine?.meta_phone_number_id === metaPhoneNumberId;
    if (!registered) {
      console.warn(
        `[whatsapp-webhook] phone_number_id ${metaPhoneNumberId} not in whatsapp_business_lines — routed to ${businessLine?.label ?? "default"}. Add line in CRM → Manage lines.`,
      );
    }
  }

  // Short-window dedup for mock/simulate paths (no provider_message_id).
  // Prevents double-clicks from doubling inbound rows and AI replies.
  if (!providerMessageId) {
    const sinceIso = new Date(Date.now() - 4000).toISOString();
    const dedupBody = (text || "").trim();
    if (dedupBody) {
      const { data: recentDupes } = await admin
        .from("whatsapp_messages")
        .select("id, body, conversation_id, created_at, whatsapp_conversations!inner(phone_e164, business_line_id)")
        .eq("direction", "inbound")
        .eq("body", dedupBody)
        .gte("created_at", sinceIso)
        .limit(5);
      const hit = (recentDupes ?? []).find((r: any) =>
        r.whatsapp_conversations?.phone_e164 === phoneE164
        && r.whatsapp_conversations?.business_line_id === businessLineId
      );
      if (hit) {
        return new Response(JSON.stringify({ ok: true, deduped: true, reason: "short_window" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  const now = new Date().toISOString();
  const aiMode = resolveAiMode();
  const intakeFlow = resolveIntakeFlow();
  const useFlMenu = intakeFlow === "fl_menu";
  const useGemini = !useFlMenu && isGeminiAiMode(aiMode);
  const deferAssign = counselingBeforeAssignEnabled(aiMode);
  const sendPhoneNumberId = businessLine?.meta_phone_number_id
    && businessLine.meta_phone_number_id !== "CONFIGURE_ME"
    ? businessLine.meta_phone_number_id
    : null;

  let { data: conv } = await admin
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_e164", phoneE164)
    .eq("business_line_id", businessLineId)
    .neq("status", "closed")
    .maybeSingle();

  if (!conv) {
    const match = await matchClientOrLead(admin, phoneE164);
    const base: Record<string, unknown> = {
      phone_e164: phoneE164,
      phone_display: phoneRaw || phoneE164,
      business_line_id: businessLineId,
      ai_mode: aiMode,
      last_message_at: now,
      last_inbound_at: now,
      unread_count_staff: 1,
    };

    const counselorLine = businessLine?.line_type === "counselor" && businessLine.assigned_user_id;

    if (counselorLine) {
      base.assigned_user_id = businessLine.assigned_user_id;
      base.status = "assigned_active";
      base.intake_data = { step: "done" };
    } else if (match?.type === "client") {
      base.client_id = match.record.id;
      base.assigned_user_id = match.record.assigned_counselor_id;
      base.status = "existing_client";
    } else if (match?.type === "lead") {
      base.lead_id = match.record.id;
      base.assigned_user_id = match.record.assigned_counselor_id;
      base.status = match.record.assigned_counselor_id ? "assigned_active" : "awaiting_assignment_confirm";
    } else {
      base.status = "unmatched_ai_intake";
      base.intake_data = useFlMenu ? initialFlMenuIntake() : { step: "welcome" };
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
    const stored = await ensureWhatsAppMediaStored(admin, {
      conversationId: conv.id,
      providerMessageId,
      mediaProviderId: mediaId,
      mediaMime,
      existingPath: null,
    });
    if (stored.error) console.warn("[whatsapp-webhook] media store:", stored.error);
    else if (stored.path) {
      mediaStoragePathValue = stored.path;
      mediaMime = stored.mime;
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
    media_provider_id: mediaId,
    media_mime: mediaMime,
  });

  await admin.from("whatsapp_conversations").update({
    last_message_at: now,
    last_inbound_at: now,
    unread_count_staff: (conv.unread_count_staff ?? 0) + 1,
    updated_at: now,
  }).eq("id", conv.id);

  const replies: string[] = [];
  const rawIntake = (conv.intake_data || {}) as IntakeData;
  const intake = isFlMenuFlow(rawIntake)
    ? rawIntake
    : normalizeIntakeFields(rawIntake);
  const intakeStep = intake?.step as string | undefined;
  const intakeInProgress = !!intakeStep && intakeStep !== "done";

  if (/^restart$/i.test(text.trim())) {
    if (isFlMenuFlow(intake)) {
      const restarted = leadCaptureRestart(intake as any);
      await admin.from("whatsapp_conversations").update({
        status: "unmatched_ai_intake",
        intake_data: restarted.intake,
        updated_at: now,
      }).eq("id", conv.id);
      replies.push(...restarted.replies);
    } else {
      await admin.from("whatsapp_conversations").update({
        status: "unmatched_ai_intake",
        intake_data: { step: "country" },
        updated_at: now,
      }).eq("id", conv.id);
      replies.push("Starting over. Which country are you interested in? (e.g. Canada, UK)");
    }
  } else if (
    aiMode !== "off"
    && conv.status === "ai_counseling"
    && text.trim()
    && messageType === "text"
  ) {
    const intakeData = (conv.intake_data || {}) as Record<string, unknown>;
    try {
      const { data: recentMsgs } = await admin
        .from("whatsapp_messages")
        .select("direction, body")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(8);

      const { replies: counselReplies, requestHandoff } = await nextGeminiCounseling(
        admin,
        intakeData as any,
        text,
        (recentMsgs ?? []).reverse(),
      );

      if (requestHandoff || clientRequestsCounselor(text)) {
        const branchResolved = await resolveBranchFromPreference(
          admin,
          intakeData.branch_preference as string | undefined,
        );
        const firstName = String(intakeData.full_name || "there").split(/\s+/)[0];
        const assignResult = await assignCounselorAfterIntake(admin, {
          conversationId: conv.id,
          leadId: conv.lead_id,
          branchId: branchResolved.branchId,
          branchLabel: branchResolved.branchLabel,
          contactName: String(intakeData.full_name || conv.phone_display || phoneE164),
          firstName,
          businessLineType: businessLine?.line_type,
        });

        if (assignResult.assigned) {
          replies.push(
            `Thank you! ${assignResult.counselorName} from Future Link will continue this chat with you shortly.`,
          );
        } else {
          await admin.from("whatsapp_conversations").update({
            status: "awaiting_assignment_confirm",
            updated_at: now,
          }).eq("id", conv.id);
          await notifyQueueUnassignedThread(admin, {
            conversationId: conv.id,
            contactLabel: conv.phone_display || phoneE164,
            reason: "intake_complete",
          });
          replies.push(
            counselReplies[0]
              || "Thank you! A Future Link counselor will respond on this chat shortly.",
          );
        }
      } else {
        replies.push(...counselReplies);
      }
    } catch (e) {
      console.error("[whatsapp-webhook] counseling:", e);
      replies.push(
        "Thanks for your message. Ask about documents, fees, or timelines — or reply COUNSELOR for our team.",
      );
    }
  } else if (
    aiMode !== "off"
    && conv.status === "unmatched_ai_intake"
    && intakeStep === "done"
    && text.trim()
    && messageType === "text"
  ) {
    // Recovery: intake marked done but status never advanced (failed YES handler)
    try {
      const { replies: counselReplies } = await nextGeminiCounseling(
        admin,
        intake as any,
        text,
      );
      await admin.from("whatsapp_conversations").update({
        status: "ai_counseling",
        updated_at: now,
      }).eq("id", conv.id);
      replies.push(...counselReplies);
    } catch (e) {
      console.error("[whatsapp-webhook] counseling recovery:", e);
      replies.push(
        "Thanks for your message. Reply COUNSELOR to connect with our team, or ask your question again.",
      );
    }
  } else if (
    aiMode !== "off"
    && (conv.status === "unmatched_ai_intake" || intakeInProgress)
    && intakeStep !== "done"
    && text.trim()
    && messageType === "text"
  ) {
    let nextIntake = intake as any;
    let botReplies: string[] = [];
    let confirmed = false;

    if (isFlMenuFlow(intake as any)) {
      const capture = nextLeadCaptureReply(intake as any, text);
      nextIntake = capture.intake;
      botReplies = capture.replies;
      confirmed = capture.confirmed;

      if (!confirmed && shouldForceLeadCaptureConfirm(intake as any, text)) {
        const forced = nextLeadCaptureReply({ ...intake, step: "confirm" } as any, text);
        nextIntake = forced.intake;
        confirmed = forced.confirmed;
        if (!botReplies.length) botReplies = forced.replies;
      }
    } else {
      const intakeFn = useGemini ? nextGeminiReply : nextRulesReply;
      const result = await intakeFn(intake as any, text);
      nextIntake = { ...intake, ...result.intake, step: result.intake.step };
      botReplies = result.replies;
      confirmed = result.confirmed;

      if (!confirmed && shouldForceIntakeConfirm(intake, text)) {
        const rules = nextRulesReply(intake, text);
        nextIntake = { ...intake, ...rules.intake, step: "done" };
        confirmed = rules.confirmed;
        if (!botReplies.length) botReplies = rules.replies;
      }
    }

    if (confirmed) {
      const { first_name, last_name } = splitName(String(nextIntake.full_name || "WhatsApp Lead"));
      const branchResolved = await resolveBranchFromPreference(
        admin,
        nextIntake.branch_preference as string | undefined,
      );
      if (branchResolved.branchId) nextIntake.branch_id = branchResolved.branchId;

      const leadNotes = isFlMenuFlow(nextIntake)
        ? buildLeadCaptureNotes(nextIntake)
        : `WhatsApp intake — level: ${nextIntake.level ?? "n/a"}${nextIntake.branch_preference ? `; branch: ${nextIntake.branch_preference}` : ""}`;

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
          notes: leadNotes,
          status: "new",
        })
        .select("id")
        .single();
      if (leadErr) console.error("[whatsapp-webhook] lead insert:", leadErr.message);

      nextIntake.step = "done";

      const counselingAfterSubmit = deferAssign && (useGemini || isFlMenuFlow(nextIntake));

      if (counselingAfterSubmit) {
        await admin.from("whatsapp_conversations").update({
          intake_data: nextIntake,
          lead_id: lead?.id ?? null,
          status: "ai_counseling",
          updated_at: now,
        }).eq("id", conv.id);

        if (isFlMenuFlow(nextIntake)) {
          // Success message already in botReplies from lead capture YES handler
          botReplies.push(
            "You can ask about documents, fees, or timelines while you wait — or reply *COUNSELOR* for our team.",
          );
        } else {
          botReplies.length = 0;
          botReplies.push(counselingWelcomeMessage(nextIntake));
        }
      } else {
        let finalStatus = "awaiting_assignment_confirm";

        const assignResult = await assignCounselorAfterIntake(admin, {
          conversationId: conv.id,
          leadId: lead?.id ?? null,
          branchId: branchResolved.branchId,
          branchLabel: branchResolved.branchLabel,
          contactName: String(nextIntake.full_name || ""),
          firstName: first_name,
          businessLineType: businessLine?.line_type,
        });

        if (assignResult.assigned) {
          finalStatus = "assigned_active";
          botReplies.length = 0;
          botReplies.push(
            `Thank you, ${first_name}! You are connected with ${assignResult.counselorName} from Future Link. They will contact you shortly on this number.`,
          );
        }

        if (finalStatus !== "assigned_active") {
          await admin.from("whatsapp_conversations").update({
            intake_data: nextIntake,
            lead_id: lead?.id ?? null,
            status: finalStatus,
            updated_at: now,
          }).eq("id", conv.id);

          if (finalStatus === "awaiting_assignment_confirm") {
            await notifyQueueUnassignedThread(admin, {
              conversationId: conv.id,
              contactLabel: conv.phone_display || phoneE164,
              reason: "intake_complete",
            });
          }
        } else {
          await admin.from("whatsapp_conversations").update({
            intake_data: nextIntake,
            lead_id: lead?.id ?? null,
            updated_at: now,
          }).eq("id", conv.id);
        }
      }
    } else {
      await admin.from("whatsapp_conversations").update({
        intake_data: nextIntake,
        updated_at: now,
      }).eq("id", conv.id);
      if (!botReplies.length) {
        botReplies.push("Please reply YES to confirm, or RESTART to begin again.");
      }
    }

    replies.push(...botReplies);
  } else if (conv.status === "existing_client" || conv.status === "assigned_active") {
    // Known contact — counselor handles in CRM (intake already finished)
  } else if (conv.status === "awaiting_assignment_confirm") {
    replies.push("Thank you for your message. A counselor will respond shortly.");
  }

  const contactLabel = String(conv.phone_display || phoneE164);
  const skipInboundNotify = conv.status === "unmatched_ai_intake"
    || intakeInProgress
    || conv.status === "ai_counseling";

  const { data: convNow } = await admin
    .from("whatsapp_conversations")
    .select("assigned_user_id, status")
    .eq("id", conv.id)
    .maybeSingle();
  const current = convNow ?? conv;

  if (!skipInboundNotify && current.assigned_user_id
    && (current.status === "assigned_active" || current.status === "existing_client")) {
    await notifyCounselorInboundMessage(admin, {
      counselorId: current.assigned_user_id as string,
      conversationId: conv.id,
      contactLabel,
      preview: displayBody,
      providerMessageId,
    });
  }

  if (current.status === "awaiting_assignment_confirm" && !current.assigned_user_id) {
    await notifyQueueUnassignedThread(admin, {
      conversationId: conv.id,
      contactLabel,
      reason: "new_message",
    });
  }

  for (const reply of replies) {
    await insertOutbound(admin, conv.id, phoneE164, reply, "ai", sendPhoneNumberId);
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
