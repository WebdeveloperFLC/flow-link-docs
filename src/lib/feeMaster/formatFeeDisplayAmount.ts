import type { FeeAccuracy } from "./institutionFeeTypes";

/**
 * Format a fee amount for counselor-facing UI.
 * APPROXIMATE / AI_DETECTED / NEEDS_VERIFICATION use "Approx. {currency} {amount}".
 */
export function formatFeeDisplayAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
  feeAccuracy: FeeAccuracy,
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const cur = (currency ?? "CAD").trim().toUpperCase();
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

  if (feeAccuracy === "EXACT") {
    return `${cur} ${formatted}`;
  }
  return `Approx. ${cur} ${formatted}`;
}

/**
 * Returns true when the accuracy level should show an approximate prefix in UI.
 */
export function isApproximateDisplayAccuracy(feeAccuracy: FeeAccuracy): boolean {
  return feeAccuracy !== "EXACT";
}
