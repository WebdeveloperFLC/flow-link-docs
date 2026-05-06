## Fix plan

### New hypothesis
The previous `refreshSession()` pre-flight is itself the bug: when gotrue returns no session (transient network or already-rotated refresh token), our code force-signs-out the user before the insert ever runs — but in some cases it returns a stale session whose JWT PostgREST still rejects, sending the request through as anon. Either way, we have no proof of which side is failing. We need a server-side probe.

### Changes

1. **New migration** — add `public.whoami()` returning `{uid, role}` so the client can verify the JWT actually arrives at PostgREST as the logged-in user.

2. **`src/components/clients/NewClientDialog.tsx`**
   - Drop `refreshSession()` pre-flight.
   - Before insert, call `supabase.rpc('whoami')` and log result. If `uid` is null, show toast "Auth token not reaching server — please sign out and back in" and abort.
   - On insert error, surface the full `error.code` + `error.message` + `error.details` in toast and console.

3. **`src/components/ProtectedRoute.tsx`** — gate on `user` only (revert dual gate that can flicker users out mid-refresh).

4. **`src/contexts/AuthContext.tsx`** — remove the self-evicting `TOKEN_REFRESHED && !session` sign-out branch and the extra `getUser()` validation; let supabase-js manage refresh.

### Files
- `supabase/migrations/<new>.sql`
- `src/components/clients/NewClientDialog.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/contexts/AuthContext.tsx`
