// @ts-nocheck
// Staff outbound WhatsApp — stores in CRM and sends via Meta Cloud API when configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getConversationSendLine } from "../_shared/whatsapp/businessLines.ts";
import {
  isMetaSessionWindowError,
  mediaStoragePath,
  metaSendEnabled,
  sendMetaMediaMessage,
  sendMetaTemplate,
  sendMetaText,
  uploadMetaMedia,
} from "../_shared/whatsapp/metaApi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOC_MIMES = new Set(["application/pdf"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 16 * 1024 * 1024;

function decodeBase64(data: string): Uint8Array | null {
  try {
    const normalized = data.replace(/^data:[^;]+;base64,/, "").trim();
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function resolveMessageType(mime: string): "image" | "document" | null {
  if (IMAGE_MIMES.has(mime)) return "image";
  if (DOC_MIMES.has(mime)) return "document";
  return null;
}

function displayBody(
  messageType: "text" | "image" | "document",
  text: string,
  filename?: string,
): string {
  const caption = text.trim();
  if (messageType === "text") return caption;
  if (caption) return caption;
  if (messageType === "image") return "[Image]";
  return filename ? `[Document: ${filename}]` : "[Document]";
}

type ParsedSendRequest = {
  conversationId: string;
  text: string;
  mimeType: string;
  filename?: string;
  mediaBase64?: string;
  mediaStoragePath?: string;
  multipartBytes?: Uint8Array;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
};

function fillTemplatePreview(preview: string, params: string[]): string {
  let out = preview;
  params.forEach((val, i) => {
    out = out.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"), val);
  });
  return out;
}

async function parseSendRequest(req: Request): Promise<ParsedSendRequest | Response> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return new Response(JSON.stringify({ error: "invalid multipart body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationId = String(form.get("conversation_id") || "").trim();
    const text = String(form.get("text") || "").trim();
    let mimeType = String(form.get("mime_type") || "").trim().toLowerCase();
    let filename = String(form.get("filename") || "").trim() || undefined;
    const file = form.get("file");

    let multipartBytes: Uint8Array | undefined;
    if (file instanceof File && file.size > 0) {
      if (!mimeType) mimeType = (file.type || "").trim().toLowerCase();
      if (!filename) filename = file.name || undefined;
      multipartBytes = new Uint8Array(await file.arrayBuffer());
    }

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!text && !multipartBytes?.length) {
      return new Response(JSON.stringify({ error: "text or media required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return { conversationId, text, mimeType, filename, multipartBytes };
  }

  let body: {
    conversation_id?: string;
    text?: string;
    media_base64?: string;
    media_storage_path?: string;
    mime_type?: string;
    filename?: string;
    template_name?: string;
    template_language?: string;
    template_params?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const conversationId = String(body.conversation_id || "").trim();
  const text = (body.text || "").trim();
  const mediaBase64 = body.media_base64?.trim();
  const mediaStoragePath = body.media_storage_path?.trim();
  const mimeType = (body.mime_type || "").trim().toLowerCase();
  const filename = (body.filename || "").trim() || undefined;
  const templateName = (body.template_name || "").trim();
  const templateLanguage = (body.template_language || "en").trim();
  const templateParams = Array.isArray(body.template_params)
    ? body.template_params.map((p) => String(p).trim())
    : [];

  if (!conversationId) {
    return new Response(JSON.stringify({ error: "conversation_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (templateName) {
    return { conversationId, text: "", mimeType: "", templateName, templateLanguage, templateParams };
  }
  if (!text && !mediaBase64 && !mediaStoragePath) {
    return new Response(JSON.stringify({ error: "text, media, or template required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return { conversationId, text, mimeType, filename, mediaBase64, mediaStoragePath };
}

function applyMediaBytes(
  mediaBytes: Uint8Array,
  mimeType: string,
): { messageType: "image" | "document"; mediaBytes: Uint8Array } | Response {
  if (!mimeType) {
    return new Response(JSON.stringify({ error: "mime_type required with media" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const messageType = resolveMessageType(mimeType);
  if (!messageType) {
    return new Response(JSON.stringify({ error: "unsupported file type (use JPG, PNG, WebP, or PDF)" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!mediaBytes.length) {
    return new Response(JSON.stringify({ error: "empty media file" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const maxBytes = messageType === "image" ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (mediaBytes.length > maxBytes) {
    const limitMb = messageType === "image" ? 5 : 16;
    return new Response(JSON.stringify({ error: `file too large (max ${limitMb} MB)` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { messageType, mediaBytes };
}

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

  const parsed = await parseSendRequest(req);
  if (parsed instanceof Response) return parsed;

  const {
    conversationId,
    text,
    mimeType,
    filename,
    mediaBase64,
    mediaStoragePath: mediaStoragePathInput,
    multipartBytes,
    templateName,
    templateLanguage,
    templateParams,
  } = parsed;

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

  if (templateName) {
    const { data: canEditTpl } = await admin.rpc("whatsapp_can_edit_conversation", {
      _uid: uid,
      _conv_id: conversationId,
    });
    if (!canEditTpl) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: convTpl, error: convTplErr } = await admin
      .from("whatsapp_conversations")
      .select("id, phone_e164, business_line_id")
      .eq("id", conversationId)
      .single();
    if (convTplErr || !convTpl) {
      return new Response(JSON.stringify({ error: "conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tpl, error: tplErr } = await admin
      .from("whatsapp_message_templates")
      .select("*")
      .eq("name", templateName)
      .eq("language_code", templateLanguage || "en")
      .eq("active", true)
      .maybeSingle();
    if (tplErr || !tpl) {
      return new Response(JSON.stringify({
        error: `template not found: ${templateName}`,
        hint: "Create and approve the template in Meta Business Manager, then add it to whatsapp_message_templates.",
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedParams = tpl.param_count ?? 0;
    const params = templateParams ?? [];
    if (params.length !== expectedParams) {
      return new Response(JSON.stringify({
        error: `template requires ${expectedParams} parameter(s), got ${params.length}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { metaPhoneNumberId: linePhoneId } = await getConversationSendLine(admin, convTpl.business_line_id);
    let providerMessageId: string | null = null;
    let metaSent = false;

    if (metaSendEnabled()) {
      const sent = await sendMetaTemplate(convTpl.phone_e164, {
        name: templateName,
        languageCode: templateLanguage || "en",
        parameters: params,
        phoneNumberId: linePhoneId,
      });
      if (sent.error) {
        return new Response(JSON.stringify({ error: sent.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      metaSent = !sent.skipped;
      providerMessageId = sent.messageId ?? null;
    }

    const preview = tpl.body_preview
      ? fillTemplatePreview(String(tpl.body_preview), params)
      : `[Template: ${tpl.label || templateName}]`;
    const now = new Date().toISOString();

    const { data: msg, error: insErr } = await admin
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        direction: "outbound",
        body: `[Template] ${preview}`,
        sent_by: "staff",
        sent_by_user_id: uid,
        provider_message_id: providerMessageId,
        message_type: "text",
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
      template: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let mediaBytes: Uint8Array | null = null;
  let messageType: "text" | "image" | "document" = "text";
  let preUploadedPath: string | null = null;

  if (multipartBytes?.length) {
    const applied = applyMediaBytes(multipartBytes, mimeType);
    if (applied instanceof Response) return applied;
    messageType = applied.messageType;
    mediaBytes = applied.mediaBytes;
  } else if (mediaStoragePathInput) {
    const prefix = `${conversationId}/`;
    if (!mediaStoragePathInput.startsWith(prefix) || mediaStoragePathInput.includes("..")) {
      return new Response(JSON.stringify({ error: "invalid media_storage_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!mimeType) {
      return new Response(JSON.stringify({ error: "mime_type required with media" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const resolved = resolveMessageType(mimeType);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "unsupported file type (use JPG, PNG, WebP, or PDF)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    messageType = resolved;
    preUploadedPath = mediaStoragePathInput;

    const { data: blob, error: dlErr } = await admin.storage
      .from("whatsapp-media")
      .download(mediaStoragePathInput);
    if (dlErr || !blob) {
      return new Response(JSON.stringify({ error: dlErr?.message || "media file not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rawBytes = new Uint8Array(await blob.arrayBuffer());
    const applied = applyMediaBytes(rawBytes, mimeType);
    if (applied instanceof Response) return applied;
    messageType = applied.messageType;
    mediaBytes = applied.mediaBytes;
  } else if (mediaBase64) {
    const rawBytes = decodeBase64(mediaBase64);
    if (!rawBytes) {
      return new Response(JSON.stringify({ error: "invalid media data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const applied = applyMediaBytes(rawBytes, mimeType);
    if (applied instanceof Response) return applied;
    messageType = applied.messageType;
    mediaBytes = applied.mediaBytes;
  }

  const { data: conv, error: convErr } = await admin
    .from("whatsapp_conversations")
    .select("id, phone_e164, business_line_id, last_inbound_at")
    .eq("id", conversationId)
    .single();
  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: "conversation not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { metaPhoneNumberId: linePhoneId } = await getConversationSendLine(admin, conv.business_line_id);

  let providerMessageId: string | null = null;
  let metaSent = false;
  let mediaStoragePathValue: string | null = null;
  let mediaMime: string | null = null;

  const sessionExpiredHint = () => new Response(JSON.stringify({
    error: "WhatsApp 24-hour session expired. Use an approved template below, or ask the client to message the helpline first.",
    session_expired: true,
    hint: "Client must send a new message to reopen the free-reply window.",
  }), {
    status: 422,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  if (mediaBytes && messageType !== "text") {
    mediaMime = mimeType;

    if (metaSendEnabled()) {
      const uploaded = await uploadMetaMedia(mediaBytes, mimeType, filename, linePhoneId);
      if (uploaded.error) {
        return new Response(JSON.stringify({ error: uploaded.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sent = await sendMetaMediaMessage(conv.phone_e164, {
        messageType,
        mediaId: uploaded.mediaId!,
        caption: text || undefined,
        filename,
        phoneNumberId: linePhoneId,
      });
      if (sent.error) {
        if (sent.sessionExpired || isMetaSessionWindowError(sent.error)) return sessionExpiredHint();
        return new Response(JSON.stringify({ error: sent.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      metaSent = !sent.skipped;
      providerMessageId = sent.messageId ?? null;
    }

    if (preUploadedPath) {
      mediaStoragePathValue = preUploadedPath;
    } else {
      const storageKey = providerMessageId || crypto.randomUUID();
      mediaStoragePathValue = mediaStoragePath(conversationId, storageKey, mimeType);
      const blob = new Blob([mediaBytes], { type: mimeType });
      const { error: storageErr } = await admin.storage
        .from("whatsapp-media")
        .upload(mediaStoragePathValue, blob, { contentType: mimeType, upsert: true });
      if (storageErr) {
        return new Response(JSON.stringify({ error: `storage upload failed: ${storageErr.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } else if (text) {
    if (metaSendEnabled()) {
      const sent = await sendMetaText(conv.phone_e164, text, linePhoneId);
      if (sent.error) {
        if (sent.sessionExpired || isMetaSessionWindowError(sent.error)) return sessionExpiredHint();
        return new Response(JSON.stringify({ error: sent.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      metaSent = !sent.skipped;
      providerMessageId = sent.messageId ?? null;
    }
  }

  const now = new Date().toISOString();

  const { data: msg, error: insErr } = await admin
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversationId,
      direction: "outbound",
      body: displayBody(messageType, text, filename),
      sent_by: "staff",
      sent_by_user_id: uid,
      provider_message_id: providerMessageId,
      message_type: messageType,
      media_storage_path: mediaStoragePathValue,
      media_mime: mediaMime,
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
    message_type: messageType,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
