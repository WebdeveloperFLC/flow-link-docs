/**
 * Commercial Agreement Engine — default configuration (code fallback; DB via platform_config).
 */
import type {
  CommercialAgreementConfig,
  CustomerOwnershipBlockReason,
  ExistingCustomerRuleConfig,
  FraudCheckConfig,
  PriorityLayer,
} from "./types";

export const DEFAULT_PROTECTED_SETTLEMENT_TYPES = [
  "incentive_counselor",
  "incentive_line_item",
  "referral_bonus",
  "referral_points",
  "commission_partner",
  "acquisition_bonus",
  "revenue_share",
  "partner_fee",
  "freelancer_payment",
  "consultant_payment",
  "aggregator_settlement",
];

export const DEFAULT_OWNERSHIP_RULES: CustomerOwnershipBlockReason[] = [
  "existing_customer_prior_payment",
  "continuing_relationship",
  "active_commercial_agreement",
  "referral_existing_client",
  "duplicate_referral",
  "ownership_conflict",
  "assigned_to_future_link",
];

export const DEFAULT_PARTY_TYPES = [
  "student",
  "parent",
  "client",
  "university",
  "aggregator",
  "partner",
  "freelancer",
  "consultant",
  "employee",
  "vendor",
  "contractor",
  "government",
  "bank",
  "trust",
  "broker",
  "internal_company",
];

export const DEFAULT_AGREEMENT_TYPES = [
  "referral",
  "commission",
  "freelancer",
  "consultant",
  "vendor_contract",
  "revenue_share",
  "incentive",
  "bonus",
  "marketing_retainer",
  "university_commission",
  "aggregator_commission",
  "custom",
];

export const DEFAULT_SETTLEMENT_CYCLES = [
  "immediate",
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "on_collection",
  "on_university_payment",
  "on_visa_approval",
  "on_course_start",
  "custom",
];

export const DEFAULT_PAYMENT_BASIS_OPTIONS = [
  "fixed_amount",
  "percentage",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "per_student",
  "per_visa",
  "per_admission",
  "per_project",
  "per_milestone",
  "revenue_share",
  "profit_share",
  "retainer",
];

export const DEFAULT_EXISTING_CUSTOMER_RULES: ExistingCustomerRuleConfig[] = [
  { code: "existing_client", label: "Existing Client", enabled: true, signals: ["hasPriorVerifiedPayment", "hasCrmRecord"] },
  { code: "existing_student", label: "Existing Student", enabled: true, signals: ["hasActiveProgram"] },
  { code: "existing_parent", label: "Existing Parent", enabled: true, signals: ["hasCrmRecord"] },
  { code: "existing_immigration_client", label: "Existing Immigration Client", enabled: true, signals: ["hasPriorVerifiedPayment", "hasActiveProgram"] },
  { code: "existing_coaching_student", label: "Existing Coaching Student", enabled: true, signals: ["hasActiveProgram"] },
  { code: "existing_corporate_client", label: "Existing Corporate Client", enabled: true, signals: ["hasCrmRecord"] },
  { code: "continuing_student", label: "Continuing Student", enabled: true, signals: ["hasPriorVerifiedPaymentBeforeEvent"] },
  { code: "additional_services", label: "Additional Services", enabled: true, signals: ["hasPriorVerifiedPayment"] },
  { code: "further_studies", label: "Further Studies", enabled: true, signals: ["hasPriorVerifiedPayment", "hasActiveProgram"] },
];

export const DEFAULT_FRAUD_CHECKS: FraudCheckConfig[] = [
  { code: "existing_future_link_customer", enabled: true },
  { code: "duplicate_referral", enabled: true },
  { code: "self_referral", enabled: true },
  { code: "multiple_referral_claims", enabled: true },
  { code: "counselor_own_student", enabled: true },
  { code: "freelancer_existing_student", enabled: true },
  { code: "partner_existing_customer", enabled: true },
  { code: "continuing_student_referral", enabled: true },
  { code: "duplicate_commercial_agreement", enabled: true },
];

export const DEFAULT_PRIORITY_STACK: PriorityLayer[] = [
  "constitution",
  "customer_ownership",
  "commercial_agreement",
  "settlement_rules",
  "workflow",
  "accounting",
];

export const DEFAULT_COMMERCIAL_AGREEMENT_CONFIG: CommercialAgreementConfig = {
  overrideAuthority: {
    roles: ["super_admin"],
    allowFinanceAdmin: false,
  },
  protectedSettlementTypes: DEFAULT_PROTECTED_SETTLEMENT_TYPES,
  enabledOwnershipRules: DEFAULT_OWNERSHIP_RULES,
  partyTypes: DEFAULT_PARTY_TYPES,
  agreementTypes: DEFAULT_AGREEMENT_TYPES,
  settlementCycles: DEFAULT_SETTLEMENT_CYCLES,
  paymentBasisOptions: DEFAULT_PAYMENT_BASIS_OPTIONS,
  existingCustomerRules: DEFAULT_EXISTING_CUSTOMER_RULES,
  fraudChecks: DEFAULT_FRAUD_CHECKS,
  priorityStack: DEFAULT_PRIORITY_STACK,
};

export const COMMERCIAL_AGREEMENT_CONFIG_KEY = "commercial_agreement_config";

/** Constitutional precedence — ownership always before agreement */
export const CONSTITUTIONAL_LAYERS: PriorityLayer[] = ["constitution", "customer_ownership"];
