/**
 * Performance Hub — three-module visual system (aligned with prototype v1).
 * Cash incentives · Discount wallet · Offers & promotions
 *
 * Module accent colors use prototype CSS tokens (Phase 6E) on [data-performance-hub].
 */

export type PerformanceModule = "cash" | "wallet" | "offers";

export const PERFORMANCE_MODULE = {
  cash: {
    label: "Cash incentive",
    short: "Cash",
    card: "ph-module-cash",
    labelClass: "ph-module-cash-label",
    badge: "ph-badge-cash",
    /** Legacy tailwind fallbacks outside hub shell */
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  wallet: {
    label: "Discount wallet",
    short: "Wallet",
    card: "ph-module-wallet",
    labelClass: "ph-module-wallet-label",
    badge: "ph-badge-wallet",
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
    text: "text-amber-700 dark:text-amber-400",
  },
  offers: {
    label: "Offers",
    short: "Offers",
    card: "ph-module-offers",
    labelClass: "ph-module-offers-label",
    badge: "ph-badge-offers",
    border: "border-l-violet-500",
    bg: "bg-violet-500/5",
    text: "text-violet-700 dark:text-violet-400",
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
