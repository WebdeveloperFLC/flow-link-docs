/** Escape a string for use inside a RegExp character class is not needed — whole-string match. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const COUNTRY_SEP = "\\s*[–—\\-·]\\s*";

/**
 * When the user is already browsing within a country, drop the redundant country prefix
 * (e.g. "Canada – BOWP (Bridging Open Work Permit)" → "BOWP (Bridging Open Work Permit)").
 */
export function stripCountryPrefix(label: string, country?: string | null): string {
  const trimmed = label.trim();
  if (!trimmed || !country || country === "ALL") return trimmed;

  const c = country.trim();
  const re = new RegExp(`^${escapeRegExp(c)}${COUNTRY_SEP}`, "i");
  const next = trimmed.replace(re, "").trim();
  return next || trimmed;
}

export type SplitServiceTitle = {
  country: string | null;
  name: string;
};

/**
 * Split a display title into country + service name for compact nav and hero layout.
 */
export function splitServiceTitle(title: string, country?: string | null): SplitServiceTitle {
  const trimmed = title.trim();
  if (!trimmed) return { country: country ?? null, name: trimmed };

  if (country && country !== "ALL") {
    const compact = stripCountryPrefix(trimmed, country);
    if (compact !== trimmed) {
      return { country, name: compact };
    }
  }

  const match = trimmed.match(/^(.+?)\s*[–—\-·]\s*(.+)$/);
  if (match) {
    return { country: match[1].trim(), name: match[2].trim() };
  }

  return { country: country && country !== "ALL" ? country : null, name: trimmed };
}
