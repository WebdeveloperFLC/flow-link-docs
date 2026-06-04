/** PostgREST `.single()` with zero rows, or equivalent not-found responses. */
export function isSupabaseNotFound(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST116" || /(\b0 rows\b|not found)/i.test(error.message ?? "");
}

/** Strict per-institution filter — never falls back to "all records". */
export function getInstitutionRecords<T extends { institution_id?: string | null }>(
  institutionId: string | undefined | null,
  records: T[],
): T[] {
  if (!institutionId) return [];
  return records.filter((r) => r.institution_id === institutionId);
}
