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

export function parseMetaInbound(payload: Record<string, unknown>): {
  phoneRaw: string;
  text: string;
  providerMessageId: string | null;
  isStatusOnly: boolean;
} | null {
  const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
  const value = ((entry?.changes as unknown[])?.[0] as Record<string, unknown>)?.value as
    | Record<string, unknown>
    | undefined;
  if (!value) return null;

  const messages = value.messages as unknown[] | undefined;
  const msg = messages?.[0] as Record<string, unknown> | undefined;
  if (msg) {
    const textBody = String((msg.text as Record<string, string>)?.body || "");
    return {
      phoneRaw: String(msg.from || ""),
      text: textBody,
      providerMessageId: msg.id ? String(msg.id) : null,
      isStatusOnly: false,
    };
  }

  if ((value.statuses as unknown[])?.length) {
    return { phoneRaw: "", text: "", providerMessageId: null, isStatusOnly: true };
  }

  return null;
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
