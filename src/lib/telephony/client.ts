import { supabase } from "@/integrations/supabase/client";
import type { CallRequest, CallResult } from "./types";

// Browser-side helpers. All calls go through edge functions — the browser
// never talks to the telephony provider directly.

export async function startCall(req: CallRequest): Promise<CallResult> {
  const { data, error } = await supabase.functions.invoke("telephony-click-to-call", {
    body: req,
  });
  if (error) throw error;
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