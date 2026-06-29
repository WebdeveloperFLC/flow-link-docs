/**
 * Platform notification routing — channel-agnostic.
 */

export type NotificationChannel = "in_app" | "email" | "whatsapp" | "sms";

export type NotificationRecipientSpec =
  | { kind: "role"; role: string }
  | { kind: "permission_group"; group: string }
  | { kind: "department"; department: string }
  | { kind: "accounting_active_users" }
  | { kind: "branch_managers"; branchId?: string }
  | { kind: "workflow_approvers"; stepId: string }
  | { kind: "any_of"; specs: NotificationRecipientSpec[] };

export interface NotificationRule {
  id: string;
  eventKey: string;
  channels: NotificationChannel[];
  recipients: NotificationRecipientSpec[];
  titleTemplate: string;
  bodyTemplate?: string;
  severity?: "info" | "success" | "warning" | "critical";
  linkTemplate?: string;
}

export interface NotificationDispatchInput {
  eventKey: string;
  context: Record<string, unknown>;
  businessEventId?: string | null;
  entityId?: string | null;
  branchId?: string | null;
  dedupeKey?: string | null;
}
