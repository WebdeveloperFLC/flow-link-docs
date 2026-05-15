export type MatchStatus = 'AUTO_MATCHED' | 'REVIEW_NEEDED' | 'UNMATCHED' | 'EXCEPTION' | 'CONFIRMED';

export interface BankStatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;        // negative = debit (money out), positive = credit (money in)
  balance?: number;
  reference?: string;
}

export interface SystemEntry {
  id: string;
  journalId: string;
  entryNumber: string;
  date: string;
  description: string;
  amount: number;
  reference: string;
}

export interface ReconMatch {
  id: string;
  bankLineId: string;
  systemEntryId: string | null;
  status: MatchStatus;
  confidence: number;          // 0-100
  reasons: string[];           // chips: "amount", "date ±2d", "description fuzzy", etc.
}

export interface BankStatement {
  accountId: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  lines: BankStatementLine[];
}