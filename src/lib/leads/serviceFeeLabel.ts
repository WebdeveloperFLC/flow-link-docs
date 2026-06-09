import type { ServiceCatalogueItem } from "@/lib/leads";

export type FeeCurrency = "INR" | "CAD";
export type FeeKind = "consultancy" | "government";

function pickAmount(
  s: ServiceCatalogueItem,
  currency: FeeCurrency,
  kind: FeeKind,
): number | null | undefined {
  if (kind === "government") {
    return currency === "CAD" ? s.govt_fee_cad : s.govt_fee_inr;
  }
  return currency === "CAD" ? s.fee_cad : s.fee_inr;
}

export function serviceFeeLabel(
  s: ServiceCatalogueItem,
  currency: FeeCurrency = "INR",
  kind: FeeKind = "consultancy",
): string {
  const fee = pickAmount(s, currency, kind);
  if (fee != null && Number(fee) > 0) {
    return currency === "CAD"
      ? `CA$${Number(fee).toLocaleString("en-CA")}`
      : `₹${Number(fee).toLocaleString("en-IN")}`;
  }
  if (kind === "consultancy") {
    if (s.pricing_type === "FREE") return "Free";
    if (s.pricing_type === "ON_REQUEST") return "On request";
  }
  return "—";
}
