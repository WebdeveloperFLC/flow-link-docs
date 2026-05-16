import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert education data extractor. Extract ALL information you find from this document. For each piece of information found, classify it into one of these entity types: institution_name, program_title, tuition_fee, application_fee, currency, duration, campus, city, country, intake_month, ielts_score, pte_score, toefl_score, duolingo_score, gpa_requirement, work_experience, scholarship_name, scholarship_amount, scholarship_eligibility, commission_rate, commission_type, bonus_condition, agreement_date, validity_period, co_op_available, pr_pathway, program_level, study_area, discipline, course_description, eligibility_rule, application_deadline, program_url, contact_info, promotional_offer, visa_requirement, work_permit_info, english_waiver_condition. If you find information that does not fit any category above, use entity_type 'custom' and set entity_key to a descriptive snake_case field name.`;

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

    const { data: doc, error: docErr } = await supabase
      .from("upi_uploaded_documents").select("*").eq("id", document_id).single();
    if (docErr || !doc) throw new Error("Document not found");

    await supabase.from("upi_uploaded_documents")
      .update({ review_status: "processing" }).eq("id", document_id);

    // Load file text. For binary docs, fall back to file metadata only.
    let rawText = doc.raw_text ?? "";
    if (!rawText && doc.file_path) {
      const { data: file } = await supabase.storage.from("institution-documents").download(doc.file_path);
      if (file) {
        try { rawText = await file.text(); } catch { rawText = ""; }
      }
    }
    const snippet = rawText.slice(0, 60000);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `File: ${doc.file_name}\nMIME: ${doc.mime_type ?? "?"}\n\nContent:\n${snippet || "(binary file — extract from filename + provided metadata)"}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_extractions",
            description: "Submit the full list of extracted entities",
            parameters: {
              type: "object",
              properties: {
                extractions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entity_type: { type: "string" },
                      entity_key: { type: "string" },
                      entity_value: { type: "string" },
                      confidence: { type: "integer", minimum: 0, maximum: 100 },
                      source_text: { type: "string" },
                      page_number: { type: "integer" },
                    },
                    required: ["entity_type", "entity_value", "confidence"],
                  },
                },
              },
              required: ["extractions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_extractions" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI error ${aiRes.status}: ${txt}`);
    }
    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { extractions: [] };
    const extractions: Array<Record<string, unknown>> = args.extractions ?? [];

    if (extractions.length > 0) {
      await supabase.from("upi_extraction_results").insert(
        extractions.map((e) => ({
          document_id,
          entity_type: e.entity_type,
          entity_key: e.entity_key ?? null,
          entity_value: e.entity_value,
          confidence: e.confidence ?? 0,
          source_text: e.source_text ?? null,
          page_number: e.page_number ?? null,
        })),
      );

      const customs = extractions.filter((e) => e.entity_type === "custom");
      if (customs.length > 0) {
        await supabase.from("upi_ai_suggestions").insert(
          customs.map((e) => ({
            institution_id: institution_id ?? null,
            document_id,
            suggestion_type: "new_field",
            title: `New field discovered: ${e.entity_key}`,
            description: String(e.entity_value).slice(0, 500),
            suggestion_data: e,
            confidence: e.confidence ?? 0,
          })),
        );
      }
    }

    const avg = extractions.length > 0
      ? Math.round(extractions.reduce((s, e) => s + Number(e.confidence ?? 0), 0) / extractions.length)
      : 0;

    await supabase.from("upi_uploaded_documents")
      .update({ is_processed: true, confidence_score: avg, review_status: "approved" })
      .eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, count: extractions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});