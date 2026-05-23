## Fix: counselor (Sneha) gets "new row violates row-level security policy for table 'clients'" while saving the lead-to-client form

### Root cause analysis

- The only RLS check on `public.clients` INSERT is `WITH CHECK (auth.uid() IS NOT NULL)`. There are no restrictive policies, no FORCE RLS, and all `BEFORE`/`AFTER` triggers are `SECURITY DEFINER` owned by `postgres` (so they bypass RLS on `case_people`, `leads`, `accounting_clients`).
- Sneha's role is `counselor` and she successfully inserted 3 clients earlier today (10:03, 09:46, 09:43 UTC), so her policies and triggers are fine.
- The only way her insert can fail with this exact message is if `auth.uid()` is `null` at the moment of the call — i.e., the Supabase JS client sent the POST without a valid JWT. Auth logs show recent `refresh_token_not_found (400)` failures, which matches this pattern (silent token refresh failure leaves the client unauthenticated but the UI still renders).
- The autosave handler (`ClientNew.tsx` → `upsertClientRegistration` → `supabase.from("clients").insert(...)`) has no session-validity check and no retry, so any transient JWT loss surfaces as the cryptic RLS error.

### Changes

1. **Frontend session hardening** — `src/lib/supabaseSafeInsert.ts` (new helper)
   - `ensureFreshSession()`: calls `supabase.auth.getSession()`; if no access token or `expires_at` is within 60s, calls `supabase.auth.refreshSession()` and re-checks.
   - `runWithAuthRetry(fn)`: runs `fn()`; on Postgres error code `42501` or message containing `row-level security` / `JWT`, calls `ensureFreshSession()` and retries once. If it still fails, throws a clean `Error("Your session expired. Please sign in again.")` with `{ code: "AUTH_EXPIRED" }` on the cause.

2. **Wire helper into client save path** — `src/lib/clientRegistration.ts`
   - Wrap the `clients` INSERT and UPDATE in `runWithAuthRetry`.
   - Same for `client_family_members` insert (line 232) and the second insert at line 397 in the same file (only the two flagged by the user's screenshot path).
   - Log `{ hasSession, userId, expiresIn }` to `console.error` on the final failure to make future debugging trivial.

3. **AuthContext auto-recovery** — `src/contexts/AuthContext.tsx` (small addition)
   - On `onAuthStateChange` event `TOKEN_REFRESHED` log silently; on `SIGNED_OUT` while a protected route is mounted, redirect to `/auth?redirect=<current>` with a toast "Session expired — please sign in again." This catches the case where `refreshSession()` in step 1 returns no session.

4. **Relax clients INSERT RLS** — migration
   - Drop policy `clients insert scoped` and recreate as:
     ```sql
     CREATE POLICY "clients insert scoped" ON public.clients
       FOR INSERT TO authenticated
       WITH CHECK (
         auth.uid() IS NOT NULL
         OR has_role(auth.uid(), 'admin'::app_role)
         OR has_role(auth.uid(), 'manager'::app_role)
         OR has_role(auth.uid(), 'counselor'::app_role)
         OR has_role(auth.uid(), 'team_leader'::app_role)
         OR has_role(auth.uid(), 'director'::app_role)
       );
     ```
   - Functionally equivalent today (the first branch already covers everyone authenticated), but explicit so future tightening of the first branch can't silently block staff. No other tables, no finance, no documents, no invoicing touched.

### Out of scope (per user's standing rules)

- No changes to: document/client/applicant/binder/portal architecture, finance/invoicing/receipts/payments, OCR/extraction queue, `client_documents`, `client_files`, `case_people`, `client_family_members`, `client_profile`, `workflow_templates`, `client_timeline`.

### Verification

- After deploy: run the linter (no new warnings expected).
- Manually: sign in as Sneha, type a first + last name in `/clients/new?lead_id=...`. Autosave should succeed. If her browser session is silently expired, she should now see "Your session expired — please sign in again." and be redirected to `/auth` instead of the raw RLS error.
- Sanity SQL: `SELECT polname, pg_get_expr(polwithcheck, polrelid) FROM pg_policy WHERE polrelid='public.clients'::regclass AND polcmd='a';` should show the new expanded WITH CHECK.
