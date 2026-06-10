/** Turn Supabase / PostgREST errors into a readable string (avoids "[object Object]"). */
export function formatSupabaseError(error: unknown, fallback = "Request failed"): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.error === "string" && o.error) return o.error;
    if (typeof o.details === "string" && o.details) return o.details;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return String(error);
}
