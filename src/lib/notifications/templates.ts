// Centralized, severity-aware copy for all notifications.
// Future i18n: swap `t(template, params)` → translation engine without touching producers.
import type { NotificationCategory, NotificationSeverity } from "@/lib/appNotifications";

export interface NotificationTemplate {
  category: NotificationCategory;
  severity: NotificationSeverity;
  /** in-app + push + toast title */
  title: (p: Record<string, any>) => string;
  /** in-app body / push body */
  body?: (p: Record<string, any>) => string;
  /** subject line for future email fallback (kept short) */
  emailSubject?: (p: Record<string, any>) => string;
  /** default deep link */
  link?: (p: Record<string, any>) => string | undefined;
  /** default dedupe key (per entity) */
  dedupe?: (p: Record<string, any>) => string | undefined;
  /** play chime? overrides defaults */
  sound?: boolean;
}

export type NotificationEventType =
  | "payment.received"
  | "payment.verified"
  | "receipt.generated"
  | "task.assigned"
  | "task.urgent"
  | "task.overdue"
  | "client.assigned"
  | "document.uploaded"
  | "document.ocr_completed"
  | "binder.generated"
  | "portal.invite_sent"
  | "portal.invite_accepted"
  | "portal.message_received"
  | "lead.assigned"
  | "lead.converted"
  | "workflow.stage_changed"
  | "telecaller.followup_assigned"
  | "broadcast.admin"
  | "info";

export const NOTIFICATION_TEMPLATES: Record<NotificationEventType, NotificationTemplate> = {
  "payment.received": {
    category: "payment_received", severity: "info",
    title: (p) => `Payment received: ${p.currency ?? ""} ${p.amount ?? ""}`.trim(),
    body: (p) => p.note ?? null as any,
    emailSubject: (p) => `Payment received — ${p.currency ?? ""} ${p.amount ?? ""}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.paymentId ? `payment:${p.paymentId}:received` : undefined,
  },
  "payment.verified": {
    category: "payment_verified", severity: "success", sound: true,
    title: (p) => `Payment verified: ${p.currency ?? ""} ${p.amount ?? ""}`.trim(),
    emailSubject: (p) => `Payment verified — ${p.currency ?? ""} ${p.amount ?? ""}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.paymentId ? `payment:${p.paymentId}:verified` : undefined,
  },
  "receipt.generated": {
    category: "receipt_generated", severity: "info",
    title: (p) => `Receipt generated: ${p.receiptNumber ?? ""}`.trim(),
    emailSubject: (p) => `Receipt ${p.receiptNumber ?? ""}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.receiptId ? `receipt:${p.receiptId}` : undefined,
  },
  "task.assigned": {
    category: "new_task_assigned", severity: "info", sound: true,
    title: (p) => `New task assigned: ${p.title ?? "Task"}`,
    body: (p) => p.description,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.taskId ? `task:${p.taskId}:assigned` : undefined,
  },
  "task.urgent": {
    category: "urgent_review_required", severity: "warning", sound: true,
    title: (p) => `Urgent task: ${p.title ?? "Task"}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.taskId ? `task:${p.taskId}:urgent` : undefined,
  },
  "task.overdue": {
    category: "urgent_review_required", severity: "warning",
    title: (p) => `Task overdue: ${p.title ?? "Task"}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.taskId && p.level != null ? `task:${p.taskId}:overdue:L${p.level}` : undefined,
  },
  "client.assigned": {
    category: "client_assigned", severity: "info", sound: true,
    title: (p) => `Client assigned: ${p.clientName ?? "Client"}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.clientId && p.userId ? `client:${p.clientId}:assigned:${p.userId}` : undefined,
  },
  "document.uploaded": {
    category: "document_uploaded", severity: "info",
    title: (p) => `Document uploaded: ${p.fileName ?? "file"}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.documentId ? `doc:${p.documentId}:uploaded` : undefined,
  },
  "document.ocr_completed": {
    category: "document_uploaded", severity: "info",
    title: (p) => `OCR completed: ${p.fileName ?? "document"}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.documentId ? `doc:${p.documentId}:ocr` : undefined,
  },
  "binder.generated": {
    category: "info", severity: "info",
    title: (p) => `Binder generated: ${p.binderName ?? "Binder"}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.binderId ? `binder:${p.binderId}:generated` : undefined,
  },
  "portal.invite_sent": {
    category: "portal_invite_sent", severity: "info",
    title: () => `Portal invite sent`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.inviteId ? `invite:${p.inviteId}:sent` : undefined,
  },
  "portal.invite_accepted": {
    category: "portal_invite_sent", severity: "success",
    title: () => `Portal invite accepted`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.inviteId ? `invite:${p.inviteId}:accepted` : undefined,
  },
  "portal.message_received": {
    category: "portal_message", severity: "info", sound: true,
    title: (p) => `New portal message${p.clientName ? ` from ${p.clientName}` : ""}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.messageId ? `pmsg:${p.messageId}` : undefined,
  },
  "lead.assigned": {
    category: "client_assigned", severity: "info",
    title: (p) => `New lead assigned${p.leadName ? `: ${p.leadName}` : ""}`,
    link: (p) => p.leadId ? `/leads/${p.leadId}` : undefined,
    dedupe: (p) => p.leadId && p.userId ? `lead:${p.leadId}:assigned:${p.userId}` : undefined,
  },
  "lead.converted": {
    category: "lead_converted", severity: "success", sound: true,
    title: (p) => `Lead converted${p.clientName ? `: ${p.clientName}` : ""}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.leadId ? `lead:${p.leadId}:converted` : undefined,
  },
  "workflow.stage_changed": {
    category: "info", severity: "info",
    title: (p) => `Workflow stage: ${p.stage ?? "updated"}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.clientId && p.stage ? `wf:${p.clientId}:${p.stage}` : undefined,
  },
  "telecaller.followup_assigned": {
    category: "new_task_assigned", severity: "info",
    title: (p) => `Follow-up assigned${p.dueAt ? ` (due ${new Date(p.dueAt).toLocaleString()})` : ""}`,
    link: (p) => p.clientId ? `/clients/${p.clientId}` : undefined,
    dedupe: (p) => p.followupId ? `fu:${p.followupId}` : undefined,
  },
  "broadcast.admin": {
    category: "info", severity: "info", sound: true,
    title: (p) => p.title ?? "Broadcast",
    body: (p) => p.body,
    dedupe: (p) => p.broadcastId ? `broadcast:${p.broadcastId}` : undefined,
  },
  "info": {
    category: "info", severity: "info",
    title: (p) => p.title ?? "Notification",
    body: (p) => p.body,
    link: (p) => p.link,
    dedupe: (p) => p.dedupeKey,
  },
};