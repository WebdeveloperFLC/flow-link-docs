import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Run a promotional campaign: send the generated content to each selected
 * client via email-send, signed by the chosen sender (current user or
 * "on behalf of" a teammate). Logs a row in upi_marketing_campaigns.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { institution_id, promotion_id, channel = "email", subject, body_html, sender_user_id, recipient_client_ids = [] } = await req.json();
    if (!institution_id) throw new Error("institution_id required");
    if (!subject || !body_html) throw new Error("subject and body_html required");
    if (!Array.isArray(recipient_client_ids) || recipient_client_ids.length === 0) {
      throw new Error("Pick at least one recipient");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error("Not authenticated");
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve sender signature (just stash on prompt_context for now)
    let signatureName = "";
    {
      const sid = sender_user_id || callerId;
      const { data: p } = await admin.from("profiles").select("full_name,first_name,last_name,email").eq("id", sid).maybeSingle();
      signatureName = p?.full_name || `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || p?.email || "Team";
    }

    const finalHtml = `${body_html}\n<br/><br/>—<br/>${signatureName}`;

    let sent = 0, failed = 0;
    const errors: Array<{ client_id: string; error: string }> = [];

    for (const client_id of recipient_client_ids) {
      const { data: client } = await admin.from("clients").select("id,email,full_name").eq("id", client_id).maybeSingle();
      if (!client?.email) {
        failed++;
        errors.push({ client_id, error: "No email on file" });
        continue;
      }
      try {
        const { error: sendErr } = await admin.functions.invoke("email-send", {
          body: {
            client_id,
            to: [client.email],
            subject,
            body_html: finalHtml,
          },
          headers: { Authorization: authHeader },
        });
        if (sendErr) {
          failed++;
          errors.push({ client_id, error: sendErr.message });
        } else {
          sent++;
        }
      } catch (e) {
        failed++;
        errors.push({ client_id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    await admin.from("upi_marketing_campaigns").insert({
      institution_id,
      promotion_id: promotion_id ?? null,
      channel,
      generated_content: body_html,
      status: sent > 0 ? "sent" : "rejected",
      sent_at: sent > 0 ? new Date().toISOString() : null,
      approved_by: callerId,
      approved_at: new Date().toISOString(),
      prompt_context: { subject, sender_user_id: sender_user_id ?? callerId, signature: signatureName, recipient_client_ids, errors },
    });

    return new Response(JSON.stringify({ ok: true, sent, failed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});