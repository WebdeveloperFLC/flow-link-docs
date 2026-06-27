import type { UpiCourseStaging, UpiInstitution } from "../types/upi";
import type { InstitutionOfficialResources, OfficialResourceLinks } from "../types/officialResources";

type MetaRecord = Record<string, unknown>;

function nested(meta: MetaRecord | null | undefined, key: string): MetaRecord {
  const block = meta?.[key];
  return block && typeof block === "object" && !Array.isArray(block) ? (block as MetaRecord) : {};
}

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export function readInstitutionOfficialResources(inst: UpiInstitution): InstitutionOfficialResources {
  const or = nested(inst.metadata, "official_resources");
  return {
    websiteUrl: inst.website_url,
    internationalStudentUrl: inst.international_student_url,
    programListingUrl: str(or.program_listing_url),
    scholarshipPageUrl: str(or.scholarship_page_url),
    tuitionPageUrl: str(or.tuition_page_url) ?? inst.deposit_policy_url,
    admissionPageUrl: inst.application_portal_url ?? str(or.admission_page_url),
    lastVerifiedAt: str(or.last_verified_at) ?? inst.last_human_verified_at,
    lastAiSyncAt: str(or.last_ai_sync_at),
    lastChangeDetectedAt: str(or.last_change_detected_at),
  };
}

/** Merge institution official resource fields into a save patch (metadata + columns). */
export function buildInstitutionOfficialResourcesPatch(
  inst: UpiInstitution,
  patch: Partial<InstitutionOfficialResources>,
): Partial<UpiInstitution> {
  const or = nested(inst.metadata, "official_resources");
  const nextOr = { ...or };

  if (patch.programListingUrl !== undefined) nextOr.program_listing_url = patch.programListingUrl || null;
  if (patch.scholarshipPageUrl !== undefined) nextOr.scholarship_page_url = patch.scholarshipPageUrl || null;
  if (patch.tuitionPageUrl !== undefined) nextOr.tuition_page_url = patch.tuitionPageUrl || null;
  if (patch.admissionPageUrl !== undefined) nextOr.admission_page_url = patch.admissionPageUrl || null;
  if (patch.lastVerifiedAt !== undefined) nextOr.last_verified_at = patch.lastVerifiedAt || null;
  if (patch.lastAiSyncAt !== undefined) nextOr.last_ai_sync_at = patch.lastAiSyncAt || null;
  if (patch.lastChangeDetectedAt !== undefined) nextOr.last_change_detected_at = patch.lastChangeDetectedAt || null;

  const out: Partial<UpiInstitution> = {
    metadata: { ...inst.metadata, official_resources: nextOr },
  };

  if (patch.websiteUrl !== undefined) out.website_url = patch.websiteUrl || null;
  if (patch.internationalStudentUrl !== undefined) out.international_student_url = patch.internationalStudentUrl || null;
  if (patch.admissionPageUrl !== undefined) out.application_portal_url = patch.admissionPageUrl || null;
  if (patch.tuitionPageUrl !== undefined) {
    // Keep deposit_policy_url in sync when tuition page is the deposit reference.
    out.deposit_policy_url = patch.tuitionPageUrl || null;
  }

  return out;
}

export function officialResourcesFromStagingRow(row: UpiCourseStaging): OfficialResourceLinks {
  const meta = (row.metadata ?? {}) as MetaRecord;
  const or = nested(meta, "official_resources");
  return {
    programUrl: row.program_url ?? row.source_url ?? str(or.program_url),
    admissionUrl: str(meta.apply_url) ?? str(or.admission_url),
    tuitionUrl: str(or.tuition_url),
    scholarshipUrl: str(or.scholarship_url),
    brochureUrl: str(or.brochure_url),
  };
}

export function mapPipelineToKnowledgeStatus(
  pipelineStatus: string | null | undefined,
  reviewStatus?: string | null,
): import("../types/officialResources").KnowledgeInboxDisplayStatus {
  const p = String(pipelineStatus ?? reviewStatus ?? "").toLowerCase();
  if (p === "published" || p === "approved") return "Published";
  if (p === "extracted") return "Extracted";
  if (p === "needs_review" || p === "pending_review") return "Needs Approval";
  return "Pending AI Review";
}
