/**
 * Configurable existing-customer rules (Platform Configuration driven).
 */
import type {
  CommercialAgreementConfig,
  CustomerOwnershipBlockReason,
  CustomerOwnershipSnapshot,
  ExistingCustomerRuleConfig,
} from "./types";
import { DEFAULT_COMMERCIAL_AGREEMENT_CONFIG } from "./defaultCommercialAgreementConfig";

const CODE_TO_REASON: Record<string, CustomerOwnershipBlockReason> = {
  existing_client: "existing_client",
  existing_student: "existing_student",
  existing_parent: "existing_parent",
  existing_immigration_client: "existing_immigration_client",
  existing_coaching_student: "existing_coaching_student",
  existing_corporate_client: "existing_corporate_client",
  continuing_student: "continuing_student",
  additional_services: "additional_services",
  further_studies: "further_studies",
};

const SIGNAL_GETTERS: Record<string, (s: CustomerOwnershipSnapshot) => boolean> = {
  hasPriorVerifiedPayment: (s) => !!s.hasPriorVerifiedPayment,
  hasPriorVerifiedPaymentBeforeEvent: (s) => !!s.hasPriorVerifiedPaymentBeforeEvent,
  hasActiveProgram: (s) => !!s.hasActiveProgram,
  hasCrmRecord: (s) => !!s.hasCrmRecord,
  hasActiveCommissionAgreement: (s) => !!s.hasActiveCommissionAgreement,
  assignedToFutureLink: (s) =>
    !!(s.assignedCounselorId || s.ownerId || s.closingCounselorId),
};

function ruleMatches(rule: ExistingCustomerRuleConfig, snapshot: CustomerOwnershipSnapshot): boolean {
  if (!rule.enabled) return false;
  return rule.signals.some((sig) => SIGNAL_GETTERS[sig]?.(snapshot) ?? false);
}

export function evaluateExistingCustomerRules(
  snapshot: CustomerOwnershipSnapshot,
  config: CommercialAgreementConfig = DEFAULT_COMMERCIAL_AGREEMENT_CONFIG,
): CustomerOwnershipBlockReason[] {
  const reasons: CustomerOwnershipBlockReason[] = [];
  for (const rule of config.existingCustomerRules) {
    if (ruleMatches(rule, snapshot)) {
      const mapped = CODE_TO_REASON[rule.code];
      if (mapped) reasons.push(mapped);
    }
  }
  return [...new Set(reasons)];
}

export { CODE_TO_REASON, SIGNAL_GETTERS };
