export type IntercompanyStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

export interface IntercompanyTransaction {
  id: string;
  txnNumber: string;
  txnDate: string;
  fromEntity: string;
  toEntity: string;
  description: string;
  transactionType?: string;
  currency: string;
  fxRate: number;
  amount: number;
  taxType?: string;
  taxRate?: number;
  taxAmount?: number;
  netAmount: number;
  fromDebitAccount: string;
  fromCreditAccount: string;
  toDebitAccount: string;
  toCreditAccount: string;
  fromJournalId?: string;
  toJournalId?: string;
  status: IntercompanyStatus;
  reference?: string;
  notes?: string;
  attachments?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
}