import type { SettingsEntity } from "../types/settings";
import type { PettyBranch, PettyPerson, PettyPersonRole } from "../types/pettyCash";

export const PETTY_PEOPLE_KEY = "accounting:petty-people:v1";
const PETTY_PEOPLE_REMOVED_KEY = "accounting:petty-people-removed:v1";

export const PETTY_BRANCH_CONFIG_KEY = "accounting:petty-branch-config:v1";
export const LEGACY_PETTY_BRANCHES_KEY = "accounting:petty-branches:v1";
/** Bump when demo/seed petty data must be wiped from the browser. */
export const PETTY_DATA_RESET_VERSION = "2026-06-02-empty";
const PETTY_DATA_RESET_MARKER = "accounting:petty-data-reset-version";

const PETTY_LOCAL_STORAGE_KEYS = [
  PETTY_BRANCH_CONFIG_KEY,
  LEGACY_PETTY_BRANCHES_KEY,
  "accounting:petty-cash:v2",
  "accounting:petty-cash:v1",
  PETTY_PEOPLE_KEY,
  PETTY_PEOPLE_REMOVED_KEY,
  "accounting:petty-categories:v1",
  "accounting:petty-replenishments:v1",
  "accounting:petty-verifications:v1",
] as const;

/** Clears manual branches, dummy vouchers in localStorage, and legacy demo caches. */
export function applyPettyCashDataResetIfNeeded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(PETTY_DATA_RESET_MARKER) === PETTY_DATA_RESET_VERSION) {
      return false;
    }
    for (const key of PETTY_LOCAL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(PETTY_DATA_RESET_MARKER, PETTY_DATA_RESET_VERSION);
    return true;
  } catch {
    return false;
  }
}

/** Petty-cash operational fields stored per entity branch (name/code come from Entities). */
export interface PettyBranchConfig {
  custodianName: string;
  custodianEmail: string;
  secondaryApproverName?: string;
  openingFloat: number;
  currentBalance: number;
  lastVerifiedAt?: string;
  lastVerifiedDelta?: number;
  /** Optional stable code for DB `accounting_petty_cash.branch` (defaults to derived code). */
  legacyCode?: string;
}

export function isPettyCashBranchEntity(e: SettingsEntity): boolean {
  return e.type === "BRANCH" || e.type === "SUB_BRANCH";
}

/** Short stable code written to `accounting_petty_cash.branch`. */
export function entityBranchCode(entity: SettingsEntity, legacyCode?: string | null): string {
  if (legacyCode?.trim()) return legacyCode.trim().toUpperCase();
  if (entity.id.startsWith("e-")) {
    const slug = entity.id.slice(2).replace(/-/g, "").toUpperCase();
    if (slug.length >= 3) return slug.slice(0, 12);
  }
  const fromName = entity.name
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 12);
  return fromName || entity.id.slice(0, 12).toUpperCase();
}

function defaultConfig(): PettyBranchConfig {
  return {
    custodianName: "",
    custodianEmail: "",
    openingFloat: 10_000,
    currentBalance: 10_000,
  };
}

const PLACEHOLDER_CUSTODIAN = "Branch custodian";

/** Labels shown in UI when a branch role is not configured yet. */
export function displayBranchCustodian(name: string | undefined | null): string {
  const n = (name ?? "").trim();
  if (!n || n === PLACEHOLDER_CUSTODIAN) return "Not assigned";
  return n;
}

export function displayBranchApprover(name: string | undefined | null): string {
  const n = (name ?? "").trim();
  return n || "Not assigned";
}

export function isBranchCustodianAssigned(name: string | undefined | null): boolean {
  const n = (name ?? "").trim();
  return !!n && n !== PLACEHOLDER_CUSTODIAN;
}

export function loadPettyBranchConfigs(): Record<string, PettyBranchConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PETTY_BRANCH_CONFIG_KEY);
    if (raw) return JSON.parse(raw) as Record<string, PettyBranchConfig>;
  } catch {
    // ignore
  }
  return {};
}

export function savePettyBranchConfigs(configs: Record<string, PettyBranchConfig>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PETTY_BRANCH_CONFIG_KEY, JSON.stringify(configs));
  } catch {
    // ignore
  }
}

export function personRoleKey(role: PettyPersonRole, name: string): string {
  return `${role}:${name.trim()}`;
}

export function loadPettyPeopleRemovedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PETTY_PEOPLE_REMOVED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // ignore
  }
  return new Set();
}

export function savePettyPeopleRemovedKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PETTY_PEOPLE_REMOVED_KEY, JSON.stringify([...keys]));
  } catch {
    // ignore
  }
}

export function loadPettyPeople(): PettyPerson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PETTY_PEOPLE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as PettyPerson[];
    return list.map((p) => ({
      ...p,
      role: (p.role === "employee" ? "authority" : p.role) as PettyPersonRole,
    }));
  } catch {
    return [];
  }
}

export function savePettyPeople(people: PettyPerson[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PETTY_PEOPLE_KEY, JSON.stringify(people));
  } catch {
    // ignore
  }
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Map a legacy petty branch row (manual add) to an entity by name similarity. */
export function matchEntityForLegacyBranch(
  legacy: { id: string; name: string; code?: string },
  entities: SettingsEntity[],
): SettingsEntity | null {
  const branchEntities = entities.filter(isPettyCashBranchEntity);
  const n = normalizeName(legacy.name);
  const exact = branchEntities.find((e) => normalizeName(e.name) === n);
  if (exact) return exact;
  const code = legacy.code?.toUpperCase();
  if (code) {
    const byCode = branchEntities.find((e) => entityBranchCode(e) === code);
    if (byCode) return byCode;
  }
  return (
    branchEntities.find((e) => {
      const en = normalizeName(e.name);
      return en.includes(n) || n.includes(en);
    }) ?? null
  );
}

type LegacyPettyBranch = PettyBranch & { entityId?: string };

/** One-time: move configs from old manual branch ids onto entity ids. */
export function migrateLegacyBranchConfigs(
  configs: Record<string, PettyBranchConfig>,
  entities: SettingsEntity[],
): Record<string, PettyBranchConfig> {
  if (typeof window === "undefined") return configs;
  let legacyBranches: LegacyPettyBranch[] = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_PETTY_BRANCHES_KEY);
    if (raw) legacyBranches = JSON.parse(raw) as LegacyPettyBranch[];
  } catch {
    // ignore
  }
  const out = { ...configs };
  for (const leg of legacyBranches) {
    const entity = matchEntityForLegacyBranch(leg, entities);
    if (!entity) continue;
    const existing = out[entity.id];
    out[entity.id] = {
      custodianName: leg.custodianName || existing?.custodianName || defaultConfig().custodianName,
      custodianEmail: leg.custodianEmail ?? existing?.custodianEmail ?? "",
      secondaryApproverName: leg.secondaryApproverName ?? existing?.secondaryApproverName,
      openingFloat: leg.openingFloat ?? existing?.openingFloat ?? 10_000,
      currentBalance: leg.currentBalance ?? existing?.currentBalance ?? leg.openingFloat ?? 10_000,
      lastVerifiedAt: leg.lastVerifiedAt ?? existing?.lastVerifiedAt,
      lastVerifiedDelta: leg.lastVerifiedDelta ?? existing?.lastVerifiedDelta,
      legacyCode: leg.code || existing?.legacyCode,
    };
    if (leg.id !== entity.id && out[leg.id]) delete out[leg.id];
  }
  for (const [key, cfg] of Object.entries(out)) {
    if (key.startsWith("br-") || key.startsWith("pv-")) {
      const entity = matchEntityForLegacyBranch({ id: key, name: key, code: cfg.legacyCode }, entities);
      if (entity && !out[entity.id]) {
        out[entity.id] = cfg;
      }
      delete out[key];
    }
  }
  return out;
}

export function buildPettyBranchesFromEntities(
  entities: SettingsEntity[],
  configs: Record<string, PettyBranchConfig>,
): PettyBranch[] {
  const branchEntities = entities
    .filter(isPettyCashBranchEntity)
    .sort((a, b) => a.name.localeCompare(b.name));

  return branchEntities.map((entity) => {
    const cfg = configs[entity.id] ?? defaultConfig();
    const code = entityBranchCode(entity, cfg.legacyCode);
    return {
      id: entity.id,
      name: entity.name,
      code,
      custodianName: cfg.custodianName,
      custodianEmail: cfg.custodianEmail,
      secondaryApproverName: cfg.secondaryApproverName,
      openingFloat: cfg.openingFloat,
      currentBalance: cfg.currentBalance,
      lastVerifiedAt: cfg.lastVerifiedAt,
      lastVerifiedDelta: cfg.lastVerifiedDelta,
    };
  });
}

export function patchToBranchConfig(patch: Partial<PettyBranch>): Partial<PettyBranchConfig> {
  const out: Partial<PettyBranchConfig> = {};
  if (patch.custodianName !== undefined) out.custodianName = patch.custodianName;
  if (patch.custodianEmail !== undefined) out.custodianEmail = patch.custodianEmail;
  if (patch.secondaryApproverName !== undefined) out.secondaryApproverName = patch.secondaryApproverName;
  if (patch.openingFloat !== undefined) out.openingFloat = patch.openingFloat;
  if (patch.currentBalance !== undefined) out.currentBalance = patch.currentBalance;
  if (patch.lastVerifiedAt !== undefined) out.lastVerifiedAt = patch.lastVerifiedAt;
  if (patch.lastVerifiedDelta !== undefined) out.lastVerifiedDelta = patch.lastVerifiedDelta;
  if (patch.code !== undefined) out.legacyCode = patch.code;
  return out;
}

export function resolveBranchIdFromDbRow(
  branchField: string,
  branches: PettyBranch[],
  entities: SettingsEntity[],
): string | null {
  const byId = branches.find((b) => b.id === branchField);
  if (byId) return byId.id;
  const byCode = branches.find((b) => b.code === branchField);
  if (byCode) return byCode.id;
  const entity = entities.find(
    (e) => isPettyCashBranchEntity(e) && entityBranchCode(e) === branchField,
  );
  return entity?.id ?? null;
}
