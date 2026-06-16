import { supabase } from "@/integrations/supabase/client";
import { buildFxSnapshot, convertWithSnapshot, effectiveRateToInr, type FxRateRow } from "@/lib/fxPolicy";
import type { MasterItem } from "@/lib/masters";

export function currentPeriodKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Country names from CRM masters → ISO currency code (via currency master metadata). */
export function currencyCodeForCountry(country: string, currencies: MasterItem[]): string | null {
  const norm = country.trim().toLowerCase();
  for (const c of currencies) {
    const countries = (c.metadata?.countries as string[] | undefined) ?? [];
    if (countries.some((x) => x.trim().toLowerCase() === norm)) return c.code.toUpperCase();
  }
  return null;
}

/** INR always included; add currencies for selected countries of interest. */
export function budgetCurrencyOptions(
  interestedCountries: string[],
  currencies: MasterItem[],
): MasterItem[] {
  const codes = new Set<string>(["INR"]);
  for (const country of interestedCountries) {
    const code = currencyCodeForCountry(country, currencies);
    if (code) codes.add(code);
  }
  const ordered = currencies.filter((c) => codes.has(c.code.toUpperCase()));
  const inr = ordered.find((c) => c.code.toUpperCase() === "INR");
  const rest = ordered.filter((c) => c.code.toUpperCase() !== "INR");
  return inr ? [inr, ...rest] : rest;
}

export async function fetchFxSnapshot(periodKey = currentPeriodKey()): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("fx_rates")
    .select("currency, base_rate_to_inr, rate_to_inr, buffer_fixed, buffer_pct")
    .eq("period_key", periodKey)
    .eq("rate_purpose", "general");
  if (error) {
    console.warn("[currencyMaster] fx_rates fetch failed", error.message);
    return { INR: 1 };
  }
  return buildFxSnapshot((data ?? []) as FxRateRow[]);
}

export function convertBudgetAmount(
  amount: number | null | undefined,
  fromCurrency: string,
  toCurrency: string,
  snap: Record<string, number>,
): number | null {
  if (amount == null || Number.isNaN(amount)) return null;
  return convertWithSnapshot(amount, fromCurrency, toCurrency, snap);
}

export interface BudgetEquivalentRow {
  country: string;
  currency: string;
  min: number | null;
  max: number | null;
}

export function buildBudgetEquivalents(
  interestedCountries: string[],
  currencies: MasterItem[],
  budgetCurrency: string,
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
  snap: Record<string, number>,
): BudgetEquivalentRow[] {
  const from = (budgetCurrency || "INR").toUpperCase();
  const rows: BudgetEquivalentRow[] = [];
  const seen = new Set<string>();

  const push = (country: string, currency: string) => {
    const key = currency.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      country,
      currency: key,
      min: convertBudgetAmount(budgetMin ?? null, from, key, snap),
      max: convertBudgetAmount(budgetMax ?? null, from, key, snap),
    });
  };

  push("India", "INR");
  for (const country of interestedCountries) {
    const code = currencyCodeForCountry(country, currencies);
    if (code) push(country, code);
  }
  return rows;
}

export function formatBudgetRange(min: number | null, max: number | null, currency: string): string {
  if (min == null && max == null) return "—";
  const sym = currency.toUpperCase();
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (min != null && max != null) return `${sym} ${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${sym} ${fmt(min)}+`;
  if (max != null) return `Up to ${sym} ${fmt(max)}`;
  return "—";
}

/** Effective rate display for Masters currency admin. */
export function displayEffectiveRate(row: FxRateRow): number {
  return effectiveRateToInr(row);
}
