import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runWhenAuthReady } from "./_hydrationGate";

/**
 * Tax registry — loads the configurable tax framework into memory so the
 * tax engine can resolve a tax code into its component legs and look up
 * per-entity tax configuration (registration, defaults, commission mode).
 */

export interface TaxComponent {
  id: string;
  taxCodeId: string;
  component: string;          // HST | GST | CGST | SGST | IGST | TDS | ...
  rate: number;
  outputRoleKey?: string | null;
  inputRoleKey?: string | null;
  legOrder: number;
}

export interface TaxCode {
  id: string;
  code: string;
  name: string;
  country: string;
  taxType: string;
  totalRate: number;
  isRecoverable: boolean;
  isWithholding: boolean;
  entityId: string | null;
  isActive: boolean;
  components: TaxComponent[];
}

export interface EntityTaxConfig {
  id: string;
  entityId: string;
  country: string;
  isTaxRegistered: boolean;
  registrationNumber?: string | null;
  defaultOutputTaxCode?: string | null;
  defaultInputTaxCode?: string | null;
  commissionTaxCode?: string | null;
  commissionTaxMode: "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT" | "RCM";
  defaultTdsCode?: string | null;
  settings: Record<string, unknown>;
}

const CODES_KEY = "accounting:tax-codes:v1";
const CONFIG_KEY = "accounting:entity-tax-config:v1";

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // ignore malformed cache
  }
  return [];
}

let taxCodes: TaxCode[] = load<TaxCode>(CODES_KEY);
let entityConfigs: EntityTaxConfig[] = load<EntityTaxConfig>(CONFIG_KEY);

const listeners = new Set<() => void>();
function emit() {
  try {
    window.localStorage.setItem(CODES_KEY, JSON.stringify(taxCodes));
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(entityConfigs));
  } catch {
    // ignore write failures
  }
  listeners.forEach((l) => l());
}

function codeFromDb(row: any): TaxCode {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    country: row.country,
    taxType: row.tax_type,
    totalRate: Number(row.total_rate) || 0,
    isRecoverable: !!row.is_recoverable,
    isWithholding: !!row.is_withholding,
    entityId: row.entity_id ?? null,
    isActive: row.is_active ?? true,
    components: ((row.accounting_tax_components ?? []) as any[])
      .map((c) => ({
        id: c.id,
        taxCodeId: c.tax_code_id,
        component: c.component,
        rate: Number(c.rate) || 0,
        outputRoleKey: c.output_role_key ?? null,
        inputRoleKey: c.input_role_key ?? null,
        legOrder: c.leg_order ?? 0,
      }))
      .sort((a, b) => a.legOrder - b.legOrder),
  };
}

function configFromDb(row: any): EntityTaxConfig {
  return {
    id: row.id,
    entityId: row.entity_id,
    country: row.country,
    isTaxRegistered: !!row.is_tax_registered,
    registrationNumber: row.registration_number ?? null,
    defaultOutputTaxCode: row.default_output_tax_code ?? null,
    defaultInputTaxCode: row.default_input_tax_code ?? null,
    commissionTaxCode: row.commission_tax_code ?? null,
    commissionTaxMode: (row.commission_tax_mode ?? "EXCLUSIVE") as EntityTaxConfig["commissionTaxMode"],
    defaultTdsCode: row.default_tds_code ?? null,
    settings: (row.settings ?? {}) as Record<string, unknown>,
  };
}

async function hydrate() {
  try {
    const [codesRes, cfgRes] = await Promise.all([
      supabase.from("accounting_tax_codes").select("*, accounting_tax_components(*)"),
      supabase.from("accounting_entity_tax_config").select("*"),
    ]);
    if (codesRes.error) throw codesRes.error;
    if (cfgRes.error) throw cfgRes.error;
    if (codesRes.data) taxCodes = codesRes.data.map(codeFromDb);
    if (cfgRes.data) entityConfigs = cfgRes.data.map(configFromDb);
    emit();
  } catch (e) {
    console.warn("[taxStore] hydrate failed", e);
  }
}
runWhenAuthReady(hydrate);

export function useTaxCodes(): TaxCode[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => taxCodes,
    () => taxCodes,
  );
}

export function useEntityTaxConfigs(): EntityTaxConfig[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => entityConfigs,
    () => entityConfigs,
  );
}

export const getTaxCodes = () => taxCodes;
export const getEntityTaxConfigs = () => entityConfigs;

/** Resolve a tax code by code string, preferring an entity-specific row then global. */
export function getTaxCode(code: string, entityId?: string | null): TaxCode | undefined {
  if (!code) return undefined;
  const scoped = entityId ? taxCodes.find((t) => t.code === code && t.entityId === entityId) : undefined;
  const global = taxCodes.find((t) => t.code === code && (t.entityId === null || t.entityId === undefined));
  return scoped ?? global ?? taxCodes.find((t) => t.code === code);
}

export function getEntityTaxConfig(entityId: string): EntityTaxConfig | undefined {
  return entityConfigs.find((c) => c.entityId === entityId);
}
