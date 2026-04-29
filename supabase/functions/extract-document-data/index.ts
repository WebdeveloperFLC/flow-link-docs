const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Schema of fields we want extracted. Kept in sync with src/lib/extractedFields.ts
const FIELD_SCHEMA = {
  type: "object",
  properties: {
    date_of_birth: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    gender: { type: ["string", "null"] },
    nationality: { type: ["string", "null"] },
    place_of_birth: { type: ["string", "null"] },
    passport_number: { type: ["string", "null"] },
    passport_issue_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    passport_expiry: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    passport_country: { type: ["string", "null"] },
    marital_status: { type: ["string", "null"], description: "single|married|divorced|widowed" },
    spouse_name: { type: ["string", "null"] },
    address_line1: { type: ["string", "null"] },
    address_city: { type: ["string", "null"] },
    address_state: { type: ["string", "null"] },
    address_country: { type: ["string", "null"] },
    address_postal: { type: ["string", "null"] },
    phone_primary: { type: ["string", "null"], description: "Primary phone number visible in the document. Include country code if shown." },
    phone_alt: { type: ["string", "null"] },
    email_alt: { type: ["string", "null"] },
    ielts_overall: { type: ["number", "null"] },
    ielts_listening: { type: ["number", "null"] },
    ielts_reading: { type: ["number", "null"] },
    ielts_writing: { type: ["number", "null"] },
    ielts_speaking: { type: ["number", "null"] },
    ielts_test_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    highest_qualification: { type: ["string", "null"] },
    institution_name: { type: ["string", "null"] },
    graduation_year: { type: ["number", "null"] },
    gpa_or_percentage: { type: ["string", "null"] },
    education_history: {
      type: ["array", "null"],
      description: "Every degree/qualification visible in the document (high school, diploma, bachelor, master, phd, certificate). Include even if partial.",
      items: {
        type: "object",
        properties: {
          degree: { type: ["string", "null"], description: "e.g. Bachelor of Science, MBA, 12th Grade" },
          field_of_study: { type: ["string", "null"], description: "e.g. Computer Science, Commerce" },
          level: { type: ["string", "null"], description: "high_school|diploma|bachelor|master|phd|certificate|other" },
          institution: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          start_year: { type: ["number", "null"] },
          end_year: { type: ["number", "null"] },
          gpa_or_percentage: { type: ["string", "null"] },
        },
        additionalProperties: false,
      },
    },
    employer_name: { type: ["string", "null"] },
    job_title: { type: ["string", "null"] },
    annual_income: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    bank_name: { type: ["string", "null"] },
    account_balance: { type: ["number", "null"] },
    gic_amount: { type: ["number", "null"] },
    tuition_paid: { type: ["number", "null"] },
    emergency_contact_name: { type: ["string", "null"] },
    emergency_contact_phone: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const docType = String(body?.document_type ?? "").slice(0, 80);
    const snippet = String(body?.snippet ?? "").slice(0, 14000);
    const fileName = String(body?.file_name ?? "").slice(0, 200);
    const imageDataUrls: string[] = Array.isArray(body?.image_data_urls)
      ? body.image_data_urls.filter((s: unknown) => typeof s === "string" && s.startsWith("data:image")).slice(0, 4)
      : [];

    if (!snippet && imageDataUrls.length === 0) {
      return json({ fields: {}, reason: "no_input" });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ fields: {}, reason: "no_api_key" });

    const sys =
      "You extract structured CRM fields from immigration / study-abroad documents. " +
      "Read the document content carefully — including text snippet AND any provided page images (use OCR on the images). " +
      "Extract every field that is clearly visible anywhere on the page: headers, footers, signature blocks, contact sections, labelled fields, sidebars. " +
      "Pay special attention to phone numbers (main and alternate), email addresses, and full education history. " +
      "If the document lists multiple degrees (e.g. on a resume), return ALL of them in education_history, not just the highest. " +
      "Also fill the legacy single-field highest_qualification/institution_name/graduation_year/gpa_or_percentage with the highest-level degree from education_history. " +
      "Return null for anything not clearly present. Do NOT hallucinate. " +
      "Dates MUST be ISO YYYY-MM-DD. Numbers must be plain numbers, no currency symbols. " +
      "Use the save_fields tool to return the result.";

    const userText = `Document type: ${docType || "unknown"}\nFile name: ${fileName}\nDocument text (may be empty or garbled if scanned):\n"""${snippet}"""`;
    const userContent: unknown[] = [{ type: "text", text: userText }];
    for (const url of imageDataUrls) {
      userContent.push({ type: "image_url", image_url: { url } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_fields",
              description: "Save the extracted CRM fields. Omit or null any field you cannot read confidently.",
              parameters: FIELD_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_fields" } },
      }),
    });

    if (resp.status === 429) return json({ fields: {}, reason: "rate_limited" });
    if (resp.status === 402) return json({ fields: {}, reason: "no_credits" });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return json({ fields: {}, reason: `ai_error:${resp.status}`, detail: t.slice(0, 300) });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let fields: Record<string, unknown> = {};
    if (toolCall?.function?.arguments) {
      try {
        fields = JSON.parse(toolCall.function.arguments);
      } catch {
        fields = {};
      }
    }
    // Strip null/empty
    for (const k of Object.keys(fields)) {
      const v = fields[k];
      if (v === null || v === undefined || v === "") delete fields[k];
    }
    return json({ fields });
  } catch (e) {
    return json({ fields: {}, reason: e instanceof Error ? e.message : "unknown" });
  }
});