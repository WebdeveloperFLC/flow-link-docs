/**
 * Fee Master P3 — line item contract (ws-1) + institution schedule resolver (ws-2).
 *
 * Pure library: enums, Zod contract, legacy normalization, send validators, helpers, resolver.
 * Gated by {@link isFeeMasterV1Enabled}; default off until consumer PRs wire callers.
 */

export { isFeeMasterV1Enabled } from "./featureFlag";

export {
  PAYMENT_RESPONSIBILITIES,
  FEE_PAYMENT_STATUSES,
  LEGACY_FEE_PAYMENT_STATUSES,
  COLLECTION_PATHS,
  FEE_SUBGROUPS,
  ACCOUNTING_TREATMENTS,
  BILLING_STAGES,
  FEE_MASTER_DOMAINS,
  PRECEDENCE_LEVELS,
  FLC_SUBSIDY_SOURCES,
  FEE_POLICY_DECISIONS,
  isFeePaymentStatus,
  isPaymentResponsibility,
  isCollectionPath,
} from "./enums";

export type {
  PaymentResponsibility,
  FeePaymentStatus,
  LegacyFeePaymentStatus,
  CollectionPath,
  FeeSubgroup,
  AccountingTreatment,
  FeeMasterBillingStage,
  FeeMasterDomain,
  PrecedenceLevel,
  FlcSubsidySource,
  FeePolicyDecision,
  FeePaymentStatusInput,
} from "./enums";

export {
  directPaidProofSchema,
  feeMasterRefSchema,
  institutionFeePolicyAuditSchema,
  feeMasterLineItemDraftSchema,
  feeMasterLineItemSendSchema,
  safeParseFeeMasterLineItemDraft,
  safeParseFeeMasterLineItemForSend,
} from "./lineItemContract";

export type {
  DirectPaidProof,
  FeeMasterRef,
  InstitutionFeePolicyAudit,
  FeeMasterLineItem,
} from "./lineItemContract";

export {
  generateLineItemKey,
  normalizeFeePaymentStatus,
  inferFeeSubgroupFromLegacy,
  normalizeLegacyLineItem,
  normalizeLegacyLineItems,
  isLegacyExemptStatus,
  mergeLegacyPricingFields,
  allFeePaymentStatuses,
} from "./legacyMapping";

export {
  parseFeeMasterLineItemDraft,
  validateFeeMasterLineItemForSend,
  validateFeeMasterLineItemsForSend,
  formatFeeMasterValidationError,
} from "./validators";

export type { FeeMasterValidationResult } from "./validators";

export {
  DIRECT_PAID_TOLERANCE_CAD_CAP,
  directPaidTolerance,
  isWithinDirectPaidTolerance,
  isFeeLineExempt,
  isFeeLineWaived,
  validateExemptWaivedDistinction,
  defaultBillableAndTracked,
  isPassThroughLine,
  deriveAccountingTreatment,
  enrichLineDefaults,
  areExemptAndWaivedDistinct,
} from "./helpers";

export {
  INSTITUTION_FEE_TYPES,
  FEE_ACCURACY_LEVELS,
  VERIFICATION_METHODS,
  INSTITUTION_FEE_SCHEDULE_STATUSES,
  INSTITUTION_FEE_TYPE_LABELS,
  RECOMMENDED_INSTITUTION_FEE_TYPES,
  isInvalidApplicationFeeAccuracy,
} from "./institutionFeeTypes";

export type {
  InstitutionFeeType,
  FeeAccuracy,
  VerificationMethod,
  InstitutionFeeScheduleStatus,
} from "./institutionFeeTypes";

export { formatFeeDisplayAmount, isApproximateDisplayAccuracy } from "./formatFeeDisplayAmount";

export {
  resolveInstitutionFee,
  resolveInstitutionFees,
  missingRecommendedScheduleTypes,
} from "./institutionScheduleResolver";

export type {
  FeeProvenanceFields,
  InstitutionFeeScheduleRow,
  ProgramFeeSource,
  ManualFeeOverride,
  InstitutionFeeResolution,
  InstitutionFeeResolverInput,
} from "./institutionScheduleResolver";

export {
  serializeFeeSnapshot,
  tuitionFromResolutions,
  applicationFeeFromResolutions,
} from "./feeSnapshot";

export { useResolvedInstitutionFees } from "./useResolvedInstitutionFees";
export type {
  UseResolvedInstitutionFeesArgs,
  UseResolvedInstitutionFeesResult,
} from "./useResolvedInstitutionFees";
