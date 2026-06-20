/** Country-specific default reference types (UI hints only — not stored in a master table). */
export const APPLICATION_REFERENCE_DEFAULTS: Record<string, readonly string[]> = {
  CA: ["Application ID", "Student ID", "Offer/LOA Number", "Portal ID"],
  US: ["Application ID", "Student ID", "I-20 Number", "SEVIS ID", "Portal ID"],
  GB: ["Application ID", "Student ID", "CAS Number", "Offer Number", "Portal ID"],
  AU: ["Application ID", "Student ID", "Offer Number", "CoE Number", "Portal ID"],
  DE: ["Application ID", "Student ID", "Admission Number", "Portal ID"],
  IE: ["Application ID", "Student ID", "Offer Number"],
  FR: ["Application ID", "Student ID", "Campus France Reference"],
};

const COUNTRY_ALIASES: Record<string, keyof typeof APPLICATION_REFERENCE_DEFAULTS> = {
  ca: "CA",
  canada: "CA",
  us: "US",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  america: "US",
  gb: "GB",
  uk: "GB",
  "united kingdom": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  au: "AU",
  australia: "AU",
  de: "DE",
  germany: "DE",
  ie: "IE",
  ireland: "IE",
  fr: "FR",
  france: "FR",
};

const GENERIC_DEFAULTS = ["Application ID", "Student ID", "Portal ID"] as const;

function normalizeCountryKey(countryName: string | null | undefined): string | null {
  const trimmed = (countryName ?? "").trim().toLowerCase();
  if (!trimmed) return null;
  return COUNTRY_ALIASES[trimmed] ?? null;
}

/** Resolve default reference type labels for an institution country (free-text country_name). */
export function getDefaultReferenceTypes(countryName: string | null | undefined): readonly string[] {
  const code = normalizeCountryKey(countryName);
  if (code && APPLICATION_REFERENCE_DEFAULTS[code]) {
    return APPLICATION_REFERENCE_DEFAULTS[code];
  }
  return GENERIC_DEFAULTS;
}

/** Human-readable country label for UI helper text. */
export function formatReferenceDefaultsCountry(countryName: string | null | undefined): string | null {
  const trimmed = (countryName ?? "").trim();
  return trimmed || null;
}

/** Normalize reference type for duplicate checks (matches DB unique index). */
export function normalizeReferenceType(referenceType: string): string {
  return referenceType.trim().toLowerCase();
}

type ReferenceTypeRow = { id: string; referenceType: string };

/** Find another row with the same normalized type (exclude current row on edit). */
export function findDuplicateReferenceType<T extends ReferenceTypeRow>(
  references: T[],
  referenceType: string,
  excludeId?: string,
): T | undefined {
  const normalized = normalizeReferenceType(referenceType);
  return references.find(
    (r) => r.id !== excludeId && normalizeReferenceType(r.referenceType) === normalized,
  );
}
