// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_PRESETS: Record<string, { host: string; port: number; encryption: string }> = {
  hostinger: { host: "smtp.hostinger.com", port: 465, encryption: "ssl" },
  gmail: { host: "smtp.gmail.com", port: 465, encryption: "ssl" },
  outlook: { host: "smtp.office365.com", port: 587, encryption: "tls" },
  brevo: { host: "smtp-relay.brevo.com", port: 587, encryption: "tls" },
  custom: { host: "", port: 587, encryption: "tls" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "Not authenticated" }, 401);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, service);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "save") {
      const p = body.payload ?? {};
      const provider = String(p.provider ?? "custom");
      const preset = PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.custom;
      const port = Number(p.port ?? preset.port);
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        return json({ error: "Invalid port" }, 400);
      }
      const encryption = ["ssl", "tls", "none"].includes(p.encryption) ? p.encryption : "tls";
      const username = String(p.username ?? "").trim();
      if (!username) {
        return json({ error: "SMTP username is required" }, 400);
      }
      const senderEmail = String(p.sender_email ?? "").trim();
      if (!/^\S+@\S+\.\S+$/.test(senderEmail)) {
        return json({ error: "Invalid sender email" }, 400);
      }
      if (p.reply_to && !/^\S+@\S+\.\S+$/.test(String(p.reply_to))) {
        return json({ error: "Invalid reply-to email" }, 400);
      }

      const { data: existing } = await admin
        .from("smtp_settings").select("id,password").eq("singleton", true).maybeSingle();

      const update: Record<string, unknown> = {
        provider,
        host: String(p.host ?? preset.host),
        port,
        encryption,
        username,
        sender_email: senderEmail,
        sender_name: String(p.sender_name ?? ""),
        reply_to: p.reply_to ? String(p.reply_to) : null,
        is_active: !!p.is_active,
        updated_by: u.user.id,
      };
      // Only overwrite password if non-empty supplied
      if (typeof p.password === "string" && p.password.length > 0) {
        update.password = p.password;
      }

      if (existing) {
        await admin.from("smtp_settings").update(update).eq("id", existing.id);
      } else {
        await admin.from("smtp_settings").insert({ ...update, password: update.password ?? "" });
      }
      return json({ ok: true });
    }

    if (action === "verify" || action === "test") {
      const { data: cfg } = await admin
        .from("smtp_settings").select("*").eq("singleton", true).maybeSingle();
      if (!cfg) {
        return json({ error: "Save SMTP settings first before verifying or testing." }, 400);
      }
      const missing: string[] = [];
      if (!cfg.host) missing.push("host");
      if (!cfg.username) missing.push("username");
      if (!cfg.password) missing.push("password");
      if (missing.length) {
        return json({ error: `SMTP not configured — missing: ${missing.join(", ")}. Fill the form and click Save settings first.` }, 400);
      }
      const recipient = action === "test" ? String(body.recipient ?? cfg.sender_email) : cfg.username;
      console.log("[smtp]", action, { host: cfg.host, port: cfg.port, encryption: cfg.encryption, username: cfg.username });
      try {
        const smtpResult = await runSmtpCheck({ cfg, action, recipient });
        console.log("[smtp]", action, "OK", { lastResponse: smtpResult.raw });
        await admin.from("smtp_settings").update({
          last_status: "verified",
          last_verified_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", cfg.id);
        if (action === "test") {
          await admin.from("app_email_logs").insert({
            recipient, subject: "SMTP test from Future Link DMS",
            status: "sent", attempts: 1, sent_at: new Date().toISOString(),
            provider: cfg.provider, category: "test", triggered_by: u.user.id,
          });
        }
        return json({ ok: true, status: action === "test" ? "sent" : "verified", raw: smtpResult.raw });
      } catch (e) {
        const raw = smtpRawError(e);
        const msg = friendlySmtpError(raw, { encryption: cfg.encryption, port: cfg.port });
        console.error("[smtp] failed:", { stage: (e as any)?.stage ?? "unknown", raw });
        await admin.from("smtp_settings").update({
          last_status: "failed", last_error: msg,
        }).eq("id", cfg.id);
        if (action === "test") {
          await admin.from("app_email_logs").insert({
            recipient, subject: "SMTP test from Future Link DMS",
            status: "failed", attempts: 1, error_message: msg,
            provider: cfg.provider, category: "test", triggered_by: u.user.id,
          });
        }
        return json({ error: msg, raw, stage: (e as any)?.stage ?? "smtp" }, 502);
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function friendlySmtpError(raw: string, ctx: { useStartTls: boolean; useImplicitTls: boolean; port: number }): string {
  const m = raw.toLowerCase();
  if (m.includes("535") || m.includes("auth") && (m.includes("fail") || m.includes("invalid") || m.includes("denied"))) {
    return `Authentication failed — invalid SMTP username or password. (${raw})`;
  }
  if (m.includes("534") || m.includes("application-specific password")) {
    return `Authentication failed — provider requires an app password. (${raw})`;
  }
  if (m.includes("tls") || m.includes("ssl") || m.includes("certificate") || m.includes("handshake")) {
    const hint = ctx.useImplicitTls
      ? "Try port 587 with TLS/STARTTLS instead of port 465 SSL."
      : ctx.useStartTls
      ? "Try port 465 with SSL instead of STARTTLS."
      : "Enable SSL or TLS encryption.";
    return `TLS/SSL handshake failure. ${hint} (${raw})`;
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return `Connection timeout — host did not respond. Check host, port, and firewall. (${raw})`;
  }
  if (m.includes("getaddrinfo") || m.includes("dns") || m.includes("name or service not known") || m.includes("nodename")) {
    return `DNS failure — SMTP host could not be resolved. Check the host name. (${raw})`;
  }
  if (m.includes("econnrefused") || m.includes("connection refused")) {
    return `Connection refused — wrong port or SMTP not enabled on this host. (${raw})`;
  }
  if (m.includes("cannot read properties of undefined") && m.includes("close")) {
    return `SMTP client failed to initialize (likely TLS/handshake error before AUTH). Try toggling encryption (SSL ↔ TLS). (${raw})`;
  }
  return raw;
}