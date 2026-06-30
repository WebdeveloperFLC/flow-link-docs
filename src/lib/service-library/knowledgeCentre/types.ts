import type { AcademyTabId } from "../academyTabs";
import type { ServiceAcademyMetadata } from "../academyTypes";
import type { FlcKnowledgeGuide } from "../knowledgeGuide/types";
import { FLC_KNOWLEDGE_GUIDE_SCHEMA_REF } from "../knowledgeGuide/types";

/** Frozen Knowledge Centre JSON contract version. */
export const KNOWLEDGE_CENTRE_SCHEMA_VERSION = "1.0" as const;

export type KnowledgeCentreSchemaVersion = typeof KNOWLEDGE_CENTRE_SCHEMA_VERSION;

/** Maps to existing Service Library tab ids — no new routes or tab components. */
export type KnowledgeCentreSectionId = AcademyTabId;

/** Legacy v1 navigation (pre-ZIP pivot) — read fallback for unmigrated services. */
export type KnowledgeCentreNavSection = {
  id: KnowledgeCentreSectionId;
  label?: string;
  sortOrder?: number;
};

export type KnowledgeCentreNavigation = {
  sections: KnowledgeCentreNavSection[];
};

/**
 * Stored guide in service_library.academy_metadata.
 * Production format: FlcKnowledgeGuide (schemaRef flc-knowledge-guide-schema-v1.0).
 * Legacy: ServiceAcademyMetadata + optional navigation.sections[].
 */
export type KnowledgeCentreMetadata = (ServiceAcademyMetadata | FlcKnowledgeGuide) & {
  schemaVersion?: KnowledgeCentreSchemaVersion | string;
  schemaRef?: typeof FLC_KNOWLEDGE_GUIDE_SCHEMA_REF | string;
  navigation?: KnowledgeCentreNavigation | FlcKnowledgeGuide["navigation"];
};

export type KnowledgeCentreValidationIssue = {
  path: string;
  message: string;
};

export type KnowledgeCentreValidationResult = {
  ok: boolean;
  schemaVersion: string | null;
  schemaRef: string | null;
  issues: KnowledgeCentreValidationIssue[];
};

/** ZIP navigation key → AcademyTabId (frozen mapping). */
export const ZIP_NAV_KEY_TO_TAB: Record<string, AcademyTabId | null> = {
  overview: "overview",
  eligibility: "eligibility",
  cost: "fees",
  checklist: "checklist",
  binder: "binder",
  visaforms: "visaforms",
  process: "process",
  working: "countryinsights",
  dos: "dos",
  redflags: "redflags",
  faqs: "faqs",
  compliance: "compliance",
  downloads: "downloads",
  sampledocs: "sampledocs",
  quiz: "quiz",
  related: null,
  sources: null,
};

/** Fields owned by each tab for section-scoped admin saves. */
export const KNOWLEDGE_CENTRE_SECTION_FIELDS: Partial<
  Record<KnowledgeCentreSectionId, (keyof ServiceAcademyMetadata | keyof FlcKnowledgeGuide)[]>
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
  checklist: ["checklistItems", "document_structure", "document_manifest"],
  binder: ["documentBinder", "document_structure"],
  visaforms: ["visaForms"],
  process: ["timeline"],
  dos: ["donts", "proTips", "postApproval"],
  redflags: ["redFlagsBanner", "redFlags"],
  faqs: ["faqs"],
  compliance: ["compliance"],
  downloads: ["downloads", "sources", "resources"],
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
