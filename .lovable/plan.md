## Root cause

Postgres logs confirm 4 inserts on `public.clients` were rejected with `new row violates row-level security policy`. The current `WITH CHECK` requires `owner_id = auth.uid() AND created_by = auth.uid()` when those fields are present in the request body — and the frontend always sends them.

When the user-supplied `owner_id` / `created_by` doesn't match `auth.uid()` exactly at evaluation time (stale session uid, or a non-admin where the client sent the wrong id), the equality check fails and the row is rejected. The `BEFORE INSERT` trigger we added doesn't help because triggers run *before* RLS `WITH CHECK` re-evaluates the row's submitted values — and the policy already failed by then in some flows.

## Fix

Make the policy trust the trigger: allow any authenticated user to insert, and have the trigger **forcibly overwrite** `owner_id` and `created_by` with `auth.uid()`. This is safe because the trigger always wins, and the creator becomes the owner with `full` permission via existing `user_client_permission`.

### Migration

```sql
-- 1. Simplify RLS: any signed-in user may insert
DROP POLICY "clients insert scoped" ON public.clients;
CREATE POLICY "clients insert scoped"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Trigger forces ownership to the caller (no longer "if null")
CREATE OR REPLACE FUNCTION public.set_client_owner_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.owner_id   := auth.uid();
  NEW.created_by := auth.uid();
  RETURN NEW;
END $$;
```

The existing `BEFORE INSERT` trigger `trg_set_client_owner_defaults` stays attached and will now overwrite client-sent values, guaranteeing the creator is the owner regardless of what the frontend sends.

### Why this resolves it

- Any authenticated user passes the new `WITH CHECK`.
- Trigger sets `owner_id = created_by = auth.uid()`, so `user_client_permission(auth.uid(), id) = 'full'` — creator has full authority immediately.
- Admins keep full access via `has_role` branch.

## Files

- New migration: `supabase/migrations/<ts>_clients_insert_open_v2.sql` with the two statements above.

No frontend changes needed — `NewClientDialog.tsx` and `AuthContext.canCreateClient` already send the right shape and expose the button.
