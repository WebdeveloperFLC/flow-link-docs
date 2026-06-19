import type { PostingLeg } from "./journalEngine";
import { getTaxCode, getEntityTaxConfig, type TaxComponent } from "../stores/taxStore";

/**
 * Tax Engine (Phase 1).
 *
 * Turns a taxable base + tax code into per-component tax amounts and the
 * matching posting legs (output tax on sales, input tax credits on
 * purchases, or withholding/TDS). Core math is pure and unit-tested; the
 * store-backed wrappers resolve the configured codes/components.
 *
 * Decision #5: tax treatment is data-driven (entity_tax_config + tax codes),
 * never hard-coded.
 */

export type TaxMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";

export interface TaxComponentCalc {
  component: string;
  rate: number;
  amount: number;
  outputRoleKey?: string | null;
  inputRoleKey?: string | null;
}

export interface TaxCalc {
  /** Taxable base (net of tax). */
  net: number;
  totalTax: number;
  gross: number;
  components: TaxComponentCalc[];
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

interface ComponentSpec {
  component: string;
  rate: number;
  outputRoleKey?: string | null;
  inputRoleKey?: string | null;
}

/**
 * Pure tax computation.
 * - EXCLUSIVE: `amount` is the net; tax is added on top.
 * - INCLUSIVE: `amount` is the gross; net is derived by removing tax.
 * - EXEMPT:    no tax.
 */
export function computeTax(
  amount: number,
  components: ComponentSpec[],
  mode: TaxMode = "EXCLUSIVE",
): TaxCalc {
  const amt = round2(amount);
  if (mode === "EXEMPT" || !components.length) {
    return { net: amt, totalTax: 0, gross: amt, components: [] };
  }

  const totalRate = components.reduce((s, c) => s + (Number(c.rate) || 0), 0);
  const net = mode === "INCLUSIVE" ? round2(amt / (1 + totalRate / 100)) : amt;

  const comps: TaxComponentCalc[] = components.map((c) => ({
    component: c.component,
    rate: c.rate,
    amount: round2((net * (Number(c.rate) || 0)) / 100),
    outputRoleKey: c.outputRoleKey,
    inputRoleKey: c.inputRoleKey,
  }));

  const totalTax = round2(comps.reduce((s, c) => s + c.amount, 0));
  return { net, totalTax, gross: round2(net + totalTax), components: comps };
}

/** CR legs for output (collected) tax on a sale. */
export function outputTaxLegs(calc: TaxCalc, description?: string): PostingLeg[] {
  return calc.components
    .filter((c) => c.amount > 0 && c.outputRoleKey)
    .map((c) => ({
      roleKey: c.outputRoleKey as string,
      drCr: "CR" as const,
      amount: c.amount,
      description: description || `${c.component} output`,
    }));
}

/** DR legs for recoverable input tax on a purchase. */
export function inputTaxLegs(calc: TaxCalc, description?: string): PostingLeg[] {
  return calc.components
    .filter((c) => c.amount > 0 && c.inputRoleKey)
    .map((c) => ({
      roleKey: c.inputRoleKey as string,
      drCr: "DR" as const,
      amount: c.amount,
      description: description || `${c.component} input credit`,
    }));
}

/** CR legs for withholding tax (TDS/TCS) deducted from a payment. */
export function withholdingLegs(calc: TaxCalc, description?: string): PostingLeg[] {
  return calc.components
    .filter((c) => c.amount > 0 && c.outputRoleKey)
    .map((c) => ({
      roleKey: c.outputRoleKey as string,
      drCr: "CR" as const,
      amount: c.amount,
      description: description || `${c.component} withheld`,
    }));
}

// ── Store-backed convenience ─────────────────────────────────────────

function specsFromComponents(components: TaxComponent[]): ComponentSpec[] {
  return components.map((c) => ({
    component: c.component,
    rate: c.rate,
    outputRoleKey: c.outputRoleKey,
    inputRoleKey: c.inputRoleKey,
  }));
}

/** Compute tax for a base amount given a configured tax code. */
export function calcTax(
  amount: number,
  taxCode: string | null | undefined,
  entityId?: string,
  mode: TaxMode = "EXCLUSIVE",
): TaxCalc {
  if (!taxCode) return { net: round2(amount), totalTax: 0, gross: round2(amount), components: [] };
  const code = getTaxCode(taxCode, entityId);
  if (!code) return { net: round2(amount), totalTax: 0, gross: round2(amount), components: [] };
  return computeTax(amount, specsFromComponents(code.components), mode);
}

/**
 * Resolve the effective tax code + mode for a commission/revenue line on a
 * given entity (decision #5 — configurable via entity_tax_config).
 */
export function resolveCommissionTax(entityId: string): { taxCode?: string | null; mode: TaxMode } {
  const cfg = getEntityTaxConfig(entityId);
  if (!cfg || !cfg.isTaxRegistered) return { taxCode: null, mode: "EXEMPT" };
  if (cfg.commissionTaxMode === "EXEMPT" || cfg.commissionTaxMode === "RCM") {
    return { taxCode: cfg.commissionTaxCode, mode: "EXEMPT" };
  }
  return { taxCode: cfg.commissionTaxCode, mode: cfg.commissionTaxMode === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE" };
}

export function getEntityTaxConfigSafe(entityId: string) {
  return getEntityTaxConfig(entityId);
}

/**
 * Split a known tax total across the output-tax components of an entity's
 * default output code (e.g. HST single leg, or CGST/SGST in India), keeping
 * the CRM-provided tax total authoritative. Falls back to a single HST output
 * leg when no tax code is configured for the entity.
 */
export function splitTaxTotalLegs(
  taxTotal: number,
  entityId: string,
  drCr: "DR" | "CR" = "CR",
): PostingLeg[] {
  const total = round2(taxTotal);
  if (total <= 0) return [];
  const cfg = getEntityTaxConfig(entityId);
  const code = cfg?.defaultOutputTaxCode ? getTaxCode(cfg.defaultOutputTaxCode, entityId) : undefined;
  const components = (code?.components ?? []).filter((c) => c.outputRoleKey);

  if (!components.length) {
    return [{ roleKey: "TAX_OUTPUT_HST", drCr, amount: total, description: "Output tax" }];
  }

  const rateSum = components.reduce((s, c) => s + (Number(c.rate) || 0), 0) || 1;
  const legs: PostingLeg[] = [];
  let allocated = 0;
  components.forEach((c, idx) => {
    const portion = idx === components.length - 1
      ? round2(total - allocated)
      : round2((total * (Number(c.rate) || 0)) / rateSum);
    allocated = round2(allocated + portion);
    if (portion > 0) {
      legs.push({ roleKey: c.outputRoleKey as string, drCr, amount: portion, description: `${c.component} output` });
    }
  });
  return legs;
}
