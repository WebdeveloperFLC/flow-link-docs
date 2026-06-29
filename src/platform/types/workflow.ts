/**
 * Enterprise Workflow Engine — generic workflow types (domain-agnostic).
 */

export type ApprovalMode = "none" | "single" | "sequential" | "parallel";

/** Who may act on a step — resolved at runtime, never hardcoded user IDs. */
export type ApproverSpec =
  | { kind: "role"; role: string }
  | { kind: "permission_group"; group: string }
  | { kind: "department"; department: string }
  | { kind: "accounting_module"; module: string }
  | { kind: "any_of"; specs: ApproverSpec[] };

export type WorkflowStepKind =
  | "verification"
  | "approval"
  | "receipt"
  | "journal_draft"
  | "journal_post"
  | "notification"
  | "custom";

export interface WorkflowStepDefinition {
  id: string;
  kind: WorkflowStepKind;
  label: string;
  approver?: ApproverSpec;
  /** When true, recorder cannot act on this step (SoD). */
  forbidActorUserId?: boolean;
  optional?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  domain: string;
  version: number;
  approvalMode: ApprovalMode;
  steps: WorkflowStepDefinition[];
}

export interface WorkflowContext {
  entityId?: string | null;
  branchId?: string | null;
  country?: string | null;
  department?: string | null;
  paymentMethod?: string | null;
  amount?: number;
  currency?: string | null;
  customerType?: string | null;
  transactionType?: string | null;
  riskLevel?: string | null;
  recordedByUserId?: string | null;
  agreementId?: string | null;
  requestedByUserId?: string | null;
  clientId?: string | null;
  settlementType?: string | null;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  businessEventId: string;
  domain: string;
  status: "active" | "completed" | "rejected" | "cancelled";
  currentStepIndex: number;
  context: WorkflowContext;
  createdAt: string;
}

export interface WorkflowStepState {
  stepId: string;
  status: "pending" | "in_progress" | "completed" | "skipped" | "rejected";
  completedBy?: string | null;
  completedAt?: string | null;
}
