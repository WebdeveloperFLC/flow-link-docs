import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYS = `You extract structured commission terms from study-abroad commission sheets / agreements. Return base rate, slab tiers, bonuses, country/intake/program-specific rates, payment timing, tax treatment, wire deduction, aggregator handling. Numbers must be numeric, not strings.`;

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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: `Commission document. File: ${doc.file_name}\n\n${rawText.slice(0, 60000) || "(binary)"}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_commission",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                currency: { type: "string" },
                model_type: { type: "string", enum: ["percentage","fixed","slab","hybrid"] },
                base_rate_percent: { type: "number" },
                payout_basis: { type: "string" },
                payment_timing: { type: "string" },
                tax_treatment: { type: "string" },
                wire_deduction: { type: "string" },
                aggregator_notes: { type: "string" },
                rules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      rule_name: { type: "string" },
                      rule_type: { type: "string", enum: ["base","slab_tier","bonus","penalty","seasonal","program_specific","conditional"] },
                      payout_type: { type: "string", enum: ["fixed","percentage","multiplier"] },
                      payout_amount: { type: "number" },
                      condition_field: { type: "string" },
                      condition_operator: { type: "string" },
                      condition_value: { type: "string" },
                      min_value: { type: "number" },
                      max_value: { type: "number" },
                    },
                  },
                },
              },
              required: ["name","currency","model_type","rules"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_commission" } },
      }),
    });
    if (!aiRes.ok) throw new Error(`AI ${aiRes.status}: ${await aiRes.text()}`);
    const aiJson = await aiRes.json();
    const args = JSON.parse(aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");

    const { data: comm, error: cErr } = await supabase
      .from("upi_commissions")
      .insert({
        institution_id,
        name: args.name ?? doc.file_name,
        currency: args.currency ?? "CAD",
        model_type: args.model_type ?? "percentage",
        is_active: false,
        is_proposed: true,
        metadata: {
          base_rate_percent: args.base_rate_percent,
          payout_basis: args.payout_basis,
          payment_timing: args.payment_timing,
          tax_treatment: args.tax_treatment,
          wire_deduction: args.wire_deduction,
          aggregator_notes: args.aggregator_notes,
          source_document_id: document_id,
        },
      })
      .select()
      .single();
    if (cErr) throw cErr;

    const rules = Array.isArray(args.rules) ? args.rules : [];
    if (rules.length) {
      await supabase.from("upi_commission_rules").insert(
        rules.map((r: any) => ({
          commission_id: comm.id,
          rule_name: r.rule_name,
          rule_type: r.rule_type ?? "base",
          payout_amount: r.payout_amount,
          payout_type: r.payout_type ?? "percentage",
          payout_currency: args.currency ?? "CAD",
          condition_field: r.condition_field,
          condition_operator: r.condition_operator,
          condition_value: r.condition_value,
          min_value: r.min_value,
          max_value: r.max_value,
        })),
      );
    }

    await supabase.from("upi_uploaded_documents")
      .update({
        linked_record_refs: [{ table: "upi_commissions", id: comm.id }],
      })
      .eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, commission_id: comm.id, rules: rules.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});