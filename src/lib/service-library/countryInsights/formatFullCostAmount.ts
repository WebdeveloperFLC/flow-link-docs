type FullCostAmountItem = {
  amount?: number | null;
  range?: string | null;
  currency?: string;
  unit?: string;
};

function shouldSkipCurrencyPrefix(range: string): boolean {
  if (/^[₹$€£₽]/.test(range)) return true;
  if (/^(USD|INR|EUR|GBP|CAD|AUD|NZD|RUB)\s/i.test(range)) return true;
  if (/^(see |varies|bank |mandatory|per catalog|not applicable|optional|sum of|calculate|from )/i.test(range)) {
    return true;
  }
  return false;
}

function formatWithCurrency(currency: string, value: string): string {
  const cur = currency.toUpperCase();
  switch (cur) {
    case "USD":
      return `$${value}`;
    case "INR":
      return `₹${value}`;
    case "EUR":
      return value.startsWith("€") ? value : `€${value}`;
    case "GBP":
      return value.startsWith("£") ? value : `£${value}`;
    case "CAD":
      return value.startsWith("CAD") ? value : `CAD $${value}`;
    case "AUD":
      return value.startsWith("AUD") ? value : `AUD $${value}`;
    case "NZD":
      return value.startsWith("NZD") ? value : `NZD $${value}`;
    case "RUB":
      return `₽${value}`;
    default:
      return `${cur} ${value}`;
  }
}

/** Format a full-cost breakdown row without double-prefixing currency. */
export function formatFullCostAmount(item: FullCostAmountItem, breakdownCurrency: string): string {
  const unitSuffix = item.unit ? ` ${item.unit}` : "";

  if (item.range) {
    const range = item.range.trim();
    if (shouldSkipCurrencyPrefix(range)) {
      return `${range}${unitSuffix}`.trim();
    }
    const cur = item.currency ?? breakdownCurrency;
    return `${formatWithCurrency(cur, range)}${unitSuffix}`.trim();
  }

  if (item.amount != null) {
    const cur = item.currency ?? breakdownCurrency;
    const n = item.amount.toLocaleString("en-US");
    return `${formatWithCurrency(cur, n)}${unitSuffix}`.trim();
  }

  return "Varies — verify official source";
}
