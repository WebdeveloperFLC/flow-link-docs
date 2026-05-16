import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYS = `You scan study-abroad documents for promotions (application fee waivers, bonus commission, free GIC, scholarships, seasonal campaigns). Return zero or more structured promotions with promo_type from: scholarship, pr_pathway, low_ielts, coop, seasonal, high_demand, affordable, work_permit, fast_track, general.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { document_id, institution_id } = await req.json();
    if (!document_id) throw new Error("document_id required");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc } = await supabase
      .from("upi_uploaded_documents").select("*").eq("id", document_id).single();
    if (!doc) throw new Error("doc not found");

    let rawText = doc.raw_text ?? "";
    if (!rawText && doc.file_path) {
      const { data: file } = await supabase.storage.from("institution-documents").download(doc.file_path);
      if (file) try { rawText = await file.text(); } catch { /* binary */ }
    }
    if (!rawText) return new Response(JSON.stringify({ ok: true, found: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: rawText.slice(0, 50000) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_promotions",
            parameters: {
              type: "object",
              properties: {
                promotions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      promo_type: { type: "string" },
                      description: { type: "string" },
                      valid_from: { type: "string" },
                      valid_to: { type: "string" },
                      target_countries: { type: "array", items: { type: "string" } },
                      conditions: { type: "object" },
                    },
                    required: ["title", "promo_type"],
                  },
                },
              },
              required: ["promotions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_promotions" } },
      }),
    });
    if (!aiRes.ok) throw new Error(`AI ${aiRes.status}`);
    const aiJson = await aiRes.json();
    const args = JSON.parse(aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    const promos = Array.isArray(args.promotions) ? args.promotions : [];
    if (promos.length) {
      await supabase.from("upi_promotions").insert(
        promos.map((p: any) => ({
          institution_id,
          title: p.title,
          promo_type: p.promo_type ?? "general",
          description: p.description,
          valid_from: p.valid_from || null,
          valid_to: p.valid_to || null,
          target_countries: p.target_countries ?? [],
          conditions: p.conditions ?? {},
          is_active: true,
          auto_detected: true,
          detection_source: `document:${document_id}`,
        })),
      );
    }
    return new Response(JSON.stringify({ ok: true, found: promos.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});