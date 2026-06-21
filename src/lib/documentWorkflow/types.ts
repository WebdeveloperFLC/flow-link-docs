/** Document workflow Phase 1 — shared types (DB-aligned). */

export const CLIENT_DOCUMENT_STATUSES = [
  "uploaded",
  "under_review",
  "approved",
  "rejected",
  "need_replacement",
] as const;

export type ClientDocumentStatus = (typeof CLIENT_DOCUMENT_STATUSES)[number];

export const REQUIREMENT_KINDS = ["document", "milestone"] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];

export const REQUIREMENT_SOURCES = ["template", "manual_add", "role_preset"] as const;
export type RequirementSource = (typeof REQUIREMENT_SOURCES)[number];

export const PARTY_SCOPES = [
  "applicant",
  "co_applicant",
  "sponsor",
  "dependent",
  "shared",
  "any",
] as const;

export type PartyScope = (typeof PARTY_SCOPES)[number];

/** Financial section UI sub-groups (ADR.display_group). */
export const DISPLAY_GROUPS = [
  "applicant_funds",
  "co_applicant_funds",
  "sponsor_funds",
  "dependent_funds",
] as const;

export type DisplayGroup = (typeof DISPLAY_GROUPS)[number];

export interface ApplicationDocumentRequirement {
  id: string;
  client_service_case_id: string;
  client_id: string;
  source: RequirementSource;
  template_item_id: string | null;
  workflow_template_id: string | null;
  master_item_code: string;
  display_name: string;
  mandatory: boolean;
  requirement_kind: RequirementKind;
  section_key: string;
  section_label: string;
  display_group: string | null;
  party_scope: PartyScope;
  person_id: string | null;
  is_suppressed: boolean;
  notes: string | null;
  sort_order: number;
}

export interface ApplicationDocumentMilestone {
  id: string;
  client_service_case_id: string;
  requirement_id: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  reference_number: string | null;
  notes: string | null;
}

export interface CaseDocumentProgress {
  required: number;
  uploaded: number;
  missing: number;
  completionPct: number;
}

/** Statuses that satisfy checklist / progress (excludes rejected & need_replacement). */
export function documentCountsAsUploaded(status: string | null | undefined): boolean {
  return status === "uploaded" || status === "under_review" || status === "approved";
}
