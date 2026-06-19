import type { AptitudeTestType, EnglishTestType, LanguageCode } from "@/lib/profile/types";

const EDU_PREFIX = "edu_";
const EXP_PREFIX = "exp_";

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function ensureEducationId(existing?: string | null): string {
  const raw = (existing ?? "").trim();
  if (raw.startsWith(EDU_PREFIX) && raw.length > EDU_PREFIX.length) return raw;
  if (raw) return `${EDU_PREFIX}${raw.replace(/^edu_/, "")}`;
  return `${EDU_PREFIX}${shortId()}`;
}

export function ensureExperienceId(existing?: string | null): string {
  const raw = (existing ?? "").trim();
  if (raw.startsWith(EXP_PREFIX) && raw.length > EXP_PREFIX.length) return raw;
  if (raw) return `${EXP_PREFIX}${raw.replace(/^exp_/, "")}`;
  return `${EXP_PREFIX}${shortId()}`;
}

export function educationRefKey(recordId: string): string {
  return `education:${ensureEducationId(recordId)}`;
}

export function experienceRefKey(recordId: string): string {
  return `experience:${ensureExperienceId(recordId)}`;
}

export function englishTestRefKey(testType: EnglishTestType): string {
  return `tests:${testType.toLowerCase()}`;
}

export function aptitudeTestRefKey(testType: AptitudeTestType): string {
  return `tests:${testType.toLowerCase()}`;
}

export function languageTestRefKey(language: LanguageCode): string {
  return `tests:${language}`;
}

export function parseRefKey(refKey: string): { kind: string; id: string } | null {
  const idx = refKey.indexOf(":");
  if (idx <= 0) return null;
  return { kind: refKey.slice(0, idx), id: refKey.slice(idx + 1) };
}
