export const DIRECTOR_READ_ONLY_CODE = "DIRECTOR_READ_ONLY";

export const DIRECTOR_READ_ONLY_TOAST =
  "Open in Finance workflow — director accounts are read-only for operational changes.";

export function isDirectorReadOnlyError(message: string | null | undefined, data?: unknown): boolean {
  if (message?.includes("DIRECTOR_READ_ONLY")) return true;
  const body = data as { code?: string; error?: string } | null;
  if (body?.code === DIRECTOR_READ_ONLY_CODE) return true;
  if (typeof body?.error === "string" && body.error.includes("DIRECTOR_READ_ONLY")) return true;
  return false;
}

export function directorReadOnlyMessage(message: string | null | undefined, data?: unknown): string {
  return isDirectorReadOnlyError(message, data) ? DIRECTOR_READ_ONLY_TOAST : message ?? "Request failed";
}
