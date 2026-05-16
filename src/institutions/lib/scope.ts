/**
 * Institution-scoped data helpers.
 *
 * These guarantee that records from one institution NEVER leak into another
 * institution's workspace, even when falling back to mock seed data.
 */

export const MOCK_TEMPLATE_IDS = [
  "mock-inst-seneca",
  "mock-inst-conestoga",
  "mock-inst-centennial",
  "mock-inst-fanshawe",
  "mock-inst-ubc",
] as const;

export type MockTemplateId = (typeof MOCK_TEMPLATE_IDS)[number];

/** Strict filter: never falls back to "all records". */
export function getInstitutionRecords<T extends { institution_id?: string | null }>(
  institutionId: string | undefined | null,
  records: T[],
): T[] {
  if (!institutionId) return [];
  return records.filter((r) => r.institution_id === institutionId);
}

/** Stable hash → mock template id, so a given real institution always
 *  hydrates from the same demo template (never a merged blob). */
export function pickMockTemplate(institutionId: string): MockTemplateId {
  // If the caller already passes a mock id, use it directly.
  if ((MOCK_TEMPLATE_IDS as readonly string[]).includes(institutionId)) {
    return institutionId as MockTemplateId;
  }
  let h = 0;
  for (let i = 0; i < institutionId.length; i++) {
    h = (h * 31 + institutionId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % MOCK_TEMPLATE_IDS.length;
  return MOCK_TEMPLATE_IDS[idx];
}

/** Clone records and rewrite their institution_id so seeded mock data
 *  appears to belong to the current institution. Child foreign keys
 *  (commission_id, claim_cycle_id, etc.) are preserved. */
export function rekeyToInstitution<T extends { institution_id?: string | null }>(
  records: T[],
  toId: string,
): T[] {
  return records.map((r) => ({ ...r, institution_id: toId }));
}