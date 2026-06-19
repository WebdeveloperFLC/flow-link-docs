import type {
  ProfileAptitudeTestId,
  ProfileEnglishTestId,
  ProfileLanguageTestId,
  ProfileTestId,
} from "@/lib/profile/profileTestCatalog";

const EDU_PREFIX = "edu_";
const EXP_PREFIX = "exp_";
const ATTEMPT_PREFIX = "test_";

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

export function ensureAttemptId(existing?: string | null): string {
  const raw = (existing ?? "").trim();
  if (raw.startsWith(ATTEMPT_PREFIX) && raw.length > ATTEMPT_PREFIX.length) return raw;
  if (raw) return `${ATTEMPT_PREFIX}${raw.replace(/^test_/, "")}`;
  return `${ATTEMPT_PREFIX}${shortId()}`;
}

/** Phase E — document refs scoped to a specific attempt. */
export function testAttemptRefKey(testId: ProfileTestId, attemptId: string): string {
  return `tests:${testId}:${ensureAttemptId(attemptId)}`;
}

/** @deprecated Phase C — use testAttemptRefKey when attempt_id is known. */
export function englishTestRefKey(testId: ProfileEnglishTestId): string {
  return `tests:${testId}`;
}

/** @deprecated Phase C — use testAttemptRefKey when attempt_id is known. */
export function aptitudeTestRefKey(testId: ProfileAptitudeTestId): string {
  return `tests:${testId}`;
}

/** @deprecated Phase C — use testAttemptRefKey when attempt_id is known. */
export function languageTestRefKey(testId: ProfileLanguageTestId): string {
  return `tests:${testId}`;
}

export function parseRefKey(refKey: string): { kind: string; id: string } | null {
  const idx = refKey.indexOf(":");
  if (idx <= 0) return null;
  return { kind: refKey.slice(0, idx), id: refKey.slice(idx + 1) };
}
