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
  layer: "default" | "suggest";
}

export interface VisaProfileContext {
  templateName?: string | null;
  serviceCode?: string | null;
  serviceName?: string | null;
  country?: string | null;
}

export interface ClientProfileSignals {
  marital_status?: string | null;
  visa_refusal_history?: boolean | null;
  sponsor?: string | null;
  /** True when client has prior international travel on file. */
  has_travel_history?: boolean;
  /** Self-employed / business owner from work experience. */
  is_business_owner?: boolean;
}

const PROFILE_DEFAULTS: Record<VisaProfileId, ProfileDocumentDef[]> = {
  student_visa: [
    { code: "passport", mandatory: true, layer: "default" },
    { code: "photograph", mandatory: true, layer: "default" },
    { code: "visa_forms", mandatory: true, layer: "default" },
    { code: "academic_transcripts", mandatory: true, layer: "default" },
    { code: "ielts_language_test", mandatory: true, layer: "default" },
    { code: "offer_letter", mandatory: true, layer: "default" },
    { code: "financial_documents", mandatory: true, layer: "default" },
    { code: "sop", mandatory: true, layer: "default" },
  ],
  visitor_visa: [
    { code: "passport", mandatory: true, layer: "default" },
    { code: "photograph", mandatory: true, layer: "default" },
    { code: "visa_forms", mandatory: true, layer: "default" },
    { code: "financial_documents", mandatory: true, layer: "default" },
    { code: "travel_itinerary", mandatory: false, layer: "default" },
  ],
  spouse_dependent: [
    { code: "passport", mandatory: true, layer: "default" },
    { code: "photograph", mandatory: true, layer: "default" },
    { code: "visa_forms", mandatory: true, layer: "default" },
    { code: "marriage_certificate", mandatory: true, layer: "default" },
    { code: "relationship_proof", mandatory: true, layer: "default" },
    { code: "principal_status_document", mandatory: true, layer: "default" },
    { code: "financial_documents", mandatory: true, layer: "default" },
  ],
  work_permit: [
    { code: "passport", mandatory: true, layer: "default" },
    { code: "photograph", mandatory: true, layer: "default" },
    { code: "visa_forms", mandatory: true, layer: "default" },
    { code: "employment_letter", mandatory: true, layer: "default" },
    { code: "experience_letter", mandatory: true, layer: "default" },
    { code: "financial_documents", mandatory: true, layer: "default" },
  ],
  permanent_residence: [
    { code: "passport", mandatory: true, layer: "default" },
    { code: "photograph", mandatory: true, layer: "default" },
    { code: "academic_transcripts", mandatory: true, layer: "default" },
    { code: "experience_letter", mandatory: true, layer: "default" },
    { code: "financial_documents", mandatory: true, layer: "default" },
    { code: "police_clearance", mandatory: true, layer: "default" },
    { code: "medical_report", mandatory: true, layer: "default" },
    { code: "ielts_language_test", mandatory: true, layer: "default" },
  ],
  coaching: [
    { code: "enrollment_agreement", mandatory: true, layer: "default" },
    { code: "passport", mandatory: false, layer: "default" },
  ],
  mbbs: [
    { code: "passport", mandatory: true, layer: "default" },
    { code: "photograph", mandatory: true, layer: "default" },
    { code: "academic_transcripts", mandatory: true, layer: "default" },
    { code: "entrance_exam_scorecard", mandatory: true, layer: "default" },
    { code: "offer_letter", mandatory: true, layer: "default" },
    { code: "financial_documents", mandatory: true, layer: "default" },
  ],
};

type CountryAddition = { match: (ctx: VisaProfileContext) => boolean; add: ProfileDocumentDef[] };

const COUNTRY_ADDITIONS: Partial<Record<VisaProfileId, CountryAddition[]>> = {
  student_visa: [
    {
      match: (ctx) => /australia|subclass-500/i.test(haystack(ctx)),
      add: [
        { code: "coe", mandatory: true, layer: "default" },
        { code: "oshc_policy", mandatory: true, layer: "default" },
      ],
    },
    {
      match: (ctx) => /\buk\b|united kingdom|student route/i.test(haystack(ctx)),
      add: [{ code: "cas_letter", mandatory: true, layer: "default" }],
    },
    {
      match: (ctx) => /canada|study permit/i.test(haystack(ctx)),
      add: [{ code: "gic_certificate", mandatory: false, layer: "default" }],
    },
    {
      match: (ctx) => /germany|sperrkonto|blocked account/i.test(haystack(ctx)),
      add: [{ code: "blocked_account_proof", mandatory: true, layer: "default" }],
    },
  ],
  spouse_dependent: [
    {
      match: (ctx) => !/dependent|visitor-with-principal|super visa/i.test(haystack(ctx)),
      add: [],
      // principal_status only for dependent flows — remove from defaults when not dependent
    },
  ],
};

function haystack(ctx: VisaProfileContext): string {
  return `${ctx.templateName ?? ""} ${ctx.serviceCode ?? ""} ${ctx.serviceName ?? ""} ${ctx.country ?? ""}`.toLowerCase();
}

export function resolveVisaProfile(ctx: VisaProfileContext): VisaProfileId {
  const h = haystack(ctx);
  if (/coaching-/i.test(h) || ctx.serviceCode?.includes("coaching")) return "coaching";
  if (/^mbbs|mbbs-/i.test(h)) return "mbbs";
  if (/express-entry|skilled-migration|oinp|pnp|green-card|permanent|subclass-189|subclass-190|subclass-491|smc/i.test(h))
    return "permanent_residence";
  if (/student|study permit|subclass-500|pgwp|graduate-route|post-study|subclass-485|ausbildung/i.test(h))
    return "student_visa";
  if (/spouse|partner visa|dependent|sponsorship|super visa|owp.*spouse/i.test(h)) return "spouse_dependent";
  if (/visitor|tourist|trv|visitor record/i.test(h)) return "visitor_visa";
  if (/work permit|skilled worker|bowp|lmia|job seeker|blue card|employment pass/i.test(h)) return "work_permit";
  return "visitor_visa";
}

export function sectionForDocumentCode(code: string): { key: DocumentSectionKey; label: string } {
  const key = CODE_TO_SECTION[code] ?? "other_documents";
  return { key, label: DOCUMENT_SECTION_LABELS[key] };
}

export function getProfileDefaultDocuments(
  profileId: VisaProfileId,
  ctx: VisaProfileContext,
): ProfileDocumentDef[] {
  const base = [...(PROFILE_DEFAULTS[profileId] ?? PROFILE_DEFAULTS.visitor_visa)];

  // Spouse: principal_status only for dependent / visitor-with-principal services
  if (profileId === "spouse_dependent" && !/dependent|visitor-with-principal|super visa/i.test(haystack(ctx))) {
    const idx = base.findIndex((d) => d.code === "principal_status_document");
    if (idx >= 0) base.splice(idx, 1);
  }

  for (const rule of COUNTRY_ADDITIONS[profileId] ?? []) {
    if (rule.match(ctx)) {
      for (const add of rule.add) base.push(add);
    }
  }

  const seen = new Set<string>();
  return base.filter((d) => {
    if (seen.has(d.code)) return false;
    seen.add(d.code);
    return true;
  });
}

/** Profile-driven suggestions — catalogue codes only. */
export function getSuggestedDocuments(
  _profileId: VisaProfileId,
  signals: ClientProfileSignals,
): ProfileDocumentDef[] {
  const out: ProfileDocumentDef[] = [];
  const push = (code: string) => {
    if (!out.some((d) => d.code === code)) {
      out.push({ code, mandatory: false, layer: "suggest" });
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

export function buildProfileDocumentPlan(
  ctx: VisaProfileContext,
  signals: ClientProfileSignals,
  catalogueCodes: ReadonlySet<string>,
): ProfileDocumentDef[] {
  const profileId = resolveVisaProfile(ctx);
  const defaults = getProfileDefaultDocuments(profileId, ctx);
  const suggestions = getSuggestedDocuments(profileId, signals);
  const seen = new Set<string>();
  const plan: ProfileDocumentDef[] = [];

  for (const d of [...defaults, ...suggestions]) {
    if (!catalogueCodes.has(d.code)) continue;
    if (seen.has(d.code)) continue;
    seen.add(d.code);
    plan.push(d);
  }
  return plan;
}

export const PROFILE_DEFAULT_NOTE = "profile_default";
export const PROFILE_SUGGEST_NOTE = "profile_suggest";
