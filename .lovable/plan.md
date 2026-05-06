## New root cause

The previous fix only checked `getSession()` (which reads from `localStorage`). That returns a "valid" session object even when the access token is **server-side dead** (expired, revoked, or its refresh token is gone — the auth log shows `refresh_token_not_found` 400s). PostgREST then treats the call as anonymous, `auth.uid()` is `NULL`, and the `WITH CHECK (auth.uid() IS NOT NULL)` policy correctly rejects the insert. That's exactly the error in the screenshot.

Evidence:
- DB policy / trigger / grants are all correct (verified live: insert policy = `auth.uid() IS NOT NULL`, trigger stamps `owner_id`/`created_by`, `authenticated` role has INSERT).
- Auth logs show `refresh_token_not_found` shortly before the failure.
- The toast shown is the RLS error (catch branch), not our "session expired" branch — meaning local session existed but the server rejected the JWT.

## Fix (code only — no DB changes)

### 1. `src/components/clients/NewClientDialog.tsx`
Replace the `getSession()` pre-flight with a **server-validated** check. Call `supabase.auth.refreshSession()` first; if it returns no session or an error, sign out and bounce to `/auth`. Only then run the insert. This guarantees the JWT used by the very next request is alive on the server.

```ts
const { data: refreshed, error: refreshErr } =
  await supabase.auth.refreshSession();
if (refreshErr || !refreshed.session?.access_token) {
  toast.error("Your session expired — please sign in again");
  await supabase.auth.signOut();
  onOpenChange(false);
  window.location.assign("/auth");
  return;
}
// then the insert (unchanged)
```

### 2. `src/contexts/AuthContext.tsx`
Harden the listener so the app cannot stay in a "logged in" UI state with a dead token:
- On `onAuthStateChange`, if the event is `TOKEN_REFRESHED` and `session` is `null`, force sign-out and clear state.
- Keep the existing `getUser()` validation on mount, but also handle the case where it succeeds yet `expires_at` is already in the past — call `refreshSession()` and sign out on failure.

### 3. `src/components/ProtectedRoute.tsx`
Today it gates on `user` only. Also gate on `session` — if `session` is `null`, redirect to `/auth`. Prevents authenticated screens from rendering while the JS client has lost its session.

## What is NOT changing
- No migration. The `clients` policies, triggers, and grants are correct.
- No changes to roles or `user_client_permission`.

## Verification after applying
1. Build passes.
2. From the preview, sign in fresh on `/auth`, then "New client" → fill → Create. Insert succeeds; new row appears with `owner_id = auth.uid()`.
3. Re-query `auth` logs and Postgres logs — expect zero new `row-level security` errors on `clients` and zero `refresh_token_not_found` 400s on the click path.

## Files to be edited
- `src/components/clients/NewClientDialog.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
