import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const storagePath = String(body.storage_path ?? "").trim();
    if (!storagePath) return json({ error: "storage_path required" }, 400);

    // RLS on chat_message_attachments enforces channel/client membership.
    const { data: att, error: attErr } = await userClient
      .from("chat_message_attachments")
      .select("id, storage_path, file_name, mime_type")
      .eq("storage_path", storagePath)
      .maybeSingle();
    if (attErr) return json({ error: attErr.message }, 403);
    if (!att) return json({ error: "Not found or forbidden" }, 404);

    const admin = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });
    const mode = String(body.mode ?? "download");

    if (mode === "sign") {
      const { data: signed, error: signErr } = await admin.storage
        .from("client-documents")
        .createSignedUrl(storagePath, 60 * 60);
      if (signErr || !signed?.signedUrl) {
        return json({ error: signErr?.message ?? "sign failed" }, 500);
      }
      return json({ url: signed.signedUrl });
    }

    const { data: file, error: dlErr } = await admin.storage.from("client-documents").download(storagePath);
    if (dlErr || !file) return json({ error: dlErr?.message ?? "download failed" }, 500);

    const safeName = (att.file_name || "attachment").replace(/[^\w.\- ()]+/g, "_");
    const contentType = att.mime_type || file.type || "application/octet-stream";

    return new Response(file.stream(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
