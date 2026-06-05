/** Meta WhatsApp Cloud API (Phase 1 — sandbox / production). */

export function isMetaConfigured(): boolean {
  return !!(
    Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim()
    && Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim()
  );
}

/** auto = send when tokens exist; mock = CRM-only; meta = require tokens */
export function metaSendEnabled(): boolean {
  const mode = (Deno.env.get("WHATSAPP_PROVIDER") || "auto").toLowerCase();
  if (mode === "mock") return false;
  if (mode === "meta") return isMetaConfigured();
  return isMetaConfigured();
}

export type MetaMessageType = "text" | "image" | "document" | "video" | "audio" | "unknown";

export type MetaInboundMessage = {
  phoneRaw: string;
  text: string;
  providerMessageId: string | null;
  isStatusOnly: boolean;
  messageType: MetaMessageType;
  mediaId: string | null;
  mediaMime: string | null;
  fileName: string | null;
};

function mediaBlock(msg: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const block = msg[key];
  return block && typeof block === "object" ? block as Record<string, unknown> : null;
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "video/mp4": "mp4",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
  };
  return map[mime.toLowerCase()] || mime.split("/")[1]?.split(";")[0]?.split("+")[0] || "bin";
}

export function parseMetaInbound(payload: Record<string, unknown>): MetaInboundMessage | null {
  const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
  const value = ((entry?.changes as unknown[])?.[0] as Record<string, unknown>)?.value as
    | Record<string, unknown>
    | undefined;
  if (!value) return null;

  const messages = value.messages as unknown[] | undefined;
  const msg = messages?.[0] as Record<string, unknown> | undefined;
  if (msg) {
    const rawType = String(msg.type || "text");
    const messageType: MetaMessageType = (
      ["text", "image", "document", "video", "audio"].includes(rawType) ? rawType : "unknown"
    ) as MetaMessageType;

    let text = "";
    let mediaId: string | null = null;
    let mediaMime: string | null = null;
    let fileName: string | null = null;

    if (messageType === "text") {
      text = String((msg.text as Record<string, string>)?.body || "");
    } else if (messageType === "image") {
      const img = mediaBlock(msg, "image");
      mediaId = img?.id ? String(img.id) : null;
      mediaMime = img?.mime_type ? String(img.mime_type) : "image/jpeg";
      text = String(img?.caption || "");
    } else if (messageType === "document") {
      const doc = mediaBlock(msg, "document");
      mediaId = doc?.id ? String(doc.id) : null;
      mediaMime = doc?.mime_type ? String(doc.mime_type) : "application/octet-stream";
      fileName = doc?.filename ? String(doc.filename) : null;
      text = String(doc?.caption || "");
    } else if (messageType === "video") {
      const vid = mediaBlock(msg, "video");
      mediaId = vid?.id ? String(vid.id) : null;
      mediaMime = vid?.mime_type ? String(vid.mime_type) : "video/mp4";
      text = String(vid?.caption || "");
    } else if (messageType === "audio") {
      const aud = mediaBlock(msg, "audio");
      mediaId = aud?.id ? String(aud.id) : null;
      mediaMime = aud?.mime_type ? String(aud.mime_type) : "audio/ogg";
    }

    return {
      phoneRaw: String(msg.from || ""),
      text,
      providerMessageId: msg.id ? String(msg.id) : null,
      isStatusOnly: false,
      messageType,
      mediaId,
      mediaMime,
      fileName,
    };
  }

  if ((value.statuses as unknown[])?.length) {
    return {
      phoneRaw: "",
      text: "",
      providerMessageId: null,
      isStatusOnly: true,
      messageType: "text",
      mediaId: null,
      mediaMime: null,
      fileName: null,
    };
  }

  return null;
}

export async function fetchMetaMedia(
  mediaId: string,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  if (!token || !mediaId) return null;

  const apiVersion = Deno.env.get("WHATSAPP_GRAPH_VERSION") || "v21.0";
  const metaRes = await fetch(`https://graph.facebook.com/${apiVersion}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    console.error("[metaApi] media meta failed:", metaRes.status, await metaRes.text().catch(() => ""));
    return null;
  }

  const meta = await metaRes.json().catch(() => ({})) as { url?: string; mime_type?: string };
  if (!meta.url) return null;

  const mime = meta.mime_type || "application/octet-stream";
  const binRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!binRes.ok) {
    console.error("[metaApi] media download failed:", binRes.status);
    return null;
  }

  return { bytes: new Uint8Array(await binRes.arrayBuffer()), mime };
}

export function mediaStoragePath(
  conversationId: string,
  providerMessageId: string | null,
  mime: string,
): string {
  const id = providerMessageId || crypto.randomUUID();
  return `${conversationId}/${id}.${extFromMime(mime)}`;
}

export function isMetaWebhookPayload(payload: Record<string, unknown>): boolean {
  return Array.isArray(payload.entry);
}

export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = Deno.env.get("WHATSAPP_APP_SECRET")?.trim();
  if (!secret) return true;

  if (!signatureHeader?.startsWith("sha256=")) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const expected = signatureHeader.slice(7);
  return hex === expected;
}

export async function sendMetaText(
  toPhoneE164: string,
  body: string,
): Promise<{ messageId?: string; skipped: boolean; error?: string }> {
  if (!metaSendEnabled()) return { skipped: true };

  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!.trim();
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!.trim();
  const to = toPhoneE164.replace(/\D/g, "");
  if (!to || !body.trim()) return { skipped: true, error: "missing phone or body" };

  const apiVersion = Deno.env.get("WHATSAPP_GRAPH_VERSION") || "v21.0";
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: body.trim() },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message || res.statusText;
    console.error("[metaApi] send failed:", msg, json);
    return { skipped: false, error: msg };
  }

  const messageId = (json as { messages?: { id: string }[] }).messages?.[0]?.id;
  return { messageId, skipped: false };
}
