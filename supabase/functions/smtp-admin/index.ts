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
    const token = auth.slice("Bearer ".length);
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsErr || !userId) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, service);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
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
        updated_by: userId,
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
            provider: cfg.provider, category: "test", triggered_by: userId,
          });
        }
        return json({ ok: true, status: action === "test" ? "sent" : "verified", raw: smtpResult.raw });
      } catch (e) {
        const raw = smtpRawError(e);
        const msg = friendlySmtpError(raw, { encryption: cfg.encryption, port: cfg.port });
        const stage = e instanceof Error ? (e as StagedError).stage ?? "unknown" : "unknown";
        console.error("[smtp] failed:", { stage, raw });
        await admin.from("smtp_settings").update({
          last_status: "failed", last_error: msg,
        }).eq("id", cfg.id);
        if (action === "test") {
          await admin.from("app_email_logs").insert({
            recipient, subject: "SMTP test from Future Link DMS",
            status: "failed", attempts: 1, error_message: msg,
            provider: cfg.provider, category: "test", triggered_by: userId,
          });
        }
        return json({ error: msg, raw, stage }, 502);
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

type SmtpCfg = {
  host: string;
  port: number;
  encryption: "ssl" | "tls" | "none";
  username: string;
  password: string;
  sender_email: string;
  sender_name?: string | null;
  reply_to?: string | null;
};

type SmtpResponse = { code: number; lines: string[]; raw: string };
type StagedError = Error & { stage?: string };
type SmtpIo = {
  cfg: SmtpCfg;
  recipient: string;
  writeLine: (stage: string, value: string) => Promise<void>;
  readResponse: (stage: string) => Promise<SmtpResponse>;
  expect: (stage: string, res: SmtpResponse, codes: number[]) => void;
};

async function runSmtpCheck({ cfg, action, recipient }: { cfg: SmtpCfg; action: "verify" | "test"; recipient: string }) {
  let conn: Deno.Conn | undefined;
  let buffer = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let lastResponse = "";
  const timeoutMs = 20000;

  const fail = (stage: string, message: string) => {
    const err: StagedError = new Error(message);
    err.stage = stage;
    throw err;
  };

  const readResponse = async (stage: string): Promise<SmtpResponse> => {
    const lines: string[] = [];
    while (true) {
      const line = await readLine(stage);
      lines.push(line);
      if (!/^\d{3}-/.test(line)) break;
    }
    const code = Number(lines[0]?.slice(0, 3));
    const raw = lines.join("\n");
    lastResponse = raw;
    console.log("[smtp]", stage, raw);
    if (!Number.isFinite(code)) fail(stage, `Invalid SMTP response: ${raw}`);
    return { code, lines, raw };
  };

  const readLine = async (stage: string): Promise<string> => {
    while (!buffer.includes("\n")) {
      if (!conn) fail(stage, "SMTP connection is not open");
      const chunk = new Uint8Array(4096);
      const n = await withTimeout(conn.read(chunk), timeoutMs, stage);
      if (n === null) fail(stage, `SMTP connection closed unexpectedly. Last response: ${lastResponse || "none"}`);
      buffer += decoder.decode(chunk.subarray(0, n), { stream: true });
    }
    const idx = buffer.indexOf("\n");
    const line = buffer.slice(0, idx).replace(/\r$/, "");
    buffer = buffer.slice(idx + 1);
    return line;
  };

  const writeLine = async (stage: string, value: string) => {
    if (!conn) fail(stage, "SMTP connection is not open");
    const safe = stage === "auth_username" || stage === "auth_password"
      ? "<redacted>"
      : value.toUpperCase().startsWith("AUTH") ? "AUTH LOGIN" : value;
    console.log("[smtp]", stage, ">", safe);
    await withTimeout(conn.write(encoder.encode(value + "\r\n")), timeoutMs, stage);
  };

  const expect = (stage: string, res: SmtpResponse, codes: number[]) => {
    if (!codes.includes(res.code)) fail(stage, res.raw);
  };

  try {
    console.log("[smtp] DNS resolve start", { host: cfg.host });
    try {
      const records = await withTimeout(Deno.resolveDns(cfg.host, "A"), 5000, "dns");
      console.log("[smtp] DNS resolve OK", { host: cfg.host, addresses: records });
    } catch (dnsErr) {
      console.warn("[smtp] DNS resolve warning", smtpRawError(dnsErr));
    }

    console.log("[smtp] TCP connect start", { host: cfg.host, port: cfg.port, encryption: cfg.encryption });
    conn = cfg.encryption === "ssl"
      ? await withTimeout(Deno.connectTls({ hostname: cfg.host, port: cfg.port }), timeoutMs, "tcp_connect")
      : await withTimeout(Deno.connect({ hostname: cfg.host, port: cfg.port }), timeoutMs, "tcp_connect");
    console.log("[smtp] TCP connect OK");

    expect("smtp_greeting", await readResponse("smtp_greeting"), [220]);
    await writeLine("ehlo", `EHLO ${cfg.host}`);
    let ehlo = await readResponse("ehlo");
    expect("ehlo", ehlo, [250]);

    if (cfg.encryption === "tls") {
      console.log("[smtp] STARTTLS upgrade start");
      if (!ehlo.raw.toUpperCase().includes("STARTTLS")) fail("starttls", `SMTP server did not advertise STARTTLS. Response: ${ehlo.raw}`);
      await writeLine("starttls", "STARTTLS");
      expect("starttls", await readResponse("starttls"), [220]);
      conn = await withTimeout(Deno.startTls(conn, { hostname: cfg.host }), timeoutMs, "starttls_upgrade");
      buffer = "";
      console.log("[smtp] STARTTLS upgrade OK");
      await writeLine("ehlo_after_starttls", `EHLO ${cfg.host}`);
      ehlo = await readResponse("ehlo_after_starttls");
      expect("ehlo_after_starttls", ehlo, [250]);
    }

    if (cfg.encryption === "none") console.warn("[smtp] AUTH over unencrypted SMTP is enabled by settings");
    console.log("[smtp] AUTH login start", { username: cfg.username });
    await writeLine("auth", "AUTH LOGIN");
    expect("auth", await readResponse("auth"), [334]);
    await writeLine("auth_username", btoa(cfg.username));
    expect("auth_username", await readResponse("auth_username"), [334]);
    await writeLine("auth_password", btoa(cfg.password));
    expect("auth_password", await readResponse("auth_password"), [235]);
    console.log("[smtp] AUTH login OK");

    if (action === "test") {
      await sendTestMessage({ cfg, recipient, writeLine, readResponse, expect });
    } else {
      await writeLine("noop", "NOOP");
      expect("noop", await readResponse("noop"), [250]);
    }

    return { raw: lastResponse };
  } finally {
    console.log("[smtp] connection close start", { exists: !!conn });
    try {
      conn?.close();
      console.log("[smtp] connection close OK");
    } catch (closeErr) {
      console.warn("[smtp] connection close failed", smtpRawError(closeErr));
    }
  }
}

async function sendTestMessage({ cfg, recipient, writeLine, readResponse, expect }: SmtpIo) {
  const from = String(cfg.sender_email || cfg.username).trim();
  const subject = "SMTP test from Future Link DMS";
  const now = new Date().toUTCString();
  const body = [
    `From: ${cfg.sender_name ? `${sanitizeHeader(cfg.sender_name)} <${from}>` : from}`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    `Date: ${now}`,
    cfg.reply_to ? `Reply-To: ${cfg.reply_to}` : "",
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    `<p>This is a <strong>test email</strong> confirming your SMTP settings work.</p><p style="color:#888;font-size:12px">Sent from Future Link DMS · ${new Date().toISOString()}</p>`,
  ].filter(Boolean).join("\r\n").replace(/^\./gm, "..");

  console.log("[smtp] test: MAIL FROM", from);
  await writeLine("mail_from", `MAIL FROM:<${from}>`);
  expect("mail_from", await readResponse("mail_from"), [250]);
  console.log("[smtp] test: RCPT TO", recipient);
  await writeLine("rcpt_to", `RCPT TO:<${recipient}>`);
  expect("rcpt_to", await readResponse("rcpt_to"), [250, 251]);
  await writeLine("data", "DATA");
  expect("data", await readResponse("data"), [354]);
  await writeLine("message_body", `${body}\r\n.`);
  expect("message_body", await readResponse("message_body"), [250]);
  console.log("[smtp] test: send OK");
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]/g, " ").trim();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, stage: string): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Timeout during ${stage} after ${ms}ms`);
      (err as StagedError).stage = stage;
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function smtpRawError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e ?? "Unknown SMTP error");
}

function friendlySmtpError(raw: string, ctx: { encryption: string; port: number }): string {
  const m = raw.toLowerCase();
  if (m.includes("535") || m.includes("auth") && (m.includes("fail") || m.includes("invalid") || m.includes("denied"))) {
    return `Authentication failed — invalid SMTP username or password. (${raw})`;
  }
  if (m.includes("534") || m.includes("application-specific password")) {
    return `Authentication failed — provider requires an app password. (${raw})`;
  }
  if (m.includes("tls") || m.includes("ssl") || m.includes("certificate") || m.includes("handshake")) {
    const hint = ctx.encryption === "ssl"
      ? "Try port 587 with TLS/STARTTLS instead of port 465 SSL."
      : ctx.encryption === "tls"
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