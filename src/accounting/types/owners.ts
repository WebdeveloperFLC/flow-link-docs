export type OwnerCategory = 'BUSINESS' | 'PERSONAL' | 'FAMILY_OFFICE';

export type BusinessOwnerType =
  | 'CORPORATION'
  | 'PRIVATE_LIMITED'
  | 'LLC'
  | 'PARTNERSHIP'
  | 'SOLE_PROPRIETOR'
  | 'BRAND_TRADE_NAME'
  | 'FRANCHISE';

export type PersonalOwnerType =
  | 'INDIVIDUAL'
  | 'HUF'
  | 'TRUST'
  | 'NRI'
  | 'MINOR';

export type AccountType =
  | 'CORPORATE'
  | 'CURRENT'
  | 'PAYROLL'
  | 'CREDIT_CARD'
  | 'MERCHANT'
  | 'SAVINGS'
  | 'NRE_SAVINGS'
  | 'NRO_SAVINGS'
  | 'FCNR_DEPOSIT'
  | 'FIXED_DEPOSIT'
  | 'RECURRING_DEPOSIT'
  | 'DEMAT'
  | 'TRADING'
  | 'MUTUAL_FUND'
  | 'PPF'
  | 'EPF'
  | 'NPS'
  | 'SSY'
  | 'BONDS'
  | 'STOCKS'
  | 'REAL_ESTATE'
  | 'LIC_POLICY'
  | 'TERM_INSURANCE'
  | 'ULIP'
  | 'HEALTH_INSURANCE'
  | 'VEHICLE_INSURANCE'
  | 'ENDOWMENT_POLICY'
  | 'HOME_LOAN'
  | 'CAR_LOAN'
  | 'PERSONAL_LOAN'
  | 'CREDIT_CARD_LIABILITY'
  | 'EDUCATION_LOAN'
  | 'CASH'
  | 'GOLD'
  | 'OTHER';

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'INVESTMENT' | 'INSURANCE';

export interface OwnerProfile {
  id: string;
  tenantId: string;
  category: OwnerCategory;
  businessType?: BusinessOwnerType;
  brandName?: string;
  legalName?: string;
  linkedEntityId?: string;
  personalType?: PersonalOwnerType;
  firstName?: string;
  lastName?: string;
  relationship?: string;
  dateOfBirth?: string;
  panNumber?: string;
  aadharLast4?: string;
  gstNumber?: string;
  taxId?: string;
  sin?: string;
  email?: string;
  phone?: string;
  address?: string;
  country: string;
  tags: string[];
  notes?: string;
  avatarInitials?: string;
  avatarColor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Optional structured data for HUF / Trust
  hufMembers?: { name: string; relationship: string }[];
  trustees?: string[];
  beneficiaries?: string[];
  trustType?: 'PRIVATE' | 'PUBLIC' | 'CHARITABLE';
  kartaName?: string;
  linkedIndividualId?: string;
}

export interface FinancialAccount {
  id: string;
  tenantId: string;
  ownerProfileId: string;
  linkedEntityId?: string;
  glAccountId?: string;
  accountType: AccountType;
  category: AccountCategory;
  nickname: string;
  institutionName: string;
  accountNumber?: string;
  policyNumber?: string;
  folioNumber?: string;
  dpId?: string;
  maturityDate?: string;
  premiumAmount?: number;
  premiumFrequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'SINGLE';
  nextPremiumDate?: string;
  sumAssured?: number;
  currency: string;
  currentBalance?: number;
  interestRate?: number;
  emiAmount?: number;
  emiDay?: number;
  country: string;
  branch?: string;
  ifscCode?: string;
  swiftCode?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MATURED' | 'CLOSED' | 'SURRENDERED';
  openedDate?: string;
  closedDate?: string;
  tags: string[];
  remarks?: string;
  documents: string[];
  createdAt: string;
  updatedAt: string;
}