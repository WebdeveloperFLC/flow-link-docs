export type CardLineCategory = 'BUSINESS' | 'PERSONAL' | 'UNCATEGORISED';
export type ReconciliationStatus =
  | 'DRAFT' | 'IN_PROGRESS' | 'JOURNAL_GENERATED' | 'POSTED' | 'VOIDED';

export interface CardStatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: CardLineCategory;
  expenseCategory?: string;
  coaAccountId?: string;
  coaAccountName?: string;
  isPersonal: boolean;
  merchantName?: string;
  notes?: string;
}

export interface CardReconciliation {
  id: string;
  reconciliationNumber: string;
  statementMonth: string;
  statementFrom: string;
  statementTo: string;
  cardAccountId: string;
  cardAccountName: string;
  cardHolderName: string;
  cardType: 'PERSONAL' | 'BUSINESS';
  entity: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  totalTransactions: number;
  totalBusinessAmount: number;
  totalPersonalAmount: number;
  totalUncategorised: number;
  lines: CardStatementLine[];
  generatedJournalId?: string;
  status: ReconciliationStatus;
  importedAt: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}