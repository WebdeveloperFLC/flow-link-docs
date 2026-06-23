import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import type {
  FeeAccuracy,
  InstitutionFeeScheduleStatus,
  InstitutionFeeType,
  VerificationMethod,
} from "@/lib/feeMaster/institutionFeeTypes";

/** institution_fee_schedule row for admin CRUD. */
export type InstitutionFeeScheduleRecord = {
  id: string;
  upi_institution_id: string;
  fee_type: InstitutionFeeType;
  amount: number;
  currency: string;
  fee_accuracy: FeeAccuracy;
  verification_method: VerificationMethod | null;
  source_url: string | null;
  last_verified_at: string | null;
  verified_by: string | null;
  confidence_score: number | null;
  detected_source_reference: string | null;
  effective_from: string;
  effective_to: string | null;
  program_id: string | null;
  partnership_route_id: string | null;
  status: InstitutionFeeScheduleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InstitutionFeeScheduleInput = Omit<
  InstitutionFeeScheduleRecord,
  "id" | "created_at" | "updated_at" | "verified_by"
> & { verified_by?: string | null };

function mapRow(row: Record<string, unknown>): InstitutionFeeScheduleRecord {
  return {
    id: row.id as string,
    upi_institution_id: row.upi_institution_id as string,
    fee_type: row.fee_type as InstitutionFeeType,
    amount: Number(row.amount),
    currency: row.currency as string,
    fee_accuracy: row.fee_accuracy as FeeAccuracy,
    verification_method: (row.verification_method as VerificationMethod | null) ?? null,
    source_url: (row.source_url as string | null) ?? null,
    last_verified_at: (row.last_verified_at as string | null) ?? null,
    verified_by: (row.verified_by as string | null) ?? null,
    confidence_score: row.confidence_score != null ? Number(row.confidence_score) : null,
    detected_source_reference: (row.detected_source_reference as string | null) ?? null,
    effective_from: row.effective_from as string,
    effective_to: (row.effective_to as string | null) ?? null,
    program_id: (row.program_id as string | null) ?? null,
    partnership_route_id: (row.partnership_route_id as string | null) ?? null,
    status: row.status as InstitutionFeeScheduleStatus,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Fetch all fee schedule rows for an institution. */
export async function fetchInstitutionFeeSchedule(
  institutionId: string,
): Promise<InstitutionFeeScheduleRecord[]> {
  const { data, error } = await supabase
    .from("institution_fee_schedule" as "upi_institutions")
    .select("*")
    .eq("upi_institution_id", institutionId)
    .order("fee_type")
    .order("effective_from", { ascending: false });

  if (error) throw new Error(formatSupabaseError(error, "Could not load fee schedule"));
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

/** Insert or update a fee schedule row. */
export async function upsertInstitutionFeeScheduleRow(
  row: Partial<InstitutionFeeScheduleRecord> & {
    upi_institution_id: string;
    fee_type: InstitutionFeeType;
    amount: number;
    currency: string;
    fee_accuracy: FeeAccuracy;
    status: InstitutionFeeScheduleStatus;
    effective_from: string;
  },
): Promise<InstitutionFeeScheduleRecord> {
  const payload = {
    upi_institution_id: row.upi_institution_id,
    fee_type: row.fee_type,
    amount: row.amount,
    currency: row.currency,
    fee_accuracy: row.fee_accuracy,
    verification_method: row.verification_method ?? null,
    source_url: row.source_url ?? null,
    last_verified_at: row.last_verified_at ?? null,
    verified_by: row.verified_by ?? null,
    confidence_score: row.confidence_score ?? null,
    detected_source_reference: row.detected_source_reference ?? null,
    effective_from: row.effective_from,
    effective_to: row.effective_to ?? null,
    program_id: row.program_id ?? null,
    partnership_route_id: row.partnership_route_id ?? null,
    status: row.status,
    notes: row.notes ?? null,
  };

  if (row.id) {
    const { data, error } = await supabase
      .from("institution_fee_schedule" as "upi_institutions")
      .update(payload)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(formatSupabaseError(error, "Could not update fee schedule row"));
    return mapRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("institution_fee_schedule" as "upi_institutions")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(formatSupabaseError(error, "Could not create fee schedule row"));
  return mapRow(data as Record<string, unknown>);
}

/** Delete a fee schedule row by id. */
export async function deleteInstitutionFeeScheduleRow(id: string): Promise<void> {
  const { error } = await supabase
    .from("institution_fee_schedule" as "upi_institutions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(formatSupabaseError(error, "Could not delete fee schedule row"));
}

/** Fetch partnership routes for resolver preview. */
export async function fetchPartnershipRoutesForInstitution(institutionId: string) {
  const { data, error } = await supabase
    .from("upi_partnership_routes")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("status", "active")
    .order("priority_rank");
  if (error) throw new Error(formatSupabaseError(error, "Could not load partnership routes"));
  return data ?? [];
}
