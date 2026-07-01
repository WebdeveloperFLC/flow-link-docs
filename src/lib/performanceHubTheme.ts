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

/** Frozen achievement scale — Bible §4.3. Instrument colors (§2.4) are separate. */
export type AchievementBandId = "red" | "purple" | "blue" | "green" | "gold";

export type AchievementBand = {
  id: AchievementBandId;
  label: string;
  /** CSS custom property for fill / dot (e.g. `--ach-red`) */
  colorVar: string;
  bgVar: string;
  textVar: string;
};

export const ACHIEVEMENT_BANDS: Record<AchievementBandId, AchievementBand> = {
  red: { id: "red", label: "Danger", colorVar: "--ach-red", bgVar: "--ach-redBg", textVar: "--ach-redTxt" },
  purple: { id: "purple", label: "Progressing", colorVar: "--ach-purple", bgVar: "--ach-purpleBg", textVar: "--ach-purpleTxt" },
  blue: { id: "blue", label: "Close", colorVar: "--ach-blue", bgVar: "--ach-blueBg", textVar: "--ach-blueTxt" },
  green: { id: "green", label: "Achieved", colorVar: "--ach-green", bgVar: "--ach-greenBg", textVar: "--ach-greenTxt" },
  gold: { id: "gold", label: "Over-achieved", colorVar: "--ach-gold", bgVar: "--ach-goldBg", textVar: "--ach-goldTxt" },
};

/** Single source for achievement status color — import everywhere; never reimplement thresholds. */
export function band(pct: number | null | undefined): AchievementBand {
  const p = pct ?? 0;
  if (p < 50) return ACHIEVEMENT_BANDS.red;
  if (p < 75) return ACHIEVEMENT_BANDS.purple;
  if (p < 100) return ACHIEVEMENT_BANDS.blue;
  if (p < 120) return ACHIEVEMENT_BANDS.green;
  return ACHIEVEMENT_BANDS.gold;
}

export function formatAchievementPct(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  return `${Math.round(pct)}%`;
}
