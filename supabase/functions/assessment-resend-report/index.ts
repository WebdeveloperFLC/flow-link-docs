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
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { data: { user } } = await createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const { sessionId } = await req.json();
    const { data: session } = await admin.from("assessment_sessions")
      .select(
        "id, pdf_path, created_by, lead:assessment_leads(id, email, first_name, auth_user_id), client:clients(email, full_name)"
      ).eq("id", sessionId).maybeSingle();
    if (!session?.pdf_path) return json({ error: "Report not generated yet — complete the assessment first." }, 404);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const userRoles = (roles ?? []).map((r: any) => r.role);
    const isAdmin = userRoles.includes("admin");
    const isOwner = (session.lead as any)?.auth_user_id === user.id;
    const isCreator = session.created_by === user.id;
    if (!isAdmin && !isOwner && !isCreator) return json({ error: "Forbidden — you can only access assessments you created" }, 403);

    const lead = (session.lead as any) ?? null;
    const client = (session.client as any) ?? null;
    const recipientEmail: string | null = lead?.email ?? client?.email ?? null;
    if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
      return json({ error: "Client has no valid email on file — cannot resend." }, 400);
    }
    const firstName: string = lead?.first_name ?? (client?.full_name ? String(client.full_name).split(" ")[0] : "");

    const { data: signed } = await admin.storage.from("assessment-pdf-assets").createSignedUrl(session.pdf_path, 60 * 60 * 24 * 7);
    const reportUrl = signed?.signedUrl ?? "";
    if (!reportUrl) return json({ error: "Could not generate signed URL for PDF" }, 500);

    const subject = `Your Settle Abroad assessment report${firstName ? `, ${firstName}` : ""}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="margin:0 0 12px">Hi ${firstName || "there"},</h2>
        <p>Your assessment report is ready. You can download the PDF using the secure link below — it stays valid for 7 days.</p>
        <p style="margin:24px 0">
          <a href="${reportUrl}" style="background:#0f3460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">Download report (PDF)</a>
        </p>
        <p style="font-size:12px;color:#666;word-break:break-all">If the button doesn't work, copy this URL:<br/>${reportUrl}</p>
        <p style="margin-top:24px">— Future Link Consultants</p>
      </div>`;
    const text = `Hi ${firstName || "there"},\n\nYour assessment report is ready. Download it here (valid 7 days):\n${reportUrl}\n\n— Future Link Consultants`;

    // Send via smtp-send with retry on transient failure. Forward the user's auth header.
    let lastErr: string | null = null;
    let smtpResult: any = null;
    let smtpStatus = 0;
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[resend-report] attempt ${attempt} → ${recipientEmail}`);
        const resp = await fetch(`${supabaseUrl}/functions/v1/smtp-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: anonKey,
          },
          body: JSON.stringify({
            to: recipientEmail,
            subject,
            html,
            text,
            category: "assessment-report",
          }),
        });
        smtpStatus = resp.status;
        smtpResult = await resp.json().catch(() => ({}));
        if (resp.ok && !smtpResult?.error) { lastErr = null; break; }
        lastErr = smtpResult?.error ?? `SMTP error (HTTP ${resp.status})`;
        // Retry only on transient (timeout/5xx) errors
        const transient = smtpStatus >= 500 || /timeout|temporarily|try again/i.test(String(lastErr));
        if (!transient) break;
        await new Promise((r) => setTimeout(r, 800));
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        console.error(`[resend-report] attempt ${attempt} threw:`, lastErr);
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (lastErr) {
      console.error(`[resend-report] FAILED for ${recipientEmail}: ${lastErr}`);
      await admin.from("activity_logs").insert({
        user_id: user.id,
        action: "assessment.report.email_failed",
        entity_type: "assessment_session",
        entity_id: sessionId,
        details: { recipient: recipientEmail, error: lastErr, smtp_log_id: smtpResult?.log_id ?? null },
      });
      return json({ error: lastErr, raw: smtpResult, log_id: smtpResult?.log_id ?? null }, 502);
    }

    await admin.from("assessment_sessions").update({ last_emailed_at: new Date().toISOString() }).eq("id", sessionId);
    await admin.from("activity_logs").insert({
      user_id: user.id,
      action: "assessment.report.email_sent",
      entity_type: "assessment_session",
      entity_id: sessionId,
      details: { recipient: recipientEmail, smtp_log_id: smtpResult?.log_id ?? null },
    });

    console.log(`[resend-report] OK → ${recipientEmail} (log ${smtpResult?.log_id ?? "?"})`);
    return json({ ok: true, recipient: recipientEmail, log_id: smtpResult?.log_id ?? null });
  } catch (e) {
    console.error("[resend-report] crash:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
