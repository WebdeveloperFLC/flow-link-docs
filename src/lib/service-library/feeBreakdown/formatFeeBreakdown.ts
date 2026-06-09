import { convertGovtFee } from "@/lib/leads/govtFeeFx";
import type {
  GovtFeeBreakdownItem,
  GovtFeeBreakdownSource,
  GovtFeeBreakdownView,
} from "./types";

function formatNative(amount: number, currency: string): string {
  const cur = currency.toUpperCase();
  const n = amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (cur === "GBP") return `£${n}`;
  if (cur === "EUR") return `€${n}`;
  if (cur === "CAD") return `CAD $${n}`;
  if (cur === "AUD") return `AUD $${n}`;
  if (cur === "USD") return `USD $${n}`;
  if (cur === "NZD") return `NZD $${n}`;
  if (cur === "INR") return `₹${n}`;
  return `${cur} ${n}`;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatFeeBreakdownRow(item: GovtFeeBreakdownItem): {
  nativeDisplay: string;
  inrDisplay: string | null;
} {
  if (!item.applicable) {
    return { nativeDisplay: "Not applicable", inrDisplay: null };
  }
  if (item.amount == null) {
    return { nativeDisplay: "Varies — see notes", inrDisplay: null };
  }
  const nativeDisplay = formatNative(item.amount, item.currency);
  const inr =
    item.currency.toUpperCase() === "INR"
      ? item.amount
      : convertGovtFee(item.amount, item.currency, "INR");
  return { nativeDisplay, inrDisplay: formatInr(inr) };
}

export function buildFeeBreakdownView(source: GovtFeeBreakdownSource): GovtFeeBreakdownView {
  const items = source.items.map((item) => ({
    ...item,
    ...formatFeeBreakdownRow(item),
  }));
  return {
    title: source.title,
    nativeCurrency: source.nativeCurrency,
    lastVerified: source.lastVerified,
    sourceUrl: source.sourceUrl,
    disclaimer: source.disclaimer,
    items,
    applicableCount: items.filter((i) => i.applicable).length,
  };
}
