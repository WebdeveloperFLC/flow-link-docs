/** Strict per-institution filter — never falls back to "all records". */
export function getInstitutionRecords<T extends { institution_id?: string | null }>(
  institutionId: string | undefined | null,
  records: T[],
): T[] {
  if (!institutionId) return [];
  return records.filter((r) => r.institution_id === institutionId);
}
