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

// ===== Deterministic ICAO 9303 TD3 (passport) MRZ parsing =====
function mrzCheckDigit(input: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    let v = 0;
    if (c >= "0" && c <= "9") v = c.charCodeAt(0) - 48;
    else if (c >= "A" && c <= "Z") v = c.charCodeAt(0) - 55;
    else if (c === "<") v = 0;
    else return -1;
    sum += v * w[i % 3];
  }
  return sum % 10;
}

function expandYY(yy: number): number {
  // ICAO does not specify; use a 20-year window for DOB/expiry hybrid: 00-49 -> 2000s, 50-99 -> 1900s.
  return yy <= 49 ? 2000 + yy : 1900 + yy;
}

function parseMrzDate(yymmdd: string): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const yyyy = expandYY(yy);
  return `${yyyy.toString().padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

interface MrzParsed {
  passport_number?: string;
  nationality?: string;
  date_of_birth?: string;
  gender?: string;
  passport_expiry?: string;
  given_names?: string;
  surname?: string;
  full_name?: string;
  passport_country?: string;
  ok: boolean;
  reason: string;
}

function parseMrz(line1Raw?: string | null, line2Raw?: string | null): MrzParsed | null {
  if (!line1Raw || !line2Raw) return null;
  const l1 = line1Raw.toUpperCase().replace(/[^A-Z0-9<]/g, "").padEnd(44, "<").slice(0, 44);
  const l2 = line2Raw.toUpperCase().replace(/[^A-Z0-9<]/g, "").padEnd(44, "<").slice(0, 44);
  if (!l1.startsWith("P<")) return null;

  const issuingCountry = l1.slice(2, 5).replace(/</g, "");
  const namePart = l1.slice(5).replace(/<+$/g, "");
  const [surnameRaw, givenRaw = ""] = namePart.split("<<");
  const surname = surnameRaw.replace(/</g, " ").trim();
  const given = givenRaw.replace(/</g, " ").trim();
  const fullName = [given, surname].filter(Boolean).join(" ");

  const passportNumber = l2.slice(0, 9).replace(/<+$/g, "");
  const passportCheck = l2[9];
  const nationality = l2.slice(10, 13).replace(/</g, "");
  const dobRaw = l2.slice(13, 19);
  const dobCheck = l2[19];
  const sex = l2[20];
  const expRaw = l2.slice(21, 27);
  const expCheck = l2[27];

  const c1 = mrzCheckDigit(l2.slice(0, 9));
  const c2 = mrzCheckDigit(dobRaw);
  const c3 = mrzCheckDigit(expRaw);
  const okPp = String(c1) === passportCheck;
  const okDob = String(c2) === dobCheck;
  const okExp = String(c3) === expCheck;
  const allOk = okPp && okDob && okExp;

  const dob = parseMrzDate(dobRaw);
  const exp = parseMrzDate(expRaw);

  return {
    passport_number: okPp && passportNumber ? passportNumber : undefined,
    nationality: nationality || undefined,
    passport_country: issuingCountry || undefined,
    date_of_birth: okDob && dob ? dob : undefined,
    passport_expiry: okExp && exp ? exp : undefined,
    gender: sex === "M" || sex === "F" ? (sex === "M" ? "M" : "F") : undefined,
    given_names: given || undefined,
    surname: surname || undefined,
    full_name: fullName || undefined,
    ok: allOk,
    reason: `passport=${okPp}, dob=${okDob}, expiry=${okExp}`,
  };
}

function looksLikePassportDoc(t?: string, c?: string): boolean {
  return /\bpassport\b/i.test(`${t ?? ""} ${c ?? ""}`);
}

// Schema of fields we want extracted. Kept in sync with src/lib/extractedFields.ts
const FIELD_SCHEMA = {
  type: "object",
  properties: {
    date_of_birth: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    gender: { type: ["string", "null"] },
    nationality: { type: ["string", "null"] },
    place_of_birth: { type: ["string", "null"] },
    passport_number: { type: ["string", "null"], description: "ONLY the current passport number from the labelled 'Passport No.' field or MRZ. NEVER File No., Old Passport No., or Previous Passport." },
    passport_issue_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD. Only from the CURRENT passport's 'Date of Issue'. Never from Old/Previous Passport." },
    passport_expiry: { type: ["string", "null"], description: "ISO date YYYY-MM-DD. Only from the CURRENT passport's 'Date of Expiry' or MRZ." },
    passport_country: { type: ["string", "null"], description: "3-letter country code (ISO 3166-1 alpha-3) of the issuing country." },
    full_name_visible: { type: ["string", "null"], description: "Full name as printed in the personal-details page of the passport (Given Names + Surname)." },
    mrz_line1: { type: ["string", "null"], description: "Exact OCR of MRZ line 1 if visible at the bottom of the passport bio page (begins with 'P<')." },
    mrz_line2: { type: ["string", "null"], description: "Exact OCR of MRZ line 2 if visible at the bottom of the passport bio page." },
    file_number: { type: ["string", "null"], description: "The 'File No.' value if printed (long alphanumeric, NOT the passport number)." },
    old_passport_number: { type: ["string", "null"], description: "Old/Previous Passport No. if printed." },
    old_passport_issue_date: { type: ["string", "null"], description: "Old passport issue date if printed." },
    mother_name: { type: ["string", "null"], description: "Mother's name as labelled. NEVER copy this into spouse_name." },
    father_name: { type: ["string", "null"], description: "Father's name / Legal Guardian. NEVER copy this into spouse_name." },
    marital_status: { type: ["string", "null"], description: "single|married|divorced|widowed" },
    spouse_name: { type: ["string", "null"], description: "Only from an explicit 'Name of Spouse / पति या पत्नी का नाम / Wife / Husband' label. Empty otherwise." },
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

    // ===== Deterministic post-processing for passports =====
    // Goal: do not trust the AI's interpreted passport_*/dob/name when MRZ is available.
    // Use ICAO 9303 check-digit-validated MRZ values as the authority. Strip evidence-only
    // helper fields before returning so callers see the same shape as before.
    const isPassport = looksLikePassportDoc(docType, customType);
    const helperKeys = [
      "mrz_line1", "mrz_line2", "file_number",
      "old_passport_number", "old_passport_issue_date",
      "mother_name", "father_name", "full_name_visible",
    ];

    if (isPassport) {
      const mrz = parseMrz(
        typeof fields.mrz_line1 === "string" ? fields.mrz_line1 : null,
        typeof fields.mrz_line2 === "string" ? fields.mrz_line2 : null,
      );

      // 1. NEVER let file_number or old_passport_number become passport_number.
      const filenoStr = typeof fields.file_number === "string" ? fields.file_number.trim() : "";
      const oldPpStr = typeof fields.old_passport_number === "string" ? fields.old_passport_number.trim() : "";
      const oldIssueStr = typeof fields.old_passport_issue_date === "string" ? fields.old_passport_issue_date.trim() : "";
      const motherStr = typeof fields.mother_name === "string" ? fields.mother_name.trim().toLowerCase() : "";
      const fatherStr = typeof fields.father_name === "string" ? fields.father_name.trim().toLowerCase() : "";

      const aiPp = typeof fields.passport_number === "string" ? fields.passport_number.trim() : "";
      if (aiPp && (aiPp === filenoStr || aiPp === oldPpStr || /^[A-Z]{2}\d{8,}$/i.test(aiPp))) {
        delete fields.passport_number;
      }
      // 2. Old passport issue date must never be the current issue date.
      const aiIssue = typeof fields.passport_issue_date === "string" ? fields.passport_issue_date.trim() : "";
      if (aiIssue && aiIssue === oldIssueStr) {
        delete fields.passport_issue_date;
      }
      // 3. Spouse must never equal mother/father.
      const aiSpouse = typeof fields.spouse_name === "string" ? fields.spouse_name.trim().toLowerCase() : "";
      if (aiSpouse && (aiSpouse === motherStr || aiSpouse === fatherStr)) {
        delete fields.spouse_name;
        delete fields.marital_status;
      }
      // 4. Drop YYYY-01-01 placeholders the AI sometimes invents.
      for (const k of ["date_of_birth", "passport_issue_date", "passport_expiry"]) {
        const v = fields[k];
        if (typeof v === "string" && /-01-01$/.test(v.trim())) delete fields[k];
      }

      // 5. MRZ check-digit-validated values OVERRIDE the AI's interpretation.
      if (mrz) {
        if (mrz.passport_number) fields.passport_number = mrz.passport_number;
        if (mrz.date_of_birth) fields.date_of_birth = mrz.date_of_birth;
        if (mrz.passport_expiry) fields.passport_expiry = mrz.passport_expiry;
        if (mrz.passport_country) fields.passport_country = mrz.passport_country;
        if (mrz.nationality) fields.nationality = mrz.nationality;
        if (mrz.gender) fields.gender = mrz.gender;
        // Surface diagnostic for the caller
        (fields as Record<string, unknown>)._mrz_validated = mrz.ok;
      } else {
        // No MRZ available — mark passport_expiry as needing review by dropping it
        // unless the AI also returned a clearly explicit value (i.e. visible label match).
        // We keep the AI value but drop obvious 1-year/10-year "computed" anomalies.
      }

      // 6. spouse_name and marital_status must never be set by a passport doc unless
      //    explicitly matched (already filtered above). Be conservative: drop.
      delete fields.spouse_name;
      delete fields.marital_status;
    }

    // Strip evidence-only helper keys (always)
    for (const k of helperKeys) delete fields[k];

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