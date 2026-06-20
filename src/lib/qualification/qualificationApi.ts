import { supabase } from "@/integrations/supabase/client";
import type {
  InstitutionApplicationStatus,
  QualificationDepositTrack,
  QualificationEvent,
  QualificationLifecycleStatus,
  QualificationRecord,
  QualificationTuitionTrack,
  TransitionQualificationPayload,
  UpsertQualificationPayload,
} from "./types";

function mapQualification(row: Record<string, unknown>): QualificationRecord {
  const institution = row.upi_institutions as { name?: string } | null | undefined;
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientServiceCaseId: row.client_service_case_id as string,
    institutionId: row.institution_id as string,
    programName: (row.program_name as string | null) ?? null,
    intakeTerm: row.intake_term as string,
    intakeDate: (row.intake_date as string | null) ?? null,
    status: row.status as QualificationLifecycleStatus,
    statusReasonCode: (row.status_reason_code as string | null) ?? null,
    statusReasonNotes: (row.status_reason_notes as string | null) ?? null,
    holdReasonCode: (row.hold_reason_code as QualificationRecord["holdReasonCode"]) ?? null,
    statusChangedAt: (row.status_changed_at as string | null) ?? null,
    statusChangedBy: (row.status_changed_by as string | null) ?? null,
    ownerUserId: (row.qualification_owner_user_id as string | null) ?? null,
    applicationStatus: (row.institution_application_status as InstitutionApplicationStatus | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    institutionName: institution?.name ?? null,
    ownerName: null,
  };
}

function mapDepositTrack(row: Record<string, unknown>): QualificationDepositTrack {
  return {
    id: row.id as string,
    qualificationId: row.qualification_id as string,
    requiredAmount: Number(row.required_amount ?? 0),
    dueDate: (row.due_date as string | null) ?? null,
    paidAmount: Number(row.paid_amount ?? 0),
    outstandingAmount: Number(row.outstanding_amount ?? 0),
    currency: (row.currency as string) ?? "CAD",
    status: row.status as QualificationDepositTrack["status"],
  };
}

function mapTuitionTrack(row: Record<string, unknown>): QualificationTuitionTrack {
  return {
    id: row.id as string,
    qualificationId: row.qualification_id as string,
    totalTuition: Number(row.total_tuition ?? 0),
    paidAmount: Number(row.paid_amount ?? 0),
    outstandingAmount: Number(row.outstanding_amount ?? 0),
    currency: (row.currency as string) ?? "CAD",
    status: row.status as QualificationTuitionTrack["status"],
  };
}

export async function fetchQualificationsForCase(
  clientId: string,
  caseId: string,
): Promise<QualificationRecord[]> {
  const { data, error } = await supabase
    .from("client_institution_qualifications" as never)
    .select("*, upi_institutions ( name )" as never)
    .eq("client_id", clientId)
    .eq("client_service_case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapQualification);
}

export async function fetchQualificationBundle(qualificationId: string) {
  const [qualRes, depositRes, tuitionRes, eventsRes] = await Promise.all([
    supabase
      .from("client_institution_qualifications" as never)
      .select("*, upi_institutions ( name )" as never)
      .eq("id", qualificationId)
      .maybeSingle(),
    supabase
      .from("qualification_deposit_track" as never)
      .select("*")
      .eq("qualification_id", qualificationId)
      .maybeSingle(),
    supabase
      .from("qualification_tuition_track" as never)
      .select("*")
      .eq("qualification_id", qualificationId)
      .maybeSingle(),
    supabase
      .from("qualification_events" as never)
      .select("*")
      .eq("qualification_id", qualificationId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (qualRes.error) throw qualRes.error;
  if (!qualRes.data) return null;

  return {
    qualification: mapQualification(qualRes.data as Record<string, unknown>),
    depositTrack: depositRes.data
      ? mapDepositTrack(depositRes.data as Record<string, unknown>)
      : null,
    tuitionTrack: tuitionRes.data
      ? mapTuitionTrack(tuitionRes.data as Record<string, unknown>)
      : null,
    events: ((eventsRes.data ?? []) as Record<string, unknown>[]).map(
      (row): QualificationEvent => ({
        id: row.id as string,
        qualificationId: row.qualification_id as string,
        eventType: row.event_type as string,
        actorId: (row.actor_id as string | null) ?? null,
        payload: (row.payload_jsonb as Record<string, unknown>) ?? {},
        createdAt: row.created_at as string,
      }),
    ),
  };
}

export async function upsertClientQualification(payload: UpsertQualificationPayload): Promise<string> {
  const { data, error } = await supabase.rpc("fn_upsert_client_qualification" as never, {
    p_payload: {
      id: payload.id,
      client_id: payload.clientId,
      client_service_case_id: payload.clientServiceCaseId,
      institution_id: payload.institutionId,
      intake_term: payload.intakeTerm,
      program_name: payload.programName ?? null,
      intake_date: payload.intakeDate ?? null,
      deposit_required: payload.depositRequired ?? 0,
      tuition_total: payload.tuitionTotal ?? 0,
      currency: payload.currency ?? "CAD",
      institution_application_status: payload.institutionApplicationStatus ?? "APPLIED",
    },
  } as never);

  if (error) throw error;
  return data as string;
}

export async function transitionQualificationStatus(
  payload: TransitionQualificationPayload,
): Promise<void> {
  const { error } = await supabase.rpc("fn_transition_qualification_status" as never, {
    p_qualification_id: payload.qualificationId,
    p_to_status: payload.toStatus,
    p_reason_code: payload.reasonCode ?? null,
    p_reason_notes: payload.reasonNotes ?? null,
    p_hold_reason_code: payload.holdReasonCode ?? null,
    p_transfer_target_case_id: null,
    p_transfer_target_institution_id: null,
  } as never);
  if (error) throw error;
}

export async function reassignQualificationOwner(
  qualificationId: string,
  newOwnerUserId: string,
  reasonNotes?: string,
): Promise<void> {
  const { error } = await supabase.rpc("fn_reassign_qualification_owner" as never, {
    p_qualification_id: qualificationId,
    p_new_owner_user_id: newOwnerUserId,
    p_reason_notes: reasonNotes ?? null,
  } as never);
  if (error) throw error;
}

export async function updateApplicationStatus(
  qualificationId: string,
  applicationStatus: InstitutionApplicationStatus,
): Promise<void> {
  const { error } = await supabase.rpc("fn_update_application_status" as never, {
    p_qualification_id: qualificationId,
    p_application_status: applicationStatus,
  } as never);
  if (error) throw error;
}
