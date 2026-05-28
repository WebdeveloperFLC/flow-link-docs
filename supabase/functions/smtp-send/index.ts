// @ts-nocheck
// Generic SMTP sender used by app workflows (notifications, alerts, status updates, etc.)
// Auth required; any authenticated user can trigger a send (caller code controls who).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return j({ error: "Not authenticated" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ error: "Not authenticated" }, 401);

    const admin = createClient(url, service);
    const body = await req.json();
    const retryLogId = body?.retry_log_id as string | undefined;

    let recipient: string;
    let subject: string;
    let html: string | undefined;
    let text: string | undefined;
    let category: string | undefined;

    if (retryLogId) {
      // retry path — admins only
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) return j({ error: "Forbidden" }, 403);
      const { data: log } = await admin.from("app_email_logs").select("*").eq("id", retryLogId).maybeSingle();
      if (!log) return j({ error: "Log not found" }, 404);
      recipient = log.recipient;
      subject = log.subject;
      html = log.body_html ?? undefined;
      text = log.body_text ?? undefined;
      category = log.category ?? undefined;
    } else {
      recipient = String(body.to ?? "");
      subject = String(body.subject ?? "");
      html = body.html ? String(body.html) : undefined;
      text = body.text ? String(body.text) : undefined;
      category = body.category ? String(body.category) : undefined;
      if (!/^\S+@\S+\.\S+$/.test(recipient)) return j({ error: "Invalid recipient" }, 400);
      if (!subject) return j({ error: "Subject required" }, 400);
      if (!html && !text) return j({ error: "Body required" }, 400);
    }

    // Resolve SMTP config: prefer per-entity settings when entity_id is provided,
    // fall back to the global smtp_settings singleton.
    const entityId = body?.entity_id ? String(body.entity_id) : null;
    let cfg: any = null;
    if (entityId) {
      const { data: entityCfg } = await admin
        .from("entity_smtp_settings")
        .select("*")
        .eq("entity_id", entityId)
        .eq("is_active", true)
        .maybeSingle();
      if (entityCfg?.host && entityCfg?.username && entityCfg?.password) {
        cfg = entityCfg;
        console.info("[smtp] using entity smtp", { entityId, provider: cfg.provider });
      }
    }
    if (!cfg) {
      const { data: globalCfg } = await admin.from("smtp_settings").select("*").eq("singleton", true).maybeSingle();
      cfg = globalCfg;
      console.info("[smtp] using global smtp", { provider: cfg?.provider });
    }
    if (!cfg || !cfg.is_active || !cfg.host || !cfg.username || !cfg.password) {
      // log failure
      const insert = retryLogId
        ? null
        : await admin
            .from("app_email_logs")
            .insert({
              recipient,
              subject,
              body_html: html,
              body_text: text,
              category,
              status: "failed",
              attempts: 1,
              error_message: "SMTP not configured or inactive",
              triggered_by: u.user.id,
            })
            .select("id")
            .single();
      if (retryLogId) {
        await admin
          .from("app_email_logs")
          .update({
            status: "failed",
            attempts: (/** @type any */ {}.attempts ?? 0) + 1,
            error_message: "SMTP not configured or inactive",
          })
          .eq("id", retryLogId);
      }
      return j({ error: "SMTP not configured" }, 400);
    }

    let logId = retryLogId;
    if (!logId) {
      const { data: ins } = await admin
        .from("app_email_logs")
        .insert({
          recipient,
          subject,
          body_html: html,
          body_text: text,
          category,
          status: "pending",
          attempts: 0,
          provider: cfg.provider,
          triggered_by: u.user.id,
        })
        .select("id")
        .single();
      logId = ins?.id;
    }

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
      await client.send({
        from: cfg.sender_name ? `${cfg.sender_name} <${cfg.sender_email}>` : cfg.sender_email,
        to: recipient,
        replyTo: cfg.reply_to ?? undefined,
        subject,
        content: text ?? subject,
        html: html ?? undefined,
      });
      await client.close();
      await admin
        .from("app_email_logs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: (await getAttempts(admin, logId)) + 1,
          error_message: null,
          provider: cfg.provider,
        })
        .eq("id", logId);
      return j({ ok: true, log_id: logId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin
        .from("app_email_logs")
        .update({
          status: "failed",
          error_message: msg,
          attempts: (await getAttempts(admin, logId)) + 1,
          provider: cfg.provider,
        })
        .eq("id", logId);
      return j({ error: msg, log_id: logId }, 502);
    }
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

async function getAttempts(admin: any, id: string | undefined) {
  if (!id) return 0;
  const { data } = await admin.from("app_email_logs").select("attempts").eq("id", id).maybeSingle();
  return Number(data?.attempts ?? 0);
}

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
