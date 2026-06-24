import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import type { PreferredCommunicationMethod } from "@/institutions/lib/institutionContactCountries";

/** Row from `upi_institution_contacts` (M2). */
export type InstitutionContactRecord = {
  id: string;
  institution_id: string;
  contact_type: string;
  contact_name: string | null;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  country_code: string | null;
  timezone: string | null;
  preferred_communication_method: PreferredCommunicationMethod | string | null;
  notes: string | null;
  is_primary: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InstitutionContactInput = Omit<
  InstitutionContactRecord,
  "id" | "created_at" | "updated_at" | "created_by" | "updated_by"
> & {
  id?: string;
};

/** Suggested contact types — free text allowed in DB. */
export const SUGGESTED_CONTACT_TYPES = [
  "Admissions",
  "Agent",
  "Finance",
  "Regional Manager",
  "International Office",
  "Commission",
  "Marketing",
  "Other",
] as const;

function mapRow(row: Record<string, unknown>): InstitutionContactRecord {
  return {
    id: row.id as string,
    institution_id: row.institution_id as string,
    contact_type: row.contact_type as string,
    contact_name: (row.contact_name as string | null) ?? null,
    designation: (row.designation as string | null) ?? null,
    department: (row.department as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    mobile: (row.mobile as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    timezone: (row.timezone as string | null) ?? null,
    preferred_communication_method:
      (row.preferred_communication_method as PreferredCommunicationMethod | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    is_primary: Boolean(row.is_primary),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchInstitutionContacts(
  institutionId: string,
  options?: { includeInactive?: boolean },
): Promise<InstitutionContactRecord[]> {
  let query = supabase
    .from("upi_institution_contacts" as "upi_institutions")
    .select("*")
    .eq("institution_id", institutionId)
    .order("contact_type")
    .order("sort_order")
    .order("contact_name");

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(formatSupabaseError(error, "Could not load contacts"));
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

export async function upsertInstitutionContact(
  row: InstitutionContactInput,
): Promise<InstitutionContactRecord> {
  const payload = {
    institution_id: row.institution_id,
    contact_type: row.contact_type.trim(),
    contact_name: row.contact_name?.trim() || null,
    designation: row.designation?.trim() || null,
    department: row.department?.trim() || null,
    email: row.email?.trim() || null,
    phone: row.phone?.trim() || null,
    mobile: row.mobile?.trim() || null,
    country_code: row.country_code?.trim().toUpperCase() || null,
    timezone: row.timezone?.trim() || null,
    preferred_communication_method: row.preferred_communication_method?.trim() || null,
    notes: row.notes?.trim() || null,
    is_primary: row.is_primary,
    is_active: row.is_active,
    sort_order: row.sort_order ?? 0,
  };

  if (!payload.contact_type) {
    throw new Error("Contact type is required");
  }

  if (row.id) {
    const { data, error } = await supabase
      .from("upi_institution_contacts" as "upi_institutions")
      .update(payload)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(formatSupabaseError(error, "Could not update contact"));
    return mapRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("upi_institution_contacts" as "upi_institutions")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(formatSupabaseError(error, "Could not add contact"));
  return mapRow(data as Record<string, unknown>);
}

export async function deleteInstitutionContact(id: string): Promise<void> {
  const { error } = await supabase
    .from("upi_institution_contacts" as "upi_institutions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(formatSupabaseError(error, "Could not delete contact"));
}

export async function setInstitutionContactActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("upi_institution_contacts" as "upi_institutions")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(formatSupabaseError(error, "Could not update contact status"));
}
