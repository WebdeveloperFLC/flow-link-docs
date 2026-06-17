import { supabase } from "@/integrations/supabase/client";
import {
  buildFxSnapshot,
  convertWithSnapshot,
  effectiveRateToInr,
  type FxRateRow,
} from "@/lib/fxPolicy";
import type { MasterItem } from "@/lib/masters";

export interface CurrencyMasterConfig {
  default_buffer_fixed: number;
  default_buffer_pct: number;
}

export const CURRENCY_MASTER_LIST_KEY = "currencies";
export const GENERAL_FX_PURPOSE = "general";
/** Deep link to Currency Master in Masters (Org & Catalogue). */
export const CURRENCY_MASTER_PATH = "/masters?section=__currencies";

export function currentPeriodKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const DEFAULT_CONFIG: CurrencyMasterConfig = {
  default_buffer_fixed: 0,
  default_buffer_pct: 0,
};

export function parseCurrencyMasterConfig(raw: unknown): CurrencyMasterConfig {
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fixed = Number(m.default_buffer_fixed);
  const pct = Number(m.default_buffer_pct);
  return {
    default_buffer_fixed: Number.isFinite(fixed) ? fixed : DEFAULT_CONFIG.default_buffer_fixed,
    default_buffer_pct: Number.isFinite(pct) ? pct : DEFAULT_CONFIG.default_buffer_pct,
  };
}

/** Org-wide buffer defaults stored on master_lists (currencies). */
export async function fetchCurrencyMasterConfig(): Promise<CurrencyMasterConfig> {
  const { data, error } = await supabase
    .from("master_lists")
    .select("metadata")
    .eq("key", CURRENCY_MASTER_LIST_KEY)
    .maybeSingle();
  if (error) {
    console.warn("[currencyMaster] config fetch failed", error.message);
    return { ...DEFAULT_CONFIG };
  }
  return parseCurrencyMasterConfig(data?.metadata);
}

export async function saveCurrencyMasterConfig(config: CurrencyMasterConfig): Promise<void> {
  const { data: existing } = await supabase
    .from("master_lists")
    .select("metadata")
    .eq("key", CURRENCY_MASTER_LIST_KEY)
    .maybeSingle();
  const prev = (existing?.metadata ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from("master_lists")
    .update({
      metadata: {
        ...prev,
        default_buffer_fixed: config.default_buffer_fixed,
        default_buffer_pct: config.default_buffer_pct,
      } as never,
    })
    .eq("key", CURRENCY_MASTER_LIST_KEY);
  if (error) throw error;
}

export function resolveRowBuffer(row: FxRateRow, config: CurrencyMasterConfig): number {
  if (row.buffer_fixed != null && !Number.isNaN(Number(row.buffer_fixed))) {
    return Number(row.buffer_fixed);
  }
  return config.default_buffer_fixed;
}

export function resolveRowBufferPct(row: FxRateRow, config: CurrencyMasterConfig): number {
  if (row.buffer_pct != null && !Number.isNaN(Number(row.buffer_pct))) {
    return Number(row.buffer_pct);
  }
  return config.default_buffer_pct;
}

export function rowWithResolvedBuffer(row: FxRateRow, config: CurrencyMasterConfig): FxRateRow {
  return {
    ...row,
    buffer_fixed: resolveRowBuffer(row, config),
    buffer_pct: resolveRowBufferPct(row, config),
  };
}

export function computeEffectiveRate(
  currency: string,
  baseRate: number,
  bufferFixed: number,
  bufferPct = 0,
): number {
  return effectiveRateToInr({
    currency,
    base_rate_to_inr: baseRate,
    buffer_fixed: bufferFixed,
    buffer_pct: bufferPct,
  });
}

/** Upsert general-purpose FX row for CRM (Currency Master SSOT). */
export async function upsertGeneralFxRate(opts: {
  currency: string;
  baseRate: number;
  bufferFixed: number;
  bufferPct?: number;
  periodKey?: string;
}): Promise<void> {
  const periodKey = opts.periodKey ?? currentPeriodKey();
  const currency = opts.currency.toUpperCase();
  if (currency === "INR") return;
  const bufferPct = opts.bufferPct ?? 0;
  const effective = computeEffectiveRate(currency, opts.baseRate, opts.bufferFixed, bufferPct);

  const { data: existing } = await supabase
    .from("fx_rates")
    .select("id")
    .eq("currency", currency)
    .eq("period_key", periodKey)
    .eq("rate_purpose", GENERAL_FX_PURPOSE)
    .maybeSingle();

  const payload = {
    base_rate_to_inr: opts.baseRate,
    buffer_fixed: opts.bufferFixed,
    buffer_pct: bufferPct,
    rate_to_inr: effective,
    source: "currency_master",
  };

  if (existing?.id) {
    const { error } = await supabase.from("fx_rates").update(payload).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("fx_rates").insert({
      currency,
      period_key: periodKey,
      rate_purpose: GENERAL_FX_PURPOSE,
      ...payload,
    });
    if (error) throw error;
  }
}

/** Apply org-wide buffer to all general FX rows for a period. */
export async function applyGlobalBufferToGeneralRates(
  config: CurrencyMasterConfig,
  periodKey = currentPeriodKey(),
): Promise<number> {
  const { data: rows, error } = await supabase
    .from("fx_rates")
    .select("id, currency, base_rate_to_inr, buffer_pct")
    .eq("period_key", periodKey)
    .eq("rate_purpose", GENERAL_FX_PURPOSE);
  if (error) throw error;

  let updated = 0;
  for (const row of rows ?? []) {
    const r = row as { id: string; currency: string; base_rate_to_inr: number | null; buffer_pct: number | null };
    if (r.currency.toUpperCase() === "INR") continue;
    const base = Number(r.base_rate_to_inr);
    if (!base || base <= 0) continue;
    const pct = r.buffer_pct != null ? Number(r.buffer_pct) : config.default_buffer_pct;
    const effective = computeEffectiveRate(r.currency, base, config.default_buffer_fixed, pct);
    const { error: updErr } = await supabase
      .from("fx_rates")
      .update({
        buffer_fixed: config.default_buffer_fixed,
        rate_to_inr: effective,
        source: "currency_master",
      })
      .eq("id", r.id);
    if (!updErr) updated += 1;
  }
  return updated;
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

/** FX snapshot for CRM modules — general purpose rates only. */
export async function fetchFxSnapshot(periodKey = currentPeriodKey()): Promise<Record<string, number>> {
  const [config, fxRes] = await Promise.all([
    fetchCurrencyMasterConfig(),
    supabase
      .from("fx_rates")
      .select("currency, base_rate_to_inr, rate_to_inr, buffer_fixed, buffer_pct")
      .eq("period_key", periodKey)
      .eq("rate_purpose", GENERAL_FX_PURPOSE),
  ]);
  if (fxRes.error) {
    console.warn("[currencyMaster] fx_rates fetch failed", fxRes.error.message);
    return { INR: 1 };
  }
  const rows = ((fxRes.data ?? []) as FxRateRow[]).map((r) => rowWithResolvedBuffer(r, config));
  return buildFxSnapshot(rows);
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

/** Effective rate display for Currency Master admin. */
export function displayEffectiveRate(row: FxRateRow, config?: CurrencyMasterConfig): number {
  const resolved = config ? rowWithResolvedBuffer(row, config) : row;
  return effectiveRateToInr(resolved);
}
