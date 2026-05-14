import Decimal from "decimal.js";

export function formatCurrency(
  amount: number | string,
  currency: "CAD" | "USD" | "INR" = "CAD"
): string {
  const d = new Decimal(amount);
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(d.toNumber());
}

export function formatCompact(
  amount: number | string,
  currency: "CAD" | "USD" | "INR" = "CAD"
): string {
  const d = new Decimal(amount).toNumber();
  const symbol = currency === "INR" ? "₹" : "$";
  if (Math.abs(d) >= 1_000_000) return `${symbol}${(d / 1_000_000).toFixed(1)}M`;
  if (Math.abs(d) >= 1_000) return `${symbol}${(d / 1_000).toFixed(0)}K`;
  return `${symbol}${d.toFixed(0)}`;
}

export function addDecimals(...amounts: (number | string)[]): Decimal {
  return amounts.reduce<Decimal>(
    (sum, a) => sum.plus(new Decimal(a)),
    new Decimal(0)
  );
}