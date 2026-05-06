## Root cause (new hypothesis, confirmed by data)

Both reported problems are the **same bug**, not two:

The admin "Create user" flow in `supabase/functions/admin-users/index.ts` calls `auth.admin.createUser({ email_confirm: false, ... })`. This deliberately marks every new internal user as **unconfirmed**, so:

1. They cannot sign in → "Email not confirmed" toast (the second issue you reported).
2. Because they can never log in, they can never create a client → which looks like "only admins can add clients" (the first issue). 

**Evidence from the live database:**
- Every user created through the admin flow has `email_confirmed_at = NULL` and `last_sign_in_at = NULL` (krishna, namrata, insia, meena, ankita, trainer, counselor10/11, manjalpur, flc.trv4, santosh@futurelinkconsultants.ca, etc.).
- The one counselor who *is* confirmed (`trv@futurelinkconsultants.com`) successfully created client FL-10 — proving RLS, triggers, and `user_client_permission` already work correctly for non-admins. No DB changes are needed.

## Fix

### 1. `supabase/functions/admin-users/index.ts`
- Change `email_confirm: false` → `email_confirm: true` in the `create` action so admin-created internal users can sign in immediately.
- Remove the now-misleading comment about confirmation emails.

### 2. One-shot SQL migration to unblock existing users
Confirm every currently-unconfirmed user so they can log in without re-creation:
```sql
UPDATE auth.users
   SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
       confirmed_at       = COALESCE(confirmed_at, now())
 WHERE email_confirmed_at IS NULL;
```

### 3. Frontend cleanup — `src/components/clients/NewClientDialog.tsx`
The `whoami` pre-flight added in earlier rounds is no longer needed (it was diagnosing a non-issue). Remove it; keep the verbose error toast for any future failure.

### 4. Optional: drop `public.whoami()` 
It served its diagnostic purpose. Remove via migration to keep the schema clean.

## Files touched
- `supabase/functions/admin-users/index.ts`
- `src/components/clients/NewClientDialog.tsx`
- New migration: confirm existing users, drop `whoami`.

After approval I will apply the changes and verify by re-querying `auth.users` to confirm no rows remain unconfirmed.
