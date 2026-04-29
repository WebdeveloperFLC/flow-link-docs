import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return json({ error: "Missing x-api-key header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const hash = await sha256(apiKey);
    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("id, scopes, revoked")
      .eq("key_hash", hash)
      .maybeSingle();
    if (!keyRow || keyRow.revoked) return json({ error: "Invalid API key" }, 401);

    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    const url = new URL(req.url);
    const path = url.pathname.replace(/^.*\/odoo-api/, "");

    // GET /clients?status=&country=&limit=
    if (req.method === "GET" && (path === "" || path === "/" || path === "/clients")) {
      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      const status = url.searchParams.get("status");
      const country = url.searchParams.get("country");
      const limit = Number(url.searchParams.get("limit") ?? "100");
      if (status) q = q.eq("status", status);
      if (country) q = q.eq("country", country);
      const { data, error } = await q.limit(Math.min(limit, 500));
      if (error) return json({ error: error.message }, 500);
      return json({ clients: data });
    }

    // GET /clients/:id
    const matchClient = path.match(/^\/clients\/([0-9a-f-]{36})$/i);
    if (req.method === "GET" && matchClient) {
      const id = matchClient[1];
      const [{ data: client }, { data: docs }, { data: binders }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase.from("client_documents").select("id,document_type,custom_type,file_name,version,uploaded_at,size_bytes").eq("client_id", id),
        supabase.from("binders").select("id,file_name,generated_at,size_bytes").eq("client_id", id),
      ]);
      if (!client) return json({ error: "Client not found" }, 404);
      return json({ client, documents: docs, binders });
    }

    return json({ error: "Not found", path }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});