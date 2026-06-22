#!/usr/bin/env node
/**
 * Phase A revision — default documents per service + suggestion rules + catalogue mapping.
 * Does NOT modify document_types or service JSON.
 *
 *   node scripts/report-default-documents-and-suggestions.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { listServiceFiles } from "./lib/build-checklist-from-service.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content/service-library");
const OUT = path.join(ROOT, "docs/guides/DOCUMENT_DEFAULTS_AND_SUGGESTIONS.md");

/** Seeded today — real uploadable documents only. */
const EXISTING_CODES = {
  passport: "Passport",
  photograph: "Photograph",
  birth_certificate: "Birth Certificate",
  visa_forms: "Visa Application Form",
  sop: "Statement of Purpose",
  resume: "Resume / CV",
  academic_transcripts: "Academic Transcripts",
  financial_documents: "Financial Documents (general bundle)",
  offer_letter: "Offer Letter / LOA",
  gic_certificate: "GIC Certificate",
  tuition_fee_receipt: "Tuition Fee Receipt",
  medical_report: "Medical Report",
  ielts_language_test: "English / Language Test Result",
  marriage_certificate: "Marriage Certificate",
  divorce_certificate: "Divorce Certificate",
  police_clearance: "Police Clearance Certificate",
  affidavit_of_support: "Affidavit of Support",
  sponsorship_letter: "Sponsorship / Invitation Letter",
  property_documents: "Property Documents",
  employment_letter: "Employment Letter",
  experience_letter: "Experience Letter",
  noc: "No Objection Certificate",
  other: "Other",
};

/**
 * Minimal proposed additions — only real uploadable files.
 * NOT expanding DB until review approval.
 */
const PROPOSED_CODES = {
  bank_statement: "Bank Statement",
  degree_certificate: "Degree Certificate",
  marksheet_10: "10th Marksheet",
  marksheet_12: "12th Marksheet",
  coe: "Confirmation of Enrolment (CoE)",
  cas_letter: "CAS Letter (UK)",
  oshc_policy: "OSHC Policy Certificate",
  english_test_result: "English Test Result (TRF/Scorecard)",
  travel_history_record: "Travel History Record",
  visa_refusal_letter: "Visa Refusal Letter",
  relationship_proof: "Relationship Evidence Pack",
  wedding_photos: "Wedding / Relationship Photos",
  principal_status_document: "Principal Applicant Status Document",
  business_registration: "Business Registration",
  blocked_account_proof: "Blocked Account / Sperrkonto Proof",
  salary_slips: "Salary Slips",
  itr_tax_returns: "ITR / Tax Returns",
  travel_itinerary: "Travel Itinerary",
  accommodation_proof: "Accommodation Proof",
  enrollment_agreement: "Enrollment Agreement (Coaching)",
  diagnostic_score_report: "Diagnostic / Mock Test Score Report",
  mbbs_admission_letter: "MBBS Admission Letter",
  mbbs_neet_scorecard: "NEET Scorecard",
  national_id: "National ID (Aadhaar / PAN / etc.)",
  cover_letter: "Cover Letter",
};

const ALL_CODES = { ...EXISTING_CODES, ...PROPOSED_CODES };

function serviceKind(slug) {
  if (/^coaching-/i.test(slug)) return "coaching";
  if (/^mbbs-/i.test(slug)) return "mbbs";
  if (/student|study|pgwp|graduate-route|post-study|subclass-485|ausbildung/i.test(slug)) return "student";
  if (/visitor|super-visa|visitor-record|trv/i.test(slug)) return "visitor";
  if (/spouse|partner|dependent|sponsorship/i.test(slug)) return "spouse";
  if (/skilled|express|work|bowp|green-card|opportunity|job-seeker|migration|caips|oinp|pnp|blue-card/i.test(slug))
    return "work";
  return "general";
}

function countryPrefix(slug) {
  return slug.split("-")[0].toLowerCase();
}

/** @typedef {{ code: string, mandatory: boolean, note?: string }} DefaultDoc */

/** @param {string} slug @param {string} kind @param {object} meta */
function defaultDocumentsForService(slug, kind, meta) {
  if (Array.isArray(meta.document_manifest) && meta.document_manifest.length > 0) {
    return meta.document_manifest.map((row) => ({
      code: row.master_item_code,
      mandatory: row.mandatory !== false,
      note: row.label,
      source: "document_manifest (approved pilot)",
    }));
  }

  const country = countryPrefix(slug);
  /** @type {DefaultDoc[]} */
  const docs = [
    { code: "passport", mandatory: true },
    { code: "photograph", mandatory: true },
    { code: "visa_forms", mandatory: true },
  ];

  if (kind === "student") {
    docs.push({ code: "offer_letter", mandatory: true });
    docs.push({ code: "academic_transcripts", mandatory: true });
    docs.push({ code: "financial_documents", mandatory: true });
    docs.push({ code: "ielts_language_test", mandatory: true });
    if (country === "australia") {
      docs.push({ code: "coe", mandatory: true, note: "proposed code" });
      docs.push({ code: "oshc_policy", mandatory: true, note: "proposed code" });
    }
    if (country === "uk") {
      docs.push({ code: "cas_letter", mandatory: true, note: "proposed code" });
    }
    if (country === "canada") {
      docs.push({ code: "gic_certificate", mandatory: false });
    }
    if (country === "germany") {
      docs.push({ code: "blocked_account_proof", mandatory: true, note: "proposed code" });
    }
  } else if (kind === "spouse") {
    docs.push({ code: "marriage_certificate", mandatory: true });
    docs.push({ code: "relationship_proof", mandatory: true, note: "proposed code" });
    docs.push({ code: "financial_documents", mandatory: true });
    if (/dependent|visitor/i.test(slug)) {
      docs.push({ code: "principal_status_document", mandatory: true, note: "proposed code" });
    }
    if (/owp|work|extension/i.test(slug)) {
      docs.push({ code: "employment_letter", mandatory: false });
    }
  } else if (kind === "visitor") {
    docs.push({ code: "financial_documents", mandatory: true });
    docs.push({ code: "travel_itinerary", mandatory: false, note: "proposed code" });
    docs.push({ code: "employment_letter", mandatory: false });
    if (country === "canada" && /super/i.test(slug)) {
      docs.push({ code: "medical_report", mandatory: true });
      docs.push({ code: "affidavit_of_support", mandatory: true });
    }
  } else if (kind === "work") {
    docs.push({ code: "employment_letter", mandatory: true });
    docs.push({ code: "experience_letter", mandatory: false });
    docs.push({ code: "resume", mandatory: true });
    docs.push({ code: "academic_transcripts", mandatory: false });
    docs.push({ code: "police_clearance", mandatory: false });
    if (country === "canada") {
      docs.push({ code: "offer_letter", mandatory: false, note: "LMIA/job offer" });
    }
  } else if (kind === "coaching") {
    return [
      { code: "enrollment_agreement", mandatory: true, note: "proposed code" },
      { code: "passport", mandatory: false },
      { code: "diagnostic_score_report", mandatory: false, note: "proposed code" },
    ];
  } else if (kind === "mbbs") {
    return [
      { code: "passport", mandatory: true },
      { code: "photograph", mandatory: true },
      { code: "academic_transcripts", mandatory: true },
      { code: "marksheet_10", mandatory: true, note: "proposed code" },
      { code: "marksheet_12", mandatory: true, note: "proposed code" },
      { code: "mbbs_neet_scorecard", mandatory: true, note: "proposed code" },
      { code: "mbbs_admission_letter", mandatory: true, note: "proposed code" },
      { code: "financial_documents", mandatory: true },
    ];
  } else {
    docs.push({ code: "financial_documents", mandatory: false });
    docs.push({ code: "resume", mandatory: false });
  }

  // Dedupe by code, cap 15
  const seen = new Set();
  return docs.filter((d) => {
    if (seen.has(d.code)) return false;
    seen.add(d.code);
    return true;
  }).slice(0, 15);
}

/**
 * Global suggestion rules — profile condition → document_types codes.
 * Applies across services; service-specific rules appended per kind.
 */
const GLOBAL_SUGGESTION_RULES = [
  {
    rule_id: "SR-01",
    profile_field: "marital_status",
    condition: "Married",
    suggest: ["marriage_certificate", "relationship_proof", "wedding_photos"],
    catalogue: { marriage_certificate: "existing", relationship_proof: "proposed", wedding_photos: "proposed" },
  },
  {
    rule_id: "SR-02",
    profile_field: "marital_status",
    condition: "Divorced",
    suggest: ["divorce_certificate"],
    catalogue: { divorce_certificate: "existing" },
  },
  {
    rule_id: "SR-03",
    profile_field: "travel_history",
    condition: "Has prior international travel",
    suggest: ["travel_history_record"],
    catalogue: { travel_history_record: "proposed" },
  },
  {
    rule_id: "SR-04",
    profile_field: "prior_visa_refusal",
    condition: "Yes",
    suggest: ["visa_refusal_letter"],
    catalogue: { visa_refusal_letter: "proposed" },
    note: "Profile field to be added if not on client record today",
  },
  {
    rule_id: "SR-05",
    profile_field: "employment_status",
    condition: "Employed",
    suggest: ["employment_letter", "salary_slips"],
    catalogue: { employment_letter: "existing", salary_slips: "proposed" },
  },
  {
    rule_id: "SR-06",
    profile_field: "employment_status",
    condition: "Self-employed / Business owner",
    suggest: ["business_registration", "itr_tax_returns"],
    catalogue: { business_registration: "proposed", itr_tax_returns: "proposed" },
  },
  {
    rule_id: "SR-07",
    profile_field: "sponsor",
    condition: "Has sponsor (not self-funded)",
    suggest: ["affidavit_of_support", "bank_statement", "itr_tax_returns"],
    catalogue: { affidavit_of_support: "existing", bank_statement: "proposed", itr_tax_returns: "proposed" },
  },
  {
    rule_id: "SR-08",
    profile_field: "has_dependants",
    condition: "Yes",
    suggest: ["birth_certificate"],
    catalogue: { birth_certificate: "existing" },
  },
  {
    rule_id: "SR-09",
    profile_field: "criminal_record",
    condition: "Yes / required",
    suggest: ["police_clearance"],
    catalogue: { police_clearance: "existing" },
  },
  {
    rule_id: "SR-10",
    profile_field: "medical_required",
    condition: "Yes",
    suggest: ["medical_report"],
    catalogue: { medical_report: "existing" },
  },
];

/** Service-kind-specific suggestion rules (additive to global). */
const SERVICE_KIND_SUGGESTIONS = {
  student: [
    {
      rule_id: "SR-S01",
      trigger: "Course requires language test",
      suggest: ["english_test_result"],
      catalogue: { english_test_result: "proposed" },
    },
    {
      rule_id: "SR-S02",
      trigger: "Australia service",
      suggest: ["coe", "oshc_policy"],
      catalogue: { coe: "proposed", oshc_policy: "proposed" },
    },
    {
      rule_id: "SR-S03",
      trigger: "UK service",
      suggest: ["cas_letter"],
      catalogue: { cas_letter: "proposed" },
    },
    {
      rule_id: "SR-S04",
      trigger: "Canada service",
      suggest: ["gic_certificate"],
      catalogue: { gic_certificate: "existing" },
    },
    {
      rule_id: "SR-S05",
      trigger: "Germany service",
      suggest: ["blocked_account_proof"],
      catalogue: { blocked_account_proof: "proposed" },
    },
  ],
  spouse: [
    {
      rule_id: "SR-P01",
      trigger: "Spouse / partner service",
      suggest: ["relationship_proof", "wedding_photos"],
      catalogue: { relationship_proof: "proposed", wedding_photos: "proposed" },
    },
    {
      rule_id: "SR-P02",
      trigger: "Dependent / visitor-with-principal",
      suggest: ["principal_status_document"],
      catalogue: { principal_status_document: "proposed" },
    },
  ],
  visitor: [
    {
      rule_id: "SR-V01",
      trigger: "Visiting family",
      suggest: ["sponsorship_letter", "accommodation_proof"],
      catalogue: { sponsorship_letter: "existing", accommodation_proof: "proposed" },
    },
  ],
  work: [
    {
      rule_id: "SR-W01",
      trigger: "Skilled worker / work permit",
      suggest: ["experience_letter", "noc"],
      catalogue: { experience_letter: "existing", noc: "existing" },
    },
  ],
  coaching: [
    {
      rule_id: "SR-C01",
      trigger: "Coaching enrollment",
      suggest: ["diagnostic_score_report"],
      catalogue: { diagnostic_score_report: "proposed" },
    },
  ],
  mbbs: [
    {
      rule_id: "SR-M01",
      trigger: "MBBS admission",
      suggest: ["mbbs_neet_scorecard", "mbbs_admission_letter"],
      catalogue: { mbbs_neet_scorecard: "proposed", mbbs_admission_letter: "proposed" },
    },
  ],
};

/** Duplicate / merge recommendations */
const DUPLICATE_ANALYSIS = [
  {
    issue: "sop vs english_test_result vs ielts_language_test",
    resolution: "Keep `ielts_language_test` (existing) as canonical English test upload; rename display to 'English Test Result'. Do NOT create separate `english_test_result` if merged.",
    action: "merge_proposed_into_existing",
    keep: "ielts_language_test",
    drop: ["english_test_result"],
  },
  {
    issue: "financial_documents vs bank_statement",
    resolution: "`bank_statement` is a specific file; `financial_documents` is a bundle category for defaults. Both valid — bank_statement suggested when sponsor/employed rules fire.",
    action: "keep_both",
    keep: ["financial_documents", "bank_statement"],
  },
  {
    issue: "offer_letter vs coe vs cas_letter",
    resolution: "Distinct real documents. `offer_letter` = generic LOA; `coe` = Australia CRICOS; `cas_letter` = UK CAS. Do not merge.",
    action: "keep_all",
    keep: ["offer_letter", "coe", "cas_letter"],
  },
  {
    issue: "photograph vs wedding_photos vs relationship_proof",
    resolution: "`photograph` = passport photos; `wedding_photos` = relationship evidence photos; `relationship_proof` = mixed evidence pack (PDF bundle). All distinct uploads.",
    action: "keep_all",
    keep: ["photograph", "wedding_photos", "relationship_proof"],
  },
  {
    issue: "medical_report vs oshc_policy",
    resolution: "OSHC is an insurance policy certificate, not a medical exam. Keep separate — do NOT map OSHC to medical_report.",
    action: "keep_both",
    keep: ["medical_report", "oshc_policy"],
  },
  {
    issue: "sop vs cover_letter vs statement_of_purpose",
    resolution: "Merge `sop` (existing) and proposed `cover_letter` under `sop` OR add `cover_letter` only if visitor visas need distinct type.",
    action: "merge_or_clarify",
    keep: ["sop"],
    drop: ["cover_letter"],
  },
  {
    issue: "visa_refusal vs visa_refusal_letter vs refusal_letter",
    resolution: "Single code: `visa_refusal_letter` (proposed). Drop metadata-only `visa_refusal` / `refusal_letter` aliases.",
    action: "consolidate",
    keep: ["visa_refusal_letter"],
    drop: ["visa_refusal", "refusal_letter"],
  },
  {
    issue: "travel_history vs travel_history_record",
    resolution: "Single code: `travel_history_record` (proposed).",
    action: "consolidate",
    keep: ["travel_history_record"],
    drop: ["travel_history"],
  },
  {
    issue: "relationship_evidence mapped to photograph (pilot)",
    resolution: "Pilot manifest uses `photograph` for relationship_evidence — should use `relationship_proof` when code is seeded.",
    action: "fix_pilot_on_phase_c",
    keep: ["relationship_proof"],
  },
  {
    issue: "gic_certificate vs blocked_account_proof",
    resolution: "Country-specific financial proof — both valid, suggested by service country not duplicated.",
    action: "keep_both",
  },
  {
    issue: "other",
    resolution: "Keep as manual-add fallback only — never in default sets.",
    action: "keep_fallback_only",
  },
];

/** Labels that must NEVER become document_types */
const INVALID_AS_DOCUMENT_TYPE = [
  "Genuine Student (GS) requirement",
  "Financial capacity",
  "Principal applicant eligible",
  "Strong ties to home country",
  "Relationship genuine",
  "Weak relationship proof",
  "CoE / provider issues",
  "Insufficient financial evidence",
  "OSHC gaps",
  "English proficiency",
  "Financial capacity for full program",
  "Government visa fee paid",
  "QA sign-off",
  "Application lodged",
  "Client reviewed, signed",
];

// --- Generate per-service table ---
/** @type {Array<object>} */
const serviceRows = [];

for (const file of listServiceFiles()) {
  const slug = file.replace(".json", "");
  const meta = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
  const kind = serviceKind(slug);
  const defaults = defaultDocumentsForService(slug, kind, meta);
  const kindRules = SERVICE_KIND_SUGGESTIONS[kind] ?? [];

  serviceRows.push({
    slug,
    displayName: meta.displayName ?? slug,
    kind,
    country: countryPrefix(slug),
    default_count: defaults.length,
    defaults: defaults.map((d) => d.code),
    default_detail: defaults,
    has_manifest: Array.isArray(meta.document_manifest) && meta.document_manifest.length > 0,
    suggestion_rules: [...GLOBAL_SUGGESTION_RULES.map((r) => r.rule_id), ...kindRules.map((r) => r.rule_id)],
  });
}

// --- Collect all codes used ---
const usedExisting = new Set();
const usedProposed = new Set();
for (const row of serviceRows) {
  for (const c of row.defaults) {
    if (EXISTING_CODES[c]) usedExisting.add(c);
    else if (PROPOSED_CODES[c]) usedProposed.add(c);
  }
}
for (const r of GLOBAL_SUGGESTION_RULES) {
  for (const c of r.suggest) {
    if (EXISTING_CODES[c]) usedExisting.add(c);
    else if (PROPOSED_CODES[c]) usedProposed.add(c);
  }
}
for (const rules of Object.values(SERVICE_KIND_SUGGESTIONS)) {
  for (const r of rules) {
    for (const c of r.suggest) {
      if (EXISTING_CODES[c]) usedExisting.add(c);
      else if (PROPOSED_CODES[c]) usedProposed.add(c);
    }
  }
}

const md = buildMarkdown({
  serviceRows,
  usedExisting: [...usedExisting].sort(),
  usedProposed: [...usedProposed].sort(),
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(`Report written: ${OUT}`);
console.log(`Services: ${serviceRows.length}`);
console.log(`Existing codes in use: ${usedExisting.size}`);
console.log(`Proposed codes in use: ${usedProposed.size}`);

function buildMarkdown({ serviceRows, usedExisting, usedProposed }) {
  const lines = [];
  const push = (...a) => lines.push(...a);

  push(
    "# Default Documents & Suggestion Rules — Phase A Revision",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "> **Status:** Review required before Phase B (document_types expansion).",
    "> **No DB changes. No service conversions.**",
    "",
    "## Architecture (locked)",
    "",
    "| Layer | Source | Creates upload rows? |",
    "|-------|--------|-------------------|",
    "| **Layer 1 — Default documents** | Per-service standard set (5–15) | Yes — initial Documents tab |",
    "| **Layer 2 — Suggested documents** | Client profile rules → document_types | Yes — additive, deduped by code |",
    "| **Layer 3 — Manual documents** | Counselor picker from document_types | Yes — additive |",
    "| **Document Binder** | Training / guidance HTML | **Never** |",
    "| **Checklist** | QA / submission tasks (future) | **Never** |",
    "| **Eligibility / Red flags / Compliance** | Service Library JSON | **Never** |",
    "",
    "### Invalid as document_types (assessment / guidance only)",
    "",
    ...INVALID_AS_DOCUMENT_TYPE.map((l) => `- ${l}`),
    "",
    "---",
    "",
    "## 1. Proposed default documents per service",
    "",
    "**" + serviceRows.length + " services** — target 5–15 upload documents each.",
    "Only real uploadable files. No eligibility, red flags, milestones, or compliance text.",
    "",
    "| Service | Kind | Defaults | Codes |",
    "|---------|------|----------|-------|",
  );

  for (const row of serviceRows.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const manifest = row.has_manifest ? " ✓ manifest" : "";
    push("| " + row.displayName + " | " + row.kind + " | " + row.default_count + manifest + " | " + row.defaults.join(", ") + " |");
  }

  push("", "### Reference examples (approved targets)", "");
  push("", "**Australia Student Visa** (proposed defaults):");
  push("");
  push("    passport, photograph, offer_letter, coe, financial_documents, oshc_policy, ielts_language_test");
  push("");
  push("**Canada Spouse Dependent Visitor** (pilot manifest — note relationship_proof revision):");
  push("");
  push("    passport, photograph, marriage_certificate, relationship_proof, financial_documents, principal_status_document, visa_forms");
  push("", "### Per-service detail (first 10 + pilot + Australia)", "");

  const highlight = ["canada-spouse-dependent-visitor", "australia-student-visa", "canada-student-visa", "uk-student-visa", "germany-student-visa"];
  const detailRows = [
    ...serviceRows.filter((r) => highlight.includes(r.slug)),
    ...serviceRows.filter((r) => !highlight.includes(r.slug)).slice(0, 10),
  ];
  for (const row of detailRows) {
    push(`#### ${row.displayName} (\`${row.slug}\`)`, "");
    push("| Code | Mandatory | Catalogue | Note |");
    push("|------|-----------|-----------|------|");
    for (const d of row.default_detail) {
      const cat = EXISTING_CODES[d.code] ? "existing" : PROPOSED_CODES[d.code] ? "proposed" : "unknown";
      push(`| \`${d.code}\` | ${d.mandatory ? "yes" : "no"} | ${cat} | ${d.note ?? ALL_CODES[d.code] ?? ""} |`);
    }
    push("");
  }
  push(`_Full table above covers all ${serviceRows.length} services._`, "", "---", "");

  push("## 2. Proposed suggestion rules", "", "### 2.1 Global rules (all services)", "");
  push("| Rule | Profile field | Condition | Suggest codes | Catalogue |");
  push("|------|---------------|-----------|---------------|-----------|");
  for (const r of GLOBAL_SUGGESTION_RULES) {
    const cat = r.suggest.map((c) => `${c} (${r.catalogue[c]})`).join(", ");
    push(`| ${r.rule_id} | \`${r.profile_field}\` | ${r.condition} | ${r.suggest.map((c) => `\`${c}\``).join(", ")} | ${cat} |`);
  }

  push("", "### 2.2 Service-kind rules (additive)", "");
  for (const [kind, rules] of Object.entries(SERVICE_KIND_SUGGESTIONS)) {
    push(`#### ${kind}`, "");
    push("| Rule | Trigger | Suggest codes | Catalogue |");
    push("|------|---------|---------------|-----------|");
    for (const r of rules) {
      const cat = r.suggest.map((c) => `${c} (${r.catalogue[c]})`).join(", ");
      push(`| ${r.rule_id} | ${r.trigger} | ${r.suggest.map((c) => `\`${c}\``).join(", ")} | ${cat} |`);
    }
    push("");
  }

  push("---", "", "## 3. Catalogue mapping summary", "");
  push("### 3.1 Existing codes used in defaults/suggestions", "");
  push(usedExisting.map((c) => `- \`${c}\` — ${EXISTING_CODES[c]}`).join("\n"));
  push("", "### 3.2 Proposed codes required (minimal set — not seeded yet)", "");
  push(`**${usedProposed.length} codes** referenced by defaults/suggestions:`,"");
  push(usedProposed.map((c) => `- \`${c}\` — ${PROPOSED_CODES[c]}`).join("\n"));
  push("", "### 3.3 Proposed codes NOT needed (after duplicate merge)", "");
  const dropped = ["english_test_result", "cover_letter", "visa_refusal", "refusal_letter", "travel_history", "statement_of_purpose"];
  push(...dropped.map((c) => `- \`${c}\` — merge into canonical code per Section 4`));
  push("", "### 3.4 Net new codes for Phase B (after merge review)", "");
  const netNew = usedProposed.filter((c) => !dropped.includes(c));
  push(`**Estimated ${netNew.length} codes** to add (not 50+):`, "");
  push(netNew.map((c) => `- \`${c}\``).join("\n"));
  push("", "---", "", "## 4. Duplicates & unnecessary types", "");
  for (const d of DUPLICATE_ANALYSIS) {
    push(`### ${d.issue}`, "");
    push(`- **Resolution:** ${d.resolution}`);
    push(`- **Action:** ${d.action}`);
    if (d.keep) push(`- **Keep:** ${(Array.isArray(d.keep) ? d.keep : [d.keep]).map((c) => `\`${c}\``).join(", ")}`);
    if (d.drop) push(`- **Drop / merge:** ${d.drop.map((c) => `\`${c}\``).join(", ")}`);
    push("");
  }

  push("---", "", "## 5. Explicit exclusions from document_types", "");
  push("The following categories must **never** receive a `document_types` code:", "");
  push("- Eligibility criteria (`eligibility[]`)");
  push("- Red flags (`redFlags[]`)");
  push("- Compliance policy lines (`compliance[]`)");
  push("- Checklist / milestone tasks (fee paid, QA sign-off, application lodged)");
  push("- Counselor guidance / verification conclusions");
  push("- Document Binder section titles used as assessment labels");
  push("", "---", "", "## 6. Next steps (blocked until approval)", "");
  push("1. **Review** this report — confirm default sets per service kind");
  push("2. **Approve** net-new catalogue codes (~" + netNew.length + ", not 50+)");
  push("3. **Complete** Canada Spouse pilot UAT on new case");
  push("4. **Phase B** — seed approved codes only");
  push("5. **Phase C** — `document_manifest[]` per service (after catalogue approved)");
  push("", "**No Phase B, no fleet conversion, no strict validation until sign-off.**");

  return lines.join("\n");
}
