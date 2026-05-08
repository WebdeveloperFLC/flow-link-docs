// Provider-agnostic telephony types — used by the browser client.
// Server-side adapters live in supabase/functions/_shared/telephony/.

export type TelephonyProviderName = "telecmi";

export interface CallRequest {
  clientId: string;
  // Optional: for queue mode the queue item id is passed so the session can be linked.
  queueItemId?: string;
  campaignId?: string;
}

export interface CallResult {
  sessionId: string;
  providerCallId: string | null;
  status: "initiated" | "ringing" | "failed";
  maskedNumber: string | null;
  traceId?: string;
}

export interface NormalizedEvent {
  providerEventId: string;
  providerCallId: string;
  type: "ringing" | "answered" | "completed" | "failed" | "no_answer" | "busy" | "recording";
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  raw: unknown;
}