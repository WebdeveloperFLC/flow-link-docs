// Returns the calling counselor's TeleCMI SBC credentials so the browser SDK
// can authenticate. Never returns another user's credentials. SBC URI and the
// admin test extension come from the global provider settings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  const uid = userData.user.id;

  const admin = createClient(url, serviceKey);

  const [{ data: agent }, { data: settings }, { data: isAdmin }] = await Promise.all([
    admin
      .from("telephony_agents")
      .select("id, sbc_user_id, sbc_password, telecmi_agent_id, is_available, is_on_break")
      .eq("user_id", uid)
      .maybeSingle(),
    admin
      .from("telephony_provider_settings")
      .select("sbc_uri, test_extension, from_number")
      .eq("id", "global")
      .maybeSingle(),
    userClient.rpc("has_role", { _user_id: uid, _role: "admin" }),
  ]);

  if (!agent) return json(404, { error: "No telephony agent profile for this user" });
  if (!agent.sbc_user_id || !agent.sbc_password) {
    return json(409, { error: "SBC credentials not configured for your account. Ask an admin to set them." });
  }
  if (!settings?.sbc_uri) {
    return json(409, { error: "Global SBC URI not configured. Ask an admin to set it." });
  }

  // Audit log: counselor fetched SBC creds (= about to start a browser session)
  await admin.from("telephony_audit_logs").insert({
    actor_id: uid,
    event_type: "browser_login_creds_issued",
    details: { sbc_uri: settings.sbc_uri },
  });

  return json(200, {
    sbc_uri: settings.sbc_uri,
    user_id: agent.sbc_user_id,
    password: agent.sbc_password,
    telecmi_agent_id: agent.telecmi_agent_id,
    test_extension: isAdmin ? settings.test_extension ?? null : null,
    is_admin: !!isAdmin,
  });
});