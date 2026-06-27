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

export type KnowledgeInboxDisplayStatus =
  | "Pending AI Review"
  | "Extracted"
  | "Needs Approval"
  | "Published";

export const KNOWLEDGE_INBOX_STATUSES: KnowledgeInboxDisplayStatus[] = [
  "Pending AI Review",
  "Extracted",
  "Needs Approval",
  "Published",
];
