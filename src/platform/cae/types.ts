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
  relationshipClassifications?: string[];
  relationshipRoleCodes?: RelationshipPartyRoleCode[];
  overlayStackLayers?: OverlayStackLayer[];
  overlayPrecedenceDefault?: number;
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
  relationshipId?: string | null;
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

export type CommercialValidityStatus =
  | "active"
  | "upcoming"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "terminated"
  | "cancelled";

export type RelationshipStatus = "draft" | "active" | "suspended" | "terminated" | "archived";

export type RelationshipClassificationCode =
  | "standard"
  | "strategic_partner"
  | "university_partnership"
  | "aggregator"
  | "referral_channel"
  | "vendor"
  | "internal"
  | "trial";

export type RelationshipPartyRoleCode =
  | "principal"
  | "counterparty"
  | "referrer"
  | "beneficiary"
  | "subject_client"
  | "relationship_owner"
  | "guarantor"
  | "introducer"
  | "payee"
  | "payer";

export type RelationshipOwnershipStatus =
  | "unassigned"
  | "assigned_future_link"
  | "protected"
  | "shared"
  | "contested"
  | "override_pending"
  | "override_approved";

export type RelationshipProtectionLevel = "block_settlement" | "require_override" | "audit_only";

export type OverlayStackLayer =
  | "constitution"
  | "customer_ownership"
  | "commercial_agreement"
  | "overlay"
  | "promotion"
  | "incentive"
  | "settlement_rules"
  | "workflow"
  | "accounting";

export type RelationshipContactType =
  | "commercial"
  | "legal"
  | "finance"
  | "operations"
  | "escalation"
  | "relationship_manager";

export interface CommercialRelationship {
  id: string;
  relationshipType: string;
  partyAId: string;
  partyBId: string;
  companyEntityId?: string | null;
  branchId?: string | null;
  countryCode?: string | null;
  status: RelationshipStatus;
  validFrom?: string | null;
  validTo?: string | null;
  noticePeriodDays?: number | null;
  relationshipManagerId?: string | null;
  relationshipClassificationCode?: RelationshipClassificationCode | string;
  externalReference?: string | null;
  healthScore?: number | null;
  renewalDate?: string | null;
  adapterSourceModule?: string | null;
  adapterSourceRecordId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CommercialRelationshipPartyRole {
  id: string;
  relationshipId: string;
  financialPartyId: string;
  roleCode: RelationshipPartyRoleCode | string;
  isPrimary: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CommercialRelationshipOwnership {
  id: string;
  relationshipId: string;
  subjectFinancialPartyId: string;
  ownershipStatus: RelationshipOwnershipStatus;
  protectionLevel: RelationshipProtectionLevel;
  ownershipRuleCode?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  status: "draft" | "active" | "suspended" | "expired" | "archived";
  metadata?: Record<string, unknown>;
}

export interface CommercialRelationshipContact {
  id: string;
  relationshipId: string;
  contactType: RelationshipContactType;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  profileId?: string | null;
  isPrimary: boolean;
  active: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface EffectiveCommercialPosition {
  found: boolean;
  asOf: string;
  relationshipId?: string;
  agreementId?: string | null;
  agreementVersionId?: string | null;
  partyRoles?: CommercialRelationshipPartyRole[];
  ownership?: CommercialRelationshipOwnership[];
  contacts?: CommercialRelationshipContact[];
  overlays?: CommercialOfferOverlay[];
  settlementAllowed: boolean;
  blockReasons: string[];
}

export interface CreateCommercialRelationshipInput {
  relationshipType: string;
  partyAId: string;
  partyBId: string;
  companyEntityId?: string;
  branchId?: string;
  countryCode?: string;
  validFrom?: string;
  validTo?: string;
  noticePeriodDays?: number;
  relationshipManagerId?: string;
  relationshipClassificationCode?: RelationshipClassificationCode | string;
  externalReference?: string;
  healthScore?: number;
  renewalDate?: string;
  adapterSourceModule?: string;
  adapterSourceRecordId?: string;
  metadata?: Record<string, unknown>;
}

export interface CommercialOfferOverlay {
  id: string;
  masterAgreementId: string;
  relationshipId?: string | null;
  offerType: string;
  name: string;
  description?: string | null;
  financialImpact?: Record<string, unknown>;
  validFrom: string;
  validUntil: string;
  status: CommercialValidityStatus | string;
  precedenceRank?: number;
  stackLayer?: OverlayStackLayer | string;
  supersedesOverlayId?: string | null;
  appliesToJson?: Record<string, unknown>;
  supportingDocumentPaths?: string[];
  approvalReference?: string | null;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
  targetJson?: Record<string, unknown>;
  adapterSourceModule?: string | null;
  adapterSourceRecordId?: string | null;
}

export interface CreateOfferOverlayInput {
  masterAgreementId: string;
  relationshipId?: string;
  offerType: string;
  name: string;
  description?: string;
  financialImpact?: Record<string, unknown>;
  validFrom: string;
  validUntil: string;
  precedenceRank?: number;
  stackLayer?: OverlayStackLayer | string;
  supersedesOverlayId?: string;
  appliesToJson?: Record<string, unknown>;
  supportingDocumentPaths?: string[];
  approvalReference?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  targetJson?: Record<string, unknown>;
  createdBy?: string;
  adapterSourceModule?: string;
  adapterSourceRecordId?: string;
}

/** Read-only institution promotion from Institution Master (SSOT) */
export interface InstitutionApplicationFeeWaiver {
  institutionId: string;
  institutionName: string;
  amount: number;
  currency: string;
  validFrom: string;
  validUntil?: string | null;
  validityStatus: CommercialValidityStatus;
  isWaiver: boolean;
  programId?: string | null;
  partnershipRouteId?: string | null;
  masterUpdatedAt?: string;
  readOnly: true;
}

/** Generated Agreement Summary — never persisted as editable object */
export interface AgreementSummary {
  generatedAt: string;
  asOfDate: string;
  agreementId: string;
  overview: AgreementSummaryOverview;
  commercialSummary: string[];
  commissionStructure: AgreementSummaryCommissionRule[];
  temporaryOffers: CommercialOfferOverlay[];
  validityItems: AgreementSummaryValidityItem[];
  institutionPromotions: InstitutionApplicationFeeWaiver[];
  figures: AgreementSummaryFigures;
  sourceRefs: AgreementSummarySourceRefs;
}

export interface AgreementSummaryOverview {
  agreementStatus: string;
  agreementType: string;
  relationship?: CommercialRelationship | null;
  parties: { role: string; displayName: string; partyType: string }[];
  companyEntityId?: string | null;
  branchId?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  renewalDate?: string | null;
  noticePeriodDays?: number | null;
  agreementHealth: CommercialValidityStatus;
  relationshipManagerId?: string | null;
  versionNumber?: number | null;
}

export interface AgreementSummaryCommissionRule {
  commissionType: string;
  calculationMethod: string;
  triggerEvent: string;
  settlementCycle: string;
  currency: string;
  taxTreatment?: string;
  minimumThreshold?: number | null;
  maximumLimit?: number | null;
  applicableCountries?: string[];
  applicableInstitutions?: string[];
  applicablePrograms?: string[];
  effectiveDate: string;
  expiryDate?: string | null;
  currentStatus: CommercialValidityStatus;
  businessSummary: string;
}

export interface AgreementSummaryValidityItem {
  itemType: string;
  itemId: string;
  label: string;
  validFrom?: string | null;
  validUntil?: string | null;
  status: CommercialValidityStatus;
  settlementAllowed: boolean;
}

export interface AgreementSummaryFigures {
  estimatedRevenue?: number | null;
  actualRevenue?: number | null;
  revenueTarget?: number | null;
  commissionEarned?: number | null;
  commissionReceived?: number | null;
  commissionOutstanding?: number | null;
  temporaryBonusLiability?: number | null;
  settlementValue?: number | null;
  pendingClaims?: number | null;
  performanceAgainstTarget?: number | null;
}

export interface AgreementSummarySourceRefs {
  agreementVersionId?: string | null;
  relationshipId?: string | null;
  institutionId?: string | null;
  adapterSourceModule?: string | null;
  adapterSourceRecordId?: string | null;
}
