import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, PDFArray, PDFDict, PDFName, PDFStream, PDFRawStream, decodePDFRawStream } from "https://esm.sh/pdf-lib@1.17.1";

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
  const base = name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "") || `field_${index + 1}`;
  seen[base] = (seen[base] ?? 0) + 1;
  return seen[base] === 1 ? base : `${base}_${seen[base]}`;
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
      const label = humanize(name);
      out.push({
        id: uniqueFieldId(name, index, seen),
        pdf_field: name,
        label,
        type: inferType(name, ctor),
        options,
        mapping_key: mappingFor(label),
      });
    }
    return out;
  } catch (e) {
    console.error("AcroForm parse failed", e);
    return [];
  }
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

const DEFAULT_SECTIONS: SectionDef[] = [
  {
    key: "personal", label: "Personal Information", fields: [
      { id: "full_name", label: "Full legal name", type: "text", required: true },
      { id: "date_of_birth", label: "Date of birth", type: "date", required: true, mapping_key: "date_of_birth" },
      { id: "gender", label: "Gender", type: "dropdown", options: ["Male","Female","Other"], mapping_key: "gender" },
      { id: "nationality", label: "Nationality", type: "text", mapping_key: "nationality" },
      { id: "passport_number", label: "Passport number", type: "text", mapping_key: "passport_number" },
      { id: "passport_expiry", label: "Passport expiry", type: "date", mapping_key: "passport_expiry" },
      { id: "marital_status", label: "Marital status", type: "dropdown", options: ["Single","Married","Divorced","Widowed"], mapping_key: "marital_status" },
      { id: "address_line1", label: "Address", type: "text", mapping_key: "address_line1" },
      { id: "address_city", label: "City", type: "text", mapping_key: "address_city" },
      { id: "address_country", label: "Country", type: "text", mapping_key: "address_country" },
      { id: "phone_alt", label: "Phone", type: "text", mapping_key: "phone_alt" },
      { id: "email_alt", label: "Email", type: "text", mapping_key: "email_alt" },
    ],
  },
  {
    key: "travel", label: "Travel History", fields: [
      { id: "travel_history", label: "Previous trips", type: "multi_entry", repeatable: true },
    ],
  },
  {
    key: "education", label: "Education", fields: [
      { id: "highest_qualification", label: "Highest qualification", type: "text", mapping_key: "highest_qualification" },
      { id: "institution_name", label: "Institution", type: "text", mapping_key: "institution_name" },
      { id: "graduation_year", label: "Graduation year", type: "number", mapping_key: "graduation_year" },
    ],
  },
  {
    key: "employment", label: "Employment", fields: [
      { id: "employer_name", label: "Employer", type: "text", mapping_key: "employer_name" },
      { id: "job_title", label: "Job title", type: "text", mapping_key: "job_title" },
      { id: "annual_income", label: "Annual income", type: "number", mapping_key: "annual_income" },
    ],
  },
  {
    key: "financial", label: "Financial Information", fields: [
      { id: "bank_name", label: "Bank", type: "text", mapping_key: "bank_name" },
      { id: "account_balance", label: "Account balance", type: "number", mapping_key: "account_balance" },
    ],
  },
  {
    key: "family", label: "Family Details", fields: [
      { id: "family_members", label: "Family members", type: "multi_entry", repeatable: true },
    ],
  },
];

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

    const { data: file, error: dlErr } = await supabase.storage
      .from("visa-forms").download(form.file_path);
    if (dlErr || !file) {
      return new Response(JSON.stringify({ error: "Cannot read form file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const acro = await extractAcroFields(bytes);

    let sections: SectionDef[];
    if (acro.length >= 3) {
      sections = buildSchemaFromFields(acro);
    } else {
      console.log(`No AcroForm fields detected for ${form.name}, using defaults.`);
      sections = DEFAULT_SECTIONS;
    }

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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("parse-form-fields error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});