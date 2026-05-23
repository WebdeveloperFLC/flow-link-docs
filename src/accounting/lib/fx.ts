/**
 * FX helpers for client payment collection.
 * Static rate matrix today; swap implementation later without touching callers.
 * Rates are "how many <to> per 1 <from>".
 */
export type CurrencyCode = "INR" | "CAD" | "USD";

const MATRIX: Record<CurrencyCode, Record<CurrencyCode, number>> = {
  INR: { INR: 1, CAD: 0.0163, USD: 0.012 },
  CAD: { INR: 61.3, CAD: 1, USD: 0.735 },
  USD: { INR: 83.3, CAD: 1.36, USD: 1 },
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ["INR", "CAD", "USD"];

export function getFxRate(from: string, to: string): number {
  const f = (from || "INR").toUpperCase() as CurrencyCode;
  const t = (to || "INR").toUpperCase() as CurrencyCode;
  if (f === t) return 1;
  return MATRIX[f]?.[t] ?? 1;
}

export function convert(amount: number, from: string, to: string, rateOverride?: number): number {
  const rate = rateOverride ?? getFxRate(from, to);
  return (Number(amount) || 0) * rate;
}