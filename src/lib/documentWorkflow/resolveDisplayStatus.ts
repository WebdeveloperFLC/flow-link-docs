import type { ClientDocumentStatus } from "./types";

export type RequirementDisplayStatus =
  | "missing"
  | "uploaded"
  | "under_review"
  | "approved"
  | "need_replacement"
  | "rejected";

/** Normalize legacy client_documents.status values to Phase 1 enum. */
export function normalizeDocumentStatus(status: string | null | undefined): ClientDocumentStatus | null {
  if (!status) return null;
  switch (status) {
    case "uploaded":
    case "under_review":
    case "approved":
    case "rejected":
    case "need_replacement":
      return status;
    case "processed":
    case "ready":
      return "uploaded";
    case "verified":
      return "approved";
    case "needs_reissue":
      return "need_replacement";
    default:
      return "uploaded";
  }
}

export function resolveRequirementDisplayStatus(
  matched: boolean,
  rawStatus: string | null | undefined,
): RequirementDisplayStatus {
  if (!matched) return "missing";
  const normalized = normalizeDocumentStatus(rawStatus);
  if (!normalized) return "missing";
  if (normalized === "need_replacement") return "need_replacement";
  return normalized;
}

export const DISPLAY_STATUS_LABELS: Record<RequirementDisplayStatus, string> = {
  missing: "Missing",
  uploaded: "Uploaded",
  under_review: "Under Review",
  approved: "Approved",
  need_replacement: "Need Replacement",
  rejected: "Rejected",
};
