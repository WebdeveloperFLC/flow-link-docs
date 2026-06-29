/**
 * Cash register foundation — reusable per company / branch.
 */

export interface CashRegister {
  id: string;
  entityId: string;
  branchId: string;
  code: string;
  name: string;
  currency: string;
  active: boolean;
}

export interface CashReceiptContext {
  cashRegisterId: string;
  entityId: string;
  branchId: string;
  cashierUserId: string;
  verificationUserId?: string | null;
  /** Future: deposit batch id */
  depositBatchId?: string | null;
}
