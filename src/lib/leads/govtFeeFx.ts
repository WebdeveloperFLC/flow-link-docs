/** Snapshot FX for government-fee equivalents (how many TO per 1 FROM). */
const TO_INR: Record<string, number> = {
  INR: 1,
  CAD: 61.3,
  USD: 83.3,
  GBP: 105,
  EUR: 90,
  AUD: 55,
  NZD: 50,
  RUB: 0.93,
};

const TO_CAD: Record<string, number> = {
  CAD: 1,
  INR: 0.0163,
  USD: 1.36,
  GBP: 1.72,
  EUR: 1.47,
  AUD: 0.9,
  NZD: 0.82,
};

export function convertGovtFee(amount: number, fromCurrency: string, to: "INR" | "CAD"): number {
  const from = (fromCurrency || "INR").toUpperCase();
  const rate = to === "INR" ? TO_INR[from] : TO_CAD[from];
  if (rate == null) return Math.round(amount);
  return Math.round(amount * rate);
}
