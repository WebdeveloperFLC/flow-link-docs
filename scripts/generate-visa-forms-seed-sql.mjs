#!/usr/bin/env node
/**
 * Seed visa_forms + questionnaire_schemas stubs for Forms Library × ClientDetail.
 * Categories align with deriveFormsCategory() in src/lib/service-library/formsCategory.ts
 *
 *   node scripts/generate-visa-forms-seed-sql.mjs
 */
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const OUT = path.join(process.cwd(), "supabase/migrations/20260617110000_seed_visa_forms_catalog.sql");

const COUNTRIES = [
  "Canada",
  "Australia",
  "Germany",
  "United Kingdom",
  "United States",
  "New Zealand",
  "Poland",
  "Hungary",
  "Latvia",
  "Singapore",
  "Finland",
  "France",
  "Italy",
  "Netherlands",
  "Ireland",
  "UAE",
];

const CATEGORIES = [
  { category: "Study Visa", forms: [{ code: "INTAKE", name: "Client intake questionnaire" }] },
  {
    category: "Visitor Visa",
    forms: [{ code: "INTAKE", name: "Visitor intake questionnaire" }],
  },
  {
    category: "Work Permit",
    forms: [
      { code: "INTAKE", name: "Work permit intake questionnaire" },
      { code: "IMM 5710", name: "IMM 5710 — Change conditions / extend stay as worker (Canada)" },
    ],
  },
  {
    category: "Spousal Sponsorship",
    forms: [{ code: "INTAKE", name: "Family reunification intake questionnaire" }],
  },
  {
    category: "Permanent Residency",
    forms: [{ code: "INTAKE", name: "PR intake questionnaire" }],
  },
];

const CANADA_EXTRA = [
  { category: "Study Visa", code: "IMM 1294", name: "IMM 1294 — Application for Study Permit Made Outside Canada" },
  { category: "Visitor Visa", code: "IMM 5257", name: "IMM 5257 — Application for Visitor Visa (Temporary Resident Visa)" },
];

function uuid(country, category, code) {
  const hex = createHash("md5").update(`visa_form:${country}:${category}:${code}`).digest("hex").slice(0, 12);
  return `d4000001-0001-4000-8000-${hex}`;
}

function schemaUuid(formId) {
  const hex = createHash("md5").update(`schema:${formId}`).digest("hex").slice(0, 12);
  return `d4000002-0001-4000-8000-${hex}`;
}

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const intakeSections = (label) =>
  JSON.stringify([
    {
      key: "personal",
      label: "Personal details",
      fields: [
        { id: "full_name", label: "Full name (as in passport)", type: "text", required: true, mapping_key: "full_name" },
        { id: "date_of_birth", label: "Date of birth", type: "date", required: true, mapping_key: "date_of_birth" },
        { id: "passport_number", label: "Passport number", type: "text", required: true, mapping_key: "passport_number" },
        { id: "passport_expiry", label: "Passport expiry", type: "date", required: true, mapping_key: "passport_expiry" },
        { id: "email_alt", label: "Email address", type: "text", required: true, mapping_key: "email_alt" },
        { id: "phone_alt", label: "Phone number", type: "text", mapping_key: "phone_alt" },
      ],
    },
    {
      key: "case_notes",
      label: label,
      fields: [
        { id: "case_summary", label: "Brief case summary", type: "textarea", required: true },
        { id: "prior_refusals", label: "Any prior visa refusals?", type: "yes_no", required: true },
        { id: "counselor_notes", label: "Counselor notes", type: "textarea" },
      ],
    },
  ]);

const lines = [
  "-- Forms Library catalog: visa_forms + active questionnaire_schemas (intake stubs).",
  "-- Upload official PDFs via Masters → Forms Library; run parse-form-fields for IRCC forms.",
  "-- Regenerate: node scripts/generate-visa-forms-seed-sql.mjs",
  "",
];

for (const country of COUNTRIES) {
  const catList = country === "Canada" ? [...CATEGORIES.map((c) => ({ ...c, forms: [...c.forms] }))] : CATEGORIES;
  if (country === "Canada") {
    for (const extra of CANADA_EXTRA) {
      const cat = catList.find((c) => c.category === extra.category);
      if (cat && !cat.forms.some((f) => f.code === extra.code)) cat.forms.push(extra);
    }
  }

  for (const { category, forms } of catList) {
    for (const form of forms) {
      const formId = uuid(country, category, form.code);
      const schemaId = schemaUuid(formId);
      const filePath = `${country}/${category}/${form.code.replace(/\s+/g, "_")}_placeholder.pdf`;
      const isCanadaIrcc = country === "Canada" && form.code.startsWith("IMM");
      const sectionLabel = `${category} — ${country}`;

      lines.push(`-- ${country} · ${category} · ${form.name}`);
      lines.push("DO $$");
      lines.push("BEGIN");
      lines.push("  INSERT INTO public.visa_forms (");
      lines.push("    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes");
      lines.push("  ) VALUES (");
      lines.push(
        `    '${formId}'::uuid, ${sqlStr(country)}, ${sqlStr(category)}, ${sqlStr(form.name)}, ${sqlStr(form.code)}, 1,`,
      );
      lines.push(`    ${sqlStr(filePath)}, ${sqlStr(`${form.code}_placeholder.pdf`)}, true, true, 'manual',`);
      lines.push(
        `    ${sqlStr(isCanadaIrcc ? "Upload official IRCC PDF then run Generate questionnaire in Form Builder." : "Intake questionnaire — upload official embassy PDF when available.")}`,
      );
      lines.push("  )");
      lines.push("  ON CONFLICT (id) DO UPDATE SET");
      lines.push("    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;");
      lines.push("");
      lines.push("  INSERT INTO public.questionnaire_schemas (");
      lines.push("    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai");
      lines.push("  ) VALUES (");
      lines.push(
        `    '${schemaId}'::uuid, '${formId}'::uuid, ${sqlStr(form.name)}, 1, '${intakeSections(sectionLabel).replace(/'/g, "''")}'::jsonb, '{}'::jsonb, true, false, false`,
      );
      lines.push("  )");
      lines.push("  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;");
      lines.push("");
      lines.push(`  UPDATE public.visa_forms SET published_schema_id = '${schemaId}'::uuid WHERE id = '${formId}'::uuid;`);
      lines.push("END $$;");
      lines.push("");
    }
  }
}

fs.writeFileSync(OUT, lines.join("\n"));
console.log(`Wrote ${OUT}`);
