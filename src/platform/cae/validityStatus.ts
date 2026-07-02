/**
 * Validity status — constitutional enforcement helper.
 * Expired items visible for audit but not settlement-eligible.
 */
import type { CommercialValidityStatus } from "./types";

const DEFAULT_EXPIRING_SOON_DAYS = 30;

export function computeCommercialValidityStatus(
  validFrom: string | null | undefined,
  validUntil: string | null | undefined,
  asOfDate: string,
  expiringSoonDays = DEFAULT_EXPIRING_SOON_DAYS,
): CommercialValidityStatus {
  const asOf = asOfDate.slice(0, 10);
  if (validFrom && asOf < validFrom) return "upcoming";
  if (validUntil && asOf > validUntil) return "expired";
  if (validUntil) {
    const until = new Date(validUntil);
    const asOfD = new Date(asOf);
    const diffMs = until.getTime() - asOfD.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 0 && diffDays <= expiringSoonDays) return "expiring_soon";
  }
  return "active";
}

export function settlementAllowedForValidity(status: CommercialValidityStatus): boolean {
  return status === "active" || status === "expiring_soon";
}
