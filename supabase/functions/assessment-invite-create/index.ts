import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { email, firstName, middleName, lastName, phone, clientId } = await req.json();
    if (!email || !firstName || !lastName) return json({ error: "Missing fields" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    // staff check via has_role
    const { data: rolesData } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (rolesData ?? []).map((r: any) => r.role);
    if (!roles.some((r: string) => ["admin","counselor","telecaller"].includes(r))) return json({ error: "Forbidden" }, 403);

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { data: invite, error } = await admin.from("assessment_invitations").insert({
      token,
      email: String(email).trim().toLowerCase(),
      phone: phone ?? null,
      first_name: firstName, middle_name: middleName ?? null, last_name: lastName,
      client_id: clientId ?? null,
      invited_by: user.id,
    }).select("id, token, expires_at, first_name").single();
    if (error) return json({ error: error.message }, 500);

    const origin = req.headers.get("origin") ?? "";
    const link = `${origin}/assessment/invite/${invite.token}`;

    let emailed = false;
    try {
      const r = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "assessment-invite",
          recipientEmail: email,
          idempotencyKey: `assessment-invite-${invite.id}`,
          templateData: { link, firstName: invite.first_name ?? firstName },
        },
      });
      if (!r.error) emailed = true;
    } catch (_) { /* queued silently */ }

    return json({ inviteId: invite.id, link, emailed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});