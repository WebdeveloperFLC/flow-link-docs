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

export const MOCK_OWNERS: OwnerProfile[] = [];

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

export const MOCK_FINANCIAL_ACCOUNTS: FinancialAccount[] = [];

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