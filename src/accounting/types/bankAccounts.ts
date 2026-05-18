export type BankAccountStatus = "ACTIVE" | "INACTIVE";
export type ReconciliationSnapshotStatus = "MATCHED" | "PENDING" | "DISCREPANCY";

export interface BankAccount {
  id: string;
  // Entity & branch linking
  country: string;            // ISO-2
  entityId: string;           // top-level company entity id
  branchId: string | null;    // optional sub-entity / branch id
  ownerProfileId: string;     // linked owner (business / personal / family-office)
  coaAccountId: string;       // linked COA ledger id
  currency: string;
  // Authorised signatories — individuals (PERSONAL owner profiles) with signing authority
  authorisedSignatoryIds?: string[];
  // Bank details
  bankName: string;
  nickname: string;
  holderName: string;
  accountNumber: string;
  iban?: string;
  swift?: string;
  ifsc?: string;
  routingNumber?: string;
  transitNumber?: string;
  branchCode?: string;
  branchName?: string;
  branchAddress?: string;
  // Contact
  rmName?: string;
  rmEmail?: string;
  rmPhone?: string;
  // Settings
  isDefaultPayment: boolean;
  isDefaultPayroll: boolean;
  isDefaultTax: boolean;
  reconciliationEnabled: boolean;
  status: BankAccountStatus;
  // Recon snapshot
  lastReconciledAt?: string | null;
  lastReconciliationStatus?: ReconciliationSnapshotStatus | null;
  createdAt: string;
}

export type BankAccountInput = Omit<BankAccount, "id" | "createdAt" | "lastReconciledAt" | "lastReconciliationStatus">;

export type DefaultKind = "payment" | "payroll" | "tax";

export function maskAccountNumber(n: string): string {
  if (!n) return "—";
  const clean = n.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `••••${clean.slice(-4)}`;
}