/** Format Supabase/PostgREST errors for user-visible toasts. */
export function formatProfileSaveError(error: unknown, context?: string): string {
  const prefix = context ? `${context}: ` : "";
  if (!error || typeof error !== "object") {
    return `${prefix}Failed to save profile`;
  }
  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message, e.details, e.hint, e.code ? `(${e.code})` : null].filter(Boolean);
  if (parts.length) return `${prefix}${parts.join(" — ")}`;
  return `${prefix}Failed to save profile`;
}

/** True when client_document_refs table is missing or not yet in PostgREST schema cache. */
export function isDocumentRefsUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const msg = (e.message ?? "").toLowerCase();
  return (
    e.code === "42P01" ||
    e.code === "PGRST205" ||
    (msg.includes("client_document_refs") &&
      (msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("could not find")))
  );
}
