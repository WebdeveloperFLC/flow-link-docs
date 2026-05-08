import { supabase } from "@/integrations/supabase/client";
import type { CallRequest, CallResult } from "./types";

// Browser-side helpers. All calls go through edge functions — the browser
// never talks to the telephony provider directly.

export class TelephonyCallError extends Error {
  sessionId?: string;
  traceId?: string;

  constructor(message: string, meta?: { sessionId?: string; traceId?: string }) {
    super(message);
    this.name = "TelephonyCallError";
    this.sessionId = meta?.sessionId;
    this.traceId = meta?.traceId;
  }
}

async function normalizeFunctionError(error: unknown): Promise<TelephonyCallError> {
  const maybe = error as { message?: string; context?: unknown };
  const context = maybe.context;
  if (context instanceof Response) {
    const body = await context.json().catch(() => null) as { error?: string; detail?: string; sessionId?: string; traceId?: string } | null;
    if (body) {
      const message = [body.error, body.detail].filter(Boolean).join(": ") || maybe.message || "Telephony request failed";
      return new TelephonyCallError(message, { sessionId: body.sessionId, traceId: body.traceId });
    }
  }
  return new TelephonyCallError(maybe.message ?? "Telephony request failed");
}

export async function startCall(req: CallRequest): Promise<CallResult> {
  // Ensure we have a fresh, valid JWT before invoking — stale tokens cause 401s.
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session;
  }
  if (!session?.access_token) {
    throw new TelephonyCallError("You are signed out. Please sign in again.");
  }
  // Bypass supabase-js invoke header handling and call the function directly so
  // our fresh access_token is the Authorization header (not overridden).
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telephony-click-to-call`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json().catch(() => null) as
    | (CallResult & { error?: string; detail?: string; sessionId?: string; traceId?: string })
    | null;
  if (!res.ok) {
    const message = [data?.error, data?.detail].filter(Boolean).join(": ") || `Request failed (${res.status})`;
    throw new TelephonyCallError(message, { sessionId: data?.sessionId, traceId: data?.traceId });
  }
  return data as CallResult;
}

export async function getRecordingUrl(sessionId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("telephony-recording-url", {
    body: { sessionId },
  });
  if (error) throw error;
  return (data as { url: string }).url;
}

export async function claimNextQueueItem(campaignId?: string) {
  const { data, error } = await supabase.functions.invoke("telephony-queue-next", {
    body: { campaignId },
  });
  if (error) throw error;
  return data as { item: Record<string, unknown> | null };
}