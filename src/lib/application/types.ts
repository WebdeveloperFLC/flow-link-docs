export const APPLICATION_LIFECYCLE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
  "REFUSED",
] as const;

export type ApplicationLifecycleStatus = (typeof APPLICATION_LIFECYCLE_STATUSES)[number];

export const TERMINAL_APPLICATION_LIFECYCLE_STATUSES: ApplicationLifecycleStatus[] = [
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

export const APPLICATION_OFFER_TYPES = [
  "CONDITIONAL_OFFER",
  "UNCONDITIONAL_OFFER",
  "LOA",
  "I20",
  "CAS",
  "COE",
  "OTHER",
] as const;

export type ApplicationOfferType = (typeof APPLICATION_OFFER_TYPES)[number];

export const APPLICATION_OFFER_STATUSES = [
  "NONE",
  "PENDING",
  "RECEIVED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
] as const;

export type ApplicationOfferStatus = (typeof APPLICATION_OFFER_STATUSES)[number];

export const APPLICATION_SOURCES = ["MANUAL", "MARK_FINAL", "IMPORT", "OTHER"] as const;

export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const APPLICATION_HOLD_REASON_CODES = [
  "WAITING_TUITION_PAYMENT",
  "WAITING_LOAN_APPROVAL",
  "WAITING_VISA_RESULT",
  "DEFERRED_INTAKE",
  "MEDICAL_ISSUE",
  "PERSONAL_REASONS",
  "MISSING_INSTITUTION_DOCS",
  "OTHER_OPERATIONAL",
] as const;

export type ApplicationHoldReasonCode = (typeof APPLICATION_HOLD_REASON_CODES)[number];

export type ApplicationTrackStatus = "NOT_STARTED" | "PARTIAL" | "SATISFIED";

export type StudentApplicationRecord = {
  id: string;
  clientId: string;
  clientServiceCaseId: string;
  institutionId: string;
  programName: string | null;
  programCode: string | null;
  campusName: string | null;
  intakeTerm: string;
  intakeDate: string | null;
  intakeYear: number | null;
  studyLevel: string | null;
  durationMonths: number | null;
  tuitionFee: number | null;
  tuitionCurrency: string | null;
  destinationCountry: string | null;
  institutionNameSnapshot: string | null;
  institutionCitySnapshot: string | null;
  cfClientProgramId: string | null;
  cfCourseId: string | null;
  applicationSource: ApplicationSource;
  status: ApplicationLifecycleStatus;
  statusReasonCode: string | null;
  statusReasonNotes: string | null;
  holdReasonCode: ApplicationHoldReasonCode | null;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  ownerUserId: string | null;
  applicationStatus: InstitutionApplicationStatus | null;
  createdAt: string;
  updatedAt: string;
  institutionName?: string | null;
  institutionCountryName?: string | null;
  ownerName?: string | null;
};

export type ApplicationOffer = {
  applicationId: string;
  offerType: ApplicationOfferType | null;
  offerStatus: ApplicationOfferStatus;
  offerNumber: string | null;
  offerDate: string | null;
  offerExpiryDate: string | null;
  notes: string | null;
};

export type ApplicationMilestones = {
  applicationId: string;
  applicationCreatedAt: string;
  applicationSubmittedDate: string | null;
  submittedByUserId: string | null;
  offerReceivedAt: string | null;
  visaFiledAt: string | null;
  visaApprovedAt: string | null;
  enrollmentAt: string | null;
};

export type ApplicationReference = {
  id: string;
  applicationId: string;
  referenceType: string;
  referenceNumber: string;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
};

export type UpsertApplicationReferencePayload = {
  id?: string;
  applicationId: string;
  referenceType: string;
  referenceNumber: string;
  notes?: string | null;
};

export type ApplicationTimelineEvent = {
  id: string;
  applicationId: string;
  eventType: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type UpsertStudentApplicationPayload = {
  id?: string;
  clientId: string;
  clientServiceCaseId: string;
  institutionId: string;
  intakeTerm: string;
  programName?: string | null;
  programCode?: string | null;
  campusName?: string | null;
  intakeDate?: string | null;
  intakeYear?: number | null;
  studyLevel?: string | null;
  durationMonths?: number | null;
  tuitionFee?: number | null;
  tuitionCurrency?: string | null;
  destinationCountry?: string | null;
  institutionApplicationStatus?: InstitutionApplicationStatus;
};

export type UpdateApplicationOfferPayload = {
  applicationId: string;
  offerType?: ApplicationOfferType | null;
  offerStatus: ApplicationOfferStatus;
  offerNumber?: string | null;
  offerDate?: string | null;
  offerExpiryDate?: string | null;
  notes?: string | null;
};

export type UpdateApplicationMilestonesPayload = {
  applicationId: string;
  offerReceivedAt?: string | null;
  visaFiledAt?: string | null;
  visaApprovedAt?: string | null;
  enrollmentAt?: string | null;
};

export type TransitionApplicationPayload = {
  applicationId: string;
  toStatus: ApplicationLifecycleStatus;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  holdReasonCode?: ApplicationHoldReasonCode | null;
};
