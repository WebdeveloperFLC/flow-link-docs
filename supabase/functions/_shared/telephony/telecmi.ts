import type { TelephonyProvider, ProviderCallRequest, ProviderCallResult, NormalizedEvent } from "./types.ts";

const TELECMI_CHUB_BASE = "https://piopiy.telecmi.com/v1";

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

function redactTelecmiBody(body: Record<string, unknown>) {
  const redacted = { ...body };
  for (const key of ["secret", "token"]) if (redacted[key]) redacted[key] = "[redacted]";
  for (const key of ["to", "from", "caller_id", "phone", "number"]) {
    if (redacted[key]) redacted[key] = { hidden: true, digitCount: String(redacted[key]).replace(/\D/g, "").length };
  }
  return redacted;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseJsonOrText(text: string): unknown {
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { return { nonJsonBody: text.slice(0, 1000) }; }
}

export const telecmi: TelephonyProvider = {
  name: "telecmi",

  fromNumber() {
    return env("TELECMI_FROM_NUMBER");
  },

  async verifyAgentReady(agentId: string) {
    const appid = env("TELECMI_APP_ID");
    const secret = env("TELECMI_SECRET");
    const body = { appid, secret, id: agentId };
    console.log("[telecmi] TeleCMI agent readiness request body", { endpoint: `${TELECMI_CHUB_BASE}/agent/get`, body: redactTelecmiBody(body) });
    const res = await fetch(`${TELECMI_CHUB_BASE}/agent/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    const raw = parseJsonOrText(rawText);
    console.log("[telecmi] TeleCMI agent readiness response body", { httpStatus: res.status, body: raw });
    if (!res.ok || !raw) return { ok: false, reason: `agent readiness failed (${res.status})`, raw };
    const status = getString((raw as Record<string, unknown>).status);
    const code = String((raw as Record<string, unknown>).code ?? "");
    const agent = (raw as Record<string, unknown>).agent;
    return {
      ok: status === "success" && code === "cmi-2000" && !!agent,
      reason: status === "success" && code === "cmi-2000" && !!agent ? undefined : "agent not ready or not found",
      status,
      raw,
    };
  },

  async click2Call(req: ProviderCallRequest): Promise<ProviderCallResult> {
    const secret = env("TELECMI_SECRET");
    // CHUB click-to-call: calls the counselor/agent first, then connects the client.
    const body = {
      agent_id: req.telecmiAgentId,
      token: secret,
      to: req.toNumber,
      custom: JSON.stringify(req.metadata ?? {}),
    };
    console.log("[telecmi] TeleCMI API request body", { endpoint: `${TELECMI_CHUB_BASE}/adminConnect`, body: redactTelecmiBody(body) });
    const res = await fetch(`${TELECMI_CHUB_BASE}/adminConnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    const raw = parseJsonOrText(rawText);
    console.log("[telecmi] TeleCMI API response body", { httpStatus: res.status, body: raw });
    if (!raw) throw new Error(`telecmi click-to-call returned an empty response (${res.status})`);
    if (!res.ok) {
      throw new Error(`telecmi click-to-call failed (${res.status}): ${JSON.stringify(raw)}`);
    }
    const rawCode = (raw as Record<string, unknown>).code;
    if (rawCode !== undefined && String(rawCode) !== "200") {
      throw new Error(`telecmi click-to-call returned error code ${String(rawCode)}: ${JSON.stringify(raw)}`);
    }
    // TeleCMI typically returns a request_id / call_id. Support both shapes.
    const data = (raw as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const providerCallId =
      (raw as Record<string, unknown>).call_id as string ??
      (raw as Record<string, unknown>).request_id as string ??
      data?.request_id as string ??
      null;
    const status = getString((raw as Record<string, unknown>).status) ?? getString(data?.status) ?? getString((raw as Record<string, unknown>).msg);
    const message = getString((raw as Record<string, unknown>).msg) ?? getString((raw as Record<string, unknown>).message);
    if (!providerCallId) throw new Error(`telecmi click-to-call did not return a request id: ${JSON.stringify(raw)}`);
    return { providerCallId, status, message, endpoint: `${TELECMI_CHUB_BASE}/adminConnect`, raw };
  },

  async verifyWebhook(rawBody: string, headers: Headers) {
    const secret = env("TELECMI_WEBHOOK_SECRET", false);
    if (!secret) {
      console.warn("[telecmi] TELECMI_WEBHOOK_SECRET not set — skipping signature verification");
      return { ok: true, reason: "no-secret-configured" };
    }
    const provided = headers.get("x-telecmi-signature") ?? headers.get("x-signature") ?? "";
    if (!provided) return { ok: false, reason: "missing-signature-header" };
    const expected = await hmacHex(secret, rawBody);
    return { ok: timingSafeEqual(expected, provided.trim()) };
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