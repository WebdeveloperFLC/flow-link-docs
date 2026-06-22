/**
 * Document workflow — service profiles, catalogue families, suggestion rules.
 * Phase B pre-seed design (no DB changes). Individual services inherit from profiles.
 */

/** @typedef {'high' | 'medium' | 'low'} SuggestionConfidence */
/** @typedef {'student_visa' | 'visitor_visa' | 'spouse_dependent' | 'work_permit' | 'permanent_residence' | 'coaching' | 'mbbs'} ServiceProfileId */

/** Seeded today — real uploadable document families. */
export const EXISTING_CATALOGUE = {
  passport: { label: "Passport", family: "identity" },
  photograph: { label: "Photograph", family: "identity" },
  birth_certificate: { label: "Birth Certificate", family: "identity" },
  visa_forms: { label: "Visa Application Form", family: "application" },
  sop: { label: "Statement of Purpose / Cover Letter", family: "application" },
  resume: { label: "Resume / CV", family: "employment" },
  academic_transcripts: { label: "Academic Transcripts & Marksheets", family: "education" },
  financial_documents: { label: "Financial Documents", family: "financial" },
  offer_letter: { label: "Offer / Admission Letter", family: "education" },
  gic_certificate: { label: "GIC Certificate", family: "financial" },
  tuition_fee_receipt: { label: "Tuition Fee Receipt", family: "financial" },
  medical_report: { label: "Medical Report", family: "health" },
  ielts_language_test: { label: "English / Language Test Result", family: "language" },
  marriage_certificate: { label: "Marriage Certificate", family: "relationship" },
  divorce_certificate: { label: "Divorce Certificate", family: "relationship" },
  police_clearance: { label: "Police Clearance Certificate", family: "compliance_upload" },
  affidavit_of_support: { label: "Affidavit of Support", family: "financial" },
  sponsorship_letter: { label: "Sponsorship / Invitation Letter", family: "travel" },
  property_documents: { label: "Property Documents", family: "financial" },
  employment_letter: { label: "Employment Letter", family: "employment" },
  experience_letter: { label: "Experience Letter", family: "employment" },
  noc: { label: "No Objection Certificate", family: "employment" },
  other: { label: "Other", family: "fallback" },
};

/**
 * Phase B additions — document families only (no wording variants).
 * NOT seeded until profile-based design approved.
 */
export const PROPOSED_CATALOGUE = {
  coe: { label: "Confirmation of Enrolment (CoE)", family: "education", reason: "Australia CRICOS enrolment — distinct from generic offer letter" },
  cas_letter: { label: "CAS Letter (UK)", family: "education", reason: "UK CAS — distinct from generic offer letter" },
  oshc_policy: { label: "OSHC Policy Certificate", family: "health", reason: "Insurance policy — not a medical exam" },
  travel_history_record: { label: "Travel History Record", family: "travel" },
  visa_refusal_letter: { label: "Visa Refusal Letter", family: "immigration_history" },
  relationship_proof: { label: "Relationship Evidence", family: "relationship", reason: "Photos, chat logs, joint docs — single family" },
  principal_status_document: { label: "Principal Applicant Status Document", family: "relationship" },
  business_registration: { label: "Business Registration", family: "employment" },
  blocked_account_proof: { label: "Blocked Account / Sperrkonto Proof", family: "financial", reason: "Germany-specific financial proof" },
  itr_tax_returns: { label: "ITR / Tax Returns", family: "financial" },
  travel_itinerary: { label: "Travel Itinerary", family: "travel" },
  accommodation_proof: { label: "Accommodation Proof", family: "travel" },
  enrollment_agreement: { label: "Enrollment Agreement", family: "coaching" },
  diagnostic_score_report: { label: "Diagnostic / Mock Test Score Report", family: "coaching" },
  entrance_exam_scorecard: { label: "Entrance Exam Scorecard (NEET etc.)", family: "education" },
};

/** Aliases and variants merged into canonical families — do NOT seed separately. */
export const FAMILY_MERGES = [
  {
    drop: ["wedding_photos", "relationship_photos", "engagement_photos"],
    keep: "relationship_proof",
    rationale: "Relationship evidence is one upload family; counselors upload photos within relationship_proof.",
  },
  {
    drop: ["bank_statement", "personal_bank_statement", "sponsor_bank_statement", "joint_bank_statement", "salary_slips"],
    keep: "financial_documents",
    rationale: "Bank statements and salary slips are financial evidence — use financial_documents unless a future rule requires split.",
  },
  {
    drop: ["english_test_result", "language_test_result", "ielts_trf", "pte_scorecard"],
    keep: "ielts_language_test",
    rationale: "Single language-test family; display label covers TRF/scorecard variants.",
  },
  {
    drop: ["cover_letter", "statement_of_purpose"],
    keep: "sop",
    rationale: "SOP and cover letter are the same document family.",
  },
  {
    drop: ["visa_refusal", "refusal_letter"],
    keep: "visa_refusal_letter",
    rationale: "Single refusal-letter family.",
  },
  {
    drop: ["travel_history"],
    keep: "travel_history_record",
    rationale: "Single travel-history upload family.",
  },
  {
    drop: ["marksheet_10", "marksheet_12", "degree_certificate", "school_marksheets"],
    keep: "academic_transcripts",
    rationale: "Marksheets and degree certs are academic evidence — upload under academic_transcripts.",
  },
  {
    drop: ["mbbs_admission_letter", "admission_letter"],
    keep: "offer_letter",
    rationale: "Admission/offer letters share one family.",
  },
  {
    drop: ["mbbs_neet_scorecard", "neet_scorecard"],
    keep: "entrance_exam_scorecard",
    rationale: "Entrance exam scorecards (NEET etc.) — one family, not exam-specific codes.",
  },
  {
    drop: ["national_id", "aadhaar", "pan_card"],
    keep: null,
    rationale: "Defer — add identity family only if operational need confirmed; not in Phase B seed.",
    action: "defer",
  },
];

export const FINAL_CATALOGUE = { ...EXISTING_CATALOGUE, ...PROPOSED_CATALOGUE };

/**
 * Master service profiles — defaults, suggestion rules, required families.
 * Individual services inherit and add country/service exceptions only.
 */
export const SERVICE_PROFILES = {
  student_visa: {
    id: "student_visa",
    label: "Student Visa",
    default_documents: [
      { code: "passport", mandatory: true },
      { code: "photograph", mandatory: true },
      { code: "visa_forms", mandatory: true },
      { code: "offer_letter", mandatory: true },
      { code: "academic_transcripts", mandatory: true },
      { code: "financial_documents", mandatory: true },
      { code: "ielts_language_test", mandatory: true },
    ],
    required_families: ["identity", "application", "education", "financial", "language"],
    suggestion_rules: ["SR-S01", "SR-S02", "SR-S03", "SR-S04", "SR-S05"],
  },
  visitor_visa: {
    id: "visitor_visa",
    label: "Visitor Visa",
    default_documents: [
      { code: "passport", mandatory: true },
      { code: "photograph", mandatory: true },
      { code: "visa_forms", mandatory: true },
      { code: "financial_documents", mandatory: true },
      { code: "travel_itinerary", mandatory: false },
      { code: "employment_letter", mandatory: false },
    ],
    required_families: ["identity", "application", "financial"],
    suggestion_rules: ["SR-V01"],
  },
  spouse_dependent: {
    id: "spouse_dependent",
    label: "Spouse / Dependent",
    default_documents: [
      { code: "passport", mandatory: true },
      { code: "photograph", mandatory: true },
      { code: "visa_forms", mandatory: true },
      { code: "marriage_certificate", mandatory: true },
      { code: "relationship_proof", mandatory: true },
      { code: "financial_documents", mandatory: true },
    ],
    required_families: ["identity", "application", "relationship", "financial"],
    suggestion_rules: ["SR-P01", "SR-P02"],
  },
  work_permit: {
    id: "work_permit",
    label: "Work Permit",
    default_documents: [
      { code: "passport", mandatory: true },
      { code: "photograph", mandatory: true },
      { code: "visa_forms", mandatory: true },
      { code: "employment_letter", mandatory: true },
      { code: "experience_letter", mandatory: false },
      { code: "resume", mandatory: true },
      { code: "academic_transcripts", mandatory: false },
      { code: "police_clearance", mandatory: false },
    ],
    required_families: ["identity", "application", "employment"],
    suggestion_rules: ["SR-W01"],
  },
  permanent_residence: {
    id: "permanent_residence",
    label: "Permanent Residence",
    default_documents: [
      { code: "passport", mandatory: true },
      { code: "photograph", mandatory: true },
      { code: "visa_forms", mandatory: true },
      { code: "employment_letter", mandatory: true },
      { code: "experience_letter", mandatory: true },
      { code: "resume", mandatory: true },
      { code: "academic_transcripts", mandatory: true },
      { code: "police_clearance", mandatory: true },
      { code: "ielts_language_test", mandatory: false },
    ],
    required_families: ["identity", "application", "employment", "education", "compliance_upload"],
    suggestion_rules: ["SR-W01", "SR-PR01"],
  },
  coaching: {
    id: "coaching",
    label: "Coaching",
    default_documents: [
      { code: "enrollment_agreement", mandatory: true },
      { code: "passport", mandatory: false },
      { code: "diagnostic_score_report", mandatory: false },
    ],
    required_families: ["coaching", "identity"],
    suggestion_rules: ["SR-C01"],
  },
  mbbs: {
    id: "mbbs",
    label: "MBBS",
    default_documents: [
      { code: "passport", mandatory: true },
      { code: "photograph", mandatory: true },
      { code: "academic_transcripts", mandatory: true },
      { code: "entrance_exam_scorecard", mandatory: true },
      { code: "offer_letter", mandatory: true },
      { code: "financial_documents", mandatory: true },
    ],
    required_families: ["identity", "education", "financial"],
    suggestion_rules: ["SR-M01"],
  },
};

/**
 * Country / slug exceptions — additive codes on top of profile defaults.
 * Key: profile id → array of { match, add[] }
 */
export const PROFILE_EXCEPTIONS = {
  student_visa: [
    { label: "Australia student services", match: (slug) => slug.startsWith("australia") || slug.includes("Australia-Student"), add: [{ code: "coe", mandatory: true }, { code: "oshc_policy", mandatory: true }] },
    { label: "UK student services", match: (slug) => slug.startsWith("uk-"), add: [{ code: "cas_letter", mandatory: true }] },
    { label: "Canada student services", match: (slug) => slug.startsWith("canada-"), add: [{ code: "gic_certificate", mandatory: false }] },
    { label: "Germany student services", match: (slug) => slug.startsWith("germany-"), add: [{ code: "blocked_account_proof", mandatory: true }] },
  ],
  visitor_visa: [
    { label: "Canada Super Visa", match: (slug) => /super-visa/i.test(slug), add: [{ code: "medical_report", mandatory: true }, { code: "affidavit_of_support", mandatory: true }] },
  ],
  spouse_dependent: [
    { label: "Dependent / visitor-with-principal", match: (slug) => /dependent|visitor/i.test(slug), add: [{ code: "principal_status_document", mandatory: true }] },
    { label: "Spouse OWP / extension / work", match: (slug) => /owp|work|extension/i.test(slug), add: [{ code: "employment_letter", mandatory: false }] },
  ],
  work_permit: [
    { label: "Canada work permit services", match: (slug) => slug.startsWith("canada-"), add: [{ code: "offer_letter", mandatory: false, note: "LMIA / job offer" }] },
  ],
};

/**
 * Suggestion rules with confidence levels.
 * HIGH → auto-add to Suggested Documents section
 * MEDIUM → counselor review banner
 * LOW → informational only; never auto-create upload rows
 */
export const SUGGESTION_RULES = [
  // --- HIGH confidence (global) ---
  { rule_id: "SR-01", scope: "global", profile_field: "marital_status", condition: "Married", suggest: ["marriage_certificate", "relationship_proof"], confidence: "high" },
  { rule_id: "SR-02", scope: "global", profile_field: "marital_status", condition: "Divorced", suggest: ["divorce_certificate"], confidence: "high" },
  { rule_id: "SR-03", scope: "global", profile_field: "travel_history", condition: "Has prior international travel", suggest: ["travel_history_record"], confidence: "high" },
  { rule_id: "SR-04", scope: "global", profile_field: "prior_visa_refusal", condition: "Yes", suggest: ["visa_refusal_letter"], confidence: "high" },
  { rule_id: "SR-08", scope: "global", profile_field: "has_dependants", condition: "Yes", suggest: ["birth_certificate"], confidence: "high" },
  { rule_id: "SR-09", scope: "global", profile_field: "criminal_record", condition: "Yes / required", suggest: ["police_clearance"], confidence: "high" },
  { rule_id: "SR-10", scope: "global", profile_field: "medical_required", condition: "Yes", suggest: ["medical_report"], confidence: "high" },
  // --- MEDIUM confidence (global) ---
  { rule_id: "SR-05", scope: "global", profile_field: "employment_status", condition: "Employed", suggest: ["employment_letter", "financial_documents"], confidence: "medium" },
  { rule_id: "SR-06", scope: "global", profile_field: "employment_status", condition: "Self-employed / Business owner", suggest: ["business_registration", "itr_tax_returns"], confidence: "medium" },
  { rule_id: "SR-07", scope: "global", profile_field: "sponsor", condition: "Has sponsor (not self-funded)", suggest: ["affidavit_of_support", "financial_documents"], confidence: "medium" },
  { rule_id: "SR-11", scope: "global", profile_field: "property_owner", condition: "Yes", suggest: ["property_documents"], confidence: "medium" },
  // --- LOW confidence (global — informational) ---
  { rule_id: "SR-L01", scope: "global", profile_field: "travel_pattern", condition: "Complex travel pattern", suggest: ["travel_history_record"], confidence: "low", ui: "Consider requesting detailed travel history documentation." },
  { rule_id: "SR-L02", scope: "global", profile_field: "education_gap", condition: "Study gap > 2 years", suggest: ["employment_letter", "sop"], confidence: "low", ui: "Gap explanation may require employment letter or SOP." },
  { rule_id: "SR-L03", scope: "global", profile_field: "employment_gap", condition: "Employment gap > 1 year", suggest: ["employment_letter", "financial_documents"], confidence: "low", ui: "Consider gap explanation documents." },
  // --- Profile-specific ---
  { rule_id: "SR-S01", scope: "student_visa", trigger: "Course requires language test", suggest: ["ielts_language_test"], confidence: "high" },
  { rule_id: "SR-S02", scope: "student_visa", trigger: "Australia service", suggest: ["coe", "oshc_policy"], confidence: "high" },
  { rule_id: "SR-S03", scope: "student_visa", trigger: "UK service", suggest: ["cas_letter"], confidence: "high" },
  { rule_id: "SR-S04", scope: "student_visa", trigger: "Canada service", suggest: ["gic_certificate"], confidence: "medium" },
  { rule_id: "SR-S05", scope: "student_visa", trigger: "Germany service", suggest: ["blocked_account_proof"], confidence: "high" },
  { rule_id: "SR-P01", scope: "spouse_dependent", trigger: "Spouse / partner service", suggest: ["relationship_proof"], confidence: "high" },
  { rule_id: "SR-P02", scope: "spouse_dependent", trigger: "Dependent / visitor-with-principal", suggest: ["principal_status_document"], confidence: "high" },
  { rule_id: "SR-V01", scope: "visitor_visa", trigger: "Visiting family", suggest: ["sponsorship_letter", "accommodation_proof"], confidence: "medium" },
  { rule_id: "SR-W01", scope: "work_permit", trigger: "Skilled worker / work permit", suggest: ["experience_letter", "noc"], confidence: "medium" },
  { rule_id: "SR-PR01", scope: "permanent_residence", trigger: "PR / skilled migration", suggest: ["police_clearance", "ielts_language_test"], confidence: "high" },
  { rule_id: "SR-C01", scope: "coaching", trigger: "Coaching enrollment", suggest: ["diagnostic_score_report"], confidence: "medium" },
  { rule_id: "SR-M01", scope: "mbbs", trigger: "MBBS admission", suggest: ["entrance_exam_scorecard", "offer_letter"], confidence: "high" },
];

/** Map service slug → profile id */
export function resolveServiceProfile(slug) {
  if (/^coaching-/i.test(slug)) return "coaching";
  if (/^mbbs-/i.test(slug)) return "mbbs";
  if (/express-entry|skilled-migration|oinp|pnp|green-card|tr-to-pr|smc|permanent|subclass-189|subclass-190|subclass-491/i.test(slug))
    return "permanent_residence";
  if (/student|study|pgwp|graduate-route|post-study|subclass-485|ausbildung/i.test(slug)) return "student_visa";
  if (/visitor|super-visa|visitor-record|trv/i.test(slug)) return "visitor_visa";
  if (/spouse|partner|dependent|sponsorship/i.test(slug)) return "spouse_dependent";
  if (/skilled|work|bowp|opportunity|job-seeker|caips|blue-card|employment-pass|work-permit/i.test(slug)) return "work_permit";
  return "visitor_visa"; // general short-stay / misc → visitor baseline
}

/** Build effective defaults for a service slug (profile + exceptions). */
export function defaultsForService(slug, meta = {}) {
  if (Array.isArray(meta.document_manifest) && meta.document_manifest.length > 0) {
    return {
      profile: resolveServiceProfile(slug),
      source: "document_manifest",
      documents: meta.document_manifest.map((row) => ({
        code: row.master_item_code,
        mandatory: row.mandatory !== false,
        note: row.label,
      })),
    };
  }

  const profileId = resolveServiceProfile(slug);
  const profile = SERVICE_PROFILES[profileId];
  const docs = [...profile.default_documents];
  const exceptions = PROFILE_EXCEPTIONS[profileId] ?? [];

  for (const ex of exceptions) {
    if (ex.match(slug)) {
      for (const add of ex.add) docs.push({ ...add });
    }
  }

  const seen = new Set();
  const deduped = docs.filter((d) => {
    if (seen.has(d.code)) return false;
    seen.add(d.code);
    return true;
  }).slice(0, 15);

  return { profile: profileId, source: "profile_inheritance", documents: deduped };
}

export function catalogueStats() {
  const existing = Object.keys(EXISTING_CATALOGUE).length;
  const proposed = Object.keys(PROPOSED_CATALOGUE).length;
  const merged = FAMILY_MERGES.reduce((n, m) => n + m.drop.length, 0);
  return {
    existing_count: existing,
    proposed_new_count: proposed,
    final_count: existing + proposed,
    variants_merged: merged,
    deferred: FAMILY_MERGES.filter((m) => m.action === "defer").flatMap((m) => m.drop),
  };
}
