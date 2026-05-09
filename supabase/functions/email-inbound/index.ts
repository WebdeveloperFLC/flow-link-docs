// @ts-nocheck
// Generic webhook receiver for inbound email. The provider should POST a JSON
// payload with: { from, to, subject, text, html, in_reply_to, message_id, attachments?, secret }
// Configure provider's webhook to include a shared secret matching EMAIL_INBOUND_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expected = Deno.env.get("EMAIL_INBOUND_SECRET");
    const provided = req.headers.get("x-webhook-secret") || new URL(req.url).searchParams.get("secret");
    if (expected && provided !== expected) {
      return new Response("forbidden", { status: 403, headers: corsHeaders });
    }

    const payload = await req.json();
    const fromRaw: string = payload.from || payload.sender || "";
    const fromEmail = fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw;
    const toAddresses: string[] = Array.isArray(payload.to) ? payload.to : [payload.to].filter(Boolean);
    const subject: string = payload.subject || "(no subject)";
    const inReplyTo: string | null = payload.in_reply_to || payload.inReplyTo || null;
    const messageId: string | null = payload.message_id || payload.messageId || null;
    const html: string | null = payload.html || null;
    const text: string | null = payload.text || null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Match client by email address
    const { data: client } = await admin
      .from("clients")
      .select("id, email")
      .ilike("email", fromEmail)
      .limit(1)
      .maybeSingle();

    if (!client) {
      return new Response(JSON.stringify({ ok: true, ignored: "no matching client" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find thread by in_reply_to or by subject
    let threadId: string | null = null;
    if (inReplyTo) {
      const { data: parent } = await admin
        .from("client_emails")
        .select("thread_id")
        .eq("provider_message_id", inReplyTo)
        .limit(1)
        .maybeSingle();
      if (parent?.thread_id) threadId = parent.thread_id;
    }
    if (!threadId) {
      const cleanSubject = subject.replace(/^(re:|fwd?:)\s*/i, "").trim();
      const { data: thr } = await admin
        .from("email_threads")
        .select("id")
        .eq("client_id", client.id)
        .ilike("subject", `%${cleanSubject}%`)
        .limit(1)
        .maybeSingle();
      if (thr?.id) threadId = thr.id;
    }
    if (!threadId) {
      const { data: newThr, error: thrErr } = await admin
        .from("email_threads")
        .insert({ client_id: client.id, subject })
        .select("id")
        .single();
      if (thrErr) throw thrErr;
      threadId = newThr.id;
    }

    const { data: email, error: insErr } = await admin
      .from("client_emails")
      .insert({
        thread_id: threadId,
        client_id: client.id,
        direction: "inbound",
        from_address: fromEmail,
        to_addresses: toAddresses,
        subject,
        body_html: html,
        body_text: text,
        in_reply_to: inReplyTo,
        provider_message_id: messageId,
        status: "received",
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, email_id: email.id, thread_id: threadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("email-inbound error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});