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

export interface EducationEntry {
  degree?: string | null;
  field_of_study?: string | null;
  level?: string | null;
  institution?: string | null;
  city?: string | null;
  country?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  gpa_or_percentage?: string | null;
}

type Extracted = Partial<Record<ProfileField, string | number | null>> & {
  phone_primary?: string | null;
  education_history?: EducationEntry[] | null;
};

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().toLowerCase();
}

const LEVEL_RANK: Record<string, number> = {
  high_school: 1, certificate: 2, diploma: 3, bachelor: 4, master: 5, phd: 6, other: 0,
};

async function syncPrimaryPhone(clientId: string, documentId: string, fileName: string, phonePrimary: string) {
  const { data: client } = await supabase.from("clients").select("phone").eq("id", clientId).maybeSingle();
  const current = client?.phone?.toString().trim() ?? "";
  if (!current) {
    await supabase.from("clients").update({ phone: phonePrimary } as never).eq("id", clientId);
    await logActivity("client.phone_extracted", "client", clientId, {
      document_id: documentId, file_name: fileName, phone: phonePrimary,
    });
  } else if (normalize(current) !== normalize(phonePrimary)) {
    await logActivity("profile.fields_conflict", "client", clientId, {
      document_id: documentId, file_name: fileName,
      conflicts: [{ field: "phone", existing: current, incoming: phonePrimary }],
    });
  }
}

async function upsertEducationHistory(
  clientId: string,
  documentId: string,
  fileName: string,
  entries: EducationEntry[],
): Promise<{ added: number; topLevel: EducationEntry | null }> {
  const cleaned = entries
    .map((e) => ({
      degree: e.degree?.toString().trim() || null,
      field_of_study: e.field_of_study?.toString().trim() || null,
      level: e.level?.toString().trim().toLowerCase() || null,
      institution: e.institution?.toString().trim() || null,
      city: e.city?.toString().trim() || null,
      country: e.country?.toString().trim() || null,
      start_year: typeof e.start_year === "number" ? e.start_year : null,
      end_year: typeof e.end_year === "number" ? e.end_year : null,
      gpa_or_percentage: e.gpa_or_percentage?.toString().trim() || null,
    }))
    .filter((e) => e.degree || e.institution);

  if (cleaned.length === 0) return { added: 0, topLevel: null };

  const { data: existing } = await supabase
    .from("client_education")
    .select("degree, institution, end_year")
    .eq("client_id", clientId);
  const seen = new Set(
    (existing ?? []).map((r) =>
      [normalize(r.degree), normalize(r.institution), r.end_year ?? ""].join("|"),
    ),
  );

  const toInsert = cleaned
    .filter((e) => !seen.has([normalize(e.degree), normalize(e.institution), e.end_year ?? ""].join("|")))
    .map((e) => ({
      client_id: clientId,
      ...e,
      source_document_id: documentId,
      source_file_name: fileName,
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("client_education").insert(toInsert as never);
    if (error) throw error;
  }

  // Determine top entry by level rank, then end_year
  const top = [...cleaned].sort((a, b) => {
    const ra = LEVEL_RANK[a.level ?? ""] ?? 0;
    const rb = LEVEL_RANK[b.level ?? ""] ?? 0;
    if (rb !== ra) return rb - ra;
    return (b.end_year ?? 0) - (a.end_year ?? 0);
  })[0];

  return { added: toInsert.length, topLevel: top ?? null };
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
  // 1. Sync primary phone to clients.phone (separate from profile)
  const phonePrimary = extracted.phone_primary?.toString().trim();
  if (phonePrimary) {
    try { await syncPrimaryPhone(clientId, documentId, fileName, phonePrimary); }
    catch (e) { console.warn("syncPrimaryPhone failed", e); }
  }

  // 2. Upsert education history; derive missing single-field qualification
  const eduHistory = Array.isArray(extracted.education_history) ? extracted.education_history : [];
  let derivedTop: EducationEntry | null = null;
  if (eduHistory.length > 0) {
    try {
      const res = await upsertEducationHistory(clientId, documentId, fileName, eduHistory);
      derivedTop = res.topLevel;
    } catch (e) { console.warn("upsertEducationHistory failed", e); }
  }

  // Backfill legacy single fields from derivedTop if AI didn't supply them directly
  if (derivedTop) {
    if (!extracted.highest_qualification && derivedTop.degree) extracted.highest_qualification = derivedTop.degree;
    if (!extracted.institution_name && derivedTop.institution) extracted.institution_name = derivedTop.institution;
    if (!extracted.graduation_year && derivedTop.end_year) extracted.graduation_year = derivedTop.end_year;
    if (!extracted.gpa_or_percentage && derivedTop.gpa_or_percentage) extracted.gpa_or_percentage = derivedTop.gpa_or_percentage;
  }

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
        .update(toWrite as never)
        .eq("client_id", clientId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("client_profile")
        .insert({ client_id: clientId, ...toWrite } as never);
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