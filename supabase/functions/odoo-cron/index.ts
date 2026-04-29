// Triggered by pg_cron via net.http_post. Calls odoo-sync action=sync_all.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Call odoo-sync with service-role auth so it passes the user check.
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/odoo-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({ action: "sync_all" }),
    });
    const data = await resp.json().catch(() => ({}));
    return json({ ok: true, downstream: data, status: resp.status });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "cron error" }, 500);
  }
});
