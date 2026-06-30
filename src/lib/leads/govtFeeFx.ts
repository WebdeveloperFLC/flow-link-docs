import { convertOfficialFigureToInr } from "@/lib/feeMaster/officialFigureFx";

/**
 * @deprecated Use convertOfficialFigureToInr with a Currency Master snapshot.
 * Government fees: only INR equivalent is derived from CM; foreign amount is fixed.
 * Consultancy fees must never pass through this module.
 */
export function convertGovtFeeToInr(
  amount: number,
  fromCurrency: string,
  fxSnapshot: Record<string, number>,
): number | null {
  return convertOfficialFigureToInr(amount, fromCurrency, fxSnapshot);
}

/**
 * @deprecated CRM rule: government fee INR equivalents use Currency Master only.
 * CAD equivalents for government fees are not auto-derived — use native govt_amount.
 */
export function convertGovtFee(
  amount: number,
  fromCurrency: string,
  to: "INR" | "CAD",
  fxSnapshot?: Record<string, number>,
): number {
  const from = (fromCurrency || "INR").toUpperCase();
  if (to === "INR") {
    if (fxSnapshot) {
      const converted = convertOfficialFigureToInr(amount, from, fxSnapshot);
      if (converted != null) return converted;
    }
    if (from === "INR") return Math.round(amount);
    return Math.round(amount);
  }
  // CAD toggle: return stored/native only — no CM conversion for govt INR↔CAD cross-rate.
  if (from === "CAD") return Math.round(amount);
  return Math.round(amount);
}
