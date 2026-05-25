// @ts-nocheck
// Centralized notification dispatcher.
// Receives a business event + payload, resolves recipients (client, assigned
// counselor, accounting BCC inbox), renders an HTML template, and hands the
// actual SMTP send to the existing smtp-send function so credentials and
// delivery logging stay in one place.
//
// Auth: any authenticated user can dispatch — routing happens server-side
// based on the business event, NOT the caller's module permissions. This is
// what lets non-accounting employees (counselors, telecallers, etc.) trigger
// receipt/payment emails as a side-effect of their actions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const money = (n: number, c = "INR") => {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: c }).format(Number(n || 0)); }
  catch { return `${c} ${Number(n || 0).toFixed(2)}`; }
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));

function shellHtml(opts: { logoUrl?: string | null; firmName?: string | null; title: string; bodyHtml: string; supportEmail?: string | null; supportPhone?: string | null; address?: string | null }) {
  const { logoUrl, firmName, title, bodyHtml, supportEmail, supportPhone, address } = opts;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:24px 0;"><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px;border-bottom:1px solid #e5e7eb;">
          ${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(firmName ?? "")}" style="max-height:56px;max-width:220px;display:block;" />` : `<div style="font-size:18px;font-weight:700;">${esc(firmName ?? "")}</div>`}
        </td></tr>
        <tr><td style="padding:24px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${esc(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;font-size:12px;color:#6b7280;">
          ${firmName ? `<div style="font-weight:600;color:#374151;">${esc(firmName)}</div>` : ""}
          ${address ? `<div style="white-space:pre-line;">${esc(address)}</div>` : ""}
          ${supportEmail ? `<div>Support: <a href="mailto:${esc(supportEmail)}" style="color:#2563eb;">${esc(supportEmail)}</a>${supportPhone ? ` · ${esc(supportPhone)}` : ""}</div>` : (supportPhone ? `<div>Support: ${esc(supportPhone)}</div>` : "")}
          <div style="margin-top:8px;color:#9ca3af;">This is an automated notification — please do not reply directly.</div>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:42%;">${esc(label)}</td><td style="padding:6px 0;font-size:13px;color:#111827;">${esc(value)}</td></tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Not authenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, service);
    const body = await req.json().catch(() => ({}));
    const eventType: string = String(body?.event_type ?? "");
    const payload: any = body?.payload ?? {};
    const clientId: string | null = payload?.client_id ?? null;
    if (!eventType) return json({ error: "event_type required" }, 400);

    // ── Settings ───────────────────────────────────────────────────────────
    const { data: settings } = await admin
      .from("notification_settings").select("*").eq("id", true).maybeSingle();
    const accountingInbox: string | null = settings?.accounting_inbox_email ?? null;
    const bccAccounting: boolean = settings?.bcc_accounting_inbox !== false;
    const ccCounselor: boolean = settings?.cc_assigned_counselor !== false;

    // ── Resolve client + counselor email ───────────────────────────────────
    let clientRow: any = null;
    let counselorEmail: string | null = null;
    if (clientId) {
      const { data: cli } = await admin
        .from("clients")
        .select("id,full_name,email,email_alternate,phone,assigned_counselor_id")
        .eq("id", clientId).maybeSingle();
      clientRow = cli;
      if (ccCounselor && cli?.assigned_counselor_id) {
        const { data: prof } = await admin
          .from("profiles").select("email").eq("id", cli.assigned_counselor_id).maybeSingle();
        counselorEmail = (prof as any)?.email ?? null;
      }
    }

    // ── Build subject + body per event ─────────────────────────────────────
    let subject = "Notification";
    let bodyHtml = "";
    let title = "Notification";
    let logoUrl: string | null = payload?.firm?.logo_url ?? null;
    let firmName: string | null = payload?.firm?.name ?? null;
    let firmAddress: string | null = payload?.firm?.address ?? null;
    let firmEmail: string | null = payload?.firm?.email ?? null;
    let firmPhone: string | null = payload?.firm?.phone ?? null;

    const clientName = esc(clientRow?.full_name ?? payload?.client?.name ?? "");

    if (eventType === "receipt_generated") {
      const r = payload?.receipt ?? {};
      const inv = payload?.invoice ?? {};
      const pay = payload?.payment ?? {};
      title = `Payment Receipt ${r.receipt_number ?? ""}`;
      subject = `Receipt ${r.receipt_number ?? ""} — ${money(pay.amount, pay.currency)}`;
      bodyHtml = `
        <p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 12px;">Dear ${clientName || "Customer"},</p>
        <p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 16px;">We have received your payment. Please find the receipt details below.</p>
        <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;margin:8px 0 16px;">
          ${row("Receipt Number", r.receipt_number ?? "—")}
          ${row("Receipt Date", new Date(r.generated_at ?? Date.now()).toLocaleDateString())}
          ${row("Invoice Number", inv.invoice_number ?? "—")}
          ${row("Payment Date", new Date(pay.paid_at ?? Date.now()).toLocaleDateString())}
          ${row("Payment Method", String(pay.method ?? "").replace(/_/g, " ").toUpperCase())}
          ${pay.reference ? row("Reference", String(pay.reference)) : ""}
          ${row("Amount Paid", money(pay.amount, pay.currency))}
          ${inv.outstanding != null ? row("Outstanding", money(inv.outstanding, pay.currency)) : ""}
        </table>
        <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">A printable copy of this receipt is also available in your client portal.</p>`;
    } else if (eventType === "payment_received") {
      const inv = payload?.invoice ?? {};
      const pay = payload?.payment ?? {};
      title = `Payment Received`;
      subject = `Payment received — ${money(pay.amount, pay.currency)} (${inv.invoice_number ?? ""})`;
      bodyHtml = `
        <p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 12px;">Dear ${clientName || "Customer"},</p>
        <p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 16px;">We have recorded your payment${pay.status === "awaiting_verification" ? " and it is awaiting verification by our team. You will receive a separate receipt once it is verified." : "."}</p>
        <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;margin:8px 0 16px;">
          ${row("Invoice Number", inv.invoice_number ?? "—")}
          ${row("Payment Date", new Date(pay.paid_at ?? Date.now()).toLocaleDateString())}
          ${row("Payment Method", String(pay.method ?? "").replace(/_/g, " ").toUpperCase())}
          ${pay.reference ? row("Reference", String(pay.reference)) : ""}
          ${row("Amount", money(pay.amount, pay.currency))}
          ${inv.outstanding != null ? row("Outstanding", money(inv.outstanding, pay.currency)) : ""}
        </table>
        <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">Thank you for your payment.</p>`;
    } else {
      return json({ error: `Unsupported event_type: ${eventType}` }, 400);
    }

    const html = shellHtml({ logoUrl, firmName, title, bodyHtml, supportEmail: firmEmail, supportPhone: firmPhone, address: firmAddress });

    // ── Recipients ─────────────────────────────────────────────────────────
    const primary = clientRow?.email ?? payload?.client?.email ?? null;
    if (!primary) {
      // Nothing to send to client — still try internal notification if configured.
      if (!accountingInbox) return json({ ok: false, skipped: true, reason: "no_recipient" });
    }

    const ccList = [counselorEmail].filter(Boolean) as string[];
    const bccList = (bccAccounting && accountingInbox) ? [accountingInbox] : [];

    // ── Send via smtp-send (one row per primary recipient) ─────────────────
    // smtp-send doesn't support cc/bcc fields directly, so we fan out as
    // separate sends to each address; metadata.category keeps them grouped
    // in app_email_logs for auditing.
    const category = `notif:${eventType}`;
    const recipients = [
      ...(primary ? [primary] : []),
      ...ccList,
      ...bccList,
    ];

    const sendResults: any[] = [];
    for (const to of recipients) {
      try {
        const r = await fetch(`${url}/functions/v1/smtp-send`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, html, category }),
        });
        const j = await r.json().catch(() => ({}));
        sendResults.push({ to, ok: r.ok, ...j });
      } catch (e) {
        sendResults.push({ to, ok: false, error: String(e) });
      }
    }

    // ── Activity timeline (best-effort) ────────────────────────────────────
    if (clientId) {
      try {
        const summaryByEvent: Record<string, string> = {
          receipt_generated: `Receipt emailed to ${primary ?? "—"}`,
          payment_received: `Payment confirmation emailed to ${primary ?? "—"}`,
        };
        await admin.from("client_timeline_events").insert({
          client_id: clientId,
          event_type: `notification.${eventType}`,
          summary: summaryByEvent[eventType] ?? `Notification: ${eventType}`,
          metadata: { recipients, results: sendResults, payload_keys: Object.keys(payload ?? {}) } as any,
          created_by: u.user.id,
        } as any);
      } catch (_) { /* timeline insert is best-effort */ }
    }

    const anyOk = sendResults.some(r => r.ok);
    return json({ ok: anyOk, recipients, results: sendResults });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});