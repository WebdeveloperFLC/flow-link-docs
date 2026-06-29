/**
 * Default payment-method workflow configuration (Phase A seed).
 * Stored in platform_config when DB available; used as code fallback.
 */
import type { NotificationRule } from "../types/notifications";
import type { SodRule } from "../types/sod";
import type { WorkflowDefinition } from "../types/workflow";

export interface PaymentMethodWorkflowConfig {
  methodCode: string;
  label: string;
  /** Requires proof upload before verification. */
  proofRequired: boolean;
  /** Initial legacy payment_status after record. */
  initialLegacyPaymentStatus: "awaiting_verification" | "verified";
  initialBusinessStatus: "money_received" | "pending_verification" | "pending_cash_verification";
  initialWorkflowStatus: "pending_verification" | "pending_cash_verification" | "not_started";
  workflowDefinitionId: string;
  /** Generate official receipt after verification step. */
  receiptAfterVerification: boolean;
  /** Create draft journal after receipt. */
  draftJournalAfterReceipt: boolean;
  /** Journal requires finance approval before POSTED. */
  journalApprovalRequired: boolean;
  /** Cash register required (foundation). */
  cashRegisterRequired: boolean;
  /** Notification event keys fired on record. */
  notifyOnRecord?: string[];
  /** Notification event keys fired on verify complete. */
  notifyOnVerify?: string[];
}

const BASE_MONEY_IN_WORKFLOW: WorkflowDefinition = {
  id: "money_in_standard",
  domain: "money_in",
  version: 1,
  approvalMode: "sequential",
  steps: [
    {
      id: "verify",
      kind: "verification",
      label: "Verify payment",
      approver: { kind: "any_of", specs: [{ kind: "permission_group", group: "payment_verifier" }] },
      forbidActorUserId: true,
    },
    { id: "receipt", kind: "receipt", label: "Issue official receipt" },
    {
      id: "journal_draft",
      kind: "journal_draft",
      label: "Create draft journal",
    },
    {
      id: "journal_approve",
      kind: "journal_post",
      label: "Approve and post journal",
      approver: { kind: "any_of", specs: [{ kind: "permission_group", group: "journal_approver" }] },
    },
  ],
};

const CASH_WORKFLOW: WorkflowDefinition = {
  id: "money_in_cash",
  domain: "money_in",
  version: 1,
  approvalMode: "sequential",
  steps: [
    {
      id: "cash_verify",
      kind: "verification",
      label: "Verify physical cash",
      approver: { kind: "any_of", specs: [{ kind: "permission_group", group: "payment_verifier" }] },
      forbidActorUserId: true,
    },
    { id: "receipt", kind: "receipt", label: "Issue official receipt" },
    { id: "journal_draft", kind: "journal_draft", label: "Create draft journal" },
    {
      id: "journal_approve",
      kind: "journal_post",
      label: "Approve and post journal",
      approver: { kind: "any_of", specs: [{ kind: "permission_group", group: "journal_approver" }] },
    },
  ],
};

const INSTANT_WORKFLOW: WorkflowDefinition = {
  id: "money_in_instant",
  domain: "money_in",
  version: 1,
  approvalMode: "none",
  steps: [
    { id: "receipt", kind: "receipt", label: "Issue official receipt" },
    { id: "journal_draft", kind: "journal_draft", label: "Create draft journal" },
    {
      id: "journal_approve",
      kind: "journal_post",
      label: "Approve and post journal",
      approver: { kind: "any_of", specs: [{ kind: "permission_group", group: "journal_approver" }] },
    },
  ],
};

export const DEFAULT_WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  BASE_MONEY_IN_WORKFLOW,
  CASH_WORKFLOW,
  INSTANT_WORKFLOW,
];

export const DEFAULT_SOD_RULES: SodRule[] = [
  {
    id: "record_not_verify",
    actionA: "record",
    actionB: "verify",
    domains: ["money_in"],
    mandatory: true,
  },
  {
    id: "record_not_verify_cash",
    actionA: "record",
    actionB: "verify",
    domains: ["money_in"],
    paymentMethods: ["cash"],
    mandatory: true,
  },
  {
    id: "verify_not_approve_journal",
    actionA: "verify",
    actionB: "approve",
    domains: ["money_in"],
  },
  {
    id: "approve_not_reconcile",
    actionA: "approve",
    actionB: "reconcile",
    domains: ["money_in", "banking"],
  },
];

export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: "cash_pending_verification",
    eventKey: "foe.cash.pending_verification",
    channels: ["in_app", "email"],
    recipients: [{ kind: "accounting_active_users" }],
    titleTemplate: "Cash payment pending verification",
    bodyTemplate: "{{amount}} {{currency}} for {{clientName}} — physical cash verification required.",
    severity: "warning",
    linkTemplate: "/accounting/finance-queue?section=pending_cash_verification",
  },
  {
    id: "payment_pending_verification",
    eventKey: "foe.payment.pending_verification",
    channels: ["in_app", "email"],
    recipients: [{ kind: "permission_group", group: "payment_verifier" }],
    titleTemplate: "Payment pending verification",
    bodyTemplate: "{{amount}} {{currency}} — {{method}}",
    severity: "info",
    linkTemplate: "/accounting/finance-queue?section=pending_payment_verification",
  },
  {
    id: "journal_pending_approval",
    eventKey: "foe.journal.pending_approval",
    channels: ["in_app"],
    recipients: [{ kind: "permission_group", group: "journal_approver" }],
    titleTemplate: "Draft journal awaiting approval",
    bodyTemplate: "Payment {{paymentId}} — review draft journal",
    severity: "info",
    linkTemplate: "/accounting/finance-queue?section=pending_journal_approval",
  },
];

function methodConfig(
  code: string,
  label: string,
  overrides: Partial<PaymentMethodWorkflowConfig> & Pick<PaymentMethodWorkflowConfig, "workflowDefinitionId">,
): PaymentMethodWorkflowConfig {
  return {
    methodCode: code,
    label,
    proofRequired: false,
    initialLegacyPaymentStatus: "awaiting_verification",
    initialBusinessStatus: "pending_verification",
    initialWorkflowStatus: "pending_verification",
    receiptAfterVerification: true,
    draftJournalAfterReceipt: true,
    journalApprovalRequired: true,
    cashRegisterRequired: false,
    notifyOnRecord: ["foe.payment.pending_verification"],
    ...overrides,
  };
}

/** Config-driven payment methods — not hardcoded in UI logic. */
export const DEFAULT_PAYMENT_METHOD_CONFIGS: PaymentMethodWorkflowConfig[] = [
  methodConfig("cash", "Cash", {
    proofRequired: false,
    initialLegacyPaymentStatus: "awaiting_verification",
    initialBusinessStatus: "pending_cash_verification",
    initialWorkflowStatus: "pending_cash_verification",
    workflowDefinitionId: "money_in_cash",
    cashRegisterRequired: true,
    notifyOnRecord: ["foe.cash.pending_verification"],
  }),
  methodConfig("cheque", "Cheque", {
    proofRequired: true,
    workflowDefinitionId: "money_in_standard",
  }),
  methodConfig("bank_transfer", "Bank transfer", {
    proofRequired: true,
    workflowDefinitionId: "money_in_standard",
  }),
  methodConfig("wire", "Wire transfer", {
    proofRequired: true,
    workflowDefinitionId: "money_in_standard",
  }),
  methodConfig("upi", "UPI", {
    proofRequired: true,
    workflowDefinitionId: "money_in_standard",
  }),
  methodConfig("card", "Credit/debit card", {
    proofRequired: true,
    workflowDefinitionId: "money_in_standard",
  }),
  methodConfig("online_gateway", "Payment gateway", {
    proofRequired: false,
    initialLegacyPaymentStatus: "verified",
    initialBusinessStatus: "money_received",
    initialWorkflowStatus: "not_started",
    workflowDefinitionId: "money_in_instant",
    notifyOnRecord: [],
  }),
  methodConfig("etransfer", "E-transfer", {
    proofRequired: true,
    workflowDefinitionId: "money_in_standard",
  }),
  methodConfig("wallet", "Wallet", {
    proofRequired: false,
    initialLegacyPaymentStatus: "verified",
    initialBusinessStatus: "money_received",
    initialWorkflowStatus: "not_started",
    workflowDefinitionId: "money_in_instant",
    notifyOnRecord: [],
  }),
  methodConfig("referral_credits", "Referral credits", {
    proofRequired: false,
    initialLegacyPaymentStatus: "verified",
    workflowDefinitionId: "money_in_instant",
    notifyOnRecord: [],
  }),
  methodConfig("points", "Points", {
    proofRequired: false,
    initialLegacyPaymentStatus: "verified",
    workflowDefinitionId: "money_in_instant",
    notifyOnRecord: [],
  }),
  methodConfig("other", "Other", {
    proofRequired: true,
    workflowDefinitionId: "money_in_standard",
  }),
];

export function getDefaultWorkflowDefinition(id: string): WorkflowDefinition | undefined {
  return DEFAULT_WORKFLOW_DEFINITIONS.find((d) => d.id === id);
}

export function getDefaultPaymentMethodConfig(methodCode: string): PaymentMethodWorkflowConfig {
  const normalized = methodCode.toLowerCase().replace(/-/g, "_");
  return (
    DEFAULT_PAYMENT_METHOD_CONFIGS.find((c) => c.methodCode === normalized) ??
    DEFAULT_PAYMENT_METHOD_CONFIGS.find((c) => c.methodCode === "other")!
  );
}

export function listPaymentMethodOptions(): { value: string; label: string }[] {
  return DEFAULT_PAYMENT_METHOD_CONFIGS.filter((c) =>
    ["cash", "cheque", "bank_transfer", "wire", "upi", "card", "online_gateway", "etransfer", "other"].includes(
      c.methodCode,
    ),
  ).map((c) => ({ value: c.methodCode, label: c.label }));
}
