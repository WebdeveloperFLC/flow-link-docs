/**
 * FLEOS platform — three independent status dimensions.
 * Never overload a single field; map legacy columns where migrations are pending.
 */

/** Commercial / operational state of the transaction. */
export type BusinessStatus =
  | "money_received"
  | "pending_verification"
  | "pending_cash_verification"
  | "verified"
  | "receipt_issued"
  | "rejected"
  | "cancelled"
  | "closed";

/** Workflow engine progression (approval gates). */
export type WorkflowStatus =
  | "not_started"
  | "pending_verification"
  | "pending_cash_verification"
  | "pending_receipt"
  | "pending_journal_approval"
  | "approved"
  | "rejected"
  | "completed";

/** Accounting / GL lifecycle. */
export type AccountingStatus =
  | "none"
  | "draft_journal"
  | "pending_journal_approval"
  | "posted"
  | "reconciled"
  | "closed";

/** Immutable lifecycle lock after submission. */
export type TransactionLockState =
  | "draft"
  | "submitted"
  | "locked"
  | "approved"
  | "posted"
  | "reconciled"
  | "closed";

export function businessStatusLabel(s: BusinessStatus | string | null | undefined): string {
  switch (s) {
    case "money_received":
      return "Money received";
    case "pending_verification":
      return "Pending verification";
    case "pending_cash_verification":
      return "Pending cash verification";
    case "verified":
      return "Verified";
    case "receipt_issued":
      return "Receipt issued";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    case "closed":
      return "Closed";
    default:
      return (s ?? "unknown").replace(/_/g, " ");
  }
}

export function workflowStatusLabel(s: WorkflowStatus | string | null | undefined): string {
  switch (s) {
    case "not_started":
      return "Not started";
    case "pending_verification":
      return "Pending verification";
    case "pending_cash_verification":
      return "Pending cash verification";
    case "pending_receipt":
      return "Pending receipt";
    case "pending_journal_approval":
      return "Pending journal approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    default:
      return (s ?? "unknown").replace(/_/g, " ");
  }
}

export function accountingStatusLabel(s: AccountingStatus | string | null | undefined): string {
  switch (s) {
    case "none":
      return "Not in accounting";
    case "draft_journal":
      return "Draft journal";
    case "pending_journal_approval":
      return "Pending journal approval";
    case "posted":
      return "Posted";
    case "reconciled":
      return "Reconciled";
    case "closed":
      return "Closed";
    default:
      return (s ?? "unknown").replace(/_/g, " ");
  }
}

/** Map legacy payment_status → business status for reads before migration. */
export function businessStatusFromLegacyPaymentStatus(
  paymentStatus: string | null | undefined,
  method?: string | null,
): BusinessStatus {
  if (paymentStatus === "verified") return "verified";
  if (paymentStatus === "rejected") return "rejected";
  if (paymentStatus === "cancelled") return "cancelled";
  if (method === "cash") return "pending_cash_verification";
  return "pending_verification";
}

/** Legacy payment_status value that keeps invoice recompute triggers working. */
export function legacyPaymentStatusForBusiness(business: BusinessStatus): string {
  switch (business) {
    case "verified":
    case "receipt_issued":
    case "closed":
      return "verified";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    default:
      return "awaiting_verification";
  }
}
