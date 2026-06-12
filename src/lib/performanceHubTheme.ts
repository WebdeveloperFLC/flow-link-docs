/**
 * Performance Hub — three-module visual system (aligned with prototype v1).
 * Cash incentives · Discount wallet · Offers & promotions
 */

export type PerformanceModule = "cash" | "wallet" | "offers";

export const PERFORMANCE_MODULE = {
  cash: {
    label: "Cash incentive",
    short: "Cash",
    /** Emerald — earned / projected payout */
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  wallet: {
    label: "Discount wallet",
    short: "Wallet",
    /** Amber — spendable discount authority */
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    ring: "ring-amber-500/20",
  },
  offers: {
    label: "Offers",
    short: "Offers",
    /** Violet — promotions & client offers */
    border: "border-l-violet-500",
    bg: "bg-violet-500/5",
    text: "text-violet-700 dark:text-violet-400",
    badge: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
    ring: "ring-violet-500/20",
  },
} as const;

export function currentPeriodKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatInr(n: number, ccy = "INR") {
  const v = Number(n ?? 0);
  if (ccy === "INR") return `₹${v.toLocaleString("en-IN")}`;
  return `${v.toLocaleString()} ${ccy}`;
}
