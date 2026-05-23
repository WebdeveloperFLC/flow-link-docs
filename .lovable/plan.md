## Root cause (from code + RLS audit)

The toast "Your session expired. Please sign in again." is misleading. `runWithAuthRetry` in `src/lib/supabaseSafeInsert.ts` throws `AuthExpiredError` for **any** Postgres error with code `42501` (RLS denial) or `PGRST301`, not just expired JWTs. So non-admins are seeing the wrong message for a permissions problem.

The actual permission failure happens upstream of the client insert. Current RLS on `public.leads`:

```text
SELECT/UPDATE: admin OR is_accounting_admin OR auth.uid()=created_by OR auth.uid()=assigned_counselor_id
INSERT: any authenticated user
DELETE: admin only
```

The convert flow (`ClientNew.tsx` → `prefillFromLead` → `upsertClientRegistration`) first fetches the lead, then inserts a client. A Telecaller / Edit Documentation / Edit Counselor / Commission Admin who didn't create the lead and isn't its assigned counselor gets zero rows back on the lead read, then any subsequent update (e.g. autosave hitting an existing lead, or family-member writes referencing `primary_lead_id`) fails with 42501 → toast says "session expired".

RLS on `public.clients` itself is fine:
- INSERT: any authenticated user
- SELECT/UPDATE: scoped via `can_view_client` / `can_edit_client`, which return 'full' when `owner_id = auth.uid()` (set by `trg_set_client_owner_defaults` BEFORE INSERT).

Triggers `fn_mark_lead_converted_on_client`, `fn_sync_accounting_client`, `ensure_applicant_for_client` are all SECURITY DEFINER and won't block non-admins. `accounting_clients` has RLS but not FORCED, so the SECURITY DEFINER insert by the table owner bypasses it.

## Allowed roles (per request)

- `admin` — full
- `counselor` — full (already)
- `documentation` — read/write leads + convert
- `telecaller` — read/write leads + convert
- `commission_admin`, `commission_manager` — read/write leads + convert
- `viewer` — read-only (no insert/update anywhere)

## Plan

### 1. Database migration (single migration, RLS-only, no schema changes)

`public.leads` — replace SELECT and UPDATE policies:

```sql
-- SELECT: admin, accounting/commission admins, creator, assigned counselor,
-- and any staff role that should be able to convert.
DROP POLICY "leads select" ON public.leads;
CREATE POLICY "leads select" ON public.leads
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR is_accounting_admin(auth.uid())
  OR is_commission_admin(auth.uid())
  OR has_role(auth.uid(),'counselor'::app_role)
  OR has_role(auth.uid(),'documentation'::app_role)
  OR has_role(auth.uid(),'telecaller'::app_role)
  OR auth.uid() = created_by
  OR auth.uid() = assigned_counselor_id
);

-- UPDATE: same set EXCLUDING viewer
DROP POLICY "leads update" ON public.leads;
CREATE POLICY "leads update" ON public.leads
FOR UPDATE TO authenticated
USING ( /* same expression as SELECT */ );
```

Add a `viewer`-blocking guard on `public.clients` INSERT (today it allows any auth user including viewer):

```sql
DROP POLICY "clients insert scoped" ON public.clients;
CREATE POLICY "clients insert scoped" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'counselor'::app_role)
  OR has_role(auth.uid(),'documentation'::app_role)
  OR has_role(auth.uid(),'telecaller'::app_role)
  OR is_commission_admin(auth.uid())
);
```

No changes to `client_profile`, `case_people`, `client_invoices`, `accounting_clients` — they already gate on `can_edit_client`, which resolves to 'full' for the user that just inserted the client (owner_id = auth.uid()).

### 2. Client-side error mapping

In `src/lib/supabaseSafeInsert.ts`:
- Keep `runWithAuthRetry`'s refresh-and-retry once.
- After retry, only throw `AuthExpiredError` when `getSession()` truly has no token. Otherwise throw a `PermissionDeniedError` with the original Postgres `message`/`details` so the toast in `ClientNew.tsx` (`Save failed: <real reason>`) is honest.
- Log `{ userId, role(s), table, code, message }` for any 42501 to the console for support.

In `src/pages/clients/ClientNew.tsx` `autosave`/`handleCreateInvoice` catch blocks: surface `e.message` from `PermissionDeniedError` directly, and only show "session expired" if the error is actually `AuthExpiredError`.

### 3. Session pre-flight

`ClientNew.tsx`: before the first autosave or `handleCreateInvoice`, call `ensureFreshSession()` once. If it returns false, show the sign-in toast and bail without attempting the write. This prevents the race described in the Stack-Overflow note for slow auth restore.

### 4. Verification (no UI test scaffolding — manual matrix)

Sign in as each role and confirm:

| Role | Create lead | Convert (save client) | Create draft invoice |
|---|---|---|---|
| admin | ✓ | ✓ | ✓ |
| counselor | ✓ | ✓ | ✓ |
| documentation | ✓ | ✓ | ✓ |
| telecaller | ✓ | ✓ | ✓ |
| commission_admin/manager | ✓ | ✓ | ✓ |
| viewer | blocked at insert | blocked at insert | blocked |

Also run the live SQL after the migration to verify:

```sql
SELECT polname, polcmd FROM pg_policy
WHERE polrelid IN ('public.leads'::regclass,'public.clients'::regclass)
ORDER BY polrelid, polcmd;
```

## Out of scope

- No UI/business-logic changes to the form, the workflow toggle, or the sticky Save bar.
- No changes to edge functions (`client-portal-invite-create` etc.) — they already use service role.
- No changes to `accounting_clients` RLS (the SECURITY DEFINER sync trigger handles it).

## Risks

- Broadening `leads SELECT` to all staff roles makes every staff member able to read every lead. This matches the user's stated requirement ("work exactly like Admin for all allowed roles except Viewer") but is a privacy widening — call this out before applying.
