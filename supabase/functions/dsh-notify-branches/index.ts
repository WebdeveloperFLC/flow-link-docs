// @ts-nocheck
// Notify branches that new/updated Digital Success Hub content is available.
// Sends one email per active contact for each selected branch via smtp-send,
// logs to dsh_branch_notifications, and stamps dsh_media.last_notified_at.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return j({ error: "Not authenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ error: "Not authenticated" }, 401);

    const admin = createClient(url, service);
    const { media_id, branch_ids = [], message = "" } = await req.json();
    if (!media_id) return j({ error: "media_id required" }, 400);
    if (!Array.isArray(branch_ids) || branch_ids.length === 0) {
      return j({ error: "Pick at least one branch" }, 400);
    }

    const { data: media, error: mErr } = await admin
      .from("dsh_media")
      .select("id,title,description,external_url,storage_path,content_type,campaign_name,country_name")
      .eq("id", media_id)
      .maybeSingle();
    if (mErr || !media) return j({ error: "Media not found" }, 404);

    // Build a public link: external_url for links, signed URL for uploads
    let link = media.external_url as string | null;
    if (!link && media.storage_path) {
      const { data: signed } = await admin.storage.from("dsh-media")
        .createSignedUrl(media.storage_path, 60 * 60 * 24 * 7);
      link = signed?.signedUrl ?? null;
    }

    const { data: contacts, error: cErr } = await admin
      .from("dsh_branch_contacts")
      .select("branch_id,email,label,is_active")
      .in("branch_id", branch_ids)
      .eq("is_active", true);
    if (cErr) throw cErr;

    let sent = 0, failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    const subject = `New promo content: ${media.title}`;
    const baseHtml = `
      <p>New promotional content is available in the Digital Success Hub.</p>
      <p><strong>${escapeHtml(media.title)}</strong>${media.campaign_name ? ` &middot; ${escapeHtml(media.campaign_name)}` : ""}</p>
      ${media.description ? `<p>${escapeHtml(media.description)}</p>` : ""}
      ${link ? `<p><a href="${link}">Open content</a></p>` : ""}
      ${message ? `<hr/><p>${escapeHtml(message)}</p>` : ""}
    `;

    for (const c of contacts ?? []) {
      try {
        const { error: sendErr } = await admin.functions.invoke("smtp-send", {
          body: { to: c.email, subject, html: baseHtml, category: "dsh_notification" },
          headers: { Authorization: authHeader },
        });
        const status = sendErr ? "failed" : "sent";
        if (sendErr) { failed++; errors.push({ email: c.email, error: sendErr.message }); }
        else { sent++; }
        await admin.from("dsh_branch_notifications").insert({
          media_id, branch_id: c.branch_id, recipient_email: c.email,
          sent_at: new Date().toISOString(), sent_by: u.user.id,
          status, message_id: null,
        });
      } catch (e) {
        failed++;
        errors.push({ email: c.email, error: e instanceof Error ? e.message : String(e) });
      }
    }

    await admin.from("dsh_media").update({ last_notified_at: new Date().toISOString() }).eq("id", media_id);

    return j({ ok: true, sent, failed, errors, recipients: contacts?.length ?? 0 });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}