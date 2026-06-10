/** Institution dedup — must stay aligned with DB unique index on normalized name + country. */

export function normalizeInstitutionDedupName(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeInstitutionDedupCountry(country: string | null | undefined): string {
  const c = String(country ?? "")
    .toLowerCase()
    .trim();
  if (c === "uk" || c === "u.k." || c === "great britain" || c === "england") return "united kingdom";
  if (c === "usa" || c === "u.s.a." || c === "us" || c === "u.s.") return "united states";
  if (c === "uae") return "united arab emirates";
  return c;
}

export function institutionDedupKey(name: string, country?: string | null): string {
  return `${normalizeInstitutionDedupName(name)}||${normalizeInstitutionDedupCountry(country)}`;
}

export function findDuplicateInstitution<
  T extends { id: string; name: string; country_name?: string | null },
>(institutions: T[], name: string, country?: string | null): T | null {
  const key = institutionDedupKey(name, country);
  if (!normalizeInstitutionDedupName(name)) return null;
  return institutions.find((i) => institutionDedupKey(i.name, i.country_name) === key) ?? null;
}
