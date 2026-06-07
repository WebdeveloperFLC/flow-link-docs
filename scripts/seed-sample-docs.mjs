#!/usr/bin/env node
/**
 * Add sampleDocs specimens to all visa service-library JSON files and emit a patch migration.
 * Run: node scripts/seed-sample-docs.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const MIGRATION = path.join(
  process.cwd(),
  "supabase/migrations/20260606260000_seed_sample_docs_metadata.sql",
);

const LIBRARY_IDS = {
  "canada-student-visa.json": "c35e6051-f40f-47bf-9cac-0a386c47a336",
  "canada-visitor-visa.json": "b2000001-0001-4000-8000-000000000011",
  "canada-spouse-visa.json": "b2000001-0001-4000-8000-000000000012",
  "canada-express-entry-pr.json": "b2000001-0001-4000-8000-000000000013",
  "canada-pgwp.json": "b2000001-0001-4000-8000-000000000014",
  "canada-work-permit.json": "b2000001-0001-4000-8000-000000000015",
  "canada-super-visa.json": "b2000001-0001-4000-8000-000000000016",
  "uk-student-visa.json": "b2000001-0001-4000-8000-000000000021",
  "uk-visitor-visa.json": "b2000001-0001-4000-8000-000000000022",
  "uk-spouse-visa.json": "b2000001-0001-4000-8000-000000000023",
  "uk-skilled-worker.json": "b2000001-0001-4000-8000-000000000024",
  "uk-graduate-route.json": "b2000001-0001-4000-8000-000000000025",
  "usa-student-visa.json": "b2000001-0001-4000-8000-000000000031",
  "usa-visitor-visa.json": "b2000001-0001-4000-8000-000000000032",
  "usa-spouse-visa.json": "b2000001-0001-4000-8000-000000000033",
  "usa-green-card.json": "b2000001-0001-4000-8000-000000000034",
  "australia-student-visa.json": "b2000001-0001-4000-8000-000000000041",
  "australia-visitor-visa.json": "b2000001-0001-4000-8000-000000000042",
  "australia-spouse-visa.json": "b2000001-0001-4000-8000-000000000043",
  "australia-skilled-migration.json": "b2000001-0001-4000-8000-000000000044",
  "australia-subclass-485.json": "b2000001-0001-4000-8000-000000000045",
  "germany-student-visa.json": "b2000001-0001-4000-8000-000000000051",
  "germany-visitor-visa.json": "b2000001-0001-4000-8000-000000000052",
  "germany-spouse-visa.json": "b2000001-0001-4000-8000-000000000053",
  "germany-opportunity-card.json": "b2000001-0001-4000-8000-000000000054",
  "germany-job-seeker.json": "b2000001-0001-4000-8000-000000000055",
  "nz-student-visa.json": "b2000001-0001-4000-8000-000000000061",
  "nz-visitor-visa.json": "b2000001-0001-4000-8000-000000000062",
  "nz-spouse-visa.json": "b2000001-0001-4000-8000-000000000063",
  "nz-skilled-migrant.json": "b2000001-0001-4000-8000-000000000064",
  "nz-post-study-work.json": "b2000001-0001-4000-8000-000000000065",
};

const ARCHETYPE = {
  "canada-student-visa.json": "student_ca",
  "canada-visitor-visa.json": "visitor",
  "canada-spouse-visa.json": "spouse",
  "canada-express-entry-pr.json": "skilled",
  "canada-pgwp.json": "post_study",
  "canada-work-permit.json": "work_permit",
  "canada-super-visa.json": "super_visa",
  "uk-student-visa.json": "student_uk",
  "uk-visitor-visa.json": "visitor",
  "uk-spouse-visa.json": "spouse",
  "uk-skilled-worker.json": "skilled",
  "uk-graduate-route.json": "post_study",
  "usa-student-visa.json": "student_us",
  "usa-visitor-visa.json": "visitor",
  "usa-spouse-visa.json": "spouse",
  "usa-green-card.json": "skilled",
  "australia-student-visa.json": "student_au",
  "australia-visitor-visa.json": "visitor",
  "australia-spouse-visa.json": "spouse",
  "australia-skilled-migration.json": "skilled",
  "australia-subclass-485.json": "post_study",
  "germany-student-visa.json": "student_de",
  "germany-visitor-visa.json": "visitor",
  "germany-spouse-visa.json": "spouse",
  "germany-opportunity-card.json": "skilled",
  "germany-job-seeker.json": "job_seeker",
  "nz-student-visa.json": "student_nz",
  "nz-visitor-visa.json": "visitor",
  "nz-spouse-visa.json": "spouse",
  "nz-skilled-migrant.json": "skilled",
  "nz-post-study-work.json": "post_study",
};

const doc = (title, description, mimeType, docKind) => ({
  title,
  description,
  mimeType,
  docKind,
});

const COMMON = {
  passport: doc(
    "Sample passport bio page (mock)",
    "Show clients which pages to scan — MRZ visible, no glare, full spread.",
    "image/jpeg",
    "identity",
  ),
  bank: doc(
    "Sample bank statement (mock)",
    "6-month statement with name, account number, and closing balance — explain seasoning.",
    "application/pdf",
    "financial",
  ),
  photo: doc(
    "Sample passport-size photo (mock)",
    "White background, recent, specs per embassy — use for biometrics briefing.",
    "image/jpeg",
    "identity",
  ),
};

const PACKS = {
  visitor: [
    COMMON.passport,
    COMMON.bank,
    doc(
      "Sample invitation / sponsor letter (mock)",
      "Host details, relationship, accommodation, and duration of stay.",
      "application/pdf",
      "supporting",
    ),
    doc(
      "Sample travel itinerary (mock)",
      "Flights, hotels, and day-wise plan for visitor visa credibility.",
      "application/pdf",
      "supporting",
    ),
    doc(
      "Sample employment / NOC letter (mock)",
      "Employer letter confirming leave, role, salary, and return to India.",
      "application/pdf",
      "employment",
    ),
    doc(
      "Sample property / ties document (mock)",
      "Sale deed or tax receipt — explain home-country ties.",
      "application/pdf",
      "financial",
    ),
  ],
  spouse: [
    COMMON.passport,
    doc(
      "Sample marriage certificate (mock)",
      "Registered marriage proof — explain translation and notarization if needed.",
      "application/pdf",
      "relationship",
    ),
    doc(
      "Sample relationship timeline & photos guide (mock)",
      "Collage layout for chat logs, travel photos, and ceremony pictures.",
      "application/pdf",
      "relationship",
    ),
    doc(
      "Sample sponsor / undertaking letter (mock)",
      "Sponsor income, accommodation, and maintenance commitment.",
      "application/pdf",
      "financial",
    ),
    COMMON.bank,
    doc(
      "Sample chat / communication evidence (mock)",
      "Redacted WhatsApp or email excerpts — privacy-safe specimen.",
      "image/jpeg",
      "relationship",
    ),
  ],
  skilled: [
    COMMON.passport,
    doc(
      "Sample language test TRF (mock)",
      "IELTS / PTE / TOEFL layout — explain CLB or points mapping.",
      "image/jpeg",
      "language",
    ),
    doc(
      "Sample ECA report (mock)",
      "WES / IQAS / ICAS credential assessment — degree equivalency page.",
      "application/pdf",
      "academic",
    ),
    doc(
      "Sample employment reference letter (mock)",
      "Duties, NOC code, dates, and full-time hours on company letterhead.",
      "application/pdf",
      "employment",
    ),
    doc(
      "Sample resume / CV (mock)",
      "Skilled migration format — chronological roles and NOC alignment.",
      "application/pdf",
      "employment",
    ),
    doc(
      "Sample nomination / job offer letter (mock)",
      "PNP nomination or employer-backed offer where applicable.",
      "application/pdf",
      "employment",
    ),
    COMMON.bank,
  ],
  post_study: [
    COMMON.passport,
    doc(
      "Sample completion / graduation letter (mock)",
      "Confirms program completion date for PGWP / 485 / Graduate Route.",
      "application/pdf",
      "academic",
    ),
    doc(
      "Sample final transcript (mock)",
      "Official transcript with degree conferred date.",
      "application/pdf",
      "academic",
    ),
    doc(
      "Sample study permit / visa copy (mock)",
      "Prior student visa evidence required for post-study pathways.",
      "application/pdf",
      "identity",
    ),
    COMMON.bank,
  ],
  work_permit: [
    COMMON.passport,
    doc(
      "Sample job offer / LMIA letter (mock)",
      "Employer name, role, wage, and LMIA number where required.",
      "application/pdf",
      "employment",
    ),
    doc(
      "Sample employer support letter (mock)",
      "Confirms position is genuine and client meets role requirements.",
      "application/pdf",
      "employment",
    ),
    doc(
      "Sample qualifications proof (mock)",
      "Degree and experience matching NOC / SOC role.",
      "application/pdf",
      "academic",
    ),
    COMMON.bank,
  ],
  super_visa: [
    COMMON.passport,
    doc(
      "Sample Super Visa insurance policy (mock)",
      "1-year minimum coverage from Canadian insurer — explain to parents.",
      "application/pdf",
      "insurance",
    ),
    doc(
      "Sample invitation letter from child (mock)",
      "Canadian child PR/citizen invitation with household details.",
      "application/pdf",
      "supporting",
    ),
    doc(
      "Sample child income proof (mock)",
      "NOA or employment letter showing LICO threshold met.",
      "application/pdf",
      "financial",
    ),
    COMMON.bank,
  ],
  job_seeker: [
    COMMON.passport,
    doc(
      "Sample degree / vocational certificate (mock)",
      "Recognized qualification for job seeker or opportunity pathways.",
      "application/pdf",
      "academic",
    ),
    doc(
      "Sample blocked account / funds proof (mock)",
      "Financial means for Germany job seeker or opportunity card.",
      "application/pdf",
      "financial",
    ),
    doc(
      "Sample CV (European format mock)",
      "Europass-style CV for German labour market orientation.",
      "application/pdf",
      "employment",
    ),
    doc(
      "Sample language certificate (mock)",
      "German A1/A2 or English test where required.",
      "image/jpeg",
      "language",
    ),
  ],
  student_ca: [
    COMMON.passport,
    doc(
      "Sample LOA / DLI letter (mock)",
      "Designated Learning Institution acceptance — program and dates.",
      "application/pdf",
      "academic",
    ),
    doc(
      "Sample GIC certificate (mock)",
      "SDS financial requirement — approved bank GIC.",
      "application/pdf",
      "financial",
    ),
    doc(
      "Sample IELTS / PTE TRF (mock)",
      "Language scores for SDS / Non-SDS discussion.",
      "image/jpeg",
      "language",
    ),
    doc(
      "Sample SOP specimen (mock)",
      "Structure for genuine student intent — course fit and career plan.",
      "application/pdf",
      "academic",
    ),
    doc(
      "Sample academic transcripts (mock)",
      "Marksheets with backlogs explanation guidance.",
      "application/pdf",
      "academic",
    ),
    doc(
      "Sample sponsor affidavit (mock)",
      "Parent sponsor ITR-linked financial undertaking.",
      "application/pdf",
      "financial",
    ),
    COMMON.bank,
  ],
  student_uk: [
    COMMON.passport,
    doc("Sample CAS letter (mock)", "Confirmation of Acceptance for Studies — UKVI reference.", "application/pdf", "academic"),
    doc("Sample IELTS UKVI TRF (mock)", "Secure English language test for Student Route.", "image/jpeg", "language"),
    doc("Sample TB test certificate (mock)", "IOM clinic certificate if applicable.", "application/pdf", "medical"),
    doc("Sample bank statement / 28-day rule (mock)", "Funds held 28 consecutive days — explain UKVI rule.", "application/pdf", "financial"),
    doc("Sample academic transcripts (mock)", "Degree marks and backlogs cover note.", "application/pdf", "academic"),
    doc("Sample consent / parental letter (mock)", "For students under 18 or sponsored minors.", "application/pdf", "supporting"),
  ],
  student_us: [
    COMMON.passport,
    doc("Sample I-20 (mock)", "SEVP school document — SEVIS ID and program dates.", "application/pdf", "academic"),
    doc("Sample DS-160 confirmation (mock)", "Barcode page printout for interview.", "application/pdf", "application"),
    doc("Sample IELTS / TOEFL score report (mock)", "English proficiency for F-1 interview prep.", "image/jpeg", "language"),
    doc("Sample financial affidavit / I-134 (mock)", "Sponsor form  I-134 or bank proof for tuition + living.", "application/pdf", "financial"),
    doc("Sample academic transcripts (mock)", "SEVIS-ready transcript packet.", "application/pdf", "academic"),
    COMMON.bank,
  ],
  student_au: [
    COMMON.passport,
    doc("Sample CoE (mock)", "Confirmation of Enrolment from CRICOS provider.", "application/pdf", "academic"),
    doc("Sample OSHC policy (mock)", "Overseas Student Health Cover certificate.", "application/pdf", "insurance"),
    doc("Sample GTE statement (mock)", "Genuine Temporary Entrant written statement structure.", "application/pdf", "academic"),
    doc("Sample IELTS / PTE TRF (mock)", "English scores for subclass 500.", "image/jpeg", "language"),
    doc("Sample financial capacity proof (mock)", "Funds for tuition + travel + 12 months living.", "application/pdf", "financial"),
    doc("Sample academic transcripts (mock)", "Qualification history for GTE alignment.", "application/pdf", "academic"),
  ],
  student_de: [
    COMMON.passport,
    doc("Sample university admission letter (mock)", "German Hochschule Zulassung for national visa.", "application/pdf", "academic"),
    doc("Sample APS certificate (mock)", "Academic Evaluation Centre certificate for India.", "application/pdf", "academic"),
    doc("Sample blocked account confirmation (mock)", "Sperrkonto €11,904+ — explain to clients.", "application/pdf", "financial"),
    doc("Sample IELTS / TestDaF certificate (mock)", "Language proof for degree program.", "image/jpeg", "language"),
    doc("Sample CV & motivation letter (mock)", "German embassy standard application packet.", "application/pdf", "academic"),
    doc("Sample travel health insurance (mock)", "Coverage from arrival until enrollment.", "application/pdf", "insurance"),
  ],
  student_nz: [
    COMMON.passport,
    doc("Sample offer of place (mock)", "NZ education provider acceptance letter.", "application/pdf", "academic"),
    doc("Sample funds proof (mock)", "Tuition + NZD living costs per INZ calculator.", "application/pdf", "financial"),
    doc("Sample IELTS / PTE TRF (mock)", "English requirement for fee-paying student visa.", "image/jpeg", "language"),
    doc("Sample medical / chest X-ray certificate (mock)", "INZ-approved panel physician format.", "application/pdf", "medical"),
    doc("Sample police certificate guide (mock)", "When PCC is required by residence history.", "application/pdf", "identity"),
    doc("Sample academic transcripts (mock)", "Prior study evidence for pathway credibility.", "application/pdf", "academic"),
  ],
};

const NAV_BUCKET = {
  visitor: "visa",
  spouse: "visa",
  student_ca: "visa",
  student_uk: "visa",
  student_us: "visa",
  student_au: "visa",
  student_de: "visa",
  student_nz: "visa",
  super_visa: "visa",
  skilled: "immigration",
  post_study: "immigration",
  work_permit: "immigration",
  job_seeker: "immigration",
};

const sqlParts = [
  "-- Patch academy_metadata.sampleDocs for all canonical visa services",
  "-- Regenerate JSON: node scripts/seed-sample-docs.mjs",
  "",
];

let updated = 0;
for (const [file, id] of Object.entries(LIBRARY_IDS)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;

  const archetype = ARCHETYPE[file];
  const sampleDocs = PACKS[archetype] ?? PACKS.visitor;
  meta.sampleDocs = sampleDocs;
  if (!meta.navBucket && NAV_BUCKET[archetype]) {
    meta.navBucket = NAV_BUCKET[archetype];
  }

  fs.writeFileSync(fp, JSON.stringify(meta, null, 2) + "\n");
  updated++;

  const patch = JSON.stringify({ sampleDocs: meta.sampleDocs, navBucket: meta.navBucket }).replace(/'/g, "''");
  sqlParts.push(`UPDATE public.service_library`);
  sqlParts.push(
    `SET academy_metadata = COALESCE(academy_metadata, '{}'::jsonb) || '${patch}'::jsonb, updated_at = now()`,
  );
  sqlParts.push(`WHERE id = '${id}';`);
  sqlParts.push("");
}

fs.writeFileSync(MIGRATION, sqlParts.join("\n"));
console.log(`Updated ${updated} JSON files and wrote ${MIGRATION}`);
