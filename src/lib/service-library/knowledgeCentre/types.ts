import type { AcademyTabId } from "../academyTabs";
import type { ServiceAcademyMetadata } from "../academyTypes";

/** Frozen Knowledge Centre JSON contract version. */
export const KNOWLEDGE_CENTRE_SCHEMA_VERSION = "1.0" as const;

export type KnowledgeCentreSchemaVersion = typeof KNOWLEDGE_CENTRE_SCHEMA_VERSION;

/** Maps to existing Service Library tab ids — no new routes or tab components. */
export type KnowledgeCentreSectionId = AcademyTabId;

export type KnowledgeCentreNavSection = {
  /** Must match an AcademyTabId when rendered in ServiceLibraryTabs. */
  id: KnowledgeCentreSectionId;
  /** Optional override; otherwise tabLabel() is used. */
  label?: string;
  sortOrder?: number;
};

export type KnowledgeCentreNavigation = {
  sections: KnowledgeCentreNavSection[];
};

/**
 * Full guide stored as one JSON object in service_library.academy_metadata.
 * Extends ServiceAcademyMetadata — no normalized kc_* tables.
 */
export type KnowledgeCentreMetadata = ServiceAcademyMetadata & {
  schemaVersion?: KnowledgeCentreSchemaVersion | string;
  navigation?: KnowledgeCentreNavigation;
};

export type KnowledgeCentreValidationIssue = {
  path: string;
  message: string;
};

export type KnowledgeCentreValidationResult = {
  ok: boolean;
  schemaVersion: string | null;
  issues: KnowledgeCentreValidationIssue[];
};

/** Fields owned by each tab for section-scoped admin saves. */
export const KNOWLEDGE_CENTRE_SECTION_FIELDS: Partial<
  Record<KnowledgeCentreSectionId, (keyof KnowledgeCentreMetadata)[]>
> = {
  overview: [
    "displayName",
    "shortDescription",
    "version",
    "versionStatus",
    "reviewStatus",
    "updatedLabel",
    "learningLevel",
    "learningMinutes",
    "policyAlert",
    "alert",
    "tags",
    "chips",
    "kpis",
    "about",
    "performance",
    "approvalFactors",
    "relatedServices",
    "navBucket",
  ],
  fees: ["feeBreakdown", "consultancyBreakdown", "fullCostBreakdown"],
  countryinsights: ["workingRights", "fullCostBreakdown"],
  eligibility: ["eligibility"],
  checklist: ["document_structure", "document_manifest"],
  binder: ["document_structure"],
  visaforms: [],
  process: ["timeline"],
  dos: ["donts", "proTips", "postApproval"],
  redflags: ["redFlagsBanner", "redFlags"],
  faqs: ["faqs"],
  compliance: ["compliance"],
  downloads: ["resources"],
  sampledocs: ["sampleDocs"],
  documentstructure: ["document_structure", "document_manifest"],
  quiz: ["quiz", "learningMinutes"],
  notes: ["staffNotes"],
  changelog: ["changelog", "version", "updatedLabel"],
  institution: ["mbbs"],
  programs: ["mbbs"],
  practice: ["mbbs"],
  acceptance: ["compare"],
  testday: ["testDayGuide"],
};
