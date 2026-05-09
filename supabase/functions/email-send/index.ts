// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { client_id, thread_id, to, cc = [], bcc = [], subject, body_html, internal_only = false, in_reply_to = null } = body ?? {};

    if (!client_id || !Array.isArray(to) || to.length === 0 || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ACL: ensure caller can edit this client
    const { data: canEdit, error: aclErr } = await admin.rpc("can_edit_client", { _uid: userId, _cid: client_id });
    if (aclErr || !canEdit) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve or create thread
    let threadId: string | null = thread_id ?? null;
    if (!threadId) {
      const { data: thr, error: thrErr } = await admin
        .from("email_threads")
        .insert({ client_id, subject, created_by: userId, internal_only })
        .select("id")
        .single();
      if (thrErr) throw thrErr;
      threadId = thr.id as string;
    }

    const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") || "no-reply@flowlinkdocs.lovable.app";

    // Persist email row first as queued
    const { data: emailRow, error: insErr } = await admin
      .from("client_emails")
      .insert({
        thread_id: threadId,
        client_id,
        direction: "outbound",
        from_address: fromAddress,
        to_addresses: to,
        cc_addresses: cc,
        bcc_addresses: bcc,
        subject,
        body_html,
        in_reply_to,
        status: "queued",
        sender_user_id: userId,
        internal_only,
      })
      .select("*")
      .single();
    if (insErr) throw insErr;

    // Try provider dispatch (Resend-compatible). If no key, mark as queued for later.
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromAddress,
            to,
            cc: cc.length ? cc : undefined,
            bcc: bcc.length ? bcc : undefined,
            subject,
            html: body_html,
          }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(JSON.stringify(json));
        await admin.from("client_emails").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: json?.id ?? null,
        }).eq("id", emailRow.id);
        await admin.from("email_events").insert({ email_id: emailRow.id, event_type: "sent", payload: json });
      } catch (e) {
        await admin.from("client_emails").update({ status: "failed", error_message: String(e) }).eq("id", emailRow.id);
        await admin.from("email_events").insert({ email_id: emailRow.id, event_type: "failed", payload: { error: String(e) } });
      }
    } else {
      // No provider configured — mark as queued and log event so UI shows clearly
      await admin.from("email_events").insert({ email_id: emailRow.id, event_type: "queued_no_provider", payload: {} });
    }

    return new Response(JSON.stringify({ email_id: emailRow.id, thread_id: threadId, status: emailRow.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("email-send error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});