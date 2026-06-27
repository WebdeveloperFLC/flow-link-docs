/** Official resource URLs — counselling references, not duplicated content. */
export type OfficialResourceLinks = {
  programUrl?: string | null;
  admissionUrl?: string | null;
  tuitionUrl?: string | null;
  scholarshipUrl?: string | null;
  brochureUrl?: string | null;
};

/** Institution-level official pages stored in columns + metadata.official_resources */
export type InstitutionOfficialResources = {
  websiteUrl?: string | null;
  internationalStudentUrl?: string | null;
  programListingUrl?: string | null;
  scholarshipPageUrl?: string | null;
  tuitionPageUrl?: string | null;
  admissionPageUrl?: string | null;
  lastVerifiedAt?: string | null;
  lastAiSyncAt?: string | null;
  lastChangeDetectedAt?: string | null;
};

/** AI processing status for knowledge sources (architecture — extraction deferred). */
export type KnowledgeSourceDisplayStatus =
  | "Pending"
  | "Processing"
  | "Extracted"
  | "Needs Review"
  | "Approved"
  | "Published";

/** @deprecated Use KnowledgeSourceDisplayStatus */
export type KnowledgeInboxDisplayStatus = KnowledgeSourceDisplayStatus;

export const KNOWLEDGE_SOURCE_STATUSES: KnowledgeSourceDisplayStatus[] = [
  "Pending",
  "Processing",
  "Extracted",
  "Needs Review",
  "Approved",
  "Published",
];

/** @deprecated Use KNOWLEDGE_SOURCE_STATUSES */
export const KNOWLEDGE_INBOX_STATUSES = KNOWLEDGE_SOURCE_STATUSES;
