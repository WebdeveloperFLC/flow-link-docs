import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { firstName, middleName, lastName, email, phone, inviteToken, referralCode } = await req.json();
    if (!firstName || !lastName || !email || !phone) return json({ error: "Missing required fields" }, 400);
    if (!inviteToken && !referralCode) return json({ error: "Invitation or referral code required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const emailLower = String(email).trim().toLowerCase();
    let source: "invite" | "referral" | "existing_client" = "referral";
    let invitationId: string | null = null;
    let clientId: string | null = null;

    if (inviteToken) {
      const { data: inv } = await admin.from("assessment_invitations")
        .select("id,email,status,expires_at,client_id,first_name,last_name,middle_name")
        .eq("token", inviteToken).maybeSingle();
      if (!inv) return json({ error: "Invalid invitation" }, 404);
      if (inv.status !== "pending") return json({ error: "Invitation already used or revoked" }, 410);
      if (new Date(inv.expires_at) < new Date()) return json({ error: "Invitation expired" }, 410);
      if (inv.email.toLowerCase() !== emailLower) return json({ error: "Email must match the invitation" }, 400);
      invitationId = inv.id;
      clientId = inv.client_id;
      source = inv.client_id ? "existing_client" : "invite";
    } else if (referralCode) {
      // Validate referral code against existing offers/referral_codes table if present.
      // For Phase 1 accept any non-empty alphanumeric code; admin can disable referral entry later.
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(referralCode)) return json({ error: "Invalid referral code" }, 400);
    }

    // Upsert lead by email
    const { data: existing } = await admin.from("assessment_leads").select("id, auth_user_id").eq("email", emailLower).maybeSingle();
    let leadId: string;
    if (existing) {
      leadId = existing.id;
      await admin.from("assessment_leads").update({
        first_name: firstName, middle_name: middleName ?? null, last_name: lastName,
        phone, referral_code_used: referralCode ?? null,
        invitation_id: invitationId, client_id: clientId, source,
      }).eq("id", leadId);
    } else {
      const { data: ins, error } = await admin.from("assessment_leads").insert({
        first_name: firstName, middle_name: middleName ?? null, last_name: lastName,
        email: emailLower, phone, referral_code_used: referralCode ?? null,
        source, invitation_id: invitationId, client_id: clientId,
      }).select("id").single();
      if (error || !ins) return json({ error: error?.message ?? "Insert failed" }, 500);
      leadId = ins.id;
    }

    // Issue verification token
    const vtoken = crypto.randomUUID().replace(/-/g,"") + crypto.randomUUID().replace(/-/g,"");
    await admin.from("assessment_email_verifications").insert({
      lead_id: leadId, token: vtoken, email: emailLower,
    });

    const origin = req.headers.get("origin") ?? "";
    const link = `${origin}/assessment/verify/${vtoken}`;

    let emailed = false;
    try {
      const r = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "assessment-verify-email",
          recipientEmail: emailLower,
          idempotencyKey: `assessment-verify-${leadId}-${Date.now()}`,
          templateData: { link, firstName },
        },
      });
      if (!r.error) emailed = true;
    } catch (_) { /* queued */ }

    // SECURITY: never return the verification link to the caller — it would
    // allow registering with someone else's email and self-verifying via the
    // API response instead of the inbox. The token is only delivered by email.
    return json({ leadId, emailed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});