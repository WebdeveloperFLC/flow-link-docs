export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type SourceType = 'MANUAL' | 'OCR_UPLOAD' | 'AP' | 'AR';
export type JournalStatus = 'DRAFT' | 'PENDING_REVIEW' | 'POSTED' | 'VOIDED';
export type Currency = 'CAD' | 'USD' | 'INR';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  description: string;
  taxCode: string;
}

export interface Journal {
  id: string;
  entryNumber: string;
  entryDate: string;
  entity: string;
  narration: string;
  sourceType: SourceType;
  reference: string;
  currency: Currency;
  status: JournalStatus;
  createdBy: string;
  postedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  lines: JournalLine[];
}

export const MOCK_ACCOUNTS: Account[] = [];

const acc = (id: string) => MOCK_ACCOUNTS.find(a => a.id === id)!;
const ln = (
  id: string,
  accountId: string,
  debit: number,
  credit: number,
  description: string,
  taxCode = ''
): JournalLine => {
  const a = acc(accountId);
  return {
    id,
    accountId,
    accountCode: a.code,
    accountName: a.name,
    accountType: a.type,
    debit,
    credit,
    description,
    taxCode,
  };
};

export const MOCK_JOURNALS: Journal[] = [];

// Legacy export kept for any existing imports
export const mockJournals = MOCK_JOURNALS;
