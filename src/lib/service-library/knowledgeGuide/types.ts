import type { AcademyKpiTone, AcademyTagVariant } from "../academyTypes";

/** Frozen production schema identifier — matches ZIP bundle `flc-knowledge-guide-schema-v1.0.md`. */
export const FLC_KNOWLEDGE_GUIDE_SCHEMA_REF = "flc-knowledge-guide-schema-v1.0" as const;

export const FLC_KNOWLEDGE_GUIDE_SCHEMA_VERSION = "1.0" as const;

export type FlcSourceRef = { id: string; url: string };

export type FlcKnowledgeGuideSource = {
  id: string;
  authority: string;
  page: string;
  category: string;
  url: string;
  reason: string;
};

export type FlcKnowledgeGuideNavigationEntry = {
  key: string;
  label: string;
  sectionType: string;
  dataKey: string;
  applicable: boolean;
};

export type FlcKnowledgeGuideKpi = {
  label: string;
  value: string;
  sub?: string;
  tone?: AcademyKpiTone;
  sourceRefs?: FlcSourceRef[];
};

export type FlcChecklistItems = {
  note?: string;
  items: string[];
  sourceRefs?: FlcSourceRef[];
};

export type FlcDocumentBinderCategory = {
  category: string;
  required?: string;
  items: string[];
  sourceRefs?: FlcSourceRef[];
};

export type FlcDocumentBinder = {
  note?: string;
  howItWorks?: string;
  sourceRefs?: FlcSourceRef[];
  categories: FlcDocumentBinderCategory[];
};

export type FlcVisaFormEntry = {
  code: string;
  name: string;
  when?: string;
  stage?: string;
  url: string;
  notes?: string;
};

export type FlcVisaForms = {
  note?: string;
  sourceRefs?: FlcSourceRef[];
  forms: FlcVisaFormEntry[];
};

export type FlcDownloadTemplate = {
  template: string;
  use?: string;
  stage?: string;
  audience?: string;
  fileUrl?: string;
  fileType?: string;
  standaloneFile?: string;
  content?: {
    intro?: string;
    sections?: { heading: string; items: string[] }[];
    sourceRefs?: (string | FlcSourceRef)[];
  };
};

export type FlcDownloads = {
  note?: string;
  templates: FlcDownloadTemplate[];
};

export type FlcSampleDocItem = {
  title: string;
  description?: string;
  filePath?: string;
  url?: string;
  mimeType?: string;
  docKind?: string;
};

export type FlcSampleDocs = {
  note?: string;
  items: FlcSampleDocItem[];
};

export type FlcCurrencyConfig = {
  baseCurrency: string;
  displayCurrency: string;
  source?: string;
  autoFetch?: boolean;
  rateField?: string;
  fallbackRate?: number;
  fallbackAsOf?: string;
  note?: string;
};

export type FlcWorkingRightsParty = {
  summary: string;
  details: string[];
  restrictions?: string[];
  sourceUrl?: string;
  lastVerified?: string;
  sourceRefs?: FlcSourceRef[];
  flagStatus?: "Not Allowed" | "Not Eligible" | "Not Applicable";
  flagReason?: string;
};

export type FlcWorkingRights = {
  applicant: FlcWorkingRightsParty;
  spouse: FlcWorkingRightsParty;
};

export type FlcFullCostBreakdown = {
  title?: string;
  currency: string;
  lastVerified: string;
  disclaimer: string;
  verifyTotalUrl?: string;
  fxNote?: string;
  sourceUrl?: string;
  sections: {
    id: string;
    label: string;
    owner?: string;
    sourceRefs?: FlcSourceRef[];
    items: {
      label: string;
      cadAmount?: number | [number, number] | null;
      inr?: number | "auto" | string | null;
      amount?: number | null;
      range?: string | null;
      currency?: string;
      unit?: string;
      notes?: string;
      applicable?: boolean;
      sourceRefs?: FlcSourceRef[];
    }[];
  }[];
  totals?: { label: string; value: string; notes?: string }[];
};

/**
 * Canonical production guide shape stored as-is in service_library.academy_metadata.
 * Reference: content/service-library/canada-student-visa.json (from ZIP bundle).
 */
export type FlcKnowledgeGuide = {
  schemaVersion: typeof FLC_KNOWLEDGE_GUIDE_SCHEMA_VERSION | string;
  schemaRef: typeof FLC_KNOWLEDGE_GUIDE_SCHEMA_REF | string;
  slug: string;
  displayName: string;
  shortDescription: string;
  country: string;
  service: string;
  navBucket: string;
  version: string;
  versionStatus: string;
  reviewStatus: string;
  updatedLabel: string;
  builtToStandard: string;
  sourcePolicy: string;
  learningLevel?: string;
  learningMinutes?: number;
  structure?: string;
  policyAlert: {
    active?: boolean;
    date?: string;
    summary: string;
    sourceRefs?: FlcSourceRef[];
  };
  alert?: { title?: string; body?: string };
  tags?: { label: string; variant?: AcademyTagVariant }[];
  chips?: { label: string; variant?: AcademyTagVariant }[];
  kpis: FlcKnowledgeGuideKpi[];
  about: { label: string; value: string; link?: string; warning?: boolean }[];
  navigation: FlcKnowledgeGuideNavigationEntry[];
  navigationModel?: Record<string, unknown>;
  currencyConfig?: FlcCurrencyConfig;
  sources: FlcKnowledgeGuideSource[];
  versionControl?: Record<string, unknown>;
  changelog: { version: string; date: string; author: string; summary: string }[];
  eligibility?: { criterion: string; met?: boolean; note?: string }[];
  checklistItems?: FlcChecklistItems;
  documentBinder?: FlcDocumentBinder;
  visaForms?: FlcVisaForms;
  timeline?: { weeks: string; title: string }[];
  workingRights?: FlcWorkingRights;
  donts?: { dos?: string[]; donts?: string[]; mistakes?: string[] };
  redFlagsBanner?: string;
  redFlags?: { title: string; description?: string; fix: string; severity?: string }[];
  faqs?: { q: string; a: string }[];
  compliance?: string[];
  downloads?: FlcDownloads;
  sampleDocs?: FlcSampleDocs | FlcSampleDocItem[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    level?: 1 | 2 | 3;
  }[];
  fullCostBreakdown?: FlcFullCostBreakdown;
  relatedServices?: { libraryId?: string; label: string }[];
  proTips?: string[];
  postApproval?: string[];
  staffNotes?: { author: string; date: string; text: string }[];
  feeBreakdown?: Record<string, unknown>;
  consultancyBreakdown?: Record<string, unknown>;
  document_structure?: Record<string, unknown>;
  [key: string]: unknown;
};

export function isFlcKnowledgeGuide(raw: unknown): raw is FlcKnowledgeGuide {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  return (
    obj.schemaRef === FLC_KNOWLEDGE_GUIDE_SCHEMA_REF &&
    obj.schemaVersion === FLC_KNOWLEDGE_GUIDE_SCHEMA_VERSION &&
    Array.isArray(obj.navigation)
  );
}
