import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COURSE_TOOL = {
  type: "function",
  function: {
    name: "extract_courses",
    description: "Extract every distinct course/program present in the uploaded document. For each, fill any field you can confidently infer; leave others null.",
    parameters: {
      type: "object",
      properties: {
        courses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_title: { type: "string" },
              program_level: { type: "string" },
              field_of_study: { type: "string" },
              specialization: { type: "string" },
              duration_value: { type: "number" },
              duration_unit: { type: "string" },
              tuition_fee: { type: "number" },
              currency: { type: "string" },
              application_fee: { type: "number" },
              intake_months: { type: "array", items: { type: "string" } },
              ielts_overall: { type: "number" },
              pte_overall: { type: "number" },
              toefl_overall: { type: "number" },
              duolingo_overall: { type: "number" },
              gpa_requirement: { type: "string" },
              is_pgwp_eligible: { type: "boolean" },
              is_coop: { type: "boolean" },
              campus_name: { type: "string" },
              city: { type: "string" },
              course_description: { type: "string" },
              confidence_score: { type: "number" },
            },
            required: ["course_title"],
            additionalProperties: true,
          },
        },
      },
      required: ["courses"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { document_id, institution_id } = await req.json();
    if (!document_id || !institution_id) throw new Error("document_id and institution_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc, error: dErr } = await supabase
      .from("upi_uploaded_documents").select("*").eq("id", document_id).single();
    if (dErr || !doc) throw new Error("Document not found");

    await supabase.from("upi_uploaded_documents").update({ review_status: "processing" }).eq("id", document_id);

    let rawText = doc.raw_text ?? "";
    if (!rawText && doc.file_path) {
      const { data: file } = await supabase.storage.from("institution-documents").download(doc.file_path);
      if (file) {
        try { rawText = await file.text(); } catch { rawText = ""; }
      }
    }
    const snippet = (rawText || "").slice(0, 80000);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract academic program data from institution-supplied sheets (PDF/Excel/CSV). One row per distinct program × campus. Never invent fees, IELTS, or durations." },
          { role: "user", content: `File: ${doc.file_name}\nMIME: ${doc.mime_type ?? "?"}\n\n${snippet || "(empty / binary)"}` },
        ],
        tools: [COURSE_TOOL],
        tool_choice: { type: "function", function: { name: "extract_courses" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 402) throw new Error("AI credits exhausted");
      if (aiRes.status === 429) throw new Error("Rate limited");
      throw new Error(`AI error ${aiRes.status}: ${t.slice(0, 300)}`);
    }
    const j = await aiRes.json();
    const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { courses: [] };
    let courses: any[] = Array.isArray(parsed?.courses) ? parsed.courses : [];
    courses = courses.map((c) => {
      const raw = Number(c.confidence_score);
      const cs = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 95;
      return { ...c, confidence_score: cs };
    });

    let upserted = 0;
    if (courses.length > 0) {
      const { data: upRes } = await supabase.functions.invoke("upi-upsert-courses", {
        body: { courses, institution_id },
      });
      upserted = (upRes as any)?.upserted ?? 0;
    }

    const docConfidence = courses.length
      ? Math.round(courses.reduce((s, c) => s + Number(c.confidence_score ?? 0), 0) / courses.length)
      : 95;
    await supabase.from("upi_uploaded_documents")
      .update({ is_processed: true, confidence_score: docConfidence, review_status: "approved" })
      .eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, found: courses.length, upserted, confidence: docConfidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});