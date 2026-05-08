import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const campaignId = body.campaignId ? String(body.campaignId) : null;

    const admin = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

    // Resolve agent — auto-create if missing
    let { data: agent } = await admin
      .from("telephony_agents")
      .select("id, role, is_on_break, is_available")
      .eq("user_id", userId)
      .maybeSingle();
    if (!agent) {
      const { data: created, error } = await admin
        .from("telephony_agents")
        .insert({ user_id: userId, role: "telecaller", is_available: true })
        .select("id, role, is_on_break, is_available")
        .single();
      if (error) return json({ error: error.message }, 500);
      agent = created;
    }
    if (agent.is_on_break) return json({ item: null, reason: "on_break" });
    if (!agent.is_available) return json({ item: null, reason: "not_available" });

    const { data: picked, error: rpcErr } = await admin.rpc("claim_next_queue_item", {
      _agent_id: agent.id,
      _campaign_id: campaignId,
    });
    if (rpcErr) return json({ error: rpcErr.message }, 500);

    return json({ item: picked ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});