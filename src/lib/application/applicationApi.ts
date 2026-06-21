import { supabase } from "@/integrations/supabase/client";
import type {
  ApplicationMilestones,
  ApplicationOffer,
  ApplicationReference,
  InstitutionApplicationStatus,
  ApplicationTimelineEvent,
  ApplicationLifecycleStatus,
  StudentApplicationRecord,
  TransitionApplicationPayload,
  UpdateApplicationMilestonesPayload,
  UpdateApplicationOfferPayload,
  UpsertApplicationReferencePayload,
  UpsertStudentApplicationPayload,
} from "./types";

/** PostgREST embed hint — disambiguates transfer_target_institution_id FK on live schema. */
export const CLIENT_INSTITUTION_QUALIFICATIONS_INSTITUTION_FK =
  "client_institution_qualifications_institution_id_fkey";

const APPLICATION_WITH_INSTITUTION_SELECT = `
  *,
  upi_institutions!${CLIENT_INSTITUTION_QUALIFICATIONS_INSTITUTION_FK} (
    name,
    country_name
  )
`;

function mapStudentApplication(row: Record<string, unknown>): StudentApplicationRecord {
  const institution = row.upi_institutions as { name?: string; country_name?: string } | null | undefined;
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientServiceCaseId: row.client_service_case_id as string,
    institutionId: row.institution_id as string,
    programName: (row.program_name as string | null) ?? null,
    programCode: (row.program_code as string | null) ?? null,
    campusName: (row.campus_name as string | null) ?? null,
    intakeTerm: row.intake_term as string,
    intakeDate: (row.intake_date as string | null) ?? null,
    intakeYear: row.intake_year != null ? Number(row.intake_year) : null,
    studyLevel: (row.study_level as string | null) ?? null,
    durationMonths: row.duration_months != null ? Number(row.duration_months) : null,
    tuitionFee: row.tuition_fee != null ? Number(row.tuition_fee) : null,
    tuitionCurrency: (row.tuition_currency as string | null) ?? null,
    destinationCountry: (row.destination_country as string | null) ?? null,
    institutionNameSnapshot: (row.institution_name_snapshot as string | null) ?? null,
    institutionCitySnapshot: (row.institution_city_snapshot as string | null) ?? null,
    cfClientProgramId: (row.cf_client_program_id as string | null) ?? null,
    cfCourseId: (row.cf_course_id as string | null) ?? null,
    applicationSource: (row.application_source as StudentApplicationRecord["applicationSource"]) ?? "MANUAL",
    status: row.status as ApplicationLifecycleStatus,
    statusReasonCode: (row.status_reason_code as string | null) ?? null,
    statusReasonNotes: (row.status_reason_notes as string | null) ?? null,
    holdReasonCode: (row.hold_reason_code as StudentApplicationRecord["holdReasonCode"]) ?? null,
    statusChangedAt: (row.status_changed_at as string | null) ?? null,
    statusChangedBy: (row.status_changed_by as string | null) ?? null,
    ownerUserId: (row.qualification_owner_user_id as string | null) ?? null,
    applicationStatus: (row.institution_application_status as InstitutionApplicationStatus | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    institutionName: institution?.name ?? row.institution_name_snapshot ?? null,
    institutionCountryName: institution?.country_name ?? row.destination_country ?? null,
    ownerName: null,
  };
}

function mapApplicationOffer(row: Record<string, unknown>): ApplicationOffer {
  return {
    applicationId: row.qualification_id as string,
    offerType: (row.offer_type as ApplicationOffer["offerType"]) ?? null,
    offerStatus: row.offer_status as ApplicationOffer["offerStatus"],
    offerNumber: (row.offer_number as string | null) ?? null,
    offerDate: (row.offer_date as string | null) ?? null,
    offerExpiryDate: (row.offer_expiry_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}

function mapApplicationMilestones(row: Record<string, unknown>): ApplicationMilestones {
  return {
    applicationId: row.qualification_id as string,
    applicationCreatedAt: row.application_created_at as string,
    applicationSubmittedDate: (row.application_submitted_date as string | null) ?? null,
    submittedByUserId: (row.submitted_by_user_id as string | null) ?? null,
    offerReceivedAt: (row.offer_received_at as string | null) ?? null,
    visaFiledAt: (row.visa_filed_at as string | null) ?? null,
    visaApprovedAt: (row.visa_approved_at as string | null) ?? null,
    enrollmentAt: (row.enrollment_at as string | null) ?? null,
  };
}

function mapApplicationReference(row: Record<string, unknown>): ApplicationReference {
  return {
    id: row.id as string,
    applicationId: row.qualification_id as string,
    referenceType: row.reference_type as string,
    referenceNumber: row.reference_number as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string | null) ?? null,
  };
}

export async function fetchStudentApplicationsForCase(
  clientId: string,
  caseId: string,
): Promise<StudentApplicationRecord[]> {
  const { data, error } = await supabase
    .from("client_institution_qualifications" as never)
    .select(APPLICATION_WITH_INSTITUTION_SELECT as never)
    .eq("client_id", clientId)
    .eq("client_service_case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapStudentApplication);
}

export async function fetchStudentApplicationBundle(applicationId: string) {
  const [qualRes, offerRes, milestonesRes, eventsRes, referencesRes] = await Promise.all([
    supabase
      .from("client_institution_qualifications" as never)
      .select(APPLICATION_WITH_INSTITUTION_SELECT as never)
      .eq("id", applicationId)
      .maybeSingle(),
    supabase
      .from("qualification_application_offer" as never)
      .select("*")
      .eq("qualification_id", applicationId)
      .maybeSingle(),
    supabase
      .from("qualification_application_milestones" as never)
      .select("*")
      .eq("qualification_id", applicationId)
      .maybeSingle(),
    supabase
      .from("qualification_events" as never)
      .select("*")
      .eq("qualification_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("qualification_application_references" as never)
      .select("*")
      .eq("qualification_id", applicationId)
      .order("created_at", { ascending: false }),
  ]);

  if (qualRes.error) throw qualRes.error;
  if (!qualRes.data) return null;

  return {
    application: mapStudentApplication(qualRes.data as Record<string, unknown>),
    offer: offerRes.data ? mapApplicationOffer(offerRes.data as Record<string, unknown>) : null,
    milestones: milestonesRes.data
      ? mapApplicationMilestones(milestonesRes.data as Record<string, unknown>)
      : null,
    events: ((eventsRes.data ?? []) as Record<string, unknown>[]).map(
      (row): ApplicationTimelineEvent => ({
        id: row.id as string,
        applicationId: row.qualification_id as string,
        eventType: row.event_type as string,
        actorId: (row.actor_id as string | null) ?? null,
        payload: (row.payload_jsonb as Record<string, unknown>) ?? {},
        createdAt: row.created_at as string,
      }),
    ),
    references: ((referencesRes.data ?? []) as Record<string, unknown>[]).map(mapApplicationReference),
  };
}

export async function upsertStudentApplication(payload: UpsertStudentApplicationPayload): Promise<string> {
  const { data, error } = await supabase.rpc("fn_upsert_client_qualification" as never, {
    p_payload: {
      id: payload.id,
      client_id: payload.clientId,
      client_service_case_id: payload.clientServiceCaseId,
      institution_id: payload.institutionId,
      intake_term: payload.intakeTerm,
      program_name: payload.programName ?? null,
      program_code: payload.programCode ?? null,
      campus_name: payload.campusName ?? null,
      intake_date: payload.intakeDate ?? null,
      intake_year: payload.intakeYear ?? null,
      study_level: payload.studyLevel ?? null,
      duration_months: payload.durationMonths ?? null,
      tuition_fee: payload.tuitionFee ?? null,
      tuition_currency: payload.tuitionCurrency ?? null,
      destination_country: payload.destinationCountry ?? null,
      institution_application_status: payload.institutionApplicationStatus ?? "APPLIED",
    },
  } as never);

  if (error) throw error;
  return data as string;
}

export async function transitionApplicationLifecycle(
  payload: TransitionApplicationPayload,
): Promise<void> {
  const { error } = await supabase.rpc("fn_transition_qualification_status" as never, {
    p_qualification_id: payload.applicationId,
    p_to_status: payload.toStatus,
    p_reason_code: payload.reasonCode ?? null,
    p_reason_notes: payload.reasonNotes ?? null,
    p_hold_reason_code: payload.holdReasonCode ?? null,
    p_transfer_target_case_id: null,
    p_transfer_target_institution_id: null,
  } as never);
  if (error) throw error;
}

export async function reassignApplicationOwner(
  applicationId: string,
  newOwnerUserId: string,
  reasonNotes?: string,
): Promise<void> {
  const { error } = await supabase.rpc("fn_reassign_qualification_owner" as never, {
    p_qualification_id: applicationId,
    p_new_owner_user_id: newOwnerUserId,
    p_reason_notes: reasonNotes ?? null,
  } as never);
  if (error) throw error;
}

export async function updateApplicationStatus(
  applicationId: string,
  applicationStatus: InstitutionApplicationStatus,
): Promise<void> {
  const { error } = await supabase.rpc("fn_update_application_status" as never, {
    p_qualification_id: applicationId,
    p_application_status: applicationStatus,
  } as never);
  if (error) throw error;
}

export async function updateApplicationOffer(payload: UpdateApplicationOfferPayload): Promise<void> {
  const { error } = await supabase.rpc("fn_update_application_offer" as never, {
    p_qualification_id: payload.applicationId,
    p_payload: {
      offer_type: payload.offerType ?? null,
      offer_status: payload.offerStatus,
      offer_number: payload.offerNumber ?? null,
      offer_date: payload.offerDate ?? null,
      offer_expiry_date: payload.offerExpiryDate ?? null,
      notes: payload.notes ?? null,
    },
  } as never);
  if (error) throw error;
}

export async function updateApplicationMilestones(
  payload: UpdateApplicationMilestonesPayload,
): Promise<void> {
  const { error } = await supabase.rpc("fn_update_application_milestones" as never, {
    p_qualification_id: payload.applicationId,
    p_payload: {
      offer_received_at: payload.offerReceivedAt ?? null,
      visa_filed_at: payload.visaFiledAt ?? null,
      visa_approved_at: payload.visaApprovedAt ?? null,
      enrollment_at: payload.enrollmentAt ?? null,
    },
  } as never);
  if (error) throw error;
}

export async function recordApplicationSubmitted(
  applicationId: string,
  submittedDate?: string,
): Promise<void> {
  const { error } = await supabase.rpc("fn_record_application_submitted" as never, {
    p_qualification_id: applicationId,
    p_submitted_date: submittedDate ?? null,
  } as never);
  if (error) throw error;
}

export async function upsertApplicationReference(
  payload: UpsertApplicationReferencePayload,
): Promise<string> {
  const { data, error } = await supabase.rpc("fn_upsert_application_reference" as never, {
    p_payload: {
      id: payload.id,
      qualification_id: payload.applicationId,
      reference_type: payload.referenceType.trim(),
      reference_number: payload.referenceNumber.trim(),
      notes: payload.notes?.trim() || null,
    },
  } as never);

  if (error) throw error;
  return data as string;
}

export async function deleteApplicationReference(referenceId: string): Promise<void> {
  const { error } = await supabase.rpc("fn_delete_application_reference" as never, {
    p_reference_id: referenceId,
  } as never);
  if (error) throw error;
}
