export type ReimbursementStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW'
  | 'APPROVED' | 'PAID' | 'REJECTED';

export interface ReimbursementLine {
  id: string;
  date: string;
  expenseCategory: string;
  description: string;
  merchant?: string;
  amount: number;
  currency: string;
  isPersonal: boolean;
  receipt?: string;
  coaAccountId?: string;
}

export interface ReimbursementClaim {
  id: string;
  claimNumber: string;
  claimDate: string;
  claimedBy: string;
  entity: string;
  branch?: string;
  personalCardAccount: string;
  companyBankAccount: string;
  lines: ReimbursementLine[];
  totalAmount: number;
  businessAmount: number;
  personalAmount: number;
  reimbursableAmount: number;
  status: ReimbursementStatus;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  paymentMode?: string;
  paymentReference?: string;
  paidByAccount?: string;
  expenseJournalId?: string;
  paymentJournalId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const EXPENSE_CATEGORIES: { code: string; label: string }[] = [
  { code: 'OFFICE_RENT', label: 'Office rent' },
  { code: 'TRAVEL', label: 'Travel' },
  { code: 'MEALS', label: 'Meals & entertainment' },
  { code: 'OFFICE_SUPPLIES', label: 'Office supplies' },
  { code: 'MARKETING', label: 'Marketing' },
  { code: 'SOFTWARE', label: 'Software' },
  { code: 'UTILITIES', label: 'Utilities' },
  { code: 'COURIER', label: 'Courier' },
  { code: 'PROFESSIONAL_FEES', label: 'Professional fees' },
  { code: 'OTHER', label: 'Other' },
];