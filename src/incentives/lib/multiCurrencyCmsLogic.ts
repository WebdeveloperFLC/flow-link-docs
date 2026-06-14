import { effectiveRateToInr, type FxRateRow } from "@/lib/fxPolicy";

export interface CurrencyConfigRow {
  code: string;
  name: string;
  rateToInr: number;
  revenueOriginal: number;
  revenueInr: number;
  status: "Base" | "Live" | "Configured" | "Inactive";
  source: string;
  manualOverride: boolean;
}

export interface CurrencyMixSlice {
  code: string;
  label: string;
  sharePct: number;
  revenueInr: number;
}

export interface FxHistoryBar {
  periodKey: string;
  label: string;
  rateToInr: number;
  manualOverride: boolean;
}

export interface MultiCurrencyCmsKpis {
  liveCurrencies: number;
  cadRate: number | null;
  cadSource: string;
  totalRevenueInr: number;
}

const CURRENCY_NAMES: Record<string, string> = {
  INR: "Indian Rupee",
  CAD: "Canadian Dollar",
  USD: "US Dollar",
  GBP: "British Pound",
  AUD: "Australian Dollar",
  EUR: "Euro",
};

const LIVE_CODES = new Set(["INR", "CAD"]);

export function currencyDisplayName(code: string): string {
  return CURRENCY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

export function currencyStatus(code: string, hasRate: boolean): CurrencyConfigRow["status"] {
  const c = code.toUpperCase();
  if (c === "INR") return "Base";
  if (LIVE_CODES.has(c) && hasRate) return "Live";
  if (hasRate) return "Configured";
  return "Inactive";
}

export function pickPeriodFxRates(
  rates: (FxRateRow & { period_key: string; source?: string })[],
  period: string,
): Map<string, FxRateRow & { period_key: string; source?: string }> {
  const byCurrency = new Map<string, FxRateRow & { period_key: string; source?: string }>();
  const sorted = [...rates].sort((a, b) => b.period_key.localeCompare(a.period_key));
  for (const row of sorted) {
    const code = (row.currency || "").toUpperCase();
    if (!code || byCurrency.has(code)) continue;
    if (row.period_key <= period || row.period_key.startsWith(period.slice(0, 4))) {
      byCurrency.set(code, row);
    }
  }
  for (const row of sorted) {
    const code = (row.currency || "").toUpperCase();
    if (!code || byCurrency.has(code)) continue;
    byCurrency.set(code, row);
  }
  return byCurrency;
}

export function buildCurrencyConfigRows(
  rates: (FxRateRow & { period_key: string; source?: string })[],
  revenueByCurrency: Map<string, number>,
  period: string,
): CurrencyConfigRow[] {
  const fxMap = pickPeriodFxRates(rates, period);
  const codes = new Set<string>(["INR", ...revenueByCurrency.keys(), ...fxMap.keys()]);

  const rows: CurrencyConfigRow[] = [];
  for (const code of [...codes].sort()) {
    const fx = fxMap.get(code);
    const rateToInr = fx ? effectiveRateToInr(fx) : code === "INR" ? 1 : 0;
    const revenueOriginal = revenueByCurrency.get(code) ?? 0;
    const revenueInr = code === "INR" ? revenueOriginal : Math.round(revenueOriginal * rateToInr);
    rows.push({
      code,
      name: currencyDisplayName(code),
      rateToInr,
      revenueOriginal,
      revenueInr,
      status: currencyStatus(code, rateToInr > 0),
      source: fx?.source ?? (code === "INR" ? "base" : "—"),
      manualOverride: fx?.source === "manual",
    });
  }

  return rows.sort((a, b) => {
    if (a.code === "INR") return -1;
    if (b.code === "INR") return 1;
    return b.revenueInr - a.revenueInr;
  });
}

export function buildCurrencyMix(rows: CurrencyConfigRow[]): CurrencyMixSlice[] {
  const total = rows.reduce((s, r) => s + r.revenueInr, 0);
  if (total <= 0) {
    return rows
      .filter((r) => r.status === "Base" || r.status === "Live")
      .map((r) => ({ code: r.code, label: r.code, sharePct: r.code === "INR" ? 100 : 0, revenueInr: 0 }));
  }
  return rows
    .filter((r) => r.revenueInr > 0)
    .map((r) => ({
      code: r.code,
      label: r.code,
      sharePct: Math.round((r.revenueInr / total) * 100),
      revenueInr: r.revenueInr,
    }))
    .sort((a, b) => b.sharePct - a.sharePct);
}

export function buildFxHistoryBars(
  rates: (FxRateRow & { period_key: string; source?: string })[],
  currency = "CAD",
  limit = 6,
): FxHistoryBar[] {
  const ccy = currency.toUpperCase();
  const filtered = rates
    .filter((r) => (r.currency || "").toUpperCase() === ccy)
    .sort((a, b) => a.period_key.localeCompare(b.period_key));
  const recent = filtered.slice(-limit);
  return recent.map((r) => ({
    periodKey: r.period_key,
    label: r.period_key.slice(5) || r.period_key,
    rateToInr: effectiveRateToInr(r),
    manualOverride: r.source === "manual",
  }));
}

export function multiCurrencyCmsKpis(rows: CurrencyConfigRow[]): MultiCurrencyCmsKpis {
  const cad = rows.find((r) => r.code === "CAD");
  return {
    liveCurrencies: rows.filter((r) => r.status === "Live" || r.status === "Base").length,
    cadRate: cad?.rateToInr ?? null,
    cadSource: cad?.source ?? "—",
    totalRevenueInr: rows.reduce((s, r) => s + r.revenueInr, 0),
  };
}
