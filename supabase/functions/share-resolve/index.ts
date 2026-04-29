import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ error: "Missing token" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { data: link, error } = await admin
      .from("share_links")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) return json({ error: "Lookup failed" }, 500);
    if (!link) return json({ error: "Link not found" }, 404);
    if (link.revoked) return json({ error: "Link has been revoked" }, 410);
    if (new Date(link.expires_at).getTime() < Date.now()) return json({ error: "Link has expired" }, 410);
    if (link.max_views && link.view_count >= link.max_views) return json({ error: "View limit reached" }, 410);

    const table = link.target_type === "binder" ? "binders" : "client_documents";
    const { data: row } = await admin
      .from(table)
      .select("file_name, storage_path")
      .eq("id", link.target_id)
      .maybeSingle();
    if (!row) return json({ error: "Resource missing" }, 404);

    const { data: signed, error: sErr } = await admin.storage
      .from("client-documents")
      .createSignedUrl(row.storage_path, 60 * 10);
    if (sErr || !signed) return json({ error: "Could not sign URL" }, 500);

    await admin
      .from("share_links")
      .update({ view_count: link.view_count + 1 })
      .eq("id", link.id);

    return json({ url: signed.signedUrl, file_name: row.file_name, expires_at: link.expires_at });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});