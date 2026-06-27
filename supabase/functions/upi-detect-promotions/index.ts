import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * FLEOS: Promotions are user-managed — AI must not auto-create rows in upi_promotions.
 * Extraction from uploads may return in a future sprint after explicit user approval.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { document_id } = await req.json();
    if (!document_id) throw new Error("document_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc } = await supabase
      .from("upi_uploaded_documents")
      .select("id")
      .eq("id", document_id)
      .maybeSingle();
    if (!doc) throw new Error("doc not found");

    return new Response(
      JSON.stringify({
        ok: true,
        found: 0,
        inserted: 0,
        disabled: true,
        message: "Automatic promotion detection is disabled. Create promotions manually or import them.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
