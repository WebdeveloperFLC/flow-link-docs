/**
 * Centralized FX policy — base rate + buffer → effective rate (V1 sign-off: fixed +2 default).
 * Client billing and incentive settlement use the same effective rate in V1.
 */

export type FxRateRow = {
  currency: string;
  base_rate_to_inr?: number | null;
  rate_to_inr?: number | null;
  buffer_fixed?: number | null;
  buffer_pct?: number | null;
};

export const DEFAULT_BUFFER_FIXED = 2;

/** Compute effective INR rate from base + buffer (fixed wins unless buffer_pct > 0). */
export function effectiveRateToInr(row: FxRateRow): number {
  const cur = (row.currency || "INR").toUpperCase();
  if (cur === "INR") return 1;
  const base = Number(row.base_rate_to_inr ?? row.rate_to_inr ?? 0);
  if (base <= 0) return 0;
  const pct = Number(row.buffer_pct ?? 0);
  if (pct > 0) return roundFx(base * (1 + pct / 100));
  return roundFx(base + Number(row.buffer_fixed ?? DEFAULT_BUFFER_FIXED));
}

export function roundFx(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Build snapshot map currency → effective rate_to_inr */
export function buildFxSnapshot(rows: FxRateRow[]): Record<string, number> {
  const snap: Record<string, number> = { INR: 1 };
  for (const r of rows) {
    const c = (r.currency || "").toUpperCase();
    if (!c || c in snap) continue;
    snap[c] = effectiveRateToInr(r);
  }
  return snap;
}

export function convertWithSnapshot(
  amount: number,
  from: string,
  to: string,
  snap: Record<string, number>,
): number | null {
  if (amount == null || Number.isNaN(amount)) return null;
  const f = from === "INR" ? 1 : snap[from.toUpperCase()];
  const t = to === "INR" ? 1 : snap[to.toUpperCase()];
  if (f == null || t == null || t === 0) return null;
  return Math.round(((amount * f) / t) * 100) / 100;
}
