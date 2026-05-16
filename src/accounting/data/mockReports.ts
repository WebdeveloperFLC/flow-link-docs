// Mock data for the Accounting Reports module.
// TODAY = 2024-11-01 (consistent with the rest of the accounting module)

export type EntityCode = "CA" | "US" | "IN" | "AE";

export const MONTHLY_DATA: ReadonlyArray<{ month: string; revenue: number; expenses: number; gross: number }> = [];

export const ENTITY_DATA: ReadonlyArray<{ entity: string; revenue: number; expenses: number; profit: number; margin: number; country: string; currency: string; flag: string }> = [];

export type PLLine = { code: string; name: string; current: number; prior: number };

export const PL_DATA = {
  revenue: [] as PLLine[],
  costOfRevenue: [] as PLLine[],
  operatingExpenses: [] as PLLine[],
  taxExpense: 0,
  priorTaxExpense: 0,
};

export const BS_DATA = {
  assets: {
    current: [] as { code: string; name: string; amount: number }[],
    nonCurrent: [] as { code: string; name: string; amount: number }[],
  },
  liabilities: {
    current: [] as { code: string; name: string; amount: number }[],
    nonCurrent: [] as { code: string; name: string; amount: number }[],
  },
  equity: [] as { code: string; name: string; amount: number }[],
};

export const CF_DATA = {
  operating: [] as { label: string; amount: number }[],
  investing: [] as { label: string; amount: number }[],
  financing: [] as { label: string; amount: number }[],
  openingCash: 0,
};

// Indicative rates — converts native currencies to CAD for the consolidated view
export const FX_RATES: Record<string, number> = {
  CAD: 1,
  USD: 1.36,
  INR: 0.016,
  AED: 0.37,
  GBP: 1.72,
  AUD: 0.88,
};

// Mock drill-down transactions — keyed by P&L account code
export type DrillTxn = { date: string; description: string; entity: string; amount: number };

export const PL_DRILLDOWN: Record<string, DrillTxn[]> = {};

// Intercompany eliminations applied on consolidation (CAD)
export const ELIMINATIONS: { label: string; amount: number }[] = [];

// ─────────────────────────────────────────────────────────────────
// Back-compat exports used by ReportFilterBar and ReportDrilldownModal
// (existing accounting components that pre-date this rewrite)
// ─────────────────────────────────────────────────────────────────
import type { DrillTxn as DrillTxnRich, EntityCode as EntityCodeRich } from "../types/reports";

export const MOCK_ENTITIES: { code: EntityCodeRich; name: string; currency: "CAD" | "USD" | "INR"; branches: string[] }[] = [];

export function getDrilldownTxns(_key: string, _totalAmount: number): DrillTxnRich[] {
  return [];
}
