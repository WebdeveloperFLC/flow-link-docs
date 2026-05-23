import { supabase } from "@/integrations/supabase/client";

/**
 * Ensure the Supabase auth session is fresh before issuing an RLS-guarded
 * write. If the access token is missing or close to expiry, force a refresh.
 * Returns true when a usable session is in place after the call.
 */
export async function ensureFreshSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = s?.expires_at ?? 0;
    if (!s?.access_token || expiresAt - now < 60) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      return !!refreshed.session?.access_token;
    }
    return true;
  } catch (e) {
    console.warn("[ensureFreshSession] refresh failed", e);
    return false;
  }
}

function isAuthOrRlsError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code ?? "");
  const msg = String(err.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "PGRST301" ||
    code === "401" ||
    msg.includes("row-level security") ||
    msg.includes("row level security") ||
    msg.includes("jwt") ||
    msg.includes("not authenticated")
  );
}

export class AuthExpiredError extends Error {
  code = "AUTH_EXPIRED" as const;
  constructor(message = "Your session expired. Please sign in again.") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

export class PermissionDeniedError extends Error {
  code = "PERMISSION_DENIED" as const;
  pgCode?: string;
  details?: string;
  hint?: string;
  constructor(message: string, pgCode?: string, details?: string, hint?: string) {
    super(message);
    this.name = "PermissionDeniedError";
    this.pgCode = pgCode;
    this.details = details;
    this.hint = hint;
  }
}

export interface WriteDebugContext {
  table?: string;
  operation?: "insert" | "update" | "delete" | "upsert" | "write";
}

/**
 * Run a Supabase write. If it fails with an RLS/JWT error, refresh the
 * session and retry once. If it still fails, surface either an
 * AuthExpiredError (real missing token) or a PermissionDeniedError
 * (RLS denial) so the UI can show a truthful message.
 *
 * The callback should perform a single Supabase call and return its result
 * (so the second attempt can re-run it cleanly).
 */
export async function runWithAuthRetry<T>(
  fn: () => PromiseLike<{ data: T; error: any }>,
  context: WriteDebugContext = {},
): Promise<T> {
  let res = await fn();
  if (res.error && isAuthOrRlsError(res.error)) {
    const refreshed = await ensureFreshSession();
    if (refreshed) {
      res = await fn();
    }
    if (res.error && isAuthOrRlsError(res.error)) {
      const { data: sess } = await supabase.auth.getSession();
      const hasSession = !!sess.session?.access_token;
      const userId = sess.session?.user?.id ?? null;
      const { data: roleRows } = userId
        ? await supabase.from("user_roles").select("role").eq("user_id", userId)
        : { data: null };
      console.error("[runWithAuthRetry] giving up", {
        table: context.table ?? "unknown",
        operation: context.operation ?? "write",
        hasSession: !!sess.session,
        userId,
        roles: roleRows?.map((r: { role: string }) => r.role) ?? [],
        pgCode: res.error?.code ?? null,
        expiresAt: sess.session?.expires_at ?? null,
        original: res.error,
      });
      // Only call it a session expiry when we truly have no token.
      if (!hasSession) {
        throw new AuthExpiredError();
      }
      const e = res.error ?? {};
      throw new PermissionDeniedError(
        e.message || "You don't have permission to perform this action.",
        e.code,
        e.details,
        e.hint,
      );
    }
  }
  if (res.error) throw res.error;
  return res.data;
}