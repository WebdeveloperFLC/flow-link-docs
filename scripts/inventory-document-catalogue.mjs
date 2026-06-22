#!/usr/bin/env node
/**
 * Full document name inventory across Service Library, binders, workflow templates,
 * and document_types catalogue. Read-only analysis — no DB required.
 *
 *   node scripts/inventory-document-catalogue.mjs
 *   node scripts/inventory-document-catalogue.mjs --json > /tmp/inventory.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildFromService, listServiceFiles } from "./lib/build-checklist-from-service.mjs";
import { DOCUMENT_MASTER_CODES } from "./lib/document-master-codes.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content/service-library");
const CHECKLIST_DIR = path.join(ROOT, "public/specimens/checklists");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

/** @type {Map<string, { code: string, label: string }>} */
const CATALOGUE = new Map([
  ["passport", "Passport"],
  ["birth_certificate", "Birth Certificate"],
  ["sop", "SOP"],
  ["resume", "Resume"],
  ["academic_transcripts", "Academic Transcripts"],
  ["financial_documents", "Financial Documents"],
  ["visa_forms", "Visa Forms"],
  ["offer_letter", "Offer Letter"],
  ["gic_certificate", "GIC Certificate"],
  ["tuition_fee_receipt", "Tuition Fee Receipt"],
  ["medical_report", "Medical Report"],
  ["ielts_language_test", "IELTS / Language Test"],
  ["photograph", "Photograph"],
  ["marriage_certificate", "Marriage Certificate"],
  ["divorce_certificate", "Divorce Certificate"],
  ["police_clearance", "Police Clearance"],
  ["affidavit_of_support", "Affidavit of Support"],
  ["sponsorship_letter", "Sponsorship Letter"],
  ["property_documents", "Property Documents"],
  ["employment_letter", "Employment Letter"],
  ["experience_letter", "Experience Letter"],
  ["noc", "No Objection Certificate"],
  ["other", "Other"],
]);

/** Codes referenced in category metadata migration but not seeded. */
const METADATA_ONLY_CODES = [
  "marksheet_10", "marksheet_12", "degree_certificate", "relationship_proof",
  "bank_statement", "salary_slips", "visa_refusal", "refusal_letter",
  "travel_history", "cover_letter", "statement_of_purpose",
];

const MILESTONE_PATTERNS = [
  /fee paid/i, /receipt saved/i, /checklist signed/i, /qa sign/i,
  /quality review/i, /application lodged/i, /confirmation.*reference/i,
  /biometrics completed/i, /application submitted/i, /aor received/i,
  /medical passed/i, /passport request/i, /visa issued/i,
];

const ELIGIBILITY_PATTERNS = [
  /requirement$/i, /demonstrated$/i, /documented$/i, /proven$/i,
  /capacity/i, /eligible/i, /genuine student/i, /genuine temporary/i,
  /strong ties/i, /financial capacity/i, /no undeclared/i, /inadmissibility/i,
  /qualif/i, /met$/i, /satisfied/i,
];

const RED_FLAG_PATTERNS = [
  /weak /i, /insufficient/i, /not disclosed/i, /gaps/i, /issues/i,
  /mismatch/i, /expiring soon/i, /inconsistent/i, /thin /i,
  /recent marriage/i, /prior refusal/i, /principal applicant not/i,
];

function normLabel(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugCode(label) {
  return normLabel(label).replace(/\s+/g, "_").slice(0, 48) || "item";
}

function isMilestone(name, sectionTitle = "") {
  const n = `${sectionTitle} ${name}`;
  return MILESTONE_PATTERNS.some((p) => p.test(n))
    || /fees.*submission/i.test(sectionTitle);
}

function classifyNonUpload(name, sectionTitle = "") {
  if (isMilestone(name, sectionTitle)) return "milestone";
  const sec = sectionTitle.toLowerCase();
  if (sec.includes("eligibility") || sec.includes("core documents")) {
    if (ELIGIBILITY_PATTERNS.some((p) => p.test(name))) return "eligibility_assessment";
  }
  if (sec.includes("common issues") || sec.includes("verify before")) {
    return "red_flag_guidance";
  }
  if (ELIGIBILITY_PATTERNS.some((p) => p.test(name))) return "eligibility_assessment";
  if (RED_FLAG_PATTERNS.some((p) => p.test(name))) return "red_flag_guidance";
  return null;
}

function matchCatalogue(label) {
  const n = normLabel(label);
  for (const [code, catLabel] of CATALOGUE) {
    if (normLabel(catLabel) === n) return code;
  }
  // Conservative contains-match for clear document phrases only
  const rules = [
    [/^passport size photo|^photograph|^passport photo/i, "photograph"],
    [/^passport$|^valid passport|^passport copy|^passport bio/i, "passport"],
    [/^marriage certificate|^valid marriage certificate/i, "marriage_certificate"],
    [/^birth certificate/i, "birth_certificate"],
    [/^academic transcript/i, "academic_transcripts"],
    [/^bank statement|^proof of funds|^financial document/i, "financial_documents"],
    [/^ielts|^language test|^english test|^toefl|^pte /i, "ielts_language_test"],
    [/^offer letter|^letter of acceptance|^enrollment letter|^coe |^confirmation of enrolment/i, "offer_letter"],
    [/^gic |^blocked account|^sperrkonto/i, "gic_certificate"],
    [/^tuition fee|^fee receipt/i, "tuition_fee_receipt"],
    [/^police clearance|^pcc /i, "police_clearance"],
    [/^employment letter|^experience letter|^noc |^no objection/i, "employment_letter"],
    [/^sop$|^statement of purpose|^study plan/i, "sop"],
    [/^resume$|^cv /i, "resume"],
    [/^visa application form|^application form complete/i, "visa_forms"],
    [/^medical report|^medical exam|^health insurance|^oshc/i, "medical_report"],
    [/^sponsorship letter|^invitation letter|^affidavit of support/i, "affidavit_of_support"],
    [/^property document|^property valuation/i, "property_documents"],
    [/^divorce certificate/i, "divorce_certificate"],
    [/^travel itinerary|^travel history/i, "travel_history"],
    [/^refusal letter|^visa refusal/i, "visa_refusal"],
    [/^degree certificate|^marksheet|^10th |^12th /i, "degree_certificate"],
  ];
  for (const [pat, code] of rules) {
    if (pat.test(label)) {
      if (CATALOGUE.has(code) || METADATA_ONLY_CODES.includes(code)) return code;
      return code; // proposed code match
    }
  }
  return null;
}

/** @param {string} label @param {string} [section] */
function inferBucket(label, section = "") {
  const nonUpload = classifyNonUpload(label, section);
  if (nonUpload) return nonUpload;
  const code = matchCatalogue(label);
  if (code) return "upload_document";
  return "missing_catalogue_candidate";
}

/** @typedef {{ label: string, sources: Set<string>, sections: Set<string>, services: Set<string>, buckets: Set<string>, suggestedCode: string|null, catalogueCode: string|null }} Entry */

/** @type {Map<string, Entry>} */
const byNorm = new Map();

/** @param {string} label @param {object} ctx */
function record(label, ctx) {
  const trimmed = String(label ?? "").trim();
  if (!trimmed || trimmed.length < 3) return;
  const key = normLabel(trimmed);
  if (!key) return;
  let e = byNorm.get(key);
  if (!e) {
    e = {
      label: trimmed,
      sources: new Set(),
      sections: new Set(),
      services: new Set(),
      buckets: new Set(),
      suggestedCode: null,
      catalogueCode: matchCatalogue(trimmed),
    };
    byNorm.set(key, e);
  }
  e.sources.add(ctx.source);
  if (ctx.section) e.sections.add(ctx.section);
  if (ctx.service) e.services.add(ctx.service);
  const bucket = inferBucket(trimmed, ctx.section ?? "");
  e.buckets.add(bucket);
  if (!e.catalogueCode) e.catalogueCode = matchCatalogue(trimmed);
  if (!e.suggestedCode && bucket === "missing_catalogue_candidate") {
    e.suggestedCode = slugCode(trimmed);
  }
}

// --- Service Library JSON ---
for (const file of listServiceFiles()) {
  const slug = file.replace(".json", "");
  const fp = path.join(CONTENT_DIR, file);
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {
    continue;
  }

  for (const row of meta.document_manifest ?? []) {
    record(row.label, {
      source: "service_library.document_manifest",
      section: row.section_label,
      service: slug,
    });
    if (row.master_item_code) {
      const key = normLabel(row.label);
      const e = byNorm.get(key);
      if (e) e.catalogueCode = row.master_item_code;
    }
  }

  for (const row of meta.eligibility ?? []) {
    record(row.criterion, { source: "service_library.eligibility", service: slug });
  }
  for (const row of meta.redFlags ?? []) {
    record(row.title, { source: "service_library.redFlags", service: slug });
  }
  for (const row of meta.sampleDocs ?? []) {
    record(row.title, { source: "service_library.sampleDocs", service: slug });
  }
  for (const row of meta.compliance ?? []) {
    // compliance is policy text — skip inventory as document label
  }
}

// --- Document Binders (HTML + generated spec) ---
for (const file of listServiceFiles()) {
  const slug = file.replace(".json", "");
  try {
    const spec = buildFromService(file);
    for (const sec of spec.sections ?? []) {
      for (const it of sec.items ?? []) {
        record(it.title, {
          source: "document_binder",
          section: sec.title,
          service: slug,
        });
      }
    }
  } catch { /* skip */ }

  const htmlPath = path.join(CHECKLIST_DIR, `${slug}.html`);
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    const blocks = html.split(/<section class="section">/i).slice(1);
    for (const block of blocks) {
      const titleMatch = block.match(/class="section-title"[^>]*>([^<]+)</i);
      const sectionTitle = titleMatch ? titleMatch[1].replace(/&[^;]+;/g, " ").trim() : "Documents";
      const itemRegex = /<div class="check-title">([^<]+)<\/div>/gi;
      let m;
      while ((m = itemRegex.exec(block)) !== null) {
        record(m[1].replace(/&[^;]+;/g, " ").trim(), {
          source: "document_binder.html",
          section: sectionTitle,
          service: slug,
        });
      }
    }
  }
}

// --- Workflow Templates (migrations) ---
const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.includes("workflow_templates") || f.includes("publish_pilot"))
  .sort();

for (const mf of migrationFiles) {
  const text = fs.readFileSync(path.join(MIGRATIONS_DIR, mf), "utf8");
  const jsonMatches = text.matchAll(/items = '(\[[\s\S]*?\])'::jsonb/g);
  for (const m of jsonMatches) {
    try {
      const items = JSON.parse(m[1].replace(/''/g, "'"));
      for (const it of items) {
        const name = it.name ?? it.label;
        record(name, {
          source: `workflow_templates.${mf}`,
          section: it.section_label ?? it.section_key ?? "",
        });
        if (it.master_item_code) {
          const key = normLabel(name);
          const e = byNorm.get(key);
          if (e) e.catalogueCode = it.master_item_code;
        }
      }
    } catch { /* skip malformed */ }
  }
}

// --- Role presets (future checklist) ---
const rolePresetsPath = path.join(ROOT, "src/lib/rolePresets.ts");
if (fs.existsSync(rolePresetsPath)) {
  const text = fs.readFileSync(rolePresetsPath, "utf8");
  for (const m of text.matchAll(/name: "([^"]+)"/g)) {
    record(m[1], { source: "role_presets" });
  }
}

// --- Build report ---
const entries = [...byNorm.values()].sort((a, b) => a.label.localeCompare(b.label));

const existingCatalogue = entries.filter((e) => e.catalogueCode && CATALOGUE.has(e.catalogueCode));
const missingCandidates = entries.filter(
  (e) => e.buckets.has("missing_catalogue_candidate") && !e.buckets.has("eligibility_assessment") && !e.buckets.has("red_flag_guidance") && !e.buckets.has("milestone"),
);
const nonUpload = entries.filter(
  (e) => e.buckets.has("eligibility_assessment") || e.buckets.has("red_flag_guidance"),
);
const milestones = entries.filter((e) => e.buckets.has("milestone"));

/** Duplicate label groups → same normalized catalogue match or fuzzy family */
/** @type {Map<string, string[]>} */
const duplicateGroups = new Map();
for (const e of entries) {
  if (e.buckets.has("eligibility_assessment") || e.buckets.has("red_flag_guidance") || e.buckets.has("milestone")) continue;
  const code = e.catalogueCode ?? e.suggestedCode ?? slugCode(e.label);
  if (!duplicateGroups.has(code)) duplicateGroups.set(code, []);
  duplicateGroups.get(code).push(e.label);
}
const duplicates = [...duplicateGroups.entries()]
  .filter(([, labels]) => new Set(labels.map(normLabel)).size > 1 || labels.length > 3)
  .sort((a, b) => b[1].length - a[1].length);

/** Consolidated catalogue proposal — immigration + coaching + MBBS */
const PROPOSED_CATALOGUE = [
  { code: "passport", label: "Passport", category: "identity" },
  { code: "photograph", label: "Photograph", category: "identity" },
  { code: "birth_certificate", label: "Birth Certificate", category: "identity" },
  { code: "national_id", label: "National ID / Aadhaar / PAN", category: "identity" },
  { code: "visa_forms", label: "Visa Application Form", category: "forms" },
  { code: "cover_letter", label: "Cover Letter", category: "forms" },
  { code: "statement_of_purpose", label: "Statement of Purpose / GS Statement", category: "forms" },
  { code: "resume", label: "Resume / CV", category: "forms" },
  { code: "academic_transcripts", label: "Academic Transcripts", category: "academic" },
  { code: "marksheet_10", label: "10th Marksheet", category: "academic" },
  { code: "marksheet_12", label: "12th Marksheet", category: "academic" },
  { code: "degree_certificate", label: "Degree Certificate", category: "academic" },
  { code: "offer_letter", label: "Offer Letter / LOA", category: "academic" },
  { code: "coe", label: "Confirmation of Enrolment (CoE)", category: "academic" },
  { code: "cas_letter", label: "CAS Letter (UK)", category: "academic" },
  { code: "ielts_language_test", label: "IELTS / Language Test", category: "academic" },
  { code: "ielts_trf", label: "IELTS TRF / Test Report", category: "academic" },
  { code: "eca_report", label: "Educational Credential Assessment (ECA)", category: "academic" },
  { code: "financial_documents", label: "Financial Documents (general)", category: "financial" },
  { code: "bank_statement", label: "Bank Statement", category: "financial" },
  { code: "gic_certificate", label: "GIC Certificate", category: "financial" },
  { code: "tuition_fee_receipt", label: "Tuition Fee Receipt", category: "financial" },
  { code: "blocked_account_proof", label: "Blocked Account / Sperrkonto Proof", category: "financial" },
  { code: "salary_slips", label: "Salary Slips", category: "financial" },
  { code: "itr_tax_returns", label: "ITR / Tax Returns", category: "financial" },
  { code: "affidavit_of_support", label: "Affidavit of Support", category: "financial" },
  { code: "sponsorship_letter", label: "Sponsorship / Invitation Letter", category: "financial" },
  { code: "property_documents", label: "Property Documents", category: "financial" },
  { code: "marriage_certificate", label: "Marriage Certificate", category: "relationship" },
  { code: "divorce_certificate", label: "Divorce Certificate", category: "relationship" },
  { code: "relationship_proof", label: "Relationship Evidence", category: "relationship" },
  { code: "wedding_photos", label: "Wedding / Relationship Photos", category: "relationship" },
  { code: "employment_letter", label: "Employment Letter", category: "employment" },
  { code: "experience_letter", label: "Experience Letter", category: "employment" },
  { code: "noc", label: "No Objection Certificate (NOC)", category: "employment" },
  { code: "business_registration", label: "Business Registration", category: "employment" },
  { code: "police_clearance", label: "Police Clearance Certificate", category: "police" },
  { code: "medical_report", label: "Medical Report", category: "medical" },
  { code: "oshc", label: "OSHC / Health Insurance Certificate", category: "medical" },
  { code: "travel_health_insurance", label: "Travel Health Insurance", category: "medical" },
  { code: "visa_refusal_letter", label: "Visa Refusal Letter", category: "travel" },
  { code: "travel_history_record", label: "Travel History Record", category: "travel" },
  { code: "travel_itinerary", label: "Travel Itinerary", category: "travel" },
  { code: "accommodation_proof", label: "Accommodation Proof", category: "travel" },
  { code: "principal_status_document", label: "Principal Applicant Status Document", category: "relationship" },
  { code: "enrollment_agreement", label: "Enrollment Agreement (Coaching)", category: "coaching" },
  { code: "diagnostic_score_report", label: "Diagnostic / Mock Test Score", category: "coaching" },
  { code: "mbbs_admission_letter", label: "MBBS Admission Letter", category: "mbbs" },
  { code: "mbbs_neet_scorecard", label: "NEET Scorecard", category: "mbbs" },
  { code: "other", label: "Other", category: "other" },
];
/** @type {Map<string, { labels: Set<string>, count: number }>} */
const proposed = new Map();
for (const e of missingCandidates) {
  const code = e.suggestedCode ?? slugCode(e.label);
  if (!proposed.has(code)) proposed.set(code, { labels: new Set(), count: 0 });
  const p = proposed.get(code);
  p.labels.add(e.label);
  p.count += e.services.size || 1;
}
const proposedCatalogue = [...proposed.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .map(([code, { labels, count }]) => ({
    proposed_code: code,
    example_labels: [...labels].slice(0, 5),
    label_variants: labels.size,
    service_touch_count: count,
  }));

const report = {
  generated_at: new Date().toISOString(),
  summary: {
    unique_labels: entries.length,
    catalogue_codes_seeded: CATALOGUE.size,
    catalogue_codes_metadata_only_unseeded: METADATA_ONLY_CODES.length,
    labels_matching_existing_catalogue: existingCatalogue.length,
    upload_candidates_missing_from_catalogue: missingCandidates.length,
    non_upload_eligibility_or_red_flag_labels: nonUpload.length,
    milestone_workflow_labels: milestones.length,
    duplicate_label_groups: duplicates.length,
    proposed_new_catalogue_codes: proposedCatalogue.length,
    services_scanned: listServiceFiles().length,
    binder_html_files: fs.readdirSync(CHECKLIST_DIR).filter((f) => f.endsWith(".html") && f !== "index.html").length,
    workflow_template_migrations: migrationFiles.length,
  },
  existing_catalogue: [...CATALOGUE.entries()].map(([code, label]) => ({ code, label })),
  metadata_only_codes_not_seeded: METADATA_ONLY_CODES,
  sections: {
    A_existing_catalogue_documents: existingCatalogue.map((e) => ({
      label: e.label,
      catalogue_code: e.catalogueCode,
      sources: [...e.sources],
      service_count: e.services.size,
    })),
    B_missing_catalogue_upload_candidates: missingCandidates.map((e) => ({
      label: e.label,
      suggested_code: e.suggestedCode,
      sources: [...e.sources],
      sections: [...e.sections].slice(0, 5),
      service_count: e.services.size,
      sample_services: [...e.services].slice(0, 5),
    })),
    C_duplicate_labels: duplicates.map(([code, labels]) => ({
      normalized_target_code: code,
      labels: [...new Set(labels)].sort(),
      variant_count: new Set(labels.map(normLabel)).size,
    })),
    D_recommended_normalized_catalogue: {
      keep_existing: [...CATALOGUE.entries()].map(([code, label]) => ({ code, label, action: "keep" })),
      add_from_metadata_migration: METADATA_ONLY_CODES.map((code) => ({
        code,
        action: "seed_from_metadata_migration",
        note: "Referenced in 20260904120000 but not in base seed",
      })),
      propose_consolidated: PROPOSED_CATALOGUE,
      propose_new_from_inventory: proposedCatalogue.slice(0, 50),
    },
    non_upload_labels_do_not_catalogue: nonUpload.map((e) => ({
      label: e.label,
      classification: [...e.buckets].filter((b) => b !== "missing_catalogue_candidate"),
      sources: [...e.sources],
      service_count: e.services.size,
    })),
    milestone_labels_checklist_not_documents: milestones.map((e) => ({
      label: e.label,
      sources: [...e.sources],
    })),
  },
};

const jsonOut = process.argv.includes("--json");
if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// Human-readable summary
console.log("# Document Catalogue Inventory Report\n");
console.log(`Generated: ${report.generated_at}\n`);
console.log("## Summary\n");
for (const [k, v] of Object.entries(report.summary)) {
  console.log(`- **${k.replace(/_/g, " ")}:** ${v}`);
}

console.log("\n## A. Existing Catalogue Documents (labels matching seeded document_types)\n");
console.log(`Count: ${report.sections.A_existing_catalogue_documents.length}\n`);
for (const row of report.sections.A_existing_catalogue_documents.slice(0, 40)) {
  console.log(`- \`${row.catalogue_code}\` — ${row.label} (${row.service_count} services)`);
}
if (report.sections.A_existing_catalogue_documents.length > 40) {
  console.log(`- … and ${report.sections.A_existing_catalogue_documents.length - 40} more`);
}

console.log("\n## B. Missing Catalogue Upload Candidates\n");
console.log(`Count: ${report.sections.B_missing_catalogue_upload_candidates.length}\n`);
for (const row of report.sections.B_missing_catalogue_upload_candidates.slice(0, 60)) {
  console.log(`- **${row.label}** → proposed \`${row.suggested_code}\` (${row.service_count} services)`);
}
if (report.sections.B_missing_catalogue_upload_candidates.length > 60) {
  console.log(`- … and ${report.sections.B_missing_catalogue_upload_candidates.length - 60} more`);
}

console.log("\n## C. Duplicate Labels (same document, multiple wordings)\n");
for (const row of report.sections.C_duplicate_labels.slice(0, 30)) {
  console.log(`\n### Target: \`${row.normalized_target_code}\` (${row.variant_count} variants)`);
  for (const l of row.labels.slice(0, 8)) console.log(`  - ${l}`);
  if (row.labels.length > 8) console.log(`  - … +${row.labels.length - 8} more`);
}

console.log("\n## D. Recommended Normalized Master Catalogue\n");
console.log("\n### Keep existing (23 seeded codes)\n");
console.log(report.existing_catalogue.map((r) => r.code).join(", "));
console.log("\n### Add from metadata migration (unseeded)\n");
console.log(METADATA_ONLY_CODES.join(", "));
console.log("\n### Propose consolidated catalogue (~50 codes)\n");
for (const row of PROPOSED_CATALOGUE) {
  console.log(`- \`${row.code}\` — ${row.label} (${row.category})`);
}
console.log("\n### High-prevalence labels needing new codes (top 20)\n");
for (const row of report.sections.D_recommended_normalized_catalogue.propose_new_from_inventory.slice(0, 20)) {
  console.log(`- \`${row.proposed_code}\` — e.g. ${row.example_labels.join(" | ")} (${row.service_touch_count} touches)`);
}

console.log("\n## Non-upload labels (do NOT add to document_types)\n");
console.log(`Eligibility / red-flag / assessment labels: ${report.sections.non_upload_labels_do_not_catalogue.length}`);
console.log(`Milestone / checklist labels: ${report.sections.milestone_labels_checklist_not_documents.length}`);

const outPath = path.join(ROOT, "docs/guides/DOCUMENT_CATALOGUE_INVENTORY.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const md = buildMarkdown(report);
fs.writeFileSync(outPath, md);
console.log(`\nFull report written: ${outPath}`);

function buildMarkdown(r) {
  return `# Document Catalogue Inventory

Generated: ${r.generated_at}

> **Purpose:** Phase A inventory before catalogue expansion and strict \`master_item_code\` enforcement.
> Document Binder content is inventoried but classified separately — not upload catalogue candidates.

## Executive summary

| Metric | Count |
|--------|------:|
| Unique labels inventoried | ${r.summary.unique_labels} |
| Seeded \`document_types\` codes | ${r.summary.catalogue_codes_seeded} |
| Labels matching existing catalogue | ${r.summary.labels_matching_existing_catalogue} |
| Upload candidates missing from catalogue | ${r.summary.upload_candidates_missing_from_catalogue} |
| Non-upload (eligibility / red-flag) labels | ${r.summary.non_upload_eligibility_or_red_flag_labels} |
| Milestone / checklist labels | ${r.summary.milestone_workflow_labels} |
| Duplicate label groups | ${r.summary.duplicate_label_groups} |
| Proposed new catalogue codes | ${r.summary.proposed_new_catalogue_codes} |
| Services scanned | ${r.summary.services_scanned} |
| Binder HTML files | ${r.summary.binder_html_files} |

## Architecture alignment (locked)

| System | Role | In this inventory |
|--------|------|-------------------|
| **Document Binder** | Counselor guide / training | \`document_binder\`, \`document_binder.html\` sources |
| **Documents Tab** | Upload requirements only | Upload candidates in sections A + B |
| **Checklist** | QA / submission tasks (future) | Milestone labels — section E |
| **Eligibility / Red flags** | Service Library assessment | Non-upload — section F |
| **document_types** | Master catalogue | Sections A, D |

## A. Existing catalogue documents

Labels that match the 23 seeded \`document_types\` codes.

${tableRows(r.sections.A_existing_catalogue_documents.slice(0, 100).map((x) => [x.catalogue_code, x.label, x.service_count]))}
${r.sections.A_existing_catalogue_documents.length > 100 ? `\n_…and ${r.sections.A_existing_catalogue_documents.length - 100} more._\n` : ""}

## B. Missing catalogue upload candidates

Upload-style labels found in binders/templates/manifests that do **not** map to seeded \`document_types\`.

${tableRows(r.sections.B_missing_catalogue_upload_candidates.map((x) => [x.suggested_code, x.label, x.service_count, x.sample_services.join(", ") || "—"]))}

## C. Duplicate labels (same document, multiple wordings)

${r.sections.C_duplicate_labels.map((g) => `### \`${g.normalized_target_code}\` (${g.variant_count} variants)\n${g.labels.map((l) => `- ${l}`).join("\n")}`).join("\n\n")}

## D. Recommended normalized master catalogue

### D.1 Keep (seeded)

${r.existing_catalogue.map((x) => `- \`${x.code}\` — ${x.label}`).join("\n")}

### D.2 Seed from metadata migration (referenced but not in base seed)

${METADATA_ONLY_CODES.map((c) => `- \`${c}\``).join("\n")}

### D.3 Propose consolidated catalogue (~50 codes)

| Code | Label | Category |
|------|-------|----------|
${PROPOSED_CATALOGUE.map((x) => `| \`${x.code}\` | ${x.label} | ${x.category} |`).join("\n")}

### D.4 High-prevalence binder labels not yet in catalogue (top 50)

${tableRows(r.sections.D_recommended_normalized_catalogue.propose_new_from_inventory.map((x) => [x.proposed_code, x.example_labels[0]?.slice(0, 80) ?? "", x.service_touch_count]))}

## E. Milestone / checklist labels (NOT documents)

${r.sections.milestone_labels_checklist_not_documents.map((x) => `- ${x.label}`).join("\n")}

## F. Non-upload labels — eligibility / red flags (NOT documents)

${r.sections.non_upload_labels_do_not_catalogue.slice(0, 80).map((x) => `- ${x.label}`).join("\n")}
${r.sections.non_upload_labels_do_not_catalogue.length > 80 ? `\n_…and ${r.sections.non_upload_labels_do_not_catalogue.length - 80} more._` : ""}

## Transition plan (locked)

| Phase | Action | Status |
|-------|--------|--------|
| **A** | Inventory + catalogue design | This report |
| **B** | Expand \`document_types\` | Pending review |
| **C** | Map services → valid codes via \`document_manifest[]\` | After B; pilot only until UAT |
| **D** | Enable strict validation on materialize | After C |
| **E** | Remove slug fallback in \`fn_resolve_document_master_code\` | After D |

**Do not convert additional services until this inventory is reviewed and Phase B catalogue is approved.**
`;
}

function tableRows(rows) {
  if (!rows.length) return "_None._";
  const head = "| " + Object.keys({ a: 1, b: 2, c: 3, d: 4 }).slice(0, rows[0].length).map((_, i) => `Col ${i + 1}`).join(" | ") + " |";
  const sep = "|" + rows[0].map(() => "---").join("|") + "|";
  const body = rows.map((r) => "| " + r.map((c) => String(c).replace(/\|/g, "\\|").slice(0, 120)).join(" | ") + " |").join("\n");
  return body;
}
