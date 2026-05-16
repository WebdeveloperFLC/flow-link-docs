import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROUTE: Record<string, string> = {
  program_sheet: "upi-extract-programs-from-doc",
  agreement: "upi-analyze-agreement",
  commission_sheet: "upi-extract-commission-sheet",
  brochure: "upi-detect-promotions",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { document_id, institution_id, doc_kind } = await req.json();
    if (!document_id) throw new Error("document_id required");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const route = ROUTE[doc_kind ?? ""] ?? "upi-process-document";

    await supabase.from("upi_document_pipeline_events").insert({
      document_id, state: "processing", edge_function: route, message: `Routing ${doc_kind} → ${route}`,
    });
    await supabase.from("upi_uploaded_documents")
      .update({ pipeline_status: "processing" })
      .eq("id", document_id);

    const { data, error } = await supabase.functions.invoke(route, {
      body: { document_id, institution_id, doc_kind },
    });
    if (error) {
      await supabase.from("upi_document_pipeline_events").insert({
        document_id, state: "failed", edge_function: route, message: error.message,
      });
      await supabase.from("upi_uploaded_documents").update({ pipeline_status: "failed" }).eq("id", document_id);
      throw error;
    }

    // Always sweep promotions (any doc type may reveal a promo)
    if (doc_kind !== "brochure") {
      try {
        await supabase.functions.invoke("upi-detect-promotions", { body: { document_id, institution_id } });
      } catch (_) { /* non-fatal */ }
    }

    await supabase.from("upi_document_pipeline_events").insert({
      document_id, state: "extracted", edge_function: route, payload: data ?? {},
    });
    await supabase.from("upi_uploaded_documents")
      .update({ pipeline_status: "needs_review", extracted_payload: data ?? {} })
      .eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, route, result: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});