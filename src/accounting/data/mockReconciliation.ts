export interface BankStatementLine {
  id: string;
  date: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
  rawText: string;
}

export interface ReconciliationMatch {
  statementLineId: string;
  journalLineId?: string;
  journalEntryNumber?: string;
  confidence: number;
  matchType: 'EXACT' | 'FUZZY' | 'MANUAL' | 'UNMATCHED' | 'NEW_ENTRY';
  matchReasons: string[];
  status: 'AUTO_MATCHED' | 'NEEDS_REVIEW' | 'CONFIRMED' | 'UNMATCHED' | 'EXCEPTION';
  reviewNote?: string;
}

export interface ReconciliationSession {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  entity: string;
  currency: string;
  statementDate: string;
  statementFrom: string;
  statementTo: string;
  openingBalance: number;
  closingBalance: number;
  totalLines: number;
  matchedLines: number;
  unreconciledLines: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

const mk = (
  id: string,
  date: string,
  description: string,
  debit: number,
  credit: number,
  balance: number,
  reference?: string
): BankStatementLine => ({
  id,
  date,
  description,
  debit,
  credit,
  balance,
  currency: 'CAD',
  reference,
  rawText: `${date},${description},${reference ?? ''},${debit},${credit},${balance}`,
});

export const MOCK_STATEMENT_LINES: BankStatementLine[] = [];

export const MOCK_PAST_SESSIONS: ReconciliationSession[] = [];
