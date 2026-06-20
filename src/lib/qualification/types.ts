export const QUALIFICATION_LIFECYCLE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
  "REFUSED",
] as const;

export type QualificationLifecycleStatus = (typeof QUALIFICATION_LIFECYCLE_STATUSES)[number];

export const TERMINAL_QUALIFICATION_STATUSES: QualificationLifecycleStatus[] = [
  "CLOSED",
  "CANCELLED",
  "REFUSED",
];

export const INSTITUTION_APPLICATION_STATUSES = [
  "APPLIED",
  "OFFER_RECEIVED",
  "CONDITIONAL_OFFER",
  "UNCONDITIONAL_OFFER",
  "LOA_RECEIVED",
  "DEPOSIT_PENDING",
  "DEPOSIT_PAID",
  "VISA_FILED",
  "VISA_APPROVED",
  "ENROLLED",
  "WITHDRAWN",
  "OTHER",
] as const;

export type InstitutionApplicationStatus = (typeof INSTITUTION_APPLICATION_STATUSES)[number];

export const QUALIFICATION_HOLD_REASON_CODES = [
  "WAITING_TUITION_PAYMENT",
  "WAITING_LOAN_APPROVAL",
  "WAITING_VISA_RESULT",
  "DEFERRED_INTAKE",
  "MEDICAL_ISSUE",
  "PERSONAL_REASONS",
  "MISSING_INSTITUTION_DOCS",
  "OTHER_OPERATIONAL",
] as const;

export type QualificationHoldReasonCode = (typeof QUALIFICATION_HOLD_REASON_CODES)[number];

export type QualificationTrackStatus = "NOT_STARTED" | "PARTIAL" | "SATISFIED";

export type QualificationRecord = {
  id: string;
  clientId: string;
  clientServiceCaseId: string;
  institutionId: string;
  programName: string | null;
  intakeTerm: string;
  intakeDate: string | null;
  status: QualificationLifecycleStatus;
  statusReasonCode: string | null;
  statusReasonNotes: string | null;
  holdReasonCode: QualificationHoldReasonCode | null;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  ownerUserId: string | null;
  applicationStatus: InstitutionApplicationStatus | null;
  createdAt: string;
  updatedAt: string;
  institutionName?: string | null;
  ownerName?: string | null;
};

export type QualificationDepositTrack = {
  id: string;
  qualificationId: string;
  requiredAmount: number;
  dueDate: string | null;
  paidAmount: number;
  outstandingAmount: number;
  currency: string;
  status: QualificationTrackStatus;
};

export type QualificationTuitionTrack = {
  id: string;
  qualificationId: string;
  totalTuition: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: string;
  status: QualificationTrackStatus;
};

export type QualificationEvent = {
  id: string;
  qualificationId: string;
  eventType: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type UpsertQualificationPayload = {
  id?: string;
  clientId: string;
  clientServiceCaseId: string;
  institutionId: string;
  intakeTerm: string;
  programName?: string | null;
  intakeDate?: string | null;
  depositRequired?: number;
  tuitionTotal?: number;
  currency?: string;
  institutionApplicationStatus?: InstitutionApplicationStatus;
};

export type TransitionQualificationPayload = {
  qualificationId: string;
  toStatus: QualificationLifecycleStatus;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  holdReasonCode?: QualificationHoldReasonCode | null;
};
