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
    const customType = String(body?.custom_type ?? "").slice(0, 80);
    const snippet = String(body?.snippet ?? "").slice(0, 30000);
    const fileName = String(body?.file_name ?? "").slice(0, 200);
    const imageDataUrls: string[] = Array.isArray(body?.image_data_urls)
      ? body.image_data_urls.filter((s: unknown) => typeof s === "string" && s.startsWith("data:image")).slice(0, 6)
      : [];

    if (!snippet && imageDataUrls.length === 0) {
      return json({ fields: {}, reason: "no_input" });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ fields: {}, reason: "no_api_key" });

    const sys =
      "You are an expert extractor for immigration / study-abroad case documents. " +
      "Read the ENTIRE document — every page, every section — using both the text snippet AND every page image (OCR all images). " +
      "Do not stop after the first page; resumes, transcripts, bank statements, and IELTS reports often have key data on later pages. " +
      "Extract every field that appears anywhere — headers, footers, signature blocks, contact strips, sidebars, tables, stamps, watermarks. " +
      "Phones / emails: capture BOTH the primary and any alternate numbers/emails listed (header, footer, contact section). " +
      "Education: list EVERY qualification — high school, diplomas, bachelor, master, phd, certificates — in education_history. " +
      "Also populate the legacy fields highest_qualification / institution_name / graduation_year / gpa_or_percentage from the highest degree. " +
      "Employment: capture employer_name, job_title, annual_income, currency. " +
      "Financial: capture bank_name, account_balance, gic_amount, tuition_paid, currency when visible. " +
      "Identity: passport_number, passport_country, passport_issue_date, passport_expiry, date_of_birth, nationality, place_of_birth, gender, marital_status, spouse_name. " +
      "Address: street/city/state/country/postal — split into the dedicated address fields. " +
      "Return null for anything not clearly readable. Never invent or guess. " +
      "Dates MUST be ISO YYYY-MM-DD. Numbers must be plain numbers (no currency symbols, commas removed). " +
      "Always call the save_fields tool exactly once with the full result.";

    const passportRules =
      "\n\nPASSPORT-SPECIFIC RULES (apply when document type is passport, or when you detect MRZ lines beginning with 'P<'):\n" +
      "- The TWO MRZ lines at the bottom are the AUTHORITATIVE source. Parse them strictly:\n" +
      "  * Line 1: 'P<{ISSUING_COUNTRY}{SURNAME}<<{GIVEN_NAMES}...'\n" +
      "  * Line 2: '{PASSPORT_NUMBER:9}{check}{NATIONALITY:3}{DOB:YYMMDD}{check}{SEX}{EXPIRY:YYMMDD}{check}...'\n" +
      "  * Two-digit years: years 00-49 → 2000-2049; years 50-99 → 1950-1999. So '02' = 2002, '32' = 2032.\n" +
      "  * Use MRZ values for passport_number, nationality, date_of_birth, gender, passport_expiry whenever MRZ is legible. Cross-check with the visual fields; if they conflict, prefer MRZ.\n" +
      "- 'File No.' / 'फाइल न.' is NOT the passport number. It is usually a longer alphanumeric like 'AH3076602281022'. NEVER place it in passport_number.\n" +
      "- 'Old Passport No.' / 'पुराने पासपोर्ट का न.' / 'Previous Passport' refers to a PREVIOUS booklet. NEVER use its number, issue date, place, or expiry for the current passport_* fields.\n" +
      "- place_of_birth must be taken ONLY from the labelled 'Place of Birth' / 'जन्म स्थान' field. NEVER copy from the address block.\n" +
      "- spouse_name: ONLY populate if there is an explicit non-empty value next to a label like 'Name of Spouse' / 'पति या पत्नी का नाम' / 'Wife' / 'Husband'. " +
      "  NEVER copy the Mother's name ('माता का नाम' / 'Name of Mother') or Father's name ('पिता' / 'Name of Father / Legal Guardian') into spouse_name. If the spouse field is blank, return spouse_name: null.\n" +
      "- marital_status: do NOT infer from the presence of mother/father fields. Set null unless an explicit marital status is stated, OR a clearly named spouse exists in the labelled spouse field.\n" +
      "- Dates: if any part of a date is unreadable, return null. NEVER pad missing day/month with '01' (no YYYY-01-01 fallbacks).\n" +
      "- For NON-passport documents, return null for passport_number, passport_country, passport_issue_date, and passport_expiry — those belong to the passport only.";

    const finalSys = sys + passportRules;

    const typeLabel = customType || docType || "unknown";
    const userText =
      `Document type: ${typeLabel}\n` +
      `File name: ${fileName}\n` +
      `Page images attached: ${imageDataUrls.length}\n` +
      `Document text (may be empty or garbled if scanned — rely on the images then):\n"""${snippet}"""`;
    const userContent: unknown[] = [{ type: "text", text: userText }];
    for (const url of imageDataUrls) {
      userContent.push({ type: "image_url", image_url: { url } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: finalSys },
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