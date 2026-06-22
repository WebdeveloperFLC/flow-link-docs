/**
 * Visa profile document defaults + suggestion rules (runtime).
 * Source of truth for Documents tab — NOT workflow_templates / binder / Service Library text.
 */

export type VisaProfileId =
  | "student_visa"
  | "visitor_visa"
  | "spouse_dependent"
  | "work_permit"
  | "permanent_residence"
  | "coaching"
  | "mbbs";

export type DocumentSectionKey =
  | "personal_documents"
  | "academic_documents"
  | "financial_documents"
  | "employment_documents"
  | "relationship_documents"
  | "sponsor_documents"
  | "travel_documents"
  | "application_forms"
  | "other_documents";

export const DOCUMENT_SECTION_ORDER: DocumentSectionKey[] = [
  "personal_documents",
  "academic_documents",
  "financial_documents",
  "employment_documents",
  "relationship_documents",
  "sponsor_documents",
  "travel_documents",
  "application_forms",
  "other_documents",
];

export const DOCUMENT_SECTION_LABELS: Record<DocumentSectionKey, string> = {
  personal_documents: "Personal Documents",
  academic_documents: "Academic Documents",
  financial_documents: "Financial Documents",
  employment_documents: "Employment Documents",
  relationship_documents: "Relationship Documents",
  sponsor_documents: "Sponsor Documents",
  travel_documents: "Travel Documents",
  application_forms: "Application Forms",
  other_documents: "Other Documents",
};

/** master_item_code → document section */
export const CODE_TO_SECTION: Record<string, DocumentSectionKey> = {
  passport: "personal_documents",
  photograph: "personal_documents",
  birth_certificate: "personal_documents",
  academic_transcripts: "academic_documents",
  offer_letter: "academic_documents",
  coe: "academic_documents",
  cas_letter: "academic_documents",
  entrance_exam_scorecard: "academic_documents",
  tuition_fee_receipt: "academic_documents",
  financial_documents: "financial_documents",
  gic_certificate: "financial_documents",
  blocked_account_proof: "financial_documents",
  property_documents: "financial_documents",
  itr_tax_returns: "financial_documents",
  bank_statement: "financial_documents",
  employment_letter: "employment_documents",
  experience_letter: "employment_documents",
  resume: "employment_documents",
  noc: "employment_documents",
  business_registration: "employment_documents",
  marriage_certificate: "relationship_documents",
  relationship_proof: "relationship_documents",
  divorce_certificate: "relationship_documents",
  principal_status_document: "relationship_documents",
  affidavit_of_support: "sponsor_documents",
  sponsorship_letter: "sponsor_documents",
  travel_history_record: "travel_documents",
  travel_itinerary: "travel_documents",
  visa_refusal_letter: "travel_documents",
  accommodation_proof: "travel_documents",
  visa_forms: "application_forms",
  sop: "application_forms",
  ielts_language_test: "application_forms",
  medical_report: "personal_documents",
  police_clearance: "personal_documents",
  oshc_policy: "personal_documents",
  enrollment_agreement: "other_documents",
  diagnostic_score_report: "other_documents",
  other: "other_documents",
};

export interface ProfileDocumentDef {
  code: string;
  mandatory: boolean;
}

/** Resolved from service_code — never from service title. */
export interface DocumentProfileContext {
  profileType: VisaProfileId;
  country?: string | null;
}

export interface ClientProfileSignals {
  marital_status?: string | null;
  visa_refusal_history?: boolean | null;
  sponsor?: string | null;
  has_travel_history?: boolean;
  is_business_owner?: boolean;
}

const PROFILE_DEFAULTS: Record<VisaProfileId, ProfileDocumentDef[]> = {
  student_visa: [
    { code: "passport", mandatory: true },
    { code: "photograph", mandatory: true },
    { code: "visa_forms", mandatory: true },
    { code: "academic_transcripts", mandatory: true },
    { code: "ielts_language_test", mandatory: true },
    { code: "offer_letter", mandatory: true },
    { code: "financial_documents", mandatory: true },
    { code: "sop", mandatory: true },
  ],
  visitor_visa: [
    { code: "passport", mandatory: true },
    { code: "photograph", mandatory: true },
    { code: "visa_forms", mandatory: true },
    { code: "financial_documents", mandatory: true },
    { code: "travel_itinerary", mandatory: false },
  ],
  spouse_dependent: [
    { code: "passport", mandatory: true },
    { code: "photograph", mandatory: true },
    { code: "visa_forms", mandatory: true },
    { code: "marriage_certificate", mandatory: true },
    { code: "relationship_proof", mandatory: true },
    { code: "principal_status_document", mandatory: true },
    { code: "financial_documents", mandatory: true },
  ],
  work_permit: [
    { code: "passport", mandatory: true },
    { code: "photograph", mandatory: true },
    { code: "visa_forms", mandatory: true },
    { code: "employment_letter", mandatory: true },
    { code: "experience_letter", mandatory: true },
    { code: "financial_documents", mandatory: true },
  ],
  permanent_residence: [
    { code: "passport", mandatory: true },
    { code: "photograph", mandatory: true },
    { code: "academic_transcripts", mandatory: true },
    { code: "experience_letter", mandatory: true },
    { code: "financial_documents", mandatory: true },
    { code: "police_clearance", mandatory: true },
    { code: "medical_report", mandatory: true },
    { code: "ielts_language_test", mandatory: true },
  ],
  coaching: [
    { code: "enrollment_agreement", mandatory: true },
    { code: "passport", mandatory: false },
  ],
  mbbs: [
    { code: "passport", mandatory: true },
    { code: "photograph", mandatory: true },
    { code: "academic_transcripts", mandatory: true },
    { code: "entrance_exam_scorecard", mandatory: true },
    { code: "offer_letter", mandatory: true },
    { code: "financial_documents", mandatory: true },
  ],
};

type CountryOverride = { matchCountry: (country: string) => boolean; add: ProfileDocumentDef[] };

const STUDENT_COUNTRY_OVERRIDES: CountryOverride[] = [
  {
    matchCountry: (c) => /^australia$/i.test(c.trim()),
    add: [
      { code: "coe", mandatory: true },
      { code: "oshc_policy", mandatory: true },
    ],
  },
  {
    matchCountry: (c) => /^(uk|united kingdom)$/i.test(c.trim()),
    add: [{ code: "cas_letter", mandatory: true }],
  },
  {
    matchCountry: (c) => /^canada$/i.test(c.trim()),
    add: [{ code: "gic_certificate", mandatory: false }],
  },
  {
    matchCountry: (c) => /^germany$/i.test(c.trim()),
    add: [{ code: "blocked_account_proof", mandatory: true }],
  },
];

function normalizeCountry(country: string | null | undefined): string {
  return (country ?? "").trim();
}

export function sectionForDocumentCode(code: string): { key: DocumentSectionKey; label: string } {
  const key = CODE_TO_SECTION[code] ?? "other_documents";
  return { key, label: DOCUMENT_SECTION_LABELS[key] };
}

export function getProfileDefaultDocuments(
  profileType: VisaProfileId,
  ctx: Pick<DocumentProfileContext, "country">,
): ProfileDocumentDef[] {
  const base = [...(PROFILE_DEFAULTS[profileType] ?? PROFILE_DEFAULTS.visitor_visa)];

  if (profileType === "student_visa") {
    const country = normalizeCountry(ctx.country);
    for (const rule of STUDENT_COUNTRY_OVERRIDES) {
      if (country && rule.matchCountry(country)) {
        for (const add of rule.add) base.push(add);
      }
    }
  }

  const seen = new Set<string>();
  return base.filter((d) => {
    if (seen.has(d.code)) return false;
    seen.add(d.code);
    return true;
  });
}

/** Profile-driven suggestions — catalogue codes only; NOT auto-seeded as requirements. */
export function getSuggestedDocuments(
  _profileType: VisaProfileId,
  signals: ClientProfileSignals,
): ProfileDocumentDef[] {
  const out: ProfileDocumentDef[] = [];
  const push = (code: string) => {
    if (!out.some((d) => d.code === code)) {
      out.push({ code, mandatory: false });
    }
  };

  const marital = (signals.marital_status ?? "").toLowerCase();
  if (marital.includes("married")) {
    push("marriage_certificate");
    push("relationship_proof");
  }

  if (signals.visa_refusal_history === true) {
    push("visa_refusal_letter");
  }

  if (signals.has_travel_history) {
    push("travel_history_record");
  }

  if (signals.is_business_owner) {
    push("business_registration");
    push("itr_tax_returns");
  }

  const sponsor = (signals.sponsor ?? "").trim().toLowerCase();
  if (sponsor && sponsor !== "self" && sponsor !== "self-funded" && sponsor !== "none") {
    push("sponsorship_letter");
    push("financial_documents");
    push("affidavit_of_support");
  }

  return out;
}

export function buildDefaultDocumentPlan(
  ctx: DocumentProfileContext,
  catalogueCodes: ReadonlySet<string>,
): ProfileDocumentDef[] {
  const defaults = getProfileDefaultDocuments(ctx.profileType, ctx);
  const seen = new Set<string>();
  const plan: ProfileDocumentDef[] = [];

  for (const d of defaults) {
    if (!catalogueCodes.has(d.code)) continue;
    if (seen.has(d.code)) continue;
    seen.add(d.code);
    plan.push(d);
  }
  return plan;
}

export function buildSuggestedDocumentPlan(
  ctx: DocumentProfileContext,
  signals: ClientProfileSignals,
  catalogueCodes: ReadonlySet<string>,
  existingCodes: ReadonlySet<string>,
): ProfileDocumentDef[] {
  const suggestions = getSuggestedDocuments(ctx.profileType, signals);
  const plan: ProfileDocumentDef[] = [];

  for (const d of suggestions) {
    if (!catalogueCodes.has(d.code)) continue;
    if (existingCodes.has(d.code)) continue;
    if (plan.some((p) => p.code === d.code)) continue;
    plan.push(d);
  }
  return plan;
}

export const PROFILE_DEFAULT_NOTE = "profile_default";
export const PROFILE_SUGGEST_NOTE = "profile_suggest";
