/**
 * Universal work queue — domain-agnostic inbox items.
 */

export type WorkQueueDomain =
  | "finance"
  | "hr"
  | "admissions"
  | "compliance"
  | "payroll"
  | "trust"
  | "vendor"
  | "construction";

export type WorkQueueItemKind =
  | "pending_cash_verification"
  | "pending_payment_verification"
  | "pending_journal_approval"
  | "pending_bank_reconciliation"
  | "pending_refund_approval"
  | "pending_trust_verification"
  | "generic";

export type WorkQueueItemStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface WorkQueueItem {
  id: string;
  queueDomain: WorkQueueDomain;
  kind: WorkQueueItemKind;
  status: WorkQueueItemStatus;
  title: string;
  subtitle?: string | null;
  businessEventId?: string | null;
  sourceModule?: string | null;
  sourceRecordId?: string | null;
  entityId?: string | null;
  branchId?: string | null;
  assignedToUserId?: string | null;
  priority?: number;
  link?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string | null;
}
