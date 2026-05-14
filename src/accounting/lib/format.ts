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

/** Accounting format: parentheses for negatives, em-dash for zero. */
export function formatAccounting(
  amount: number,
  currency: "CAD" | "USD" | "INR" = "CAD",
  opts: { compact?: boolean; showSymbol?: boolean } = {}
): string {
  if (!Number.isFinite(amount) || amount === 0) return "—";
  const abs = Math.abs(amount);
  const symbol = opts.showSymbol === false ? "" : currency === "INR" ? "₹" : "$";
  let body: string;
  if (opts.compact && abs >= 1000) {
    if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(1)}M`;
    else body = `${(abs / 1_000).toFixed(1)}K`;
  } else {
    body = abs.toLocaleString("en-CA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  const text = `${symbol}${body}`;
  return amount < 0 ? `(${text})` : text;
}

export function formatPercent(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

/** Returns variance ratio (curr - prior) / |prior|. Null when prior is 0. */
export function variancePct(current: number, prior: number): number | null {
  if (!prior) return null;
  return (current - prior) / Math.abs(prior);
}