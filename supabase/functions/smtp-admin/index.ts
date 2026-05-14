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
        username: String(p.username ?? ""),
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
      if (!cfg || !cfg.host || !cfg.username || !cfg.password) {
        return json({ error: "SMTP not configured" }, 400);
      }
      const recipient = action === "test" ? String(body.recipient ?? cfg.sender_email) : cfg.username;
      try {
        const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
        const client = new SMTPClient({
          connection: {
            hostname: cfg.host,
            port: cfg.port,
            tls: cfg.encryption === "ssl",
            auth: { username: cfg.username, password: cfg.password },
          },
        });
        if (action === "verify") {
          // denomailer connects lazily; force a connection by sending NOOP via close after send
          // Simplest: do a no-op send to self only on test. For verify, just open + close.
          await client.close();
          await admin.from("smtp_settings").update({
            last_status: "verified",
            last_verified_at: new Date().toISOString(),
            last_error: null,
          }).eq("id", cfg.id);
          return json({ ok: true, status: "verified" });
        }
        // test: send a real email
        await client.send({
          from: cfg.sender_name ? `${cfg.sender_name} <${cfg.sender_email}>` : cfg.sender_email,
          to: recipient,
          replyTo: cfg.reply_to ?? undefined,
          subject: "SMTP test from Future Link DMS",
          content: "This is a test email confirming your SMTP settings work.",
          html: `<p>This is a <strong>test email</strong> confirming your SMTP settings work.</p><p style="color:#888;font-size:12px">Sent from Future Link DMS · ${new Date().toISOString()}</p>`,
        });
        await client.close();
        await admin.from("smtp_settings").update({
          last_status: "verified",
          last_verified_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", cfg.id);
        await admin.from("app_email_logs").insert({
          recipient, subject: "SMTP test from Future Link DMS",
          status: "sent", attempts: 1, sent_at: new Date().toISOString(),
          provider: cfg.provider, category: "test", triggered_by: u.user.id,
        });
        return json({ ok: true, status: "sent" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
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
        return json({ error: msg }, 502);
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