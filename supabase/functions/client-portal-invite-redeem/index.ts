import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, password, fullName } = await req.json();
    if (!token || !password) {
      return new Response(JSON.stringify({ error: "Missing token or password" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: invite } = await admin.from("client_portal_invites")
      .select("id, client_id, email, expires_at, used_at, revoked_at")
      .eq("token", token).maybeSingle();
    if (!invite) return new Response(JSON.stringify({ error: "Invalid invite" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (invite.used_at) return new Response(JSON.stringify({ error: "Invite already used" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (invite.revoked_at) return new Response(JSON.stringify({ error: "Invite revoked" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (new Date(invite.expires_at) < new Date()) return new Response(JSON.stringify({ error: "Invite expired" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Find existing user by email
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => (u.email ?? "").toLowerCase() === invite.email.toLowerCase());

    if (existing) {
      userId = existing.id;
      // update password
      await admin.auth.admin.updateUserById(existing.id, { password });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName ?? "", signup_role: "client" },
      });
      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Could not create user" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userId = created.user.id;
    }

    // Ensure client role
    await admin.from("user_roles").insert({ user_id: userId, role: "client" }).select().maybeSingle();

    // Link to case
    await admin.from("client_portal_links").insert({ user_id: userId, client_id: invite.client_id, relation: "self", is_primary: true });

    // Mark invite used
    await admin.from("client_portal_invites").update({ used_at: new Date().toISOString(), used_by: userId }).eq("id", invite.id);

    return new Response(JSON.stringify({ ok: true, email: invite.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});