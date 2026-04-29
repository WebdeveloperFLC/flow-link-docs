import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Server-side optimization for large client documents.
 * Body: { document_id: string }
 * Streams the file from storage, re-saves through pdf-lib (object streams + dedup),
 * and writes back if smaller. For very large multi-page PDFs this typically reduces size.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { document_id } = await req.json().catch(() => ({}));
    if (!document_id) return json({ error: "Missing document_id" }, 400);

    const { data: doc } = await admin
      .from("client_documents")
      .select("id, storage_path, file_name, size_bytes")
      .eq("id", document_id)
      .maybeSingle();
    if (!doc) return json({ error: "Document not found" }, 404);

    const { data: blob, error: dlErr } = await admin.storage.from("client-documents").download(doc.storage_path);
    if (dlErr || !blob) return json({ error: "Download failed" }, 500);

    const original = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(original);
    const out = await pdf.save({ useObjectStreams: true });

    const before = original.byteLength;
    const after = out.byteLength;

    if (after < before) {
      const upload = await admin.storage
        .from("client-documents")
        .upload(doc.storage_path, new Blob([out], { type: "application/pdf" }), {
          upsert: true,
          contentType: "application/pdf",
        });
      if (upload.error) return json({ error: upload.error.message }, 500);
      await admin.from("client_documents").update({ size_bytes: after, status: "processed" }).eq("id", doc.id);
    }

    return json({
      ok: true,
      file_name: doc.file_name,
      before_bytes: before,
      after_bytes: Math.min(before, after),
      saved: Math.max(0, before - after),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});