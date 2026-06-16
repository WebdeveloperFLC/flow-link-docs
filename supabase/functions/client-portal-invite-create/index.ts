import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { publicInviteUrl } from "../_shared/publicBaseUrl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailDispatch = {
  emailed: boolean;
  emailStatus: "sent" | "failed" | "suppressed" | "skipped";
  emailError?: string;
};

async function dispatchPortalInviteEmail(
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

    if (payload.queued || payload.success) {
      return { emailed: true, emailStatus: "sent" };
    }
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
  } catch (e) {
    return { emailed: false, emailStatus: "failed", emailError: (e as Error).message };
  }
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
    const emailDispatch = await dispatchPortalInviteEmail(admin, {
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
        emailError: emailDispatch.emailError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
