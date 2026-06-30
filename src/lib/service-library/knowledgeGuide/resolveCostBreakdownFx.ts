import { convertWithSnapshot } from "@/lib/fxPolicy";
import {
  isConsultancyCostSection,
  parseFeeItemAmount,
  shouldConvertInrViaCurrencyMaster,
} from "@/lib/feeMaster/crmPricingRules";
import type { FullCostBreakdown, FullCostBreakdownItem } from "../countryInsights/types";
import type { FlcCurrencyConfig, FlcFullCostBreakdown } from "../knowledgeGuide/types";

export type ResolvedFullCostBreakdownItem = FullCostBreakdownItem & {
  /** Native/base currency amount when resolved from cadAmount/baseAmount. */
  foreignAmount?: number | null;
  foreignRange?: [number, number] | null;
  foreignCurrency?: string;
  /** Computed INR when inr was "auto" or numeric. */
  inrAmount?: number | null;
  inrRange?: [number, number] | null;
  /** Pre-formatted display strings for dual-column UI. */
  foreignDisplay?: string;
  inrDisplay?: string;
};

export type ResolvedFullCostBreakdown = Omit<FullCostBreakdown, "sections"> & {
  sections: {
    id: string;
    label: string;
    items: ResolvedFullCostBreakdownItem[];
  }[];
  totals?: {
    label: string;
    value: string;
    notes?: string;
    inrDisplay?: string;
  }[];
  fxRateUsed?: number;
  fxRateSource?: "snapshot" | "fallback";
  displayCurrency?: string;
  baseCurrency?: string;
};

type FlcCostItem = FlcFullCostBreakdown["sections"][number]["items"][number] & {
  cadAmount?: number | [number, number] | null;
  baseAmount?: number | [number, number] | null;
};

function formatAmount(n: number, currency: string): string {
  const cur = currency.toUpperCase();
  const formatted = n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  switch (cur) {
    case "INR":
      return `₹${formatted}`;
    case "USD":
      return `$${formatted}`;
    case "CAD":
      return `CAD $${formatted}`;
    case "AUD":
      return `AUD $${formatted}`;
    case "GBP":
      return `£${formatted}`;
    case "EUR":
      return `€${formatted}`;
    default:
      return `${cur} ${formatted}`;
  }
}

function formatRange(min: number, max: number, currency: string): string {
  return `${formatAmount(min, currency)} – ${formatAmount(max, currency)}`;
}

function effectiveRate(
  baseCurrency: string,
  fxSnapshot: Record<string, number>,
  currencyConfig?: FlcCurrencyConfig,
): { rate: number; source: "snapshot" | "fallback" } {
  const cur = baseCurrency.toUpperCase();
  const snap = fxSnapshot[cur];
  if (snap != null && snap > 0) return { rate: snap, source: "snapshot" };
  const fallback = currencyConfig?.fallbackRate;
  if (fallback != null && fallback > 0) return { rate: fallback, source: "fallback" };
  return { rate: 0, source: "fallback" };
}

function toInr(
  amount: number,
  baseCurrency: string,
  fxSnapshot: Record<string, number>,
  currencyConfig?: FlcCurrencyConfig,
): number | null {
  const { rate } = effectiveRate(baseCurrency, fxSnapshot, currencyConfig);
  if (rate <= 0) return null;
  if (baseCurrency.toUpperCase() === "INR") return amount;
  return Math.round(amount * rate);
}

function resolveForeignAmount(item: FlcCostItem, baseCurrency: string): {
  foreignAmount: number | null;
  foreignRange: [number, number] | null;
} {
  const raw = item.cadAmount ?? item.baseAmount ?? item.amount;
  if (Array.isArray(raw) && raw.length === 2) {
    return { foreignAmount: null, foreignRange: [raw[0], raw[1]] as [number, number] };
  }
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    return { foreignAmount: raw, foreignRange: null };
  }
  return { foreignAmount: null, foreignRange: null };
}

function resolveInrForItem(
  item: FlcCostItem,
  baseCurrency: string,
  displayCurrency: string,
  fxSnapshot: Record<string, number>,
  currencyConfig?: FlcCurrencyConfig,
  section?: { id?: string; label?: string },
): { inrAmount: number | null; inrRange: [number, number] | null } {
  const sectionCtx = section ?? {};
  const itemCtx = { label: item.label, official: item.official, inr: item.inr };

  if (!shouldConvertInrViaCurrencyMaster(sectionCtx, itemCtx)) {
    if (typeof item.inr === "number") {
      return { inrAmount: item.inr, inrRange: null };
    }
    const parsed = parseFeeItemAmount(
      typeof item.inr === "string" ? item.inr : null,
    );
    if (parsed != null) return { inrAmount: parsed, inrRange: null };
    return { inrAmount: null, inrRange: null };
  }

  if (item.inr === "auto" || item.inr == null) {
    const { foreignAmount, foreignRange } = resolveForeignAmount(item, baseCurrency);
    if (foreignRange) {
      const lo = toInr(foreignRange[0], baseCurrency, fxSnapshot, currencyConfig);
      const hi = toInr(foreignRange[1], baseCurrency, fxSnapshot, currencyConfig);
      if (lo != null && hi != null) return { inrAmount: null, inrRange: [lo, hi] };
    }
    if (foreignAmount != null) {
      return {
        inrAmount: toInr(foreignAmount, baseCurrency, fxSnapshot, currencyConfig),
        inrRange: null,
      };
    }
    return { inrAmount: null, inrRange: null };
  }

  if (typeof item.inr === "number") {
    return { inrAmount: item.inr, inrRange: null };
  }

  const parsed = Number(String(item.inr).replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(parsed)) return { inrAmount: parsed, inrRange: null };
  return { inrAmount: null, inrRange: null };
}

/**
 * Resolve FLC fullCostBreakdown with Currency Master FX snapshot.
 * Computes INR from cadAmount/baseAmount when inr is "auto"; supports ranges.
 */
export function resolveCostBreakdownFx(
  breakdown: FlcFullCostBreakdown,
  currencyConfig: FlcCurrencyConfig | undefined,
  fxSnapshot: Record<string, number>,
): ResolvedFullCostBreakdown {
  const baseCurrency = (currencyConfig?.baseCurrency ?? breakdown.currency.split(/\s/)[0] ?? "CAD").toUpperCase();
  const displayCurrency = (currencyConfig?.displayCurrency ?? "INR").toUpperCase();
  const { rate, source } = effectiveRate(baseCurrency, fxSnapshot, currencyConfig);

  const sections = (breakdown.sections ?? []).map((section) => ({
    id: section.id,
    label: section.label,
    items: (section.items ?? []).map((raw) => {
      const item = raw as FlcCostItem;
      const { foreignAmount, foreignRange } = resolveForeignAmount(item, baseCurrency);
      const { inrAmount, inrRange } = resolveInrForItem(
        item,
        baseCurrency,
        displayCurrency,
        fxSnapshot,
        currencyConfig,
        section,
      );

      let foreignDisplay: string | undefined;
      if (foreignRange) {
        foreignDisplay = formatRange(foreignRange[0], foreignRange[1], baseCurrency);
      } else if (foreignAmount != null) {
        foreignDisplay = formatAmount(foreignAmount, baseCurrency);
      } else if (typeof item.amount === "string") {
        foreignDisplay = item.amount;
      } else if (item.range) {
        foreignDisplay = item.range;
      }

      let inrDisplay: string | undefined;
      if (inrRange) {
        inrDisplay = formatRange(inrRange[0], inrRange[1], displayCurrency);
      } else if (inrAmount != null) {
        inrDisplay = formatAmount(inrAmount, displayCurrency);
      }

      return {
        label: item.label,
        amount: foreignAmount ?? (typeof item.amount === "number" ? item.amount : null),
        range: item.range ?? (foreignRange ? `${foreignRange[0]}–${foreignRange[1]}` : null),
        currency: baseCurrency,
        unit: item.unit,
        notes: item.notes,
        applicable: item.applicable,
        foreignAmount,
        foreignRange,
        foreignCurrency: baseCurrency,
        inrAmount,
        inrRange,
        foreignDisplay,
        inrDisplay,
      } satisfies ResolvedFullCostBreakdownItem;
    }),
  }));

  const totals = (breakdown.totals ?? []).map((t) => {
    const totalItem = t as FlcCostItem & { range?: string };
    const consultancyTotal = /consultancy|professional fee|future link/i.test(t.label ?? "");
    const { inrAmount, inrRange } = consultancyTotal
      ? { inrAmount: null as number | null, inrRange: null as [number, number] | null }
      : resolveInrForItem(
          { label: t.label, inr: (t as { inr?: unknown }).inr ?? "auto", range: totalItem.range },
          baseCurrency,
          displayCurrency,
          fxSnapshot,
          currencyConfig,
        );
    let inrDisplay: string | undefined;
    if (inrRange) inrDisplay = formatRange(inrRange[0], inrRange[1], displayCurrency);
    else if (inrAmount != null) inrDisplay = formatAmount(inrAmount, displayCurrency);

    return {
      label: t.label,
      value: t.value ?? totalItem.range ?? "—",
      notes: t.notes,
      inrDisplay,
    };
  });

  return {
    title: breakdown.title,
    currency: breakdown.currency,
    lastVerified: breakdown.lastVerified,
    disclaimer: breakdown.disclaimer,
    sourceUrl: breakdown.sourceUrl ?? breakdown.verifyTotalUrl,
    sections,
    totals,
    fxRateUsed: rate > 0 ? rate : undefined,
    fxRateSource: source,
    displayCurrency,
    baseCurrency,
  };
}

/** True when guide needs live FX resolution for cost planning tab. */
export function needsFxResolution(
  breakdown: FlcFullCostBreakdown | undefined | null,
  currencyConfig: FlcCurrencyConfig | undefined | null,
): boolean {
  if (!breakdown?.sections?.length) return false;
  if (!currencyConfig?.baseCurrency) return false;
  const hasAuto = (breakdown.sections ?? []).some((s) =>
    (s.items ?? []).some(
      (i) =>
        i.inr === "auto" &&
        shouldConvertInrViaCurrencyMaster(
          { id: s.id, label: s.label },
          { label: i.label, official: (i as { official?: boolean }).official, inr: i.inr },
        ),
    ),
  );
  const totalsAuto = (breakdown.totals ?? []).some(
    (t) =>
      (t as { inr?: unknown }).inr === "auto" &&
      !/consultancy|professional fee|future link/i.test(t.label ?? ""),
  );
  return hasAuto || totalsAuto || currencyConfig.autoFetch === true;
}

export { isConsultancyCostSection };

/** Pass-through for legacy FullCostBreakdown (no FX columns). */
export function asLegacyBreakdown(resolved: ResolvedFullCostBreakdown): FullCostBreakdown {
  return {
    title: resolved.title,
    currency: resolved.currency,
    lastVerified: resolved.lastVerified,
    disclaimer: resolved.disclaimer,
    sourceUrl: resolved.sourceUrl,
    sections: resolved.sections.map((s) => ({
      id: s.id,
      label: s.label,
      items: s.items.map(({ label, amount, range, currency, unit, notes, applicable }) => ({
        label,
        amount,
        range,
        currency,
        unit,
        notes,
        applicable,
      })),
    })),
    totals: resolved.totals?.map(({ label, value, notes }) => ({ label, value, notes })),
  };
}

/** Convert resolved INR amounts using snapshot only (for tests). */
export function convertBaseToInr(
  amount: number,
  baseCurrency: string,
  fxSnapshot: Record<string, number>,
  fallbackRate?: number,
): number | null {
  const converted = convertWithSnapshot(amount, baseCurrency, "INR", fxSnapshot);
  if (converted != null) return converted;
  if (fallbackRate != null && fallbackRate > 0) return Math.round(amount * fallbackRate);
  return null;
}
