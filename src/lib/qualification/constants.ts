import type {
  InstitutionApplicationStatus,
  QualificationHoldReasonCode,
  QualificationLifecycleStatus,
} from "./types";

/** Application Lifecycle status labels (internal enum: qualification_lifecycle_status) */
export const QUALIFICATION_STATUS_LABELS: Record<QualificationLifecycleStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  REFUSED: "Refused",
};

export const QUALIFICATION_STATUS_BADGE_CLASS: Record<QualificationLifecycleStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  ACTIVE: "bg-green-100 text-green-800 border-green-300",
  ON_HOLD: "bg-amber-100 text-amber-900 border-amber-300",
  COMPLETED: "bg-blue-100 text-blue-800 border-blue-300",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
  REFUSED: "bg-red-100 text-red-800 border-red-300",
};

/** Admissions Stage labels (internal enum: institution_application_status) */
export const APPLICATION_STATUS_LABELS: Record<InstitutionApplicationStatus, string> = {
  APPLIED: "Applied",
  OFFER_RECEIVED: "Offer Received",
  CONDITIONAL_OFFER: "Conditional Offer",
  UNCONDITIONAL_OFFER: "Unconditional Offer",
  LOA_RECEIVED: "LOA Received",
  DEPOSIT_PENDING: "Deposit Pending",
  DEPOSIT_PAID: "Deposit Paid",
  VISA_FILED: "Visa Filed",
  VISA_APPROVED: "Visa Approved",
  ENROLLED: "Enrolled",
  WITHDRAWN: "Withdrawn",
  OTHER: "Other",
};

export const HOLD_REASON_LABELS: Record<QualificationHoldReasonCode, string> = {
  WAITING_TUITION_PAYMENT: "Waiting for tuition payment",
  WAITING_LOAN_APPROVAL: "Waiting for loan approval",
  WAITING_VISA_RESULT: "Waiting for visa result",
  DEFERRED_INTAKE: "Student deferred intake",
  MEDICAL_ISSUE: "Medical issue",
  PERSONAL_REASONS: "Personal reasons",
  MISSING_INSTITUTION_DOCS: "Missing institution documents",
  OTHER_OPERATIONAL: "Other operational blocker",
};

export const TRACK_STATUS_LABELS = {
  NOT_STARTED: "Not started",
  PARTIAL: "Partial",
  SATISFIED: "Satisfied",
} as const;

/** Application Timeline event labels (internal event_type codes unchanged) */
export const APPLICATION_EVENT_LABELS: Record<string, string> = {
  QUALIFICATION_CREATED: "Application created",
  QUALIFICATION_UPDATED: "Application updated",
  QUALIFICATION_STATUS_CHANGED: "Application lifecycle changed",
  QUALIFICATION_OWNER_CHANGED: "Application owner changed",
  APPLICATION_STATUS_UPDATED: "Admissions stage changed",
  TRACK_AMOUNT_UPDATED: "Deposit or tuition amounts updated",
};

export function formatApplicationEventType(eventType: string): string {
  return APPLICATION_EVENT_LABELS[eventType] ?? eventType.replace(/_/g, " ");
}
