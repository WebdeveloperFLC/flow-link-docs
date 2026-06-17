#!/usr/bin/env node
/**
 * Phase 1 — Export Canada Student Visa service record for external review.
 * Read-only. Does not modify content/service-library/canada-student-visa.json.
 *
 * Usage: node scripts/export-canada-student-visa.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "content/service-library/canada-student-visa.json");
const REPORTS = path.join(ROOT, "reports");

const LIBRARY_ID = "c35e6051-f40f-47bf-9cac-0a386c47a336";
const SLUG = "canada-student-visa";

/** DB / migration-sourced records (repo seeds — live Supabase not queried). */
const SUPPLEMENTARY_DB_RECORDS = {
  _note:
    "The following blocks are defined in Supabase migrations in this repo. Live production values may differ if Admin was edited after publish. academy_metadata primary source is content/service-library/canada-student-visa.json.",
  service_library_row: {
    id: LIBRARY_ID,
    service_category: "visa_immigration",
    service: "Canada",
    sub_service: "Student Visa (Study Permit — Outside Canada)",
    countries: ["Canada"],
    process_flow: null,
    cost_summary_html: null,
    checklist_text: null,
    internal_sop_html: null,
    quick_guide_what_to_do: null,
    quick_guide_common_mistakes: null,
    quick_guide_escalation_rules: null,
    quick_guide_important_reminders: null,
    _source:
      "process_flow, cost_summary_html, quick_guide_*, checklist_text, internal_sop_html are DB columns on service_library — not present in repo JSON; no canada-student-specific seed found for these fields in migrations.",
  },
  service_library_fee_items: [
    {
      fee_label: "Government fee",
      amount: "150",
      currency: "CAD",
      country: "Canada",
      display_order: 10,
      notes: "+ biometrics if applicable",
      _migration: "supabase/migrations/20260610210000_canada_govt_fees.sql",
    },
    {
      fee_label: "Consultancy fee (INR)",
      amount: "10,000",
      currency: "INR",
      country: "Canada",
      display_order: 50,
      notes: "From rate — see lead form for packages",
      _migration: "supabase/migrations/20260610170000_canada_visa_consultancy_fees.sql",
    },
    {
      fee_label: "Consultancy fee (CAD)",
      amount: "147",
      currency: "CAD",
      country: "Canada",
      display_order: 51,
      notes: "From rate — see lead form for packages",
      _migration: "supabase/migrations/20260610170000_canada_visa_consultancy_fees.sql",
    },
  ],
  service_library_picker_variants: [
    {
      variant_key: "fresh-outside",
      picker_label: "Canada Student Visa (Fresh, Outside India)",
      group_label: "Student Visa",
      fee_inr: 15000,
      fee_cad: 225,
      govt_amount: 150,
      govt_currency: "CAD",
      govt_fee_inr: 9195,
      govt_fee_cad: 150,
      display_order: 30,
      _migration: "20260610170000_canada_visa_consultancy_fees.sql + 20260610210000_canada_govt_fees.sql",
    },
    {
      variant_key: "rejected-outside",
      picker_label: "Canada Student Visa (Rejected Case, Outside India)",
      group_label: "Student Visa",
      fee_inr: 35000,
      fee_cad: 515,
      govt_amount: 150,
      govt_currency: "CAD",
      display_order: 40,
    },
    {
      variant_key: "fresh-india",
      picker_label: "Canada Student Visa (From India — Fresh Case)",
      group_label: "Student Visa",
      fee_inr: 10000,
      fee_cad: 147,
      govt_amount: 150,
      govt_currency: "CAD",
      display_order: 50,
    },
    {
      variant_key: "rejected-india",
      picker_label: "Canada Student Visa (From India — Rejected Case)",
      group_label: "Student Visa",
      fee_inr: 10000,
      fee_cad: 147,
      govt_amount: 150,
      govt_currency: "CAD",
      display_order: 60,
    },
  ],
  service_library_submission_checklist: [
    { item_key: "letter_of_acceptance_loa_from_dli", item_label: "Letter of acceptance (LOA) from DLI", is_mandatory: true, sort_order: 1 },
    { item_key: "proof_of_financial_support_tuition_living", item_label: "Proof of financial support (tuition + living)", is_mandatory: true, sort_order: 2 },
    { item_key: "language_proficiency_sds", item_label: "Language proficiency (SDS)", is_mandatory: true, sort_order: 3 },
    { item_key: "biometrics_completed", item_label: "Biometrics completed", is_mandatory: true, sort_order: 4 },
    { item_key: "medical_exam_if_required", item_label: "Medical exam (if required)", is_mandatory: true, sort_order: 5 },
    { item_key: "no_criminal_immigration_misrepresentation", item_label: "No criminal / immigration misrepresentation", is_mandatory: true, sort_order: 6 },
    { item_key: "genuine_student_ties_to_home_country", item_label: "Genuine student / ties to home country", is_mandatory: true, sort_order: 7 },
    { item_key: "fees_collected", item_label: "Fees collected (consultancy + government)", is_mandatory: true, sort_order: 8 },
    { item_key: "client_approval_received", item_label: "Client approval on final file", is_mandatory: true, sort_order: 9 },
    { item_key: "quality_review_completed", item_label: "Quality review sign-off", is_mandatory: true, sort_order: 10 },
    { item_key: "submission_approved", item_label: "Submission approved & lodged", is_mandatory: true, sort_order: 11 },
  ],
  service_library_visa_form_files: [
    { form_code: "IMM 1294", file_name: "Application for Study Permit Made Outside of Canada", file_path: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm1294e.pdf", sort_order: 1, notes: "Primary study permit application — complete online via IRCC portal when applying digitally" },
    { form_code: "IMM 5645", file_name: "Family Information", file_path: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5645e.pdf", sort_order: 2, notes: "Required for many countries including India" },
    { form_code: "IMM 5707", file_name: "Family Information (Extended)", file_path: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5707e.pdf", sort_order: 3, notes: "Use when IMM 5645 does not apply to applicant country" },
    { form_code: "IRCC Portal", file_name: "IRCC secure account — apply online", file_path: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html", sort_order: 4, notes: "Most study permit applications are submitted online" },
  ],
  service_library_checklist_files: [
    {
      file_name: "Canada – Student Visa (Study Permit — Outside Canada) — Document Checklist.html",
      file_path: "/specimens/checklists/canada-student-visa.html",
      mime_type: "text/html",
      size_bytes: 116571,
      version: 1,
      notes: "Future Link branded checklist — fields auto-fill when linked to client",
    },
  ],
  stage_pipeline: {
    id: "c3000001-0001-4000-8000-f69c28e543f3",
    name: "Canada Study Visa",
    country: "Canada",
    description: "Auto-seeded pipeline for canada-student-visa",
    _migration: "supabase/migrations/20260617100000_seed_stage_pipelines.sql",
  },
};

function mdSection(title, body) {
  return `## ${title}\n\n${body}\n`;
}

function mdJsonBlock(obj) {
  return "```json\n" + JSON.stringify(obj, null, 2) + "\n```\n";
}

function buildMarkdown(meta, exportDoc) {
  const lines = [];
  lines.push("# Canada Student Visa — Complete Service Content Export");
  lines.push("");
  lines.push("**Phase 1 — Content extraction for external review**");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Service name | ${meta.displayName} |`);
  lines.push(`| Service ID | \`${LIBRARY_ID}\` |`);
  lines.push(`| Slug | \`${SLUG}\` |`);
  lines.push(`| Source file | \`content/service-library/canada-student-visa.json\` |`);
  lines.push(`| Exported at | ${exportDoc.exportedAt} |`);
  lines.push(`| Record type | \`service_library.academy_metadata\` + supplementary DB seeds |`);
  lines.push("");
  lines.push("> No content was modified. Full `academy_metadata` is reproduced below without omission.");
  lines.push("> DB-only columns and live Supabase state were not queried; supplementary records are from repo migrations.");
  lines.push("");

  lines.push(mdSection("Overview", [
    `**displayName:** ${meta.displayName}`,
    `**shortDescription:** ${meta.shortDescription}`,
    `**version:** ${meta.version}`,
    `**versionStatus:** ${meta.versionStatus}`,
    `**reviewStatus:** ${meta.reviewStatus}`,
    `**updatedLabel:** ${meta.updatedLabel}`,
    `**learningLevel:** ${meta.learningLevel}`,
    `**learningMinutes:** ${meta.learningMinutes}`,
    `**navBucket:** ${meta.navBucket}`,
    "",
    "### Tags",
    mdJsonBlock(meta.tags),
    "### Chips",
    mdJsonBlock(meta.chips),
    "### KPIs",
    mdJsonBlock(meta.kpis),
    "### Performance",
    mdJsonBlock(meta.performance),
    "### Approval factors",
    mdJsonBlock(meta.approvalFactors),
  ].join("\n")));

  lines.push(mdSection("Policy alerts & banners", mdJsonBlock({ policyAlert: meta.policyAlert, alert: meta.alert, redFlagsBanner: meta.redFlagsBanner })));
  lines.push(mdSection("About", mdJsonBlock(meta.about)));
  lines.push(mdSection("Eligibility", mdJsonBlock(meta.eligibility)));
  lines.push(mdSection("Required documents (eligibility criteria + submission checklist + sample docs)", [
    "### Eligibility criteria (document-related)",
    mdJsonBlock(meta.eligibility),
    "### Submission checklist (DB seed — service_library_submission_checklist)",
    mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_submission_checklist),
    "### Sample documents (metadata)",
    mdJsonBlock(meta.sampleDocs),
    "### KPI: Required docs count",
    meta.kpis?.find((k) => /required docs/i.test(k.label)) ? mdJsonBlock(meta.kpis.find((k) => /required docs/i.test(k.label))) : "_Not set_",
  ].join("\n")));
  lines.push(mdSection("Process flow", [
    "### Timeline (academy_metadata.timeline)",
    mdJsonBlock(meta.timeline),
    "### process_flow (DB column)",
    "`null` — not set in repo JSON; no canada-student-specific `process_flow` seed found in migrations.",
  ].join("\n")));
  lines.push(mdSection("Timeline", mdJsonBlock(meta.timeline)));
  lines.push(mdSection("Government fees", [
    "### KPI",
    mdJsonBlock(meta.kpis?.filter((k) => /government fee/i.test(k.label))),
    "### fullCostBreakdown — Government & visa fees section",
    mdJsonBlock(meta.fullCostBreakdown?.sections?.find((s) => s.id === "fees")),
    "### service_library_fee_items (DB seed)",
    mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_fee_items.filter((f) => f.fee_label === "Government fee")),
    "### Picker variant government amounts",
    mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_picker_variants.map((v) => ({
      variant_key: v.variant_key,
      govt_amount: v.govt_amount,
      govt_currency: v.govt_currency,
      govt_fee_inr: v.govt_fee_inr,
      govt_fee_cad: v.govt_fee_cad,
    }))),
  ].join("\n")));
  lines.push(mdSection("Consultancy fees", [
    "### KPI",
    mdJsonBlock(meta.kpis?.filter((k) => /consultancy fee/i.test(k.label))),
    "### service_library_picker_variants (DB seed)",
    mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_picker_variants),
    "### service_library_fee_items — consultancy (DB seed)",
    mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_fee_items.filter((f) => f.fee_label.startsWith("Consultancy"))),
    "### fullCostBreakdown — miscellaneous (consultancy line)",
    mdJsonBlock(meta.fullCostBreakdown?.sections?.find((s) => s.id === "misc")),
  ].join("\n")));
  lines.push(mdSection("Cost breakdown (full)", mdJsonBlock(meta.fullCostBreakdown)));
  lines.push(mdSection("FAQs (complete — all 30)", mdJsonBlock(meta.faqs)));
  lines.push(mdSection("Red flags (complete)", mdJsonBlock(meta.redFlags)));
  lines.push(mdSection("Pro tips", mdJsonBlock(meta.proTips)));
  lines.push(mdSection("Compliance", mdJsonBlock(meta.compliance)));
  lines.push(mdSection("Do's & don'ts / counsellor guidance", mdJsonBlock(meta.donts)));
  lines.push(mdSection("Resources (official links)", mdJsonBlock(meta.resources)));
  lines.push(mdSection("Working rights — applicant", mdJsonBlock(meta.workingRights?.applicant)));
  lines.push(mdSection("Working rights — spouse", mdJsonBlock(meta.workingRights?.spouse)));
  lines.push(mdSection("Post-study options / post-approval", mdJsonBlock({ postApproval: meta.postApproval, workingRightsApplicantPgwpNote: meta.workingRights?.applicant?.details })));
  lines.push(mdSection("Sample documents (complete)", mdJsonBlock(meta.sampleDocs)));
  lines.push(mdSection("Verification information", mdJsonBlock({
    updatedLabel: meta.updatedLabel,
    policyAlert: meta.policyAlert,
    feeBreakdown: meta.feeBreakdown ?? null,
    consultancyBreakdown: meta.consultancyBreakdown ?? null,
    fullCostBreakdown_lastVerified: meta.fullCostBreakdown?.lastVerified,
    fullCostBreakdown_disclaimer: meta.fullCostBreakdown?.disclaimer,
    fullCostBreakdown_sourceUrl: meta.fullCostBreakdown?.sourceUrl,
    workingRights_applicant_lastVerified: meta.workingRights?.applicant?.lastVerified,
    workingRights_spouse_lastVerified: meta.workingRights?.spouse?.lastVerified,
  })));
  lines.push(mdSection("Internal notes (staffNotes)", mdJsonBlock(meta.staffNotes)));
  lines.push(mdSection("Changelog", mdJsonBlock(meta.changelog)));
  lines.push(mdSection("Related services", mdJsonBlock(meta.relatedServices)));
  lines.push(mdSection("Quiz (complete — all 75 questions)", mdJsonBlock(meta.quiz)));
  lines.push(mdSection("Visa forms (DB seed)", mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_visa_form_files)));
  lines.push(mdSection("Checklist PDF / HTML (DB seed)", mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_checklist_files)));
  lines.push(mdSection("Stage pipeline (DB seed)", mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.stage_pipeline)));
  lines.push(mdSection("Supplementary DB record notes", mdJsonBlock(SUPPLEMENTARY_DB_RECORDS.service_library_row)));
  lines.push(mdSection("Complete academy_metadata (raw JSON — exact copy)", mdJsonBlock(meta)));

  return lines.join("\n");
}

const meta = JSON.parse(fs.readFileSync(SRC, "utf8"));
const exportDoc = {
  exportedAt: new Date().toISOString(),
  phase: "Phase 1 — Canada Student Visa Content Extraction",
  serviceName: meta.displayName,
  serviceId: LIBRARY_ID,
  slug: SLUG,
  sourceFile: "content/service-library/canada-student-visa.json",
  academy_metadata: meta,
  supplementary_db_records: SUPPLEMENTARY_DB_RECORDS,
};

fs.mkdirSync(REPORTS, { recursive: true });
const jsonOut = path.join(REPORTS, "canada-student-visa-full-export.json");
const mdOut = path.join(REPORTS, "canada-student-visa-full-export.md");
const rawOut = path.join(REPORTS, "canada-student-visa-academy-metadata.raw.json");

fs.writeFileSync(jsonOut, JSON.stringify(exportDoc, null, 2));
fs.writeFileSync(rawOut, JSON.stringify(meta, null, 2));
fs.writeFileSync(mdOut, buildMarkdown(meta, exportDoc));

console.log(`Wrote ${mdOut}`);
console.log(`Wrote ${jsonOut}`);
console.log(`Wrote ${rawOut}`);
