# Why the previous three fixes didn't work

All prior attempts changed RLS / triggers on `public.clients`. I verified the current state directly against the database:

- Policy `clients insert scoped` = `WITH CHECK (auth.uid() IS NOT NULL)` ✅
- Trigger `trg_set_client_owner_defaults` forces `owner_id = auth.uid()`, `created_by = auth.uid()` ✅
- RLS is enabled, no other restrictive policies ✅

So the policy is permissive. Yet Postgres logs still show:
`new row violates row-level security policy for table "clients"` at the moment of the click.

The only way that policy can fail is if **`auth.uid()` is `NULL`** — i.e. the request reached PostgREST **without a valid user JWT**. Auth logs confirm a `refresh_token_not_found` 400 just before the failure. The React `AuthContext` still held the `user` object in memory (so the dialog rendered and the button was enabled), but the supabase-js client had no usable session, so the `from('clients').insert(...)` call went out as the anonymous role.

**New root-cause hypothesis:** the bug is client-side, not database-side. The Supabase JS client lost its session (expired/invalid refresh token), but our `AuthContext` did not react, so the app kept making "authenticated" calls that were actually anonymous. RLS correctly rejected them.

# Fix (code only — no DB changes)

### 1. `src/contexts/AuthContext.tsx`
- Subscribe to `onAuthStateChange` events `TOKEN_REFRESHED`, `SIGNED_OUT`, and `USER_UPDATED`. On `SIGNED_OUT` or when a refresh yields no session, clear `user` / `session` / `roles` immediately so guarded UI disappears.
- After `getSession()` on mount, also `getUser()`. If it returns an error (invalid refresh token), call `supabase.auth.signOut()` and clear state so the user is bounced to `/auth` instead of seeing a stale "logged-in" UI.

### 2. `src/components/clients/NewClientDialog.tsx`
- Before the insert, call `const { data: { session } } = await supabase.auth.getSession();`
- If `!session?.access_token`, show toast `Your session expired — please sign in again`, close the dialog, redirect to `/auth`, and abort.
- Drop the manual `created_by` / `owner_id` from the insert payload — the `trg_set_client_owner_defaults` trigger sets them. Sending nulls is harmless but misleading.
- On error, surface the real Supabase message (`error.message`) in the toast so the next failure (if any) is self-diagnosing instead of the generic "Failed to create client".

### 3. `src/App.tsx` (or existing `ProtectedRoute`)
- Verify the route guard redirects to `/auth` when `session` is `null` (not just when `user` is null). Add the missing branch if needed. This prevents authenticated screens from ever rendering with a dead session.

# What is explicitly NOT changing

- No new migration. Re-touching the `clients` policies or trigger will not fix this — they are already correct.
- No changes to roles, permissions, or `user_client_permission`.

# Verification I will run after the edit

1. `code--exec` build check passes.
2. Re-read `AuthContext.tsx` and `NewClientDialog.tsx` to confirm the session pre-flight is on the click path.
3. Query Postgres logs again after you retry once; expect zero new `row-level security` errors on `clients`.

# What you do after I apply it

Sign in once on `/auth` (your previous session is dead — that's why this is happening). Then "New client" → fill → Create. The dialog will now refuse to even attempt the insert without a live JWT, and with a live JWT the trigger stamps you as owner and RLS passes.
