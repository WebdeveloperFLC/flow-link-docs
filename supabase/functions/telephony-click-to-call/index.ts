import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getProvider } from "../_shared/telephony/provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(traceId: string, message: string, data?: Record<string, unknown>) {
  console.log(`[telephony-click-to-call] ${message}`, { traceId, ...(data ?? {}) });
}

function phoneSummary(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return { hidden: true, present: digits.length > 0, digitCount: digits.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const traceId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client validates the JWT and respects RLS for the permission check.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const clientId = String(body.clientId ?? "");
    const queueItemId = body.queueItemId ? String(body.queueItemId) : null;
    const campaignId = body.campaignId ? String(body.campaignId) : null;
    log(traceId, "request payload", { clientId, queueItemId, campaignId, hasClientId: !!clientId });
    if (!clientId) return json({ error: "clientId required" }, 400);

    // Permission check via RLS-respecting helper
    const { data: canEdit } = await userClient.rpc("can_edit_client", { _uid: userId, _cid: clientId });
    if (!canEdit) return json({ error: "Forbidden" }, 403);

    // Service role for the writes that follow
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

    // Look up client phone (admin client bypasses masking view; we never return it to caller)
    const { data: clientRow, error: cErr } = await adminClient
      .from("clients")
      .select("id, phone, full_name")
      .eq("id", clientId)
      .maybeSingle();
    if (cErr || !clientRow) return json({ error: "Client not found", traceId }, 404);
    log(traceId, "resolved client phone", { clientId, phone: phoneSummary(clientRow.phone) });
    if (!clientRow.phone) return json({ error: "Client has no phone number on file", traceId }, 422);

    // Ensure agent row exists
    let { data: agent } = await adminClient
      .from("telephony_agents")
      .select("id, role, telecmi_agent_id, is_available, is_on_break")
      .eq("user_id", userId)
      .maybeSingle();
    if (!agent) {
      const { data: created, error: aErr } = await adminClient
        .from("telephony_agents")
        .insert({ user_id: userId, role: "counselor", is_available: true })
        .select("id, role, telecmi_agent_id, is_available, is_on_break")
        .single();
      if (aErr) return json({ error: aErr.message, traceId }, 500);
      agent = created;
    }

    const provider = getProvider("telecmi");
    const fromNumber = provider.fromNumber();
    log(traceId, "masked outbound number", { maskedOutboundNumber: fromNumber ? phoneSummary(fromNumber) : { present: false } });
    if (!fromNumber) return json({ error: "Telephony not configured (missing TELECMI_FROM_NUMBER)", traceId }, 503);

    // Create session row first so we have an id even if provider call fails
    const { data: session, error: sErr } = await adminClient
      .from("call_sessions")
      .insert({
        agent_id: agent.id,
        client_id: clientId,
        campaign_id: campaignId,
        queue_item_id: queueItemId,
        provider: provider.name,
        direction: "outbound",
        status: "initiated",
        masked_number_used: fromNumber,
        created_by: userId,
      })
      .select("id")
      .single();
    if (sErr) return json({ error: sErr.message }, 500);

    try {
      const result = await provider.click2Call({
        toNumber: clientRow.phone,
        fromNumber,
        metadata: { sessionId: session.id, clientId },
      });
      await adminClient
        .from("call_sessions")
        .update({ telecmi_call_id: result.providerCallId, status: "ringing", start_time: new Date().toISOString() })
        .eq("id", session.id);

      // Audit log
      await adminClient.from("telephony_audit_logs").insert({
        actor_id: userId,
        session_id: session.id,
        client_id: clientId,
        event_type: "call_started",
        details: { provider: provider.name, providerCallId: result.providerCallId },
      });

      return json({
        sessionId: session.id,
        providerCallId: result.providerCallId,
        status: "ringing",
        maskedNumber: fromNumber,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await adminClient
        .from("call_sessions")
        .update({ status: "failed", end_time: new Date().toISOString(), notes: msg })
        .eq("id", session.id);
      return json({ error: "Provider call failed", detail: msg, sessionId: session.id }, 502);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("telephony-click-to-call error", msg);
    return json({ error: msg }, 500);
  }
});