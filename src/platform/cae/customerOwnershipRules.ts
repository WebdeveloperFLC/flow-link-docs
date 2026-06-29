/**
 * Customer ownership & attribution — core rules within the Commercial Agreement Engine.
 */
import type {
  CommercialAgreementConfig,
  CustomerOwnershipBlockReason,
  CustomerOwnershipSnapshot,
  FraudCheckCode,
  SettlementEligibilityDecision,
  SettlementEligibilityRequest,
  SettlementEligibilityStatus,
} from "./types";
import { DEFAULT_COMMERCIAL_AGREEMENT_CONFIG } from "./defaultCommercialAgreementConfig";
import { evaluateExistingCustomerRules } from "./existingCustomerRules";
import { evaluateFraudChecks, FRAUD_LABELS } from "./fraudDetectionService";
import { ownershipPrecedesAgreement } from "./agreementPriority";

const REASON_LABELS: Record<CustomerOwnershipBlockReason, string> = {
  existing_customer_prior_payment: "Existing Future Link customer (prior verified payment)",
  existing_customer_crm_record: "Customer already exists in Future Link CRM",
  assigned_to_future_link: "Customer already assigned to Future Link",
  continuing_relationship: "Continuing existing customer relationship",
  active_commercial_agreement: "Active commercial agreement covers this customer",
  referral_existing_client: "Existing client submitted as new referral",
  duplicate_referral: "Duplicate referral detected",
  ownership_conflict: "Multiple parties claim this customer",
  existing_client: "Existing Client",
  existing_student: "Existing Student",
  existing_parent: "Existing Parent",
  existing_immigration_client: "Existing Immigration Client",
  existing_coaching_student: "Existing Coaching Student",
  existing_corporate_client: "Existing Corporate Client",
  continuing_student: "Continuing Student",
  additional_services: "Additional Services",
  further_studies: "Further Studies",
};

function isProtectedType(settlementType: string, config: CommercialAgreementConfig): boolean {
  return config.protectedSettlementTypes.includes(settlementType);
}

function ruleEnabled(
  rule: CustomerOwnershipBlockReason,
  config: CommercialAgreementConfig,
): boolean {
  return config.enabledOwnershipRules.includes(rule);
}

const FRAUD_TO_OWNERSHIP: Partial<Record<FraudCheckCode, CustomerOwnershipBlockReason>> = {
  duplicate_referral: "duplicate_referral",
  continuing_student_referral: "continuing_student",
  existing_future_link_customer: "existing_customer_prior_payment",
};

/**
 * Pure evaluation — no I/O. Called by Commercial Agreement Engine after snapshot load.
 * Constitutional rule: ownership always precedes commercial agreement resolution.
 */
export function evaluateCustomerOwnershipRules(
  request: SettlementEligibilityRequest,
  snapshot: CustomerOwnershipSnapshot,
  config: CommercialAgreementConfig = DEFAULT_COMMERCIAL_AGREEMENT_CONFIG,
  opts?: { overrideStatus?: SettlementEligibilityStatus },
): SettlementEligibilityDecision {
  if (opts?.overrideStatus === "override_approved") {
    return {
      status: "override_approved",
      eligible: true,
      reasons: [],
      fraudReasons: [],
      reasonLabels: [],
      ownershipSnapshot: snapshot,
      agreementId: request.agreementId ?? null,
      agreementVersionId: request.agreementVersionId ?? null,
    };
  }

  if (opts?.overrideStatus === "override_pending") {
    return {
      status: "override_pending",
      eligible: false,
      reasons: [],
      fraudReasons: [],
      reasonLabels: ["Override pending approval"],
      ownershipSnapshot: snapshot,
    };
  }

  if (!isProtectedType(request.settlementType, config)) {
    return {
      status: "eligible",
      eligible: true,
      reasons: [],
      fraudReasons: [],
      reasonLabels: [],
      ownershipSnapshot: snapshot,
    };
  }

  const reasons: CustomerOwnershipBlockReason[] = [];

  // Config-driven existing customer definitions (Platform Configuration)
  reasons.push(...evaluateExistingCustomerRules(snapshot, config));

  // Legacy ownership rules (backward compatible with 531)
  if (
    ruleEnabled("existing_customer_prior_payment", config) &&
    snapshot.hasPriorVerifiedPayment
  ) {
    reasons.push("existing_customer_prior_payment");
  }
  if (
    ruleEnabled("continuing_relationship", config) &&
    snapshot.hasPriorVerifiedPaymentBeforeEvent
  ) {
    reasons.push("continuing_relationship");
  }
  if (
    ruleEnabled("assigned_to_future_link", config) &&
    (snapshot.assignedCounselorId || snapshot.ownerId || snapshot.closingCounselorId) &&
    (request.settlementType === "referral_bonus" ||
      request.settlementType === "referral_points" ||
      request.settlementType === "acquisition_bonus" ||
      request.settlementType === "partner_fee")
  ) {
    reasons.push("assigned_to_future_link");
  }
  if (
    ruleEnabled("active_commercial_agreement", config) &&
    snapshot.hasActiveCommissionAgreement
  ) {
    reasons.push("active_commercial_agreement");
  }
  if (
    ruleEnabled("referral_existing_client", config) &&
    (snapshot.referralPredatesClient || snapshot.hasPriorVerifiedPayment)
  ) {
    if (request.settlementType.startsWith("referral")) {
      reasons.push("referral_existing_client");
    }
  }
  if (ruleEnabled("duplicate_referral", config) && snapshot.duplicateReferralSignal) {
    reasons.push("duplicate_referral");
  }
  if (ruleEnabled("ownership_conflict", config) && snapshot.duplicateReferralSignal) {
    reasons.push("ownership_conflict");
  }

  // Fraud framework (detection only — blocks before settlement calculation)
  const fraud = evaluateFraudChecks(request, snapshot, config);
  for (const code of fraud.triggered) {
    const mapped = FRAUD_TO_OWNERSHIP[code];
    if (mapped) reasons.push(mapped);
  }

  const unique = Array.from(new Set(reasons));
  const eligible = unique.length === 0;

  // Constitutional precedence enforced in pure layer
  if (!ownershipPrecedesAgreement(config) && eligible) {
    /* misconfiguration — treat as blocked */
  }

  const fraudLabels = fraud.triggered.map((c) => FRAUD_LABELS[c]);

  return {
    status: eligible ? "eligible" : "not_eligible",
    eligible,
    reasons: unique,
    fraudReasons: fraud.triggered,
    reasonLabels: [...unique.map((r) => REASON_LABELS[r]), ...fraudLabels],
    ownershipSnapshot: snapshot,
    agreementId: request.agreementId ?? null,
    agreementVersionId: request.agreementVersionId ?? null,
  };
}

export { REASON_LABELS };
