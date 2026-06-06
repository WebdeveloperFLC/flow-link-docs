// @ts-nocheck
// Staff outbound WhatsApp — stores in CRM and sends via Meta Cloud API when configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  mediaStoragePath,
  metaSendEnabled,
  sendMetaMediaMessage,
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

  let body: {
    conversation_id?: string;
    text?: string;
    media_base64?: string;
    media_storage_path?: string;
    mime_type?: string;
    message_type?: string;
    filename?: string;
  };
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
  const mediaBase64 = body.media_base64?.trim();
  const mediaStoragePathInput = body.media_storage_path?.trim();
  const mimeType = (body.mime_type || "").trim().toLowerCase();
  const filename = (body.filename || "").trim() || undefined;

  if (!conversationId) {
    return new Response(JSON.stringify({ error: "conversation_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!text && !mediaBase64 && !mediaStoragePathInput) {
    return new Response(JSON.stringify({ error: "text or media required" }), {
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

  let mediaBytes: Uint8Array | null = null;
  let messageType: "text" | "image" | "document" = "text";
  let preUploadedPath: string | null = null;

  if (mediaStoragePathInput) {
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
    mediaBytes = new Uint8Array(await blob.arrayBuffer());
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
  } else if (mediaBase64) {
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
    mediaBytes = decodeBase64(mediaBase64);
    if (!mediaBytes?.length) {
      return new Response(JSON.stringify({ error: "invalid media data" }), {
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
  let mediaStoragePathValue: string | null = null;
  let mediaMime: string | null = null;

  if (mediaBytes && messageType !== "text") {
    mediaMime = mimeType;

    if (metaSendEnabled()) {
      const uploaded = await uploadMetaMedia(mediaBytes, mimeType, filename);
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
