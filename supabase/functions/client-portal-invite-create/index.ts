import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildPortalInviteEmail } from "../_shared/portalInviteEmail.ts";
import { publicInviteUrl } from "../_shared/publicBaseUrl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailDispatch = {
  emailed: boolean;
  emailStatus: "sent" | "failed" | "suppressed" | "skipped";
  emailDelivery?: "smtp" | "lovable_queue";
  emailError?: string;
};

async function isEmailSuppressed(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<boolean> {
  const { data } = await admin
    .from("suppressed_emails")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return Boolean(data);
}

async function sendViaSmtp(
  supabaseUrl: string,
  authHeader: string,
  args: { email: string; link: string; clientName?: string | null },
): Promise<EmailDispatch | null> {
  const { subject, html, text } = buildPortalInviteEmail(args);
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/smtp-send`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: args.email,
        subject,
        html,
        text,
        category: "portal-invite",
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && body.ok) {
      return { emailed: true, emailStatus: "sent", emailDelivery: "smtp" };
    }
    console.warn("[portal-invite] smtp_send_failed", {
      status: res.status,
      error: body.error,
      to: args.email,
    });
    return {
      emailed: false,
      emailStatus: "failed",
      emailError: body.error ?? `SMTP send failed (${res.status})`,
    };
  } catch (e) {
    console.warn("[portal-invite] smtp_send_error", String(e));
    return {
      emailed: false,
      emailStatus: "failed",
      emailError: (e as Error).message,
    };
  }
}

async function sendViaTransactionalQueue(
  admin: ReturnType<typeof createClient>,
  args: { inviteId: string; email: string; link: string; clientName?: string | null },
): Promise<EmailDispatch> {
  try {
    const r = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "portal-invite",
        recipientEmail: args.email,
        idempotencyKey: `portal-invite-${args.inviteId}`,
        templateData: { link: args.link, clientName: args.clientName ?? undefined },
      },
    });

    if (r.error) {
      return { emailed: false, emailStatus: "failed", emailError: r.error.message };
    }

    const payload = (r.data ?? {}) as {
      success?: boolean;
      queued?: boolean;
      reason?: string;
      error?: string;
    };

    if (!(payload.queued || payload.success)) {
      if (payload.reason === "email_suppressed") {
        return {
          emailed: false,
          emailStatus: "suppressed",
          emailError: "This address is on the unsubscribe list. Use Copy link or another email.",
        };
      }
      return {
        emailed: false,
        emailStatus: "failed",
        emailError: payload.error ?? payload.reason ?? "Email could not be queued",
      };
    }

    // Drain queue immediately — cron for process-email-queue may not be configured.
    try {
      await admin.functions.invoke("process-email-queue", {
        body: { triggered_by: "portal-invite" },
      });
    } catch (flushError) {
      console.warn("[portal-invite] queue_flush_error", String(flushError));
    }

    return { emailed: true, emailStatus: "sent", emailDelivery: "lovable_queue" };
  } catch (e) {
    return { emailed: false, emailStatus: "failed", emailError: (e as Error).message };
  }
}

async function dispatchPortalInviteEmail(
  admin: ReturnType<typeof createClient>,
  supabaseUrl: string,
  authHeader: string,
  args: { inviteId: string; email: string; link: string; clientName?: string | null },
): Promise<EmailDispatch> {
  if (await isEmailSuppressed(admin, args.email)) {
    return {
      emailed: false,
      emailStatus: "suppressed",
      emailError: "This address is on the unsubscribe list. Use Copy link or another email.",
    };
  }

  const smtpResult = await sendViaSmtp(supabaseUrl, authHeader, args);
  if (smtpResult?.emailed) return smtpResult;

  const queueResult = await sendViaTransactionalQueue(admin, args);
  if (queueResult.emailed) return queueResult;

  return {
    emailed: false,
    emailStatus: queueResult.emailStatus === "suppressed" ? "suppressed" : "failed",
    emailError:
      queueResult.emailError ??
      smtpResult?.emailError ??
      "Email not sent. Configure SMTP in Settings → Email, or copy the invite link.",
  };
}

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
    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: clientRow } = await admin
      .from("clients")
      .select("full_name")
      .eq("id", clientId)
      .maybeSingle();

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { data: invite, error } = await userClient.from("client_portal_invites").insert({
      client_id: clientId,
      email: normalizedEmail,
      token,
      invited_by: user.id,
    }).select("id, token, expires_at").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const link = publicInviteUrl(req.headers.get("origin"), `/portal/invite?token=${invite.token}`);
    const emailDispatch = await dispatchPortalInviteEmail(admin, supabaseUrl, authHeader, {
      inviteId: invite.id,
      email: normalizedEmail,
      link,
      clientName: clientRow?.full_name,
    });

    return new Response(
      JSON.stringify({
        inviteId: invite.id,
        link,
        emailed: emailDispatch.emailed,
        emailStatus: emailDispatch.emailStatus,
        emailDelivery: emailDispatch.emailDelivery,
        emailError: emailDispatch.emailError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
