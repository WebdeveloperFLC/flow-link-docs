import type { TelephonyProvider, ProviderCallRequest, ProviderCallResult, NormalizedEvent } from "./types.ts";

const TELECMI_BASE = "https://rest.telecmi.com/v2";

function env(name: string, required = true): string {
  const v = Deno.env.get(name) ?? "";
  if (!v && required) console.warn(`[telecmi] missing env: ${name}`);
  return v;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const telecmi: TelephonyProvider = {
  name: "telecmi",

  fromNumber() {
    return env("TELECMI_FROM_NUMBER");
  },

  async click2Call(req: ProviderCallRequest): Promise<ProviderCallResult> {
    const appid = env("TELECMI_APP_ID");
    const secret = env("TELECMI_SECRET");
    // PIOPIY click-to-call. If your TeleCMI plan uses a different endpoint, swap it here.
    const body = {
      appid,
      secret,
      from: req.fromNumber,
      to: req.toNumber,
      caller_id: req.fromNumber,
    };
    const res = await fetch(`${TELECMI_BASE}/ind_pcmo_make_call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`telecmi click-to-call failed (${res.status}): ${JSON.stringify(raw)}`);
    }
    // TeleCMI typically returns a request_id / call_id. Support both shapes.
    const providerCallId =
      (raw as Record<string, unknown>).call_id as string ??
      (raw as Record<string, unknown>).request_id as string ??
      null;
    return { providerCallId, raw };
  },

  verifyWebhook(rawBody: string, headers: Headers) {
    const secret = env("TELECMI_WEBHOOK_SECRET", false);
    if (!secret) {
      console.warn("[telecmi] TELECMI_WEBHOOK_SECRET not set — skipping signature verification");
      return { ok: true, reason: "no-secret-configured" };
    }
    // TeleCMI does not have a fixed signature header convention across plans.
    // Accept either "X-TeleCMI-Signature" or "X-Signature". Both are HMAC-SHA256 hex of the raw body.
    const provided = headers.get("x-telecmi-signature") ?? headers.get("x-signature") ?? "";
    if (!provided) return { ok: false, reason: "missing-signature-header" };
    return hmacHex(secret, rawBody).then((expected) => ({
      ok: timingSafeEqual(expected, provided.trim()),
      reason: undefined,
    })) as unknown as { ok: boolean; reason?: string };
    // Note: returns a Promise — the webhook handler awaits it.
  },

  normalizeEvent(payload: unknown): NormalizedEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    const callId = (p.call_id ?? p.callid ?? p.request_id ?? p.uuid) as string | undefined;
    if (!callId) return null;
    const eventId = (p.event_id ?? p.id ?? `${callId}:${p.event ?? p.status ?? Date.now()}`) as string;
    const evt = String(p.event ?? p.status ?? "").toLowerCase();

    let type: NormalizedEvent["type"] = "ringing";
    if (evt.includes("answer") || evt === "in-progress") type = "answered";
    else if (evt === "completed" || evt === "ended" || evt === "complete") type = "completed";
    else if (evt === "failed" || evt === "error") type = "failed";
    else if (evt === "no-answer" || evt === "noanswer") type = "no_answer";
    else if (evt === "busy") type = "busy";
    else if (evt === "recording" || p.recording_url) type = "recording";

    const dur = Number(p.duration ?? p.call_duration ?? 0);
    return {
      providerEventId: eventId,
      providerCallId: String(callId),
      type,
      startTime: (p.start_time ?? p.answered_at) as string | undefined,
      endTime: (p.end_time ?? p.ended_at) as string | undefined,
      durationSeconds: Number.isFinite(dur) && dur > 0 ? dur : undefined,
      recordingUrl: (p.recording_url ?? p.recordingUrl) as string | undefined,
      raw: payload,
    };
  },
};