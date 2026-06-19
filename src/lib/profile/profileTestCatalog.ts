/** Canonical lowercase test ids — view model + UI keys. DB boundary maps to legacy values. */

export type ProfileEnglishTestId = "ielts" | "pte" | "toefl" | "celpip" | "duolingo";
export type ProfileAptitudeTestId = "gre" | "gmat" | "sat" | "act";
export type ProfileLanguageTestId = "french" | "german";
export type ProfileTestId = ProfileEnglishTestId | ProfileAptitudeTestId | ProfileLanguageTestId;

export type ProfileTestCategory = "english" | "aptitude" | "language";

interface ProfileTestCatalogEntry {
  label: string;
  legacyDbValue: string;
  category: ProfileTestCategory;
}

const CATALOG: Record<ProfileTestId, ProfileTestCatalogEntry> = {
  ielts: { label: "IELTS", legacyDbValue: "IELTS", category: "english" },
  pte: { label: "PTE", legacyDbValue: "PTE", category: "english" },
  toefl: { label: "TOEFL", legacyDbValue: "TOEFL", category: "english" },
  celpip: { label: "CELPIP", legacyDbValue: "CELPIP", category: "english" },
  duolingo: { label: "Duolingo", legacyDbValue: "Duolingo", category: "english" },
  gre: { label: "GRE", legacyDbValue: "GRE", category: "aptitude" },
  gmat: { label: "GMAT", legacyDbValue: "GMAT", category: "aptitude" },
  sat: { label: "SAT", legacyDbValue: "SAT", category: "aptitude" },
  act: { label: "ACT", legacyDbValue: "ACT", category: "aptitude" },
  french: { label: "French", legacyDbValue: "french", category: "language" },
  german: { label: "German", legacyDbValue: "german", category: "language" },
};

export const ENGLISH_TEST_IDS = ["ielts", "pte", "toefl", "celpip", "duolingo"] as const;
export const APTITUDE_TEST_IDS = ["gre", "gmat", "sat", "act"] as const;
export const LANGUAGE_TEST_IDS = ["french", "german"] as const;

const LEGACY_ENGLISH = new Map(
  ENGLISH_TEST_IDS.map((id) => [CATALOG[id].legacyDbValue.toUpperCase(), id] as const),
);
const LEGACY_APTITUDE = new Map(
  APTITUDE_TEST_IDS.map((id) => [CATALOG[id].legacyDbValue.toUpperCase(), id] as const),
);

export function isProfileTestId(v: string): v is ProfileTestId {
  return v in CATALOG;
}

export function testLabel(testId: ProfileTestId): string {
  return CATALOG[testId].label;
}

export function testCategory(testId: ProfileTestId): ProfileTestCategory {
  return CATALOG[testId].category;
}

export function legacyEnglishToTestId(raw: string | null | undefined): ProfileEnglishTestId | null {
  if (!raw?.trim() || raw === "None") return null;
  const hit = LEGACY_ENGLISH.get(raw.trim().toUpperCase());
  if (hit) return hit;
  const lower = raw.trim().toLowerCase();
  return ENGLISH_TEST_IDS.includes(lower as ProfileEnglishTestId) ? (lower as ProfileEnglishTestId) : null;
}

export function testIdToLegacyEnglish(testId: ProfileEnglishTestId): string {
  return CATALOG[testId].legacyDbValue;
}

export function legacyAptitudeToTestId(raw: string | null | undefined): ProfileAptitudeTestId | null {
  if (!raw?.trim()) return null;
  const hit = LEGACY_APTITUDE.get(raw.trim().toUpperCase());
  if (hit) return hit;
  const lower = raw.trim().toLowerCase();
  return APTITUDE_TEST_IDS.includes(lower as ProfileAptitudeTestId) ? (lower as ProfileAptitudeTestId) : null;
}

export function testIdToLegacyAptitude(testId: ProfileAptitudeTestId): string {
  return CATALOG[testId].legacyDbValue;
}

export function languageToTestId(raw: string | null | undefined): ProfileLanguageTestId | null {
  if (!raw?.trim()) return null;
  const lower = raw.trim().toLowerCase();
  return LANGUAGE_TEST_IDS.includes(lower as ProfileLanguageTestId) ? (lower as ProfileLanguageTestId) : null;
}
