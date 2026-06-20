/** Collection category lifecycle — user-managed, not hardcoded. */
export type CategoryLifecycleStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

/** How a category posts to the GL. */
export type AccountingTreatment =
  | "REVENUE"
  | "THIRD_PARTY"
  | "RECOVERABLE"
  | "REIMBURSEMENT"
  | "INSTITUTION_RELATED";

export type CategoryPayeeType =
  | "INSTITUTION"
  | "VENDOR"
  | "GOVERNMENT"
  | "INSURER"
  | "STUDENT"
  | "OTHER";

export type TaxMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";

/** Line classification stored on bridge rows. */
export type LineClassificationKind =
  | "REVENUE"
  | "TRUST"
  | "DEPOSIT"
  | "INSTITUTION"
  | "RECOVERABLE"
  | "REIMBURSEMENT";

export interface CollectionCategoryCoa {
  id?: string;
  categoryId: string;
  entityId?: string | null;
  revenueAccountCode?: string | null;
  liabilityAccountCode?: string | null;
  recoverableAccountCode?: string | null;
  reimbursementPayableAccountCode?: string | null;
  institutionClearingAccountCode?: string | null;
  roleKey: string;
}

export interface CollectionCategoryVendor {
  id?: string;
  categoryId: string;
  vendorId: string;
  vendorName?: string;
  isDefault: boolean;
  country?: string | null;
  notes?: string | null;
}

export interface CollectionCategory {
  id: string;
  parentId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  path: string;
  depth: number;
  isPostingGroup: boolean;
  lifecycleStatus: CategoryLifecycleStatus;
  isSystem: boolean;
  displayOrder: number;
  accountingTreatment: AccountingTreatment;
  defaultTaxCode?: string | null;
  defaultTaxMode: TaxMode;
  requiresTrust: boolean;
  requiresDisbursement: boolean;
  defaultCollectionCurrency?: string | null;
  defaultPaymentCurrency?: string | null;
  defaultPayeeType?: CategoryPayeeType | null;
  expectedPayeeName?: string | null;
  defaultVendorId?: string | null;
  defaultInstitutionId?: string | null;
  defaultAggregatorId?: string | null;
  defaultRevenueRoleKey?: string | null;
  defaultTrustRoleKey?: string | null;
  defaultRecoverableRoleKey?: string | null;
  defaultReimbursementRoleKey?: string | null;
  commissionEligible: boolean;
  entityId?: string | null;
  coa?: CollectionCategoryCoa | null;
  children?: CollectionCategory[];
}

export interface StudentFinancialSummary {
  clientId: string;
  outstanding: number;
  collected: number;
  trustHeld: number;
  disbursed: number;
  refunded: number;
  recoverable: number;
  reimbursable: number;
  categories: StudentCategoryBreakdown[];
  services: StudentServiceBalance[];
}

export type ServiceCollectionStatus =
  | "NOT_INVOICED"
  | "DRAFT"
  | "OUTSTANDING"
  | "PARTIAL"
  | "COLLECTED"
  | "TRUST_HELD";

export interface StudentServiceBalance {
  serviceId: string;
  serviceCode: string | null;
  serviceName: string;
  collectionCategoryId: string | null;
  categoryName: string | null;
  invoiced: number;
  collected: number;
  outstanding: number;
  trustHeld: number;
  collectionStatus: ServiceCollectionStatus;
  currency: string;
}

export interface StudentCategoryBreakdown {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  categoryPath: string;
  parentName?: string | null;
  accountingTreatment: AccountingTreatment;
  expectedPayeeName?: string | null;
  invoiced: number;
  collected: number;
  trustHeld: number;
  disbursed: number;
  currency: string;
}

export interface PaymentPurposeRow {
  paymentId: string;
  invoiceId: string;
  clientId: string;
  paymentAmount: number;
  paymentCurrency: string;
  paidAt: string;
  categoryId?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  parentCategoryName?: string | null;
  paymentPurpose: string;
  allocatedAmount: number;
  accountingTreatment?: AccountingTreatment | null;
  expectedPayeeName?: string | null;
}
