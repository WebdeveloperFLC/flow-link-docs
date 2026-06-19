export type SlotScope = "tests" | "education" | "experience" | "language";

export interface DocumentSlotDefinition {
  id: string;
  label: string;
  scope: SlotScope[];
  source: "system" | "custom";
  sortOrder: number;
  /** Phase 1: custom slots are registry-only; not persisted per client. */
  clientId?: string;
}

/** Phase 1 system slots — seeded in code, not DB. Custom slots reserved for future admin governance. */
const SYSTEM_SLOTS: DocumentSlotDefinition[] = [
  { id: "trf", label: "TRF", scope: ["tests"], source: "system", sortOrder: 10 },
  { id: "score_report", label: "Score Report", scope: ["tests"], source: "system", sortOrder: 20 },
  { id: "certificate", label: "Certificate", scope: ["tests", "language"], source: "system", sortOrder: 30 },
  { id: "transcript", label: "Transcript", scope: ["education"], source: "system", sortOrder: 40 },
  { id: "degree_certificate", label: "Degree Certificate", scope: ["education"], source: "system", sortOrder: 50 },
  { id: "experience_letter", label: "Experience Letter", scope: ["experience"], source: "system", sortOrder: 60 },
  { id: "payslip", label: "Payslip", scope: ["experience"], source: "system", sortOrder: 70 },
  { id: "marksheet", label: "Marksheet", scope: ["education"], source: "system", sortOrder: 45 },
  { id: "offer_letter", label: "Offer Letter", scope: ["experience"], source: "system", sortOrder: 65 },
];

const slotById = new Map(SYSTEM_SLOTS.map((s) => [s.id, s]));

export function getSystemDocumentSlots(): readonly DocumentSlotDefinition[] {
  return SYSTEM_SLOTS;
}

export function getDocumentSlot(slotId: string): DocumentSlotDefinition | undefined {
  return slotById.get(slotId);
}

export function getSlotsForScope(scope: SlotScope): DocumentSlotDefinition[] {
  return SYSTEM_SLOTS.filter((s) => s.scope.includes(scope)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function slotLabel(slotId: string, fallback?: string): string {
  return slotById.get(slotId)?.label ?? fallback ?? slotId;
}

export function isValidSlotForScope(slotId: string, scope: SlotScope): boolean {
  const def = slotById.get(slotId);
  return !!def && def.scope.includes(scope);
}

/**
 * Register a custom slot in-memory (Phase 1: not persisted).
 * Future admin UI can extend the registry without jsonb migrations.
 */
export function registerCustomSlot(def: Omit<DocumentSlotDefinition, "source"> & { clientId?: string }): DocumentSlotDefinition {
  const entry: DocumentSlotDefinition = { ...def, source: "custom" };
  slotById.set(entry.id, entry);
  return entry;
}
