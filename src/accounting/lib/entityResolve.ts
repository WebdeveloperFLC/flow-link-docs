import type { SettingsEntity } from "../types/settings";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEntityUuid(ref: string | null | undefined): boolean {
  return !!ref && UUID_RX.test(ref.trim());
}

/** Resolve a journal/intercompany entity field (UUID or name) to a settings entity row. */
export function findEntityByRef(
  ref: string | null | undefined,
  entities: SettingsEntity[],
): SettingsEntity | undefined {
  const t = (ref ?? "").trim();
  if (!t) return undefined;
  if (isEntityUuid(t)) return entities.find((e) => e.id === t);
  const exact = entities.find((e) => e.name === t);
  if (exact) return exact;
  const lower = t.toLowerCase();
  return entities.find((e) => e.name.toLowerCase() === lower);
}

export function entityDisplayName(
  ref: string | null | undefined,
  entities: SettingsEntity[],
): string {
  if (!ref?.trim()) return "—";
  return findEntityByRef(ref, entities)?.name ?? ref;
}

/** Match a journal's entity field against a filter entity id (or "all"). */
export function journalMatchesEntityFilter(
  journalEntity: string,
  filterEntityId: string,
  entities: SettingsEntity[],
): boolean {
  if (filterEntityId === "all") return true;
  const filterEntity = entities.find((e) => e.id === filterEntityId);
  if (!filterEntity) return journalEntity === filterEntityId;
  const journalEntityRow = findEntityByRef(journalEntity, entities);
  if (journalEntityRow) return journalEntityRow.id === filterEntity.id;
  return journalEntity === filterEntity.name;
}
