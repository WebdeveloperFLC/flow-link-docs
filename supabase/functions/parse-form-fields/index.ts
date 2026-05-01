import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, PDFArray, PDFDict, PDFName, PDFStream, PDFRawStream, PDFRef, decodePDFRawStream } from "https://esm.sh/pdf-lib@1.17.1";
import { inflate } from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FieldDef {
  id: string;
  pdf_field?: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "dropdown" | "yes_no" | "multi_entry";
  options?: string[];
  required?: boolean;
  repeatable?: boolean;
  mapping_key?: string;
  max_length?: number;
  format?: string;
}

interface SectionDef {
  key: string;
  label: string;
  fields: FieldDef[];
}

const PROFILE_KEYS = [
  "date_of_birth", "gender", "nationality", "place_of_birth",
  "passport_number", "passport_issue_date", "passport_expiry", "passport_country",
  "marital_status", "spouse_name",
  "address_line1", "address_city", "address_state", "address_country", "address_postal",
  "phone_alt", "email_alt",
  "highest_qualification", "institution_name", "graduation_year", "gpa_or_percentage",
  "employer_name", "job_title", "annual_income", "currency",
  "bank_name", "account_balance",
];

function classifySection(label: string): string {
  const l = label.toLowerCase();
  if (/passport|nationality|gender|birth|marital|name/.test(l)) return "personal";
  if (/travel|trip|visit|previous.*country|entry|exit/.test(l)) return "travel";
  if (/educat|school|college|university|degree|qualification|gpa|grade/.test(l)) return "education";
  if (/employ|job|work|occupation|salary|income/.test(l)) return "employment";
  if (/financ|bank|fund|gic|tuition|sponsor|account.*balance/.test(l)) return "financial";
  if (/family|spouse|child|parent|sibling|depend/.test(l)) return "family";
  return "form_specific";
}

function mappingFor(label: string): string | undefined {
  const l = label.toLowerCase();
  if (/date.*of.*birth|dob/.test(l)) return "date_of_birth";
  if (/passport.*number/.test(l)) return "passport_number";
  if (/passport.*expiry|expiration/.test(l)) return "passport_expiry";
  if (/passport.*issue/.test(l)) return "passport_issue_date";
  if (/national/.test(l)) return "nationality";
  if (/marital.*status/.test(l)) return "marital_status";
  if (/spouse.*name/.test(l)) return "spouse_name";
  if (/email/.test(l)) return "email_alt";
  if (/phone|mobile|tel/.test(l)) return "phone_alt";
  if (/employer|company/.test(l)) return "employer_name";
  if (/job.*title|position|occupation/.test(l)) return "job_title";
  if (/annual.*income|salary/.test(l)) return "annual_income";
  if (/bank.*name/.test(l)) return "bank_name";
  if (/account.*balance/.test(l)) return "account_balance";
  if (/postal|zip/.test(l)) return "address_postal";
  if (/city/.test(l)) return "address_city";
  if (/province|state/.test(l)) return "address_state";
  if (/country.*resid|country.*of/.test(l)) return "address_country";
  if (/gender|sex/.test(l)) return "gender";
  return undefined;
}

function inferType(name: string, raw: string): FieldDef["type"] {
  const l = name.toLowerCase();
  if (/date|dob|expiry|issue/.test(l)) return "date";
  if (/year|amount|income|balance|salary|number.*of/.test(l)) return "number";
  if (raw === "PDFCheckBox") return "yes_no";
  if (raw === "PDFDropdown" || raw === "PDFRadioGroup") return "dropdown";
  if (/notes|details|description|reason|explain/.test(l)) return "textarea";
  return "text";
}

function humanize(name: string): string {
  return name
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function uniqueFieldId(name: string, index: number, seen: Record<string, number>): string {
  // Preserve the PDF field name verbatim when it is unique. Only when the same
  // raw name appears twice do we suffix; we still keep the original characters
  // (dots, brackets) so id round-trips back to pdf_field for the filler.
  const raw = name || `field_${index + 1}`;
  seen[raw] = (seen[raw] ?? 0) + 1;
  return seen[raw] === 1 ? raw : `${raw}#${seen[raw]}`;
}

async function extractAcroFields(pdfBytes: Uint8Array): Promise<FieldDef[]> {
  try {
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
    const form = pdf.getForm();
    const fields = form.getFields();
    const out: FieldDef[] = [];
    const seen: Record<string, number> = {};
    for (const [index, f] of fields.entries()) {
      const name = f.getName();
      const ctor = f.constructor.name;
      let options: string[] | undefined;
      try {
        if (ctor === "PDFDropdown" || ctor === "PDFRadioGroup") {
          // @ts-expect-error - getOptions exists on those subclasses
          options = f.getOptions?.();
        }
      } catch { /* ignore */ }
      let max_length: number | undefined;
      try {
        if (ctor === "PDFTextField") {
          // @ts-expect-error getMaxLength exists on PDFTextField
          const ml = f.getMaxLength?.();
          if (typeof ml === "number" && ml > 0) max_length = ml;
        }
      } catch { /* ignore */ }
      const label = humanize(name);
      out.push({
        id: uniqueFieldId(name, index, seen),
        pdf_field: name,
        label,
        type: inferType(name, ctor),
        options,
        max_length,
        mapping_key: mappingFor(label),
      });
    }
    return out;
  } catch (e) {
    console.error("AcroForm parse failed", e);
    return [];
  }
}

/** Extract the XFA template XML from a PDF (LiveCycle/dynamic XFA forms). */
async function extractXfaTemplateXml(pdfBytes: Uint8Array): Promise<string | null> {
  try {
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
    const lookup = (obj: unknown) => obj instanceof PDFRef ? pdf.context.lookup(obj) : obj;
    const acro = lookup(pdf.catalog.get(PDFName.of("AcroForm")));
    if (!(acro instanceof PDFDict)) return null;
    const xfa = lookup(acro.get(PDFName.of("XFA")));
    if (!xfa) return null;

    const decodeStream = (s: PDFStream): string => {
      try {
        if (s instanceof PDFRawStream) {
          const bytes = decodePDFRawStream(s).decode();
          return new TextDecoder().decode(bytes);
        }
      } catch (e) { console.warn("decode stream", e); }
      return "";
    };

    if (xfa instanceof PDFArray) {
      // Pairs of [name, stream]
      for (let i = 0; i < xfa.size(); i += 2) {
        const nameObj = lookup(xfa.get(i));
        const streamRef = lookup(xfa.get(i + 1));
        const nm = nameObj?.toString?.() ?? "";
        if (nm.includes("template") && streamRef instanceof PDFStream) {
          return decodeStream(streamRef);
        }
      }
      // Fallback: concat all streams
      let combined = "";
      for (let i = 1; i < xfa.size(); i += 2) {
        const s = lookup(xfa.get(i));
        if (s instanceof PDFStream) combined += decodeStream(s);
      }
      return combined || null;
    }
    if (xfa instanceof PDFStream) return decodeStream(xfa);
    return null;
  } catch (e) {
    console.error("XFA extract failed", e);
    return null;
  }
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

function trimPdfStreamBounds(bytes: Uint8Array, start: number, end: number): Uint8Array {
  let s = start;
  let e = end;
  if (bytes[s] === 13 && bytes[s + 1] === 10) s += 2;
  else if (bytes[s] === 10 || bytes[s] === 13) s += 1;
  if (bytes[e - 2] === 13 && bytes[e - 1] === 10) e -= 2;
  else if (bytes[e - 1] === 10 || bytes[e - 1] === 13) e -= 1;
  return bytes.subarray(s, e);
}

/** Raw stream scan fallback for malformed IRCC/LiveCycle PDFs whose object refs break pdf-lib. */
function extractXfaXmlByScanningStreams(pdfBytes: Uint8Array): string | null {
  const pdfText = bytesToText(pdfBytes);
  const candidates: string[] = [];
  let pos = 0;

  while (true) {
    const streamIdx = pdfText.indexOf("stream", pos);
    if (streamIdx < 0) break;
    const endIdx = pdfText.indexOf("endstream", streamIdx + 6);
    if (endIdx < 0) break;

    const dictStart = Math.max(0, pdfText.lastIndexOf("<<", streamIdx));
    const dictText = pdfText.slice(dictStart, streamIdx);
    const raw = trimPdfStreamBounds(pdfBytes, streamIdx + 6, endIdx);

    let decoded = raw;
    if (/\/FlateDecode\b/.test(dictText)) {
      try { decoded = inflate(raw); }
      catch { pos = endIdx + 9; continue; }
    }

    const text = new TextDecoder().decode(decoded);
    if (/<(?:\?xpacket|xdp:xdp|template\b|field\b)|xfa:datasets/.test(text)) {
      candidates.push(text);
    }
    pos = endIdx + 9;
  }

  if (candidates.length === 0) return null;
  const combined = candidates.join("\n");
  const start = combined.indexOf("<template");
  const end = combined.lastIndexOf("</template>");
  if (start >= 0 && end > start) return combined.slice(start, end + "</template>".length);
  return combined;
}

/** Match each <field ...> ... </field> block (fields don't nest in XFA template). */
function* iterateXfaFieldBlocks(xml: string): Generator<{ attrs: string; body: string }> {
  const open = /<field\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml)) !== null) {
    const attrs = m[1];
    const startBody = open.lastIndex;
    const closeRe = /<\/field\s*>/g;
    closeRe.lastIndex = startBody;
    const cm = closeRe.exec(xml);
    if (!cm) continue;
    yield { attrs, body: xml.slice(startBody, cm.index) };
    open.lastIndex = cm.index + cm[0].length;
  }
}

function getAttr(attrs: string, key: string): string {
  const m = new RegExp(`\\b${key}\\s*=\\s*"([^"]*)"`).exec(attrs);
  return m ? m[1] : "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function xfaFieldType(body: string, attrs: string): FieldDef["type"] {
  if (/<dateTimeEdit\b/.test(body)) return "date";
  if (/<choiceList\b/.test(body)) return "dropdown";
  if (/<numericEdit\b/.test(body)) return "number";
  if (/<checkButton\b/.test(body)) return "yes_no";
  if (/multiLine="1"/.test(body)) return "textarea";
  // Year / Month / Day numeric hints from name
  const name = getAttr(attrs, "name").toLowerCase();
  if (/year|month|day|amount|number|count/.test(name)) return "number";
  return "text";
}

function xfaCaption(body: string): string {
  const cap = /<caption\b[^>]*>([\s\S]*?)<\/caption\s*>/.exec(body);
  if (cap) {
    const t = /<text\b[^>]*>([\s\S]*?)<\/text\s*>/.exec(cap[1]);
    if (t) return decodeEntities(t[1]).replace(/\s+/g, " ").replace(/^\*+\s*/, "").trim();
  }
  const tt = /<toolTip\b[^>]*>([\s\S]*?)<\/toolTip\s*>/.exec(body);
  if (tt) return decodeEntities(tt[1]).replace(/\s+/g, " ").trim();
  return "";
}

function xfaOptions(body: string): string[] | undefined {
  const items = /<items\b[^>]*>([\s\S]*?)<\/items\s*>/.exec(body);
  if (!items) return undefined;
  const out: string[] = [];
  const re = /<text\b[^>]*>([\s\S]*?)<\/text\s*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(items[1])) !== null) {
    const v = decodeEntities(m[1]).trim();
    if (v) out.push(v);
  }
  return out.length ? out : undefined;
}

function extractXfaFields(xml: string): FieldDef[] {
  const out: FieldDef[] = [];
  const seen: Record<string, number> = {};
  let index = 0;
  for (const { attrs, body } of iterateXfaFieldBlocks(xml)) {
    const presence = getAttr(attrs, "presence");
    if (presence === "hidden" || presence === "invisible") continue;
    if (getAttr(attrs, "access") === "readOnly") continue;
    const name = getAttr(attrs, "name") || `field_${index + 1}`;
    const required = /<validate\b[^>]*\bnullTest="error"/.test(body);
    const caption = xfaCaption(body);
    const isButton = /<ui\b[^>]*>[\s\S]*?<button\b/.test(body) || /<button\b/.test(body);
    if (isButton) { index++; continue; }
    const type = xfaFieldType(body, attrs);
    if (type === "text" && /signature/i.test(name)) { index++; continue; }
    const label = caption || humanize(name);
    out.push({
      id: uniqueFieldId(name, index, seen),
      pdf_field: name,
      label: label.slice(0, 200),
      type,
      options: xfaOptions(body),
      required: required || /^\*/.test(caption),
      mapping_key: mappingFor(label),
    });
    index++;
  }
  return out;
}

function slugId(label: string, index: number, seen: Record<string, number>): string {
  const base = label.toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || `field_${index + 1}`;
  seen[base] = (seen[base] ?? 0) + 1;
  return seen[base] === 1 ? base : `${base}_${seen[base]}`;
}

function extractPdfLiteralStrings(block: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== "(") continue;
    let depth = 1;
    let raw = "";
    i++;
    for (; i < block.length; i++) {
      const ch = block[i];
      if (ch === "\\") {
        const n = block[++i] ?? "";
        raw += n === "n" || n === "r" ? "\n" : n === "t" ? "\t" : n;
      } else if (ch === "(") { depth++; raw += ch; }
      else if (ch === ")") { if (--depth === 0) break; raw += ch; }
      else raw += ch;
    }
    const text = raw.replace(/\s+/g, " ").trim();
    if (/[A-Za-z]/.test(text) && text.length <= 180) out.push(text);
  }
  return out;
}

function extractVisibleTextByScanningStreams(pdfBytes: Uint8Array): string {
  const pdfText = bytesToText(pdfBytes);
  const pieces: string[] = [];
  let pos = 0;
  while (true) {
    const streamIdx = pdfText.indexOf("stream", pos);
    if (streamIdx < 0) break;
    const endIdx = pdfText.indexOf("endstream", streamIdx + 6);
    if (endIdx < 0) break;
    const dictStart = Math.max(0, pdfText.lastIndexOf("<<", streamIdx));
    const dictText = pdfText.slice(dictStart, streamIdx);
    const raw = trimPdfStreamBounds(pdfBytes, streamIdx + 6, endIdx);
    let decoded = raw;
    if (/\/FlateDecode\b/.test(dictText)) {
      try { decoded = inflate(raw); }
      catch { pos = endIdx + 9; continue; }
    }
    const text = new TextDecoder("latin1").decode(decoded);
    if (/\bBT\b[\s\S]*\bET\b/.test(text)) pieces.push(...extractPdfLiteralStrings(text));
    pos = endIdx + 9;
  }
  return pieces.filter(Boolean).join("\n");
}

function extractFieldsFromVisibleText(text: string): FieldDef[] {
  const labels = Array.from(new Set(text.split(/\n+/)
    .map((line) => line.replace(/^\d+[.)]?\s*/, "").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3 && line.length <= 140)
    .filter((line) => /[A-Za-z]/.test(line))
    .filter((line) => !/^(page|protected|imm\s*\d+|application|office use|for official use|warning|privacy notice|barcode|signature|date signed)$/i.test(line))
    .filter((line) => /\?$|:$|name|date|birth|passport|uci|address|city|country|postal|phone|telephone|email|status|gender|sex|citizenship|nationality|occupation|employer|school|language|height|eye|married|spouse|children|father|mother|from|to|number|amount|fund|visit|permit|representative|client id/i.test(line))));

  const seen: Record<string, number> = {};
  return labels.slice(0, 120).map((label, index) => {
    const type = /\?$|^(have|has|are|is|do|does|did|will|can)\b/i.test(label)
      ? "yes_no"
      : inferType(label, "PDFTextField");
    const id = slugId(label, index, seen);
    return { id, pdf_field: id, label: label.replace(/[:：]$/, ""), type, mapping_key: mappingFor(label) };
  });
}

function field(id: string, label: string, type: FieldDef["type"] = "text", required = false, options?: string[]): FieldDef {
  return { id, pdf_field: id, label, type, required, options, mapping_key: mappingFor(label) };
}

function knownFormTemplate(form: { name?: string; code?: string | null; file_name?: string | null }): SectionDef[] | null {
  const key = `${form.code ?? ""} ${form.name ?? ""} ${form.file_name ?? ""}`.toLowerCase();
  if (!/imm\s*1295|1295|work permit made outside of canada|work permit/.test(key)) return null;
  return [
    { key: "personal", label: "Personal Details", fields: [
      field("uci", "UCI"),
      field("service_language", "I want service in", "dropdown", true, ["English", "French"]),
      field("family_name", "Family name (as shown on passport or travel document)", "text", true),
      field("given_names", "Given name(s) (as shown on passport or travel document)"),
      field("used_other_name", "Have you ever used any other name?", "yes_no"),
      field("other_family_name", "Other family name"),
      field("other_given_names", "Other given name(s)"),
      field("sex", "Sex", "dropdown", true, ["Female", "Male", "X"]),
      field("date_of_birth", "Date of birth", "date", true),
      field("place_of_birth_city", "Place of birth - City/Town", "text", true),
      field("place_of_birth_country", "Place of birth - Country or Territory", "text", true),
      field("citizenship", "Citizenship", "text", true),
      field("current_country", "Current country or territory of residence", "text", true),
      field("current_status", "Current residence status", "text", true),
      field("current_status_other", "Current residence status - Other"),
      field("current_status_from", "Current residence status from", "date"),
      field("current_status_to", "Current residence status to", "date"),
      field("previous_residence_over_six_months", "During the past five years, lived in another country for more than six months?", "yes_no"),
      field("previous_country", "Previous country or territory of residence"),
      field("previous_status", "Previous residence status"),
      field("previous_from", "Previous residence from", "date"),
      field("previous_to", "Previous residence to", "date"),
      field("applying_same_as_residence", "Country where applying is same as current residence?", "yes_no"),
      field("marital_status", "Current marital status", "dropdown", true, ["Annulled Marriage", "Common-Law", "Divorced", "Legally Separated", "Married", "Single", "Widowed"]),
      field("marriage_date", "Date married or entered common-law relationship", "date"),
      field("spouse_family_name", "Current spouse/common-law partner family name"),
      field("spouse_given_names", "Current spouse/common-law partner given name(s)"),
      field("previous_marriage", "Previously married or in a common-law relationship?", "yes_no"),
    ] },
    { key: "language_passport", label: "Languages, Passport and ID", fields: [
      field("native_language", "Native language/Mother tongue", "text", true),
      field("can_communicate_english_french", "Able to communicate in English and/or French?", "yes_no", true),
      field("most_at_ease_language", "Language most at ease", "dropdown", false, ["English", "French", "Both", "Neither"]),
      field("language_test_taken", "Taken a designated English or French language test?", "yes_no"),
      field("passport_number", "Passport number", "text", true),
      field("passport_country", "Country or territory of issue", "text", true),
      field("passport_issue_date", "Passport issue date", "date", true),
      field("passport_expiry", "Passport expiry date", "date", true),
      field("taiwan_mofa_passport", "Using a Taiwan Ministry of Foreign Affairs passport with personal ID number?", "yes_no"),
      field("israeli_national_passport", "Using an Israeli national passport?", "yes_no"),
      field("has_national_identity_document", "Do you have a national identity document?", "yes_no"),
      field("national_id_number", "National identity document number"),
      field("national_id_country", "National identity document country or territory of issue"),
      field("national_id_issue_date", "National identity document issue date", "date"),
      field("national_id_expiry_date", "National identity document expiry date", "date"),
      field("us_pr_card", "Lawful Permanent Resident of the United States with valid green card?", "yes_no"),
      field("us_pr_document_number", "US PR card document number"),
      field("us_pr_expiry_date", "US PR card expiry date", "date"),
    ] },
    { key: "contact", label: "Contact Information", fields: [
      field("mailing_po_box", "Mailing address - P.O. box"),
      field("mailing_apt_unit", "Mailing address - Apt/Unit"),
      field("mailing_street_no", "Mailing address - Street no."),
      field("mailing_street_name", "Mailing address - Street name", "text", true),
      field("mailing_city", "Mailing address - City/Town", "text", true),
      field("mailing_country", "Mailing address - Country or Territory", "text", true),
      field("mailing_province_state", "Mailing address - Province/State"),
      field("mailing_postal_code", "Mailing address - Postal code"),
      field("residential_same_as_mailing", "Residential address same as mailing address?", "yes_no"),
      field("residential_address", "Residential address", "textarea"),
      field("telephone_type", "Telephone type"),
      field("telephone_country_code", "Telephone country code"),
      field("telephone_number", "Telephone number"),
      field("telephone_ext", "Telephone extension"),
      field("alternate_telephone_number", "Alternate telephone number"),
      field("fax_number", "Fax number"),
      field("email_alt", "E-mail address"),
    ] },
    { key: "work_education_employment", label: "Work, Education and Employment", fields: [
      field("work_permit_type", "Type of work permit applying for", "text", true),
      field("employer_name", "Name of employer"),
      field("employer_address", "Complete address of employer", "textarea"),
      field("employment_province", "Intended location of employment - Province"),
      field("employment_city", "Intended location of employment - City/Town"),
      field("employment_address", "Intended location of employment - Address"),
      field("job_title", "Job title in Canada", "text", true),
      field("job_duties", "Brief description of duties", "textarea", true),
      field("employment_from", "Duration of expected employment - From", "date"),
      field("employment_to", "Duration of expected employment - To", "date"),
      field("lmia_or_offer_number", "LMIA No. or Offer of Employment No."),
      field("post_secondary_education", "Have you had any post secondary education?", "yes_no"),
      field("education_from", "Education from", "date"),
      field("education_to", "Education to", "date"),
      field("field_level_of_study", "Field and level of study"),
      field("school_name", "School/Facility name"),
      field("employment_history", "Employment history for the past 10 years", "multi_entry"),
    ] },
    { key: "background_signature", label: "Background Information and Signature", fields: [
      field("tb_contact", "Tuberculosis or close contact in past two years?", "yes_no"),
      field("health_services_required", "Physical or mental disorder requiring services during stay in Canada?", "yes_no"),
      field("health_details", "Health details", "textarea"),
      field("status_violation", "Remained beyond status, studied or worked without authorization in Canada?", "yes_no"),
      field("refused_visa_or_entry", "Refused visa/permit, denied entry, or ordered to leave any country?", "yes_no"),
      field("previously_applied_canada", "Previously applied to enter or remain in Canada?", "yes_no"),
      field("immigration_details", "Immigration history details", "textarea"),
      field("criminal_offence", "Committed, arrested for, charged with, or convicted of any criminal offence?", "yes_no"),
      field("criminal_details", "Criminal offence details", "textarea"),
      field("military_service", "Served in military, militia, civil defence, security organization or police force?", "yes_no"),
      field("military_details", "Military/service details", "textarea"),
      field("political_violence_association", "Member or associated with group advocating violence or criminal activity?", "yes_no"),
      field("witnessed_ill_treatment", "Witnessed or participated in ill treatment of prisoners/civilians, looting or desecration?", "yes_no"),
      field("ircc_contact_consent", "Consent to be contacted by IRCC in the future?", "yes_no"),
      field("signature_date", "Signature date", "date"),
    ] },
  ];
}

function buildSchemaFromFields(fields: FieldDef[]): SectionDef[] {
  const buckets: Record<string, FieldDef[]> = {
    personal: [], travel: [], education: [], employment: [],
    financial: [], family: [], form_specific: [],
  };
  for (const f of fields) {
    const key = classifySection(f.label);
    buckets[key].push(f);
  }
  const labels: Record<string, string> = {
    personal: "Personal Information",
    travel: "Travel History",
    education: "Education",
    employment: "Employment",
    financial: "Financial Information",
    family: "Family Details",
    form_specific: "Form-specific",
  };
  return Object.entries(buckets)
    .filter(([, arr]) => arr.length > 0)
    .map(([key, fs]) => ({ key, label: labels[key], fields: fs }));
}

/** Last-resort: ask Lovable AI (Gemini) to read the PDF visually and propose fields. */
async function extractFieldsWithAI(pdfBytes: Uint8Array, formName: string): Promise<FieldDef[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) { console.warn("LOVABLE_API_KEY missing — skipping AI fallback"); return []; }

  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < pdfBytes.length; i += chunk) {
    binary += String.fromCharCode(...pdfBytes.subarray(i, i + chunk));
  }
  const dataUrl = `data:application/pdf;base64,${btoa(binary)}`;

  const prompt =
    `You are reading a government visa application form titled "${formName}". ` +
    `List EVERY input field a person fills in. For each: name (machine_snake_case), ` +
    `label (exact text printed on the form, max 120 chars), ` +
    `type (text|textarea|date|number|dropdown|yes_no), ` +
    `options (only if dropdown/radio), required (boolean, true when marked with *). ` +
    `Skip signatures, barcodes, instructions, and read-only headings. Return STRICT JSON only.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "form_fields",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["fields"],
            properties: {
              fields: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "label", "type"],
                  properties: {
                    name: { type: "string" },
                    label: { type: "string" },
                    type: { type: "string", enum: ["text","textarea","date","number","dropdown","yes_no"] },
                    options: { type: "array", items: { type: "string" } },
                    required: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    console.error("AI fallback failed", res.status, await res.text());
    return [];
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  let parsed: { fields?: Array<{ name: string; label: string; type: FieldDef["type"]; options?: string[]; required?: boolean }> } = {};
  try { parsed = typeof content === "string" ? JSON.parse(content) : content; }
  catch (e) { console.error("AI JSON parse failed", e, String(content).slice(0, 400)); return []; }

  const seen: Record<string, number> = {};
  return (parsed.fields ?? []).map((f, i) => ({
    id: uniqueFieldId(f.name, i, seen),
    pdf_field: f.name,
    label: (f.label || humanize(f.name)).slice(0, 200),
    type: f.type,
    options: f.options?.length ? f.options : undefined,
    required: Boolean(f.required),
    mapping_key: mappingFor(f.label || f.name),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userResp } = await supabase.auth.getUser(token);
    if (!userResp.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const formId = String(body.form_id ?? "");
    if (!formId) {
      return new Response(JSON.stringify({ error: "form_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: form, error: formErr } = await supabase
      .from("visa_forms").select("*").eq("id", formId).maybeSingle();
    if (formErr || !form) {
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourcePath = form.source_pdf_path || form.file_path;
    const { data: file, error: dlErr } = await supabase.storage
      .from("visa-forms").download(sourcePath);
    if (dlErr || !file) {
      return new Response(JSON.stringify({ error: "Cannot read form file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const acro = await extractAcroFields(bytes);

    let detectedFields: FieldDef[] = acro;
    let detectedSections: SectionDef[] | null = null;
    let source: "acroform" | "xfa" | "text" | "template" | "ai" | "none" = "acroform";

    if (detectedFields.length < 3) {
      const xml = await extractXfaTemplateXml(bytes);
      if (xml) {
        const xfa = extractXfaFields(xml);
        console.log(`XFA fields detected for ${form.name}: ${xfa.length}`);
        if (xfa.length >= 3) { detectedFields = xfa; source = "xfa"; }
      }
    }

    if (detectedFields.length < 3) {
      const scannedXml = extractXfaXmlByScanningStreams(bytes);
      if (scannedXml) {
        const xfa = extractXfaFields(scannedXml);
        console.log(`Raw-scan XFA fields detected for ${form.name}: ${xfa.length}`);
        if (xfa.length >= 3) { detectedFields = xfa; source = "xfa"; }
      }
    }

    if (detectedFields.length < 3) {
      const visibleText = extractVisibleTextByScanningStreams(bytes);
      const textFields = extractFieldsFromVisibleText(visibleText);
      console.log(`Visible text fields detected for ${form.name}: ${textFields.length}`);
      if (textFields.length >= 3) { detectedFields = textFields; source = "text"; }
    }

    if (detectedFields.length < 3) {
      const templated = knownFormTemplate(form);
      if (templated) {
        detectedSections = templated;
        detectedFields = templated.flatMap((s) => s.fields);
        source = "template";
        console.log(`Known template fields detected for ${form.name}: ${detectedFields.length}`);
      }
    }

    if (detectedFields.length < 3) {
      console.log(`Falling back to AI vision for ${form.name}`);
      const ai = await extractFieldsWithAI(bytes, form.name);
      console.log(`AI fields detected for ${form.name}: ${ai.length}`);
      if (ai.length >= 3) { detectedFields = ai; source = "ai"; }
    }

    if (detectedFields.length < 3) {
      source = "none";
      return new Response(JSON.stringify({
        error: "No fields could be extracted automatically. The builder is ready for manual field creation.",
        acro_fields_detected: acro.length,
        total_fields_detected: detectedFields.length,
        source,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sections = detectedSections ?? buildSchemaFromFields(detectedFields);

    const mappings: Record<string, { table: string; column: string }> = {};
    for (const s of sections) {
      for (const f of s.fields) {
        if (f.mapping_key && PROFILE_KEYS.includes(f.mapping_key)) {
          mappings[f.id] = { table: "client_profile", column: f.mapping_key };
        }
      }
    }

    const { data: existing } = await supabase
      .from("questionnaire_schemas").select("id, version")
      .eq("form_id", formId).order("version", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = existing ? (existing.version as number) + 1 : 1;

    const { data: inserted, error: insErr } = await supabase
      .from("questionnaire_schemas")
      .insert({
        form_id: formId,
        name: `${form.name} questionnaire`,
        country: form.country,
        category: form.category,
        version: nextVersion,
        sections,
        mappings,
        is_active: false,
        is_draft: true,
        generated_by_ai: true,
        created_by: userResp.user.id,
      })
      .select().single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      schema: inserted,
      acro_fields_detected: acro.length,
      total_fields_detected: detectedFields.length,
      source,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("parse-form-fields error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});