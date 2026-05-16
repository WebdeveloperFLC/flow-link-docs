import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { agreement_id, institution_id } = await req.json();
    if (!agreement_id || !institution_id) throw new Error("agreement_id and institution_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ag } = await supabase.from("upi_agreements").select("*").eq("id", agreement_id).single();
    if (!ag) throw new Error("Agreement not found");

    let rawText = "";
    if (ag.file_path) {
      const { data: file } = await supabase.storage.from("institution-documents").download(ag.file_path);
      if (file) { try { rawText = await file.text(); } catch { /* binary */ } }
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Extract the commission structure from this institution agreement. Identify model type, currency, validity dates, and every payout rule (base, bonuses, slabs, penalties, seasonal, conditional)." },
          { role: "user", content: `Title: ${ag.title}\n\n${rawText.slice(0, 60000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_commission",
            parameters: {
              type: "object",
              properties: {
                model_type: { type: "string", enum: ["fixed","percentage","slab","yearly","semester","bonus","conditional","hybrid"] },
                currency: { type: "string" },
                description: { type: "string" },
                effective_from: { type: "string" },
                effective_to: { type: "string" },
                rules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      rule_name: { type: "string" },
                      rule_type: { type: "string" },
                      payout_amount: { type: "number" },
                      payout_type: { type: "string", enum: ["fixed","percentage","multiplier"] },
                      min_value: { type: "number" },
                      max_value: { type: "number" },
                      condition_field: { type: "string" },
                      condition_operator: { type: "string" },
                      condition_value: { type: "string" },
                      notes: { type: "string" },
                    },
                    required: ["rule_type", "payout_type"],
                  },
                },
              },
              required: ["model_type", "rules"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_commission" } },
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error ${aiRes.status}`);
    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const data = toolCall ? JSON.parse(toolCall.function.arguments) : { model_type: "fixed", rules: [] };
    const confidence = (toolCall && Array.isArray(data.rules) && data.rules.length > 0) ? 95 : 60;
    (data as any).confidence = confidence;

    const { data: comm } = await supabase.from("upi_commissions").insert({
      institution_id, agreement_id,
      name: `Proposed from "${ag.title}"`,
      model_type: data.model_type,
      currency: data.currency ?? "CAD",
      description: data.description ?? null,
      effective_from: data.effective_from ?? null,
      effective_to: data.effective_to ?? null,
      is_proposed: true, is_active: false, source: "ai_extracted",
    }).select().single();

    if (comm && Array.isArray(data.rules) && data.rules.length) {
      await supabase.from("upi_commission_rules").insert(
        data.rules.map((r: Record<string, unknown>) => ({ ...r, commission_id: comm.id, payout_currency: data.currency ?? "CAD" })),
      );
    }

    await supabase.from("upi_agreements").update({ extracted_data: data }).eq("id", agreement_id);
    await supabase.from("upi_ai_suggestions").insert({
      institution_id,
      suggestion_type: "commission_structure",
      title: `Commission proposed from "${ag.title}"`,
      description: `Model: ${data.model_type} · ${(data.rules ?? []).length} rules`,
      suggestion_data: data,
      confidence,
    });

    return new Response(JSON.stringify({ ok: true, commission_id: comm?.id, agreement_id, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});