/**
 * Institution fee schedule enums (ws-2 / Sprint 2).
 */

/** Institution fee types supported by the schedule and resolver. */
export const INSTITUTION_FEE_TYPES = [
  "APPLICATION",
  "TUITION",
  "DEPOSIT",
  "RESIDENCE",
  "INSURANCE",
  "GIC",
  "OTHER",
] as const;

/** Fee amount confidence for counselor and intelligence workflows. */
export const FEE_ACCURACY_LEVELS = [
  "EXACT",
  "APPROXIMATE",
  "AI_DETECTED",
  "NEEDS_VERIFICATION",
] as const;

/** How a fee amount was verified or sourced. */
export const VERIFICATION_METHODS = [
  "WEBSITE",
  "LOA",
  "EMAIL",
  "AGREEMENT",
  "MANUAL",
  "AI_DETECTED",
  "PARTNER_PORTAL",
] as const;

/** Schedule row lifecycle status. */
export const INSTITUTION_FEE_SCHEDULE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export type InstitutionFeeType = (typeof INSTITUTION_FEE_TYPES)[number];
export type FeeAccuracy = (typeof FEE_ACCURACY_LEVELS)[number];
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];
export type InstitutionFeeScheduleStatus = (typeof INSTITUTION_FEE_SCHEDULE_STATUSES)[number];

/** Human-readable labels for fee types in admin and counselor UI. */
export const INSTITUTION_FEE_TYPE_LABELS: Record<InstitutionFeeType, string> = {
  APPLICATION: "Application fee",
  TUITION: "Tuition",
  DEPOSIT: "Deposit",
  RESIDENCE: "Residence",
  INSURANCE: "Insurance",
  GIC: "GIC",
  OTHER: "Other",
};

/** Fee types strongly recommended on institution schedule (not hard mandatory). */
export const RECOMMENDED_INSTITUTION_FEE_TYPES: InstitutionFeeType[] = ["TUITION", "DEPOSIT"];

/**
 * Returns true when APPLICATION fee_accuracy violates EXACT-only rule.
 */
export function isInvalidApplicationFeeAccuracy(
  feeType: InstitutionFeeType,
  feeAccuracy: FeeAccuracy,
): boolean {
  return feeType === "APPLICATION" && feeAccuracy !== "EXACT";
}
