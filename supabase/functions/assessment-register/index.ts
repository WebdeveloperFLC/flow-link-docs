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
    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      inviteToken,
      referralCode,
      promoCode,
      promoFirstOpenedAt,
      intendedCountry,
      intendedGoal,
    } = await req.json();
    if (!firstName || !lastName || !email || !phone) return json({ error: "Missing required fields" }, 400);
    // Public self-start needs no invite/referral; promo or quick-link leads are allowed.

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const emailLower = String(email).trim().toLowerCase();
    let source: "invite" | "referral" | "existing_client" | "public" = "public";
    let invitationId: string | null = null;
    let clientId: string | null = null;

    // ── Promo handling ───────────────────────────────────────────────────
    // The promo code is reusable; the 3-day clock is PER-CANDIDATE, starting
    // when they first opened the link (sent from the browser). If we don't get
    // a first-opened timestamp, fall back to now.
    let promoExpiresAt: string | null = null;
    let promoExpiredAtRegistration = false;
    const promoCodeClean = promoCode ? String(promoCode).trim().toUpperCase() : null;
    let promoFirstOpened: string | null = null;
    if (promoCodeClean) {
      const opened = promoFirstOpenedAt ? new Date(promoFirstOpenedAt) : new Date();
      promoFirstOpened = opened.toISOString();
      const expiry = new Date(opened.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
      promoExpiresAt = expiry.toISOString();
      promoExpiredAtRegistration = new Date() > expiry;
      source = "referral"; // promo leads count as referral-sourced
    }
    // ─────────────────────────────────────────────────────────────────────

    if (inviteToken) {
      const { data: inv } = await admin
        .from("assessment_invitations")
        .select("id,email,status,expires_at,client_id,first_name,last_name,middle_name")
        .eq("token", inviteToken)
        .maybeSingle();
      if (!inv) return json({ error: "Invalid invitation" }, 404);
      if (inv.status !== "pending") return json({ error: "Invitation already used or revoked" }, 410);
      if (new Date(inv.expires_at) < new Date()) return json({ error: "Invitation expired" }, 410);
      if (inv.email.toLowerCase() !== emailLower) return json({ error: "Email must match the invitation" }, 400);
      invitationId = inv.id;
      clientId = inv.client_id;
      source = inv.client_id ? "existing_client" : "invite";
    } else if (referralCode) {
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(referralCode)) return json({ error: "Invalid referral code" }, 400);
      source = "referral";
    }
    // else: pure public self-start (Option 1 — quick link). source stays "public".

    // Upsert lead by email
    const { data: existing } = await admin
      .from("assessment_leads")
      .select("id, auth_user_id")
      .eq("email", emailLower)
      .maybeSingle();
    let leadId: string;
    if (existing) {
      leadId = existing.id;
      await admin
        .from("assessment_leads")
        .update({
          first_name: firstName,
          middle_name: middleName ?? null,
          last_name: lastName,
          phone,
          referral_code_used: referralCode ?? null,
          invitation_id: invitationId,
          client_id: clientId,
          source,
          ...(intendedCountry ? { intended_country: intendedCountry } : {}),
          ...(intendedGoal ? { intended_goal: intendedGoal } : {}),
          ...(promoCodeClean
            ? {
                promo_code: promoCodeClean,
                promo_first_opened_at: promoFirstOpened,
                promo_expires_at: promoExpiresAt,
                promo_expired_at_registration: promoExpiredAtRegistration,
              }
            : {}),
        })
        .eq("id", leadId);
    } else {
      const { data: ins, error } = await admin
        .from("assessment_leads")
        .insert({
          first_name: firstName,
          middle_name: middleName ?? null,
          last_name: lastName,
          email: emailLower,
          phone,
          referral_code_used: referralCode ?? null,
          source,
          invitation_id: invitationId,
          client_id: clientId,
          promo_code: promoCodeClean,
          promo_first_opened_at: promoFirstOpened,
          promo_expires_at: promoExpiresAt,
          promo_expired_at_registration: promoExpiredAtRegistration,
          intended_country: intendedCountry ?? null,
          intended_goal: intendedGoal ?? null,
        })
        .select("id")
        .single();
      if (error || !ins) return json({ error: error?.message ?? "Insert failed" }, 500);
      leadId = ins.id;
    }

    // Issue verification token
    const vtoken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await admin.from("assessment_email_verifications").insert({
      lead_id: leadId,
      token: vtoken,
      email: emailLower,
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
    } catch (_) {
      /* queued */
    }

    // SECURITY: never return the verification link to the caller — it would
    // allow registering with someone else's email and self-verifying via the
    // API response instead of the inbox. The token is only delivered by email.
    return json({ leadId, emailed, promoExpiresAt, promoExpiredAtRegistration });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
