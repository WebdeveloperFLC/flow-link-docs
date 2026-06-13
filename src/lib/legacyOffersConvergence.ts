const env = import.meta.env;

function isTruthy(value: string | undefined, defaultValue: boolean): boolean {
  const raw = value ?? String(defaultValue);
  return String(raw).toLowerCase() === "true";
}

/** O14 — when true, legacy `service_offers` pickers are view-only (no apply). Default false. */
export const LEGACY_OFFERS_READ_ONLY = isTruthy(env.VITE_LEGACY_OFFERS_READ_ONLY, false);

/** Shown in the convergence banner copy. Override via env for comms updates. */
export const LEGACY_OFFERS_RETIREMENT_LABEL =
  (env.VITE_LEGACY_OFFERS_RETIREMENT_DATE as string | undefined)?.trim() || "December 2026";

export const SERVICE_OFFERS_CONVERGENCE_BANNER = {
  title: "Legacy service offers",
  body: (retirementLabel: string) =>
    `This screen uses the legacy service_offers system. New promotions live in the Offer Library (Performance Hub). Legacy offers become read-only on ${retirementLabel}.`,
  ctaLabel: "Open Offer Library",
  ctaTo: "/performance/offers/library",
} as const;

const DISMISS_PREFIX = "flc:o14:banner:dismissed:";

export function isServiceOffersBannerDismissed(scope: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${scope}`) === "1";
  } catch {
    return false;
  }
}

export function dismissServiceOffersBanner(scope: string): void {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${scope}`, "1");
  } catch {
    /* ignore */
  }
}
