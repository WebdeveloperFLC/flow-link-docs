import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { clientId, email } = await req.json();
    if (!clientId || !email) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);

    // check edit permission via RPC-equivalent: use user client to insert (RLS will guard)
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { data: invite, error } = await userClient.from("client_portal_invites").insert({
      client_id: clientId, email: email.trim().toLowerCase(), token, invited_by: user.id,
    }).select("id, token, expires_at").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const origin = req.headers.get("origin") ?? "";
    const link = `${origin}/portal/invite?token=${invite.token}`;

    // Try to send email via existing transactional sender if available; otherwise return link only.
    let emailed = false;
    try {
      const r = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "portal-invite",
          recipientEmail: email,
          idempotencyKey: `portal-invite-${invite.id}`,
          templateData: { link },
        },
      });
      if (!r.error) emailed = true;
    } catch (_) { /* email not configured yet */ }

    return new Response(JSON.stringify({ inviteId: invite.id, link, emailed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});