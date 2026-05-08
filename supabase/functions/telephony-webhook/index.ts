import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getProvider } from "../_shared/telephony/provider.ts";

// Public endpoint — verify_jwt = false in supabase/config.toml.
// HMAC signature verified inside (when TELECMI_WEBHOOK_SECRET is set).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawBody = await req.text();
  const provider = getProvider("telecmi");

  const verify = await provider.verifyWebhook(rawBody, req.headers);
  if (!verify.ok) {
    console.warn("[telephony-webhook] signature verification failed:", verify.reason);
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: corsHeaders }); }

  const evt = provider.normalizeEvent(payload);
  if (!evt) {
    // Unknown payload shape — ack so the provider stops retrying, but log for inspection.
    console.warn("[telephony-webhook] could not normalize payload:", rawBody.slice(0, 500));
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Find the related session (if any) by provider call id
  const { data: session } = await admin
    .from("call_sessions")
    .select("id, client_id, agent_id")
    .eq("provider", provider.name)
    .eq("telecmi_call_id", evt.providerCallId)
    .maybeSingle();

  // Idempotent insert into call_events. The unique index on
  // (provider, provider_event_id) makes ON CONFLICT a no-op.
  await admin.from("call_events").insert({
    provider: provider.name,
    provider_event_id: evt.providerEventId,
    session_id: session?.id ?? null,
    client_id: session?.client_id ?? null,
    event_type: evt.type,
    raw: evt.raw as Record<string, unknown>,
    received_at: new Date().toISOString(),
    matched_at: session ? new Date().toISOString() : null,
    call_id: evt.providerCallId,
  }).then(({ error }) => {
    if (error && error.code !== "23505") console.warn("[telephony-webhook] insert call_event error:", error.message);
  });

  if (session) {
    const update: Record<string, unknown> = {};
    if (evt.type === "ringing") update.status = "ringing";
    if (evt.type === "answered") { update.status = "answered"; update.start_time = evt.startTime ?? new Date().toISOString(); }
    if (evt.type === "completed") { update.status = "completed"; update.end_time = evt.endTime ?? new Date().toISOString(); update.duration_seconds = evt.durationSeconds ?? null; }
    if (evt.type === "failed") { update.status = "failed"; update.end_time = new Date().toISOString(); }
    if (evt.type === "no_answer") { update.status = "no_answer"; update.end_time = new Date().toISOString(); }
    if (evt.type === "busy") { update.status = "busy"; update.end_time = new Date().toISOString(); }
    if (evt.recordingUrl) update.recording_url = evt.recordingUrl;

    if (Object.keys(update).length) {
      await admin.from("call_sessions").update(update).eq("id", session.id);
    }

    if (["completed", "failed", "no_answer", "busy"].includes(evt.type)) {
      await admin.from("telephony_audit_logs").insert({
        actor_id: session.agent_id ?? null,
        session_id: session.id,
        client_id: session.client_id,
        event_type: "call_ended",
        details: { result: evt.type, duration: evt.durationSeconds ?? null },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});