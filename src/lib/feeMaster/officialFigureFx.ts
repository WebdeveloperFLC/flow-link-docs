import { convertWithSnapshot } from "@/lib/fxPolicy";

/**
 * Convert an official foreign-currency figure to INR using Currency Master effective rates.
 * Used for government fees, tuition, living costs, and financial estimates — never consultancy.
 */
export function convertOfficialFigureToInr(
  amount: number,
  fromCurrency: string,
  fxSnapshot: Record<string, number>,
): number | null {
  const from = (fromCurrency || "INR").toUpperCase();
  if (from === "INR") return Math.round(amount);
  const converted = convertWithSnapshot(amount, from, "INR", fxSnapshot);
  if (converted == null) return null;
  return Math.round(converted);
}
