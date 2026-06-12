import type { ServiceCatalogueItem } from "@/lib/leads";
import { convertGovtFee } from "@/lib/leads/govtFeeFx";

export type FeeCurrency = "INR" | "CAD";
export type FeeKind = "consultancy" | "government";

/** Shared grid for service picker header, group rows, and item rows. */
export const SERVICE_PICKER_GRID =
  "grid grid-cols-[1.25rem_minmax(12rem,1fr)_6.5rem_6.5rem] sm:grid-cols-[1.25rem_minmax(0,1fr)_7rem_7rem] gap-x-3 sm:gap-x-4 items-start w-full min-w-0";

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  USD: "US$",
  AUD: "A$",
  NZD: "NZ$",
  INR: "₹",
};

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

export function formatFeeAmount(amount: number, currency: FeeCurrency | string): string {
  const cur = String(currency).toUpperCase();
  if (cur === "CAD") return `CA$${Number(amount).toLocaleString("en-CA")}`;
  if (cur === "GBP") return `£${Number(amount).toLocaleString("en-GB")}`;
  if (cur === "EUR") return `€${Number(amount).toLocaleString("en-GB")}`;
  if (cur === "USD") return `US$${Number(amount).toLocaleString("en-US")}`;
  if (cur === "AUD") return `A$${Number(amount).toLocaleString("en-AU")}`;
  if (cur === "NZD") return `NZ$${Number(amount).toLocaleString("en-NZ")}`;
  if (cur === "INR") return `₹${Number(amount).toLocaleString("en-IN")}`;
  const sym = CURRENCY_SYMBOL[cur] ?? "";
  return `${sym}${Number(amount).toLocaleString()}`;
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

export type GovtFeeDisplay = { primary: string; equivalent: string | null };

/** Government fee: native currency primary + INR/CAD equivalent sub-line. */
export function governmentFeeDisplay(
  s: ServiceCatalogueItem,
  toggleCurrency: FeeCurrency,
): GovtFeeDisplay {
  if (s.govt_amount != null && s.govt_amount > 0 && s.govt_currency) {
    const primary = formatFeeAmount(s.govt_amount, s.govt_currency);
    const eqAmount =
      toggleCurrency === "CAD"
        ? s.govt_fee_cad ?? convertGovtFee(s.govt_amount, s.govt_currency, "CAD")
        : s.govt_fee_inr ?? convertGovtFee(s.govt_amount, s.govt_currency, "INR");
    const equivalent = eqAmount > 0 ? `≈ ${formatFeeAmount(eqAmount, toggleCurrency)}` : null;
    return { primary, equivalent };
  }

  const fee = pickFeeAmount(s, toggleCurrency, "government");
  if (fee != null && Number(fee) > 0) {
    return { primary: formatFeeAmount(Number(fee), toggleCurrency), equivalent: null };
  }
  return { primary: "—", equivalent: null };
}

/** Min–max fee label for accordion group headers (collapsed state). */
export function groupFeeSummary(
  items: ServiceCatalogueItem[],
  currency: FeeCurrency,
  kind: FeeKind,
): string {
  if (kind === "government") {
    const natives = items
      .filter((item) => item.govt_amount != null && item.govt_amount > 0 && item.govt_currency)
      .map((item) => ({
        amount: item.govt_amount!,
        currency: item.govt_currency!,
      }));
    if (natives.length > 0) {
      const sameCurrency = natives.every((n) => n.currency === natives[0]!.currency);
      if (sameCurrency) {
        const amounts = natives.map((n) => n.amount);
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        const cur = natives[0]!.currency;
        return min === max
          ? formatFeeAmount(min, cur)
          : `${formatFeeAmount(min, cur)}–${formatFeeAmount(max, cur)}`;
      }
    }
  }

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
