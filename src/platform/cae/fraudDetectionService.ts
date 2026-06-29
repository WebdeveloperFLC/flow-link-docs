/**
 * Fraud protection foundation — detection framework only (no settlement calculation).
 */
import type {
  CommercialAgreementConfig,
  CustomerOwnershipSnapshot,
  FraudCheckCode,
  SettlementEligibilityRequest,
} from "./types";
import { DEFAULT_COMMERCIAL_AGREEMENT_CONFIG } from "./defaultCommercialAgreementConfig";

export interface FraudDetectionResult {
  triggered: FraudCheckCode[];
  labels: string[];
}

const FRAUD_LABELS: Record<FraudCheckCode, string> = {
  existing_future_link_customer: "Existing Future Link customer",
  duplicate_referral: "Duplicate referral detected",
  self_referral: "Self-referral detected",
  multiple_referral_claims: "Multiple referral claims for same customer",
  counselor_own_student: "Counsellor claiming own assigned student",
  freelancer_existing_student: "Freelancer claiming existing student",
  partner_existing_customer: "Partner claiming existing customer",
  continuing_student_referral: "Continuing student submitted as referral",
  duplicate_commercial_agreement: "Duplicate commercial agreement detected",
};

function isEnabled(code: FraudCheckCode, config: CommercialAgreementConfig): boolean {
  return config.fraudChecks.find((c) => c.code === code)?.enabled ?? false;
}

/**
 * Pure fraud evaluation — runs after ownership snapshot load.
 */
export function evaluateFraudChecks(
  request: SettlementEligibilityRequest,
  snapshot: CustomerOwnershipSnapshot,
  config: CommercialAgreementConfig = DEFAULT_COMMERCIAL_AGREEMENT_CONFIG,
): FraudDetectionResult {
  const triggered: FraudCheckCode[] = [];

  if (isEnabled("existing_future_link_customer", config) && snapshot.hasPriorVerifiedPayment) {
    triggered.push("existing_future_link_customer");
  }
  if (isEnabled("duplicate_referral", config) && snapshot.duplicateReferralSignal) {
    triggered.push("duplicate_referral");
  }
  if (isEnabled("self_referral", config) && snapshot.selfReferralSignal) {
    triggered.push("self_referral");
  }
  if (isEnabled("multiple_referral_claims", config) && snapshot.multipleReferralClaimsSignal) {
    triggered.push("multiple_referral_claims");
  }
  if (isEnabled("counselor_own_student", config) && snapshot.counselorOwnStudentSignal) {
    triggered.push("counselor_own_student");
  }
  if (
    isEnabled("freelancer_existing_student", config) &&
    request.settlementType.includes("freelancer") &&
    (snapshot.hasPriorVerifiedPayment || snapshot.hasActiveProgram)
  ) {
    triggered.push("freelancer_existing_student");
  }
  if (
    isEnabled("partner_existing_customer", config) &&
    (request.settlementType.includes("partner") || request.settlementType.includes("commission")) &&
    snapshot.hasPriorVerifiedPayment
  ) {
    triggered.push("partner_existing_customer");
  }
  if (
    isEnabled("continuing_student_referral", config) &&
    request.settlementType.startsWith("referral") &&
    snapshot.hasPriorVerifiedPaymentBeforeEvent
  ) {
    triggered.push("continuing_student_referral");
  }
  if (isEnabled("duplicate_commercial_agreement", config) && snapshot.duplicateAgreementSignal) {
    triggered.push("duplicate_commercial_agreement");
  }

  const unique = [...new Set(triggered)];
  return {
    triggered: unique,
    labels: unique.map((c) => FRAUD_LABELS[c]),
  };
}

export { FRAUD_LABELS };
