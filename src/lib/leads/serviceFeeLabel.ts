import type { ServiceCatalogueItem } from "@/lib/leads";

export type FeeCurrency = "INR" | "CAD";

export function serviceFeeLabel(s: ServiceCatalogueItem, currency: FeeCurrency = "INR"): string {
  const fee = currency === "CAD" ? s.fee_cad : s.fee_inr;
  if (fee != null && Number(fee) > 0) {
    return currency === "CAD"
      ? `CA$${Number(fee).toLocaleString("en-CA")}`
      : `₹${Number(fee).toLocaleString("en-IN")}`;
  }
  if (s.pricing_type === "FREE") return "Free";
  if (s.pricing_type === "ON_REQUEST") return "On request";
  return "—";
}
