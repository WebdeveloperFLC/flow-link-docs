/**
 * Commercial Agreement Engine (CAE) — types.
 * Customer ownership & attribution is a core rule within CAE, not a separate engine.
 */

export type SettlementEligibilityStatus =
  | "eligible"
  | "not_eligible"
  | "override_pending"
  | "override_approved";

export type CustomerOwnershipBlockReason =
  | "existing_customer_prior_payment"
  | "existing_customer_crm_record"
  | "assigned_to_future_link"
  | "continuing_relationship"
  | "active_commercial_agreement"
  | "referral_existing_client"
  | "duplicate_referral"
  | "ownership_conflict"
  | "existing_client"
  | "existing_student"
  | "existing_parent"
  | "existing_immigration_client"
  | "existing_coaching_student"
  | "existing_corporate_client"
  | "continuing_student"
  | "additional_services"
  | "further_studies";

export type FraudCheckCode =
  | "existing_future_link_customer"
  | "duplicate_referral"
  | "self_referral"
  | "multiple_referral_claims"
  | "counselor_own_student"
  | "freelancer_existing_student"
  | "partner_existing_customer"
  | "continuing_student_referral"
  | "duplicate_commercial_agreement";

export type AgreementLifecycleStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "active"
  | "suspended"
  | "expired"
  | "superseded"
  | "archived";

export type AgreementVersionStatus = "draft" | "approved" | "active" | "superseded";

export type AgreementPartyRole =
  | "payee"
  | "payer"
  | "beneficiary"
  | "counterparty"
  | "referrer"
  | "subject";

export type PriorityLayer =
  | "constitution"
  | "customer_ownership"
  | "commercial_agreement"
  | "settlement_rules"
  | "workflow"
  | "accounting";

export interface CustomerOwnershipSnapshot {
  clientId: string;
  clientCreatedAt?: string | null;
  hasPriorVerifiedPayment?: boolean;
  hasPriorVerifiedPaymentBeforeEvent?: boolean;
  assignedCounselorId?: string | null;
  ownerId?: string | null;
  closingCounselorId?: string | null;
  hasActiveProgram?: boolean;
  hasActiveCommissionAgreement?: boolean;
  hasCrmRecord?: boolean;
  referralPredatesClient?: boolean;
  duplicateReferralSignal?: boolean;
  selfReferralSignal?: boolean;
  multipleReferralClaimsSignal?: boolean;
  counselorOwnStudentSignal?: boolean;
  duplicateAgreementSignal?: boolean;
  /** Claimant party (counselor/freelancer/partner) for fraud checks */
  claimantPartyId?: string | null;
  claimantCounselorId?: string | null;
}

export interface SettlementEligibilityRequest {
  settlementType: string;
  clientId: string;
  sourceModule: string;
  sourceRecordId: string;
  asOfDate?: string;
  amount?: number;
  currency?: string;
  agreementId?: string | null;
  agreementVersionId?: string | null;
  financialPartyId?: string | null;
  claimantCounselorId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SettlementEligibilityDecision {
  status: SettlementEligibilityStatus;
  eligible: boolean;
  reasons: CustomerOwnershipBlockReason[];
  fraudReasons: FraudCheckCode[];
  reasonLabels: string[];
  decisionId?: string | null;
  businessEventId?: string | null;
  overrideRequestId?: string | null;
  ownershipSnapshot?: CustomerOwnershipSnapshot;
  agreementId?: string | null;
  agreementVersionId?: string | null;
}

export interface OverrideAuthorityConfig {
  roles: string[];
  allowFinanceAdmin: boolean;
}

export interface ExistingCustomerRuleConfig {
  code: string;
  label: string;
  enabled: boolean;
  signals: string[];
}

export interface FraudCheckConfig {
  code: FraudCheckCode;
  enabled: boolean;
}

export interface CommercialAgreementConfig {
  overrideAuthority: OverrideAuthorityConfig;
  protectedSettlementTypes: string[];
  enabledOwnershipRules: CustomerOwnershipBlockReason[];
  partyTypes: string[];
  agreementTypes: string[];
  settlementCycles: string[];
  paymentBasisOptions: string[];
  existingCustomerRules: ExistingCustomerRuleConfig[];
  fraudChecks: FraudCheckConfig[];
  priorityStack: PriorityLayer[];
}

export interface OverrideRequestInput {
  clientId: string;
  settlementType: string;
  sourceModule: string;
  sourceRecordId: string;
  businessReason: string;
  supportingDocumentPaths?: string[];
  requestedByUserId: string;
  agreementId?: string | null;
  agreementVersionId?: string | null;
  ownershipSnapshot?: CustomerOwnershipSnapshot;
}

/** Universal financial party registry row */
export interface FinancialParty {
  id: string;
  partyType: string;
  displayName: string;
  sourceModule?: string | null;
  sourceRecordId?: string | null;
  companyEntityId?: string | null;
  branchId?: string | null;
  countryCode?: string | null;
  metadata?: Record<string, unknown>;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommercialAgreementTemplate {
  id: string;
  templateCode: string;
  name: string;
  agreementType: string;
  description?: string | null;
  defaultCurrency: string;
  defaultPaymentBasis?: string | null;
  defaultSettlementCycle?: string | null;
  defaultRules?: Record<string, unknown>;
  priority: number;
  active: boolean;
}

export interface CommercialAgreement {
  id: string;
  agreementNumber?: string | null;
  templateId?: string | null;
  agreementType: string;
  status: AgreementLifecycleStatus;
  currentVersionId?: string | null;
  priority: number;
  companyEntityId?: string | null;
  branchId?: string | null;
  countryCode?: string | null;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
  adapterSourceModule?: string | null;
  adapterSourceRecordId?: string | null;
  workflowInstanceId?: string | null;
  createdBy?: string | null;
}

export interface CommercialAgreementVersion {
  id: string;
  agreementId: string;
  versionNumber: number;
  status: AgreementVersionStatus;
  paymentBasis?: string | null;
  settlementCycle?: string | null;
  rulesJson?: Record<string, unknown>;
  taxRulesJson?: Record<string, unknown>;
  paymentMethod?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changeSummary?: string | null;
}

export interface CreateFinancialPartyInput {
  partyType: string;
  displayName: string;
  sourceModule?: string;
  sourceRecordId?: string;
  companyEntityId?: string;
  branchId?: string;
  countryCode?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAgreementFromTemplateInput {
  templateCode: string;
  agreementType?: string;
  companyEntityId?: string;
  branchId?: string;
  countryCode?: string;
  currency?: string;
  validFrom?: string;
  validTo?: string;
  createdBy?: string;
  adapterSourceModule?: string;
  adapterSourceRecordId?: string;
  partyIds?: { financialPartyId: string; role: AgreementPartyRole; isPrimary?: boolean }[];
}

export interface CreateAgreementVersionInput {
  agreementId: string;
  paymentBasis?: string;
  settlementCycle?: string;
  rulesJson?: Record<string, unknown>;
  taxRulesJson?: Record<string, unknown>;
  paymentMethod?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  changeSummary?: string;
  createdBy?: string;
}
