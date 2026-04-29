import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";

/** Whitelist of profile columns we ever write to. */
export const PROFILE_FIELDS = [
  "date_of_birth", "gender", "nationality", "place_of_birth",
  "passport_number", "passport_issue_date", "passport_expiry", "passport_country",
  "marital_status", "spouse_name",
  "address_line1", "address_city", "address_state", "address_country", "address_postal",
  "phone_alt", "email_alt",
  "ielts_overall", "ielts_listening", "ielts_reading", "ielts_writing", "ielts_speaking", "ielts_test_date",
  "highest_qualification", "institution_name", "graduation_year", "gpa_or_percentage",
  "employer_name", "job_title", "annual_income", "currency",
  "bank_name", "account_balance", "gic_amount", "tuition_paid",
  "emergency_contact_name", "emergency_contact_phone",
] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];

type Extracted = Partial<Record<ProfileField, string | number | null>>;

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().toLowerCase();
}

/**
 * Merge extracted fields into client_profile.
 * - Empty in DB → write
 * - Same value → no-op
 * - Conflict → keep DB, log conflict, return list
 */
export async function mergeExtractedFields(
  clientId: string,
  documentId: string,
  fileName: string,
  extracted: Extracted,
): Promise<{ written: ProfileField[]; conflicts: { field: ProfileField; existing: unknown; incoming: unknown }[] }> {
  // Fetch current row (may not exist yet)
  const { data: existing } = await supabase
    .from("client_profile")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  const sourceMap: Record<string, string> = (existing?.source_documents as Record<string, string> | null) ?? {};
  const toWrite: Record<string, unknown> = {};
  const written: ProfileField[] = [];
  const conflicts: { field: ProfileField; existing: unknown; incoming: unknown }[] = [];

  for (const field of PROFILE_FIELDS) {
    const incoming = extracted[field];
    if (incoming === undefined || incoming === null || incoming === "") continue;
    const current = (existing as Record<string, unknown> | null)?.[field];
    if (current === null || current === undefined || current === "") {
      toWrite[field] = incoming;
      sourceMap[field] = fileName;
      written.push(field);
    } else if (normalize(current) === normalize(incoming)) {
      // matches — nothing to do
    } else {
      conflicts.push({ field, existing: current, incoming });
    }
  }

  if (written.length > 0) {
    toWrite.source_documents = sourceMap;
    toWrite.last_extracted_at = new Date().toISOString();
    if (existing) {
      const { error } = await supabase
        .from("client_profile")
        .update(toWrite)
        .eq("client_id", clientId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("client_profile")
        .insert({ client_id: clientId, ...toWrite });
      if (error) throw error;
    }
    await logActivity("profile.fields_extracted", "client", clientId, {
      document_id: documentId,
      file_name: fileName,
      fields: written,
    });
  }

  if (conflicts.length > 0) {
    await logActivity("profile.fields_conflict", "client", clientId, {
      document_id: documentId,
      file_name: fileName,
      conflicts: conflicts.map((c) => ({ field: c.field, existing: c.existing, incoming: c.incoming })),
    });
  }

  return { written, conflicts };
}