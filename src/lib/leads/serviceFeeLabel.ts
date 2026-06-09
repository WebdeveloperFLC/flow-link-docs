import type { ServiceCatalogueItem } from "@/lib/leads";

export type FeeCurrency = "INR" | "CAD";
export type FeeKind = "consultancy" | "government";

/** Shared grid for service picker header, group rows, and item rows. */
export const SERVICE_PICKER_GRID =
  "grid grid-cols-[1.25rem_minmax(0,1fr)_5.5rem_5.5rem] gap-x-3 items-center";

export function pickFeeAmount(
  s: ServiceCatalogueItem,
  currency: FeeCurrency,
  kind: FeeKind,
): number | null | undefined {
  if (kind === "government") {
    return currency === "CAD" ? s.govt_fee_cad : s.govt_fee_inr;
  }
  return currency === "CAD" ? s.fee_cad : s.fee_inr;
}

export function formatFeeAmount(amount: number, currency: FeeCurrency): string {
  return currency === "CAD"
    ? `CA$${Number(amount).toLocaleString("en-CA")}`
    : `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function serviceFeeLabel(
  s: ServiceCatalogueItem,
  currency: FeeCurrency = "INR",
  kind: FeeKind = "consultancy",
): string {
  const fee = pickFeeAmount(s, currency, kind);
  if (fee != null && Number(fee) > 0) {
    return formatFeeAmount(Number(fee), currency);
  }
  if (kind === "consultancy") {
    if (s.pricing_type === "FREE") return "Free";
    if (s.pricing_type === "ON_REQUEST") return "On request";
  }
  return "—";
}

/** Min–max fee label for accordion group headers (collapsed state). */
export function groupFeeSummary(
  items: ServiceCatalogueItem[],
  currency: FeeCurrency,
  kind: FeeKind,
): string {
  const amounts = items
    .map((item) => pickFeeAmount(item, currency, kind))
    .filter((fee): fee is number => fee != null && Number(fee) > 0)
    .map(Number);
  if (amounts.length > 0) {
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    return min === max
      ? formatFeeAmount(min, currency)
      : `${formatFeeAmount(min, currency)}–${formatFeeAmount(max, currency)}`;
  }
  if (kind === "consultancy" && items.every((item) => item.pricing_type === "ON_REQUEST")) {
    return "On request";
  }
  if (kind === "consultancy" && items.every((item) => item.pricing_type === "FREE")) {
    return "Free";
  }
  return "—";
}
