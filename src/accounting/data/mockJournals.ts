export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type SourceType = 'MANUAL' | 'OCR_UPLOAD' | 'AP' | 'AR';
export type JournalStatus = 'DRAFT' | 'PENDING_REVIEW' | 'POSTED' | 'VOIDED';
export type Currency = 'CAD' | 'USD' | 'INR';

/**
 * Originating workspace for a journal (Phase 1 journal contract).
 * Distinct from the legacy `sourceType`; persisted to `source_module`.
 */
export type SourceModule =
  | 'MANUAL'
  | 'CRM_AR'
  | 'TRUST'
  | 'AP'
  | 'PAYROLL'
  | 'TAX'
  | 'CLOSE'
  | 'BANK_RECON'
  | 'INTERCOMPANY';

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
  /** Journal contract (Phase 1) — line-level entity/branch + symbolic role. */
  entityId?: string;
  branchId?: string;
  accountRole?: string;
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
  /** ── Journal contract (Phase 1) ───────────────────────────────── */
  entityId?: string;
  branchId?: string;
  sourceModule?: SourceModule;
  sourceRecordId?: string;
  postingDate?: string;
  isReversal?: boolean;
  reversalOfJournalId?: string;
  reversedByJournalId?: string;
  attachmentPath?: string;
  /** Reserved nullable references for future commission integration. */
  studentId?: string;
  applicationId?: string;
  institutionId?: string;
  aggregatorId?: string;
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
