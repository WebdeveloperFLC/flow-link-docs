import { convertOfficialFigureToInr } from "@/lib/feeMaster/officialFigureFx";
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
  if (cur === "RUB") return `₽${n}`;
  return `${cur} ${n}`;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatFeeBreakdownRow(
  item: GovtFeeBreakdownItem,
  fxSnapshot?: Record<string, number>,
): {
  nativeDisplay: string;
  inrDisplay: string | null;
} {
  if (!item.applicable) {
    return { nativeDisplay: "Not applicable", inrDisplay: null };
  }
  if (item.amount == null) {
    const hint = item.notes?.trim();
    return {
      nativeDisplay: hint && hint.length <= 48 ? hint : "Verify on official source",
      inrDisplay: null,
    };
  }
  const nativeDisplay = formatNative(item.amount, item.currency);
  const inr =
    item.currency.toUpperCase() === "INR"
      ? item.amount
      : fxSnapshot
        ? convertOfficialFigureToInr(item.amount, item.currency, fxSnapshot)
        : null;
  return { nativeDisplay, inrDisplay: inr != null ? formatInr(inr) : null };
}

export function buildFeeBreakdownView(
  source: GovtFeeBreakdownSource,
  fxSnapshot?: Record<string, number>,
): GovtFeeBreakdownView {
  const items = source.items.map((item) => ({
    ...item,
    ...formatFeeBreakdownRow(item, fxSnapshot),
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
