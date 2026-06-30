/**
 * Permanent CRM pricing rules (Fee Master + Knowledge Centre + Lead form).
 *
 * Consultancy fees — business-defined, stored per currency independently.
 * Currency Master must NEVER modify consultancy amounts.
 *
 * Government / tuition / living / proof-of-funds — official foreign currency
 * is source of truth; only INR equivalent uses Currency Master (effective rate).
 */

export type StoredCurrencyAmounts = Partial<
  Record<"INR" | "CAD" | "USD" | "AUD" | "GBP" | "EUR" | "NZD", number>
>;

export type ConsultancyFeeSource = {
  amounts: StoredCurrencyAmounts;
};

type CostSectionLike = { id?: string; label?: string };
type CostItemLike = { label?: string; official?: boolean; inr?: unknown };

const CONSULTANCY_SECTION_IDS = new Set(["flc", "consultancy", "consultancy-fee"]);
const CONSULTANCY_LABEL = /consultancy|professional fee|future link|flc professional|our fee|service fee/i;
const OFFICIAL_GOVT_SECTION_IDS = new Set(["govt", "fees", "government", "gov"]);

/** Cost Planning section that holds Future Link consultancy (never FX-converted). */
export function isConsultancyCostSection(section: CostSectionLike): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  if (CONSULTANCY_SECTION_IDS.has(id)) return true;
  const label = (section.label ?? "").trim().toLowerCase();
  return CONSULTANCY_LABEL.test(label) && !/government|ircc|embassy|official/i.test(label);
}

/** Line item that represents business consultancy pricing (never FX-converted). */
export function isConsultancyCostItem(item: CostItemLike, section?: CostSectionLike): boolean {
  if (section && isConsultancyCostSection(section)) return true;
  if (item.official === false && CONSULTANCY_LABEL.test(item.label ?? "")) return true;
  return false;
}

/** Government / official fee section in Cost Planning. */
export function isOfficialGovernmentSection(section: CostSectionLike): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  if (OFFICIAL_GOVT_SECTION_IDS.has(id)) return true;
  const label = (section.label ?? "").trim().toLowerCase();
  return /government|ircc|embassy|official fee|visa fee|consular/i.test(label);
}

/**
 * Whether Currency Master may compute INR from the stored foreign amount.
 * False for consultancy; true for official govt, tuition, living, estimates.
 */
export function shouldConvertInrViaCurrencyMaster(
  section: CostSectionLike,
  item: CostItemLike,
): boolean {
  if (isConsultancyCostItem(item, section)) return false;
  if (item.official === false && !isOfficialGovernmentSection(section)) {
    // Third-party planning estimates (VAC, courier, etc.) — INR guide via CM.
    return true;
  }
  return true;
}

export function parseFeeItemAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[£€$,\s]/g, "").replace(/\+.*/, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Read independently stored consultancy amounts from fee_items rows (no conversion). */
export function consultancyAmountsFromFeeItems(
  rows: { fee_label: string; amount: string | null; currency: string | null }[],
): StoredCurrencyAmounts {
  const amounts: StoredCurrencyAmounts = {};
  for (const row of rows) {
    if (!/consultancy|consult|service fee|our fee/i.test(row.fee_label)) continue;
    const cur = (row.currency ?? "").toUpperCase();
    if (!cur) continue;
    const n = parseFeeItemAmount(row.amount);
    if (n == null) continue;
    amounts[cur as keyof StoredCurrencyAmounts] = n;
  }
  return amounts;
}

/** Read independently stored consultancy amounts from picker variant row (no conversion). */
export function consultancyAmountsFromPickerVariant(variant: {
  fee_inr?: number | null;
  fee_cad?: number | null;
}): StoredCurrencyAmounts {
  const amounts: StoredCurrencyAmounts = {};
  if (variant.fee_inr != null && variant.fee_inr > 0) amounts.INR = variant.fee_inr;
  if (variant.fee_cad != null && variant.fee_cad > 0) amounts.CAD = variant.fee_cad;
  return amounts;
}

export function formatConsultancyKpiFromStored(amounts: StoredCurrencyAmounts): {
  value: string;
  sub?: string;
} {
  const inr = amounts.INR;
  const cad = amounts.CAD;
  const usd = amounts.USD;
  const gbp = amounts.GBP;
  const aud = amounts.AUD;
  const eur = amounts.EUR;

  if (inr != null && inr > 0) {
    const value = `₹${inr.toLocaleString("en-IN")}`;
    const subParts: string[] = [];
    if (cad != null && cad > 0) subParts.push(`CA$${cad.toLocaleString("en-CA")}`);
    if (usd != null && usd > 0) subParts.push(`US$${usd.toLocaleString("en-US")}`);
    if (gbp != null && gbp > 0) subParts.push(`£${gbp.toLocaleString("en-GB")}`);
    if (aud != null && aud > 0) subParts.push(`A$${aud.toLocaleString("en-AU")}`);
    if (eur != null && eur > 0) subParts.push(`€${eur.toLocaleString("en-GB")}`);
    return { value, sub: subParts.length > 0 ? subParts.join(" · ") : undefined };
  }

  if (cad != null && cad > 0) {
    return { value: `CA$${cad.toLocaleString("en-CA")}` };
  }
  if (usd != null && usd > 0) {
    return { value: `US$${usd.toLocaleString("en-US")}` };
  }
  if (gbp != null && gbp > 0) {
    return { value: `£${gbp.toLocaleString("en-GB")}` };
  }

  return { value: "—" };
}

export function formatStoredAmount(amount: number, currency: string): string {
  const cur = currency.toUpperCase();
  const n = amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  switch (cur) {
    case "INR":
      return `₹${n}`;
    case "CAD":
      return `CAD $${n}`;
    case "USD":
      return `USD $${n}`;
    case "GBP":
      return `£${n}`;
    case "EUR":
      return `€${n}`;
    case "AUD":
      return `AUD $${n}`;
    case "NZD":
      return `NZD $${n}`;
    default:
      return `${cur} ${n}`;
  }
}
