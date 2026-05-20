import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROUTE: Record<string, string> = {
  program_sheet: "upi-extract-programs-from-doc",
  agreement: "upi-analyze-agreement",
  commission_sheet: "upi-extract-commission-sheet",
  // Brochures get a multi-step pipeline (programs + promotions) below.
  brochure: "upi-extract-programs-from-doc",
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

    // Build the body the target route expects.
    // upi-analyze-agreement needs an agreement_id (not a document_id),
    // so create the upi_agreements row first and pass that id through.
    let invokeBody: Record<string, unknown> = { document_id, institution_id, doc_kind };
    let agreementId: string | null = null;
    if (doc_kind === "agreement") {
      const { data: docRow } = await supabase
        .from("upi_uploaded_documents")
        .select("file_name, file_path, mime_type")
        .eq("id", document_id)
        .single();
      const { data: ag, error: agErr } = await supabase
        .from("upi_agreements")
        .insert({
          institution_id,
          title: docRow?.file_name ?? "Untitled agreement",
          file_path: docRow?.file_path ?? null,
          agreement_type: "partnership",
          status: "active",
        })
        .select()
        .single();
      if (agErr) throw agErr;
      agreementId = ag?.id ?? null;
      invokeBody = { agreement_id: agreementId, institution_id };
    }

    const { data, error } = await supabase.functions.invoke(route, { body: invokeBody });
    if (error) {
      await supabase.from("upi_document_pipeline_events").insert({
        document_id, state: "failed", edge_function: route, message: error.message,
      });
      await supabase.from("upi_uploaded_documents").update({ pipeline_status: "failed" }).eq("id", document_id);
      throw error;
    }

    // Always sweep promotions (any doc type may reveal a promo, brochures included)
    let promosResult: any = null;
    try {
      const { data: pr } = await supabase.functions.invoke("upi-detect-promotions", {
        body: { document_id, institution_id },
      });
      promosResult = pr ?? null;
    } catch (_) { /* non-fatal */ }

    const aggregated = {
      route,
      programs_found: Number((data as any)?.found ?? (data as any)?.count ?? 0),
      programs_upserted: Number((data as any)?.upserted ?? 0),
      promotions_found: Number(promosResult?.found ?? 0),
      extraction_meta: (data as any)?.extraction_meta ?? null,
      confidence: Number((data as any)?.confidence ?? 0),
      pageCount: (data as any)?.pageCount ?? null,
      pagesSucceeded: (data as any)?.pagesSucceeded ?? null,
      pagesFailed: (data as any)?.pagesFailed ?? null,
      runMs: (data as any)?.runMs ?? null,
      raw: data ?? {},
    };
    const anythingFound =
      aggregated.programs_found > 0 ||
      aggregated.programs_upserted > 0 ||
      aggregated.promotions_found > 0 ||
      doc_kind === "agreement"; // agreement extractor doesn't return found count
    await supabase.from("upi_document_pipeline_events").insert({
      document_id,
      state: anythingFound ? "extracted" : "needs_review",
      edge_function: route,
      payload: aggregated,
    });
    const resultConf = Number((data as any)?.confidence);
    const confidence_score = Number.isFinite(resultConf)
      ? Math.max(0, Math.min(100, Math.round(resultConf)))
      : (anythingFound ? 80 : 0);
    let mergedMetadata: Record<string, unknown> | undefined;
    if (agreementId) {
      const { data: cur } = await supabase
        .from("upi_uploaded_documents")
        .select("metadata")
        .eq("id", document_id)
        .single();
      mergedMetadata = { ...((cur?.metadata as Record<string, unknown>) ?? {}), linked_agreement_id: agreementId };
    }
    await supabase.from("upi_uploaded_documents")
      .update({
        pipeline_status: anythingFound ? "extracted" : "needs_review",
        review_status: anythingFound ? "approved" : "needs_review",
        is_processed: true,
        confidence_score,
        extracted_payload: aggregated,
        ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
      })
      .eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, route, result: aggregated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});