import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Verifies an email verification token, creates/links an auth user for the lead,
// creates (or returns) the current draft session, and returns a magic link so the
// browser can sign in and continue to the questionnaire.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token) return json({ error: "Missing token" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: rec } = await admin
      .from("assessment_email_verifications")
      .select("id, lead_id, email, expires_at, consumed_at")
      .eq("token", token)
      .maybeSingle();
    if (!rec) return json({ error: "Invalid token" }, 404);
    if (rec.consumed_at) return json({ error: "Token already used" }, 410);
    if (new Date(rec.expires_at) < new Date()) return json({ error: "Token expired" }, 410);

    const { data: lead } = await admin
      .from("assessment_leads")
      .select("id, email, first_name, last_name, middle_name, auth_user_id, invitation_id")
      .eq("id", rec.lead_id)
      .maybeSingle();
    if (!lead) return json({ error: "Lead missing" }, 404);

    // Resolve country + goal from the invitation if present, so the session
    // gets the correct values rather than the hardcoded Canada / permanent_residence fallback.
    let sessionCountry = "Canada";
    let sessionGoal = "permanent_residence";
    if (lead.invitation_id) {
      const { data: inv } = await admin
        .from("assessment_invitations")
        .select("client_id")
        .eq("id", lead.invitation_id)
        .maybeSingle();
      if (inv?.client_id) {
        // Try to find the most recent draft session created for this client by staff
        const { data: staffSes } = await admin
          .from("assessment_sessions")
          .select("country, goal")
          .eq("client_id", inv.client_id)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (staffSes) {
          sessionCountry = staffSes.country || sessionCountry;
          sessionGoal = staffSes.goal || sessionGoal;
        }
      }
    }

    // Ensure an auth user exists for this email
    let authUserId: string | null = lead.auth_user_id;
    if (!authUserId) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((u) => (u.email ?? "").toLowerCase() === lead.email.toLowerCase());
      if (existing) {
        authUserId = existing.id;
      } else {
        const tempPwd = crypto.randomUUID() + "Aa1!";
        const fullName = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ");
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: lead.email,
          password: tempPwd,
          email_confirm: true,
          user_metadata: { full_name: fullName, signup_role: "client" },
        });
        if (createErr || !created.user) return json({ error: createErr?.message ?? "Could not create user" }, 500);
        authUserId = created.user.id;
      }
      await admin
        .from("assessment_leads")
        .update({ auth_user_id: authUserId, email_verified_at: new Date().toISOString() })
        .eq("id", lead.id);
    } else {
      await admin.from("assessment_leads").update({ email_verified_at: new Date().toISOString() }).eq("id", lead.id);
    }

    // Mark invitation as registered (if any)
    if (lead.invitation_id) {
      await admin
        .from("assessment_invitations")
        .update({
          status: "registered",
          redeemed_at: new Date().toISOString(),
          redeemed_lead_id: lead.id,
        })
        .eq("id", lead.invitation_id);
    }

    // Consume verification token
    await admin
      .from("assessment_email_verifications")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", rec.id);

    // Ensure a session exists
    let { data: session } = await admin
      .from("assessment_sessions")
      .select("id, status")
      .eq("lead_id", lead.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) {
      const { data: ins } = await admin
        .from("assessment_sessions")
        .insert({
          lead_id: lead.id,
          country: sessionCountry,
          goal: sessionGoal,
          status: "draft",
        })
        .select("id, status")
        .single();
      session = ins!;
    }

    // Generate magic link so the browser can sign in
    const origin = req.headers.get("origin") ?? "";
    const { data: magic } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: lead.email,
      options: { redirectTo: `${origin}/assessment/run/${session.id}` },
    });
    const actionLink = (magic as any)?.properties?.action_link ?? null;

    return json({ ok: true, sessionId: session.id, actionLink });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
