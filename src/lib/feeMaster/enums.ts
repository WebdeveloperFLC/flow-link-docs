/**
 * Locked fee-master enums (FEE_MASTER_ARCHITECTURE_V1_1 §2–3, §9.1; P2.3 C5).
 *
 * `FeePaymentStatus` tracks **fee line settlement** — not `client_invoice_payments.payment_status`
 * (payment verification workflow: awaiting_verification / verified / rejected).
 */

/** Who is obligated to pay or fund a fee line. */
export const PAYMENT_RESPONSIBILITIES = [
  "CLIENT",
  "FLC",
  "SPONSOR",
  "INSTITUTION",
  "THIRD_PARTY",
] as const;

/** Operational settlement state of a pass-through or institution fee line. */
export const FEE_PAYMENT_STATUSES = [
  "EXEMPT",
  "PENDING",
  "PAID_BY_CLIENT",
  "PAID_BY_FLC",
  "WAIVED",
  "REFUNDED",
] as const;

/** Legacy read-only alias — map to EXEMPT on normalize; do not write on new records. */
export const LEGACY_FEE_PAYMENT_STATUSES = ["NOT_REQUIRED"] as const;

/** How money flows for a fee line. */
export const COLLECTION_PATHS = ["FLC_COLLECTS", "CLIENT_DIRECT", "FLC_ADVANCE"] as const;

/** High-level fee domain for reporting and subgroup derivation. */
export const FEE_SUBGROUPS = [
  "GOVERNMENT",
  "INSTITUTION",
  "ANCILLARY",
  "TEST",
  "CREENTIAL",
] as const;

/** Derived GL / reporting bucket for a line. */
export const ACCOUNTING_TREATMENTS = [
  "REVENUE",
  "THIRD_PARTY",
  "INSTITUTION_RELATED",
  "REIMBURSEMENT",
] as const;

/** Invoice line billing stage — aligned with serviceBilling.ts. */
export const BILLING_STAGES = [
  "DEPOSIT",
  "INSTALLMENT",
  "BALANCE",
  "TOP_UP",
  "FULL",
] as const;

/** Source domain for fee_master_ref back-pointer. */
export const FEE_MASTER_DOMAINS = [
  "GOVERNMENT",
  "INSTITUTION",
  "SERVICE_LIBRARY",
  "THIRD_PARTY",
  "MANUAL",
] as const;

/** Precedence level when resolving master rates. */
export const PRECEDENCE_LEVELS = ["ROUTE", "PROGRAM", "INSTITUTION", "MANUAL"] as const;

/** FLC subsidy cost attribution (P2.3 C2 — schema-ready for ws-3). */
export const FLC_SUBSIDY_SOURCES = ["CENTRAL", "BRANCH"] as const;

/** Counselor policy decision on institution fee application (ws-3 audit). */
export const FEE_POLICY_DECISIONS = [
  "FULL_FEE",
  "DISCOUNT_APPLIED",
  "WAIVER_APPLIED",
] as const;

export type PaymentResponsibility = (typeof PAYMENT_RESPONSIBILITIES)[number];
/** Fee line settlement status (not payment verification status). */
export type FeePaymentStatus = (typeof FEE_PAYMENT_STATUSES)[number];
/** Legacy read-only fee status — normalize to EXEMPT on read. */
export type LegacyFeePaymentStatus = (typeof LEGACY_FEE_PAYMENT_STATUSES)[number];
export type CollectionPath = (typeof COLLECTION_PATHS)[number];
export type FeeSubgroup = (typeof FEE_SUBGROUPS)[number];
export type AccountingTreatment = (typeof ACCOUNTING_TREATMENTS)[number];
export type FeeMasterBillingStage = (typeof BILLING_STAGES)[number];
export type FeeMasterDomain = (typeof FEE_MASTER_DOMAINS)[number];
export type PrecedenceLevel = (typeof PRECEDENCE_LEVELS)[number];
export type FlcSubsidySource = (typeof FLC_SUBSIDY_SOURCES)[number];
export type FeePolicyDecision = (typeof FEE_POLICY_DECISIONS)[number];

/** Fee payment status input including legacy NOT_REQUIRED alias. */
export type FeePaymentStatusInput = FeePaymentStatus | LegacyFeePaymentStatus;

/**
 * Type guard for canonical fee payment status values.
 */
export function isFeePaymentStatus(value: unknown): value is FeePaymentStatus {
  return (
    typeof value === "string" &&
    (FEE_PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Type guard for payment responsibility values.
 */
export function isPaymentResponsibility(value: unknown): value is PaymentResponsibility {
  return (
    typeof value === "string" &&
    (PAYMENT_RESPONSIBILITIES as readonly string[]).includes(value)
  );
}

/**
 * Type guard for collection path values.
 */
export function isCollectionPath(value: unknown): value is CollectionPath {
  return (
    typeof value === "string" && (COLLECTION_PATHS as readonly string[]).includes(value)
  );
}
