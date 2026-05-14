import type { OwnerProfile, FinancialAccount, AccountType, AccountCategory } from '../types/owners';

const T = 'tenant-1';
const now = '2024-10-18T12:00:00Z';

const ASSET_TYPES: AccountType[] = ['CORPORATE','CURRENT','PAYROLL','MERCHANT','SAVINGS','NRE_SAVINGS','NRO_SAVINGS','FCNR_DEPOSIT','FIXED_DEPOSIT','RECURRING_DEPOSIT','CASH','GOLD','REAL_ESTATE'];
const INVESTMENT_TYPES: AccountType[] = ['DEMAT','TRADING','MUTUAL_FUND','PPF','EPF','NPS','SSY','BONDS','STOCKS'];
const INSURANCE_TYPES: AccountType[] = ['LIC_POLICY','TERM_INSURANCE','ULIP','HEALTH_INSURANCE','VEHICLE_INSURANCE','ENDOWMENT_POLICY'];
const LIABILITY_TYPES: AccountType[] = ['HOME_LOAN','CAR_LOAN','PERSONAL_LOAN','CREDIT_CARD_LIABILITY','EDUCATION_LOAN','CREDIT_CARD'];

export function categoryOf(t: AccountType): AccountCategory {
  if (LIABILITY_TYPES.includes(t)) return 'LIABILITY';
  if (INVESTMENT_TYPES.includes(t)) return 'INVESTMENT';
  if (INSURANCE_TYPES.includes(t)) return 'INSURANCE';
  return 'ASSET';
}

export function formatMaskedAccount(num?: string): string {
  if (!num) return '••••';
  const last = num.slice(-4);
  return `••••${last}`;
}

export const MOCK_OWNERS: OwnerProfile[] = [
  // ── BUSINESS ────────────────────────────────────────────────
  {
    id: 'o1', tenantId: T, category: 'BUSINESS', businessType: 'CORPORATION',
    brandName: 'Future Link Consultants', legalName: 'Future Link Consultants Inc.',
    linkedEntityId: 'e1', country: 'CA', taxId: '789456123BC0001',
    email: 'finance@futurelink.ca', phone: '+1 416 555 0100',
    tags: ['hq', 'corporation'], isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o2', tenantId: T, category: 'BUSINESS', businessType: 'LLC',
    brandName: 'Future Link Consultants USA', legalName: 'Future Link USA LLC',
    linkedEntityId: 'e2', country: 'US', taxId: '12-3456789',
    email: 'usa@futurelink.com', tags: ['llc'],
    isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o3', tenantId: T, category: 'BUSINESS', businessType: 'PRIVATE_LIMITED',
    brandName: 'Future Link India', legalName: 'Future Link India Pvt Ltd',
    linkedEntityId: 'e3', country: 'IN',
    panNumber: 'AAFCF1234A', gstNumber: '27AAFCF1234A1Z1',
    email: 'india@futurelink.in', tags: ['pvtltd'],
    isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o4', tenantId: T, category: 'BUSINESS', businessType: 'BRAND_TRADE_NAME',
    brandName: 'Future Link Academy', legalName: 'Future Link Academy (a brand of Future Link India Pvt Ltd)',
    linkedEntityId: 'e5', country: 'IN', tags: ['brand', 'academy'],
    isActive: true, createdAt: now, updatedAt: now,
  },
  // ── PERSONAL ────────────────────────────────────────────────
  {
    id: 'o5', tenantId: T, category: 'PERSONAL', personalType: 'INDIVIDUAL',
    firstName: 'Rajesh', lastName: 'Sharma', relationship: 'Self',
    dateOfBirth: '1975-03-15', country: 'IN', panNumber: 'ABCPS1234D', aadharLast4: '4521',
    email: 'rajesh.sharma@example.com', phone: '+91 98200 12345',
    tags: ['self'], isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o6', tenantId: T, category: 'PERSONAL', personalType: 'INDIVIDUAL',
    firstName: 'Priya', lastName: 'Sharma', relationship: 'Spouse',
    dateOfBirth: '1978-07-22', country: 'IN', panNumber: 'DEFPS5678K',
    email: 'priya.sharma@example.com', tags: ['spouse'],
    isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o7', tenantId: T, category: 'PERSONAL', personalType: 'INDIVIDUAL',
    firstName: 'Arjun', lastName: 'Sharma', relationship: 'Son',
    dateOfBirth: '2002-11-05', country: 'IN', panNumber: 'GHIPS9012L',
    tags: ['son'], isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o8', tenantId: T, category: 'FAMILY_OFFICE', personalType: 'HUF',
    brandName: 'Sharma Family HUF', kartaName: 'Rajesh Sharma',
    country: 'IN', panNumber: 'ABCHS5678F',
    hufMembers: [
      { name: 'Rajesh Sharma', relationship: 'Karta' },
      { name: 'Priya Sharma', relationship: 'Spouse' },
      { name: 'Arjun Sharma', relationship: 'Son' },
    ],
    tags: ['huf'], isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o9', tenantId: T, category: 'FAMILY_OFFICE', personalType: 'TRUST',
    brandName: 'Sharma Family Trust', trustType: 'PRIVATE',
    country: 'IN', panNumber: 'AACTS9012T',
    trustees: ['Rajesh Sharma', 'Priya Sharma'],
    beneficiaries: ['Arjun Sharma'],
    notes: 'Trust deed dated 2018-04-01',
    tags: ['trust'], isActive: true, createdAt: now, updatedAt: now,
  },
  {
    id: 'o10', tenantId: T, category: 'PERSONAL', personalType: 'NRI',
    firstName: 'Rajesh', lastName: 'Sharma (NRI)', relationship: 'Self',
    country: 'CA', linkedIndividualId: 'o5', sin: 'XXX-XXX-901',
    panNumber: 'ABCPS1234D',
    tags: ['nri'], isActive: true, createdAt: now, updatedAt: now,
  },
];

const mk = (a: Partial<FinancialAccount> & {
  id: string; ownerProfileId: string; accountType: AccountType;
  nickname: string; institutionName: string; currency: string;
}): FinancialAccount => ({
  tenantId: T,
  category: categoryOf(a.accountType),
  status: 'ACTIVE',
  country: a.country ?? 'IN',
  tags: a.tags ?? [],
  documents: a.documents ?? [],
  createdAt: now, updatedAt: now,
  ...a,
}) as FinancialAccount;

export const MOCK_FINANCIAL_ACCOUNTS: FinancialAccount[] = [
  // ── Business — Future Link Canada (o1) ─────────────────────
  mk({ id: 'fa1', ownerProfileId: 'o1', linkedEntityId: 'e1', accountType: 'CORPORATE',
    nickname: 'RBC Business Chequing', institutionName: 'RBC Royal Bank',
    accountNumber: 'CA00112233444521', currency: 'CAD', currentBalance: 245000,
    country: 'CA', branch: 'Toronto Downtown', openedDate: '2019-01-12' }),
  mk({ id: 'fa2', ownerProfileId: 'o1', linkedEntityId: 'e1', accountType: 'PAYROLL',
    nickname: 'RBC Payroll', institutionName: 'RBC Royal Bank',
    accountNumber: 'CA00112233447832', currency: 'CAD', currentBalance: 85000, country: 'CA' }),
  mk({ id: 'fa3', ownerProfileId: 'o1', linkedEntityId: 'e1', accountType: 'CREDIT_CARD',
    nickname: 'CIBC Business VISA', institutionName: 'CIBC',
    accountNumber: '4500000000001288', currency: 'CAD', currentBalance: -12400, country: 'CA' }),
  // ── Business — Future Link USA (o2) ────────────────────────
  mk({ id: 'fa4', ownerProfileId: 'o2', linkedEntityId: 'e2', accountType: 'CORPORATE',
    nickname: 'Chase Business Checking', institutionName: 'JPMorgan Chase',
    accountNumber: 'US00998877665544', currency: 'USD', currentBalance: 180000, country: 'US' }),
  // ── Business — Future Link India (o3) ──────────────────────
  mk({ id: 'fa5', ownerProfileId: 'o3', linkedEntityId: 'e3', accountType: 'CURRENT',
    nickname: 'HDFC Current A/c', institutionName: 'HDFC Bank',
    accountNumber: '500100100200300', ifscCode: 'HDFC0000123', currency: 'INR',
    currentBalance: 1240000 }),
  mk({ id: 'fa6', ownerProfileId: 'o3', linkedEntityId: 'e3', accountType: 'CREDIT_CARD',
    nickname: 'HDFC Corporate CC', institutionName: 'HDFC Bank',
    accountNumber: '4514000099992211', currency: 'INR', currentBalance: -85000 }),
  // ── Personal — Rajesh Sharma (o5) ──────────────────────────
  mk({ id: 'fa7', ownerProfileId: 'o5', accountType: 'SAVINGS',
    nickname: 'HDFC Savings', institutionName: 'HDFC Bank',
    accountNumber: '500100100400123456', ifscCode: 'HDFC0000123',
    currency: 'INR', currentBalance: 450000 }),
  mk({ id: 'fa8', ownerProfileId: 'o5', accountType: 'FIXED_DEPOSIT',
    nickname: 'SBI FD — 5L', institutionName: 'State Bank of India',
    accountNumber: 'SBIFD9981122', currency: 'INR', currentBalance: 500000,
    interestRate: 7.2, openedDate: '2024-03-15', maturityDate: '2026-03-15',
    remarks: 'Cumulative payout' }),
  mk({ id: 'fa9', ownerProfileId: 'o5', accountType: 'FIXED_DEPOSIT',
    nickname: 'ICICI FD — 3L', institutionName: 'ICICI Bank',
    accountNumber: 'ICICIFD7712', currency: 'INR', currentBalance: 300000,
    interestRate: 6.8, openedDate: '2023-09-30', maturityDate: '2025-09-30' }),
  mk({ id: 'fa10', ownerProfileId: 'o5', accountType: 'LIC_POLICY',
    nickname: 'LIC Jeevan Anand', institutionName: 'Life Insurance Corp of India',
    policyNumber: '123456789', currency: 'INR', sumAssured: 2000000,
    premiumAmount: 42000, premiumFrequency: 'YEARLY',
    nextPremiumDate: '2025-03-01', remarks: 'Endowment + whole life' }),
  mk({ id: 'fa11', ownerProfileId: 'o5', accountType: 'TERM_INSURANCE',
    nickname: 'LIC Term Plan', institutionName: 'Life Insurance Corp of India',
    policyNumber: '987654321', currency: 'INR', sumAssured: 10000000,
    premiumAmount: 18500, premiumFrequency: 'YEARLY',
    nextPremiumDate: '2025-01-15' }),
  mk({ id: 'fa12', ownerProfileId: 'o5', accountType: 'DEMAT',
    nickname: 'Zerodha Demat', institutionName: 'Zerodha Broking',
    dpId: '12345678', currency: 'INR', currentBalance: 680000,
    remarks: 'INFY 200, RELIANCE 50, HDFCBANK 100' }),
  mk({ id: 'fa13', ownerProfileId: 'o5', accountType: 'TRADING',
    nickname: 'Zerodha Trading', institutionName: 'Zerodha Broking',
    dpId: '12345678', currency: 'INR', currentBalance: 25000 }),
  mk({ id: 'fa14', ownerProfileId: 'o5', accountType: 'HOME_LOAN',
    nickname: 'SBI Home Loan', institutionName: 'State Bank of India',
    accountNumber: 'SBIHL5544001', currency: 'INR', currentBalance: -3200000,
    interestRate: 8.5, emiAmount: 28500, emiDay: 5,
    openedDate: '2018-06-01', maturityDate: '2033-06-01' }),
  mk({ id: 'fa15', ownerProfileId: 'o5', accountType: 'CAR_LOAN',
    nickname: 'HDFC Car Loan', institutionName: 'HDFC Bank',
    accountNumber: 'HDFCCL2271', currency: 'INR', currentBalance: -450000,
    interestRate: 9.2, emiAmount: 12000, emiDay: 10,
    openedDate: '2022-04-01', maturityDate: '2027-04-01' }),
  mk({ id: 'fa16', ownerProfileId: 'o5', accountType: 'PPF',
    nickname: 'PPF Account', institutionName: 'SBI',
    accountNumber: 'PPF11225588', currency: 'INR', currentBalance: 1200000,
    interestRate: 7.1 }),
  // ── Personal — Priya Sharma (o6) ───────────────────────────
  mk({ id: 'fa17', ownerProfileId: 'o6', accountType: 'SAVINGS',
    nickname: 'ICICI Savings', institutionName: 'ICICI Bank',
    accountNumber: 'ICICI55661199', ifscCode: 'ICIC0001122',
    currency: 'INR', currentBalance: 180000 }),
  mk({ id: 'fa18', ownerProfileId: 'o6', accountType: 'DEMAT',
    nickname: 'ICICI Demat', institutionName: 'ICICI Direct',
    dpId: '88774422', currency: 'INR', currentBalance: 320000,
    remarks: 'TCS 50, ITC 200' }),
  mk({ id: 'fa19', ownerProfileId: 'o6', accountType: 'RECURRING_DEPOSIT',
    nickname: 'SBI RD', institutionName: 'State Bank of India',
    accountNumber: 'SBIRD2024', currency: 'INR', currentBalance: 60000,
    interestRate: 6.5, premiumAmount: 5000, premiumFrequency: 'MONTHLY',
    openedDate: '2024-01-01', maturityDate: '2025-12-31' }),
  mk({ id: 'fa20', ownerProfileId: 'o6', accountType: 'LIC_POLICY',
    nickname: 'LIC Spouse Plan', institutionName: 'LIC of India',
    policyNumber: '556677889', currency: 'INR', sumAssured: 1000000,
    premiumAmount: 22000, premiumFrequency: 'YEARLY',
    nextPremiumDate: '2024-12-20' }),
  // ── HUF (o8) ───────────────────────────────────────────────
  mk({ id: 'fa21', ownerProfileId: 'o8', accountType: 'SAVINGS',
    nickname: 'SBI HUF Savings', institutionName: 'State Bank of India',
    accountNumber: 'SBI998877665', currency: 'INR', currentBalance: 320000 }),
  mk({ id: 'fa22', ownerProfileId: 'o8', accountType: 'FIXED_DEPOSIT',
    nickname: 'HUF FD — 8L', institutionName: 'State Bank of India',
    accountNumber: 'SBIFDHUF1199', currency: 'INR', currentBalance: 800000,
    interestRate: 7.5, openedDate: '2024-06-30', maturityDate: '2026-06-30' }),
  // ── NRI (o10) ──────────────────────────────────────────────
  mk({ id: 'fa23', ownerProfileId: 'o10', accountType: 'NRE_SAVINGS',
    nickname: 'HDFC NRE Savings', institutionName: 'HDFC Bank',
    accountNumber: 'NRE5511220099', ifscCode: 'HDFC0000999',
    currency: 'INR', currentBalance: 2400000, country: 'CA' }),
  mk({ id: 'fa24', ownerProfileId: 'o10', accountType: 'NRO_SAVINGS',
    nickname: 'HDFC NRO Savings', institutionName: 'HDFC Bank',
    accountNumber: 'NRO5511220088', currency: 'INR', currentBalance: 180000, country: 'CA' }),
  // ── Arjun Sharma (o7) ──────────────────────────────────────
  mk({ id: 'fa25', ownerProfileId: 'o7', accountType: 'SAVINGS',
    nickname: 'SBI Youth Savings', institutionName: 'State Bank of India',
    accountNumber: 'SBI22113399', currency: 'INR', currentBalance: 35000 }),
];

export function getOwnerById(id: string): OwnerProfile | undefined {
  return MOCK_OWNERS.find(o => o.id === id);
}

export function getAccountsForOwner(ownerId: string, accounts: FinancialAccount[] = MOCK_FINANCIAL_ACCOUNTS): FinancialAccount[] {
  return accounts.filter(a => a.ownerProfileId === ownerId);
}

export function ownerDisplayName(o: OwnerProfile): string {
  if (o.brandName) return o.brandName;
  return [o.firstName, o.lastName].filter(Boolean).join(' ') || 'Unnamed';
}

export function ownerInitials(o: OwnerProfile): string {
  const name = ownerDisplayName(o);
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

const AVATAR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

export function avatarColorClass(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function countryFlag(country: string): string {
  const map: Record<string, string> = { CA: '🇨🇦', US: '🇺🇸', IN: '🇮🇳' };
  return map[country] ?? '🌐';
}

export function formatINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatAccountAmount(amount: number, currency: string): string {
  if (currency === 'INR') return formatINR(amount);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const sym = currency === 'CAD' ? 'CAD ' : currency === 'USD' ? '$' : `${currency} `;
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(1)}K`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}

export function maskTaxId(id?: string): string {
  if (!id || id.length < 4) return id ?? '';
  const last = id.slice(-3);
  return `${id[0]}${'•'.repeat(Math.max(2, id.length - 4))}${last}`;
}

// FX rates relative to INR (1 unit foreign = N INR)
export const MOCK_FX: Record<string, number> = { INR: 1, CAD: 62, USD: 84 };

export function convertTo(amount: number, from: string, to: string): number {
  const inr = amount * (MOCK_FX[from] ?? 1);
  return inr / (MOCK_FX[to] ?? 1);
}