// Server-side mirror of src/lib/telephony/types.ts plus provider interface.

export type TelephonyProviderName = "telecmi";

export interface ProviderCallRequest {
  toNumber: string;
  fromNumber: string;
  telecmiAgentId: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderCallResult {
  providerCallId: string | null;
  status: string | null;
  message: string | null;
  endpoint: string;
  raw: unknown;
}

export interface ProviderAgentReadiness {
  ok: boolean;
  reason?: string;
  status?: string | null;
  raw?: unknown;
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

export interface TelephonyProvider {
  name: TelephonyProviderName;
  fromNumber(): string;
  verifyAgentReady(agentId: string): Promise<ProviderAgentReadiness>;
  click2Call(req: ProviderCallRequest): Promise<ProviderCallResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<{ ok: boolean; reason?: string }> | { ok: boolean; reason?: string };
  normalizeEvent(payload: unknown): NormalizedEvent | null;
}