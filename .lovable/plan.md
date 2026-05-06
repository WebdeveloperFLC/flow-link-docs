## Problem

Non-admin users with edit rights get an RLS violation when creating a new client. The current `clients insert scoped` RLS policy restricts inserts to users who hold one of these roles: `admin`, `counselor`, `documentation`. Any other role (e.g. `viewer`, or a custom edit-permission role granted via `client_access`) is blocked at the database level — even though the UI's `canCreateClient` flag may be true for them in some flows.

Additionally, the request is that whoever creates a client automatically becomes the **full-authority owner** of that file.

## Fix

### 1. Database — relax `clients` insert RLS

Replace the existing `clients insert scoped` policy with one that allows **any authenticated user** to create a client, as long as they set themselves as `owner_id` (or leave it null, in which case a trigger sets it). This guarantees the creator owns the record.

```sql
DROP POLICY "clients insert scoped" ON public.clients;

CREATE POLICY "clients insert scoped"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (owner_id IS NULL OR owner_id = auth.uid())
  AND (created_by IS NULL OR created_by = auth.uid())
);
```

### 2. Database — trigger to default ownership to the creator

To guarantee "full authority" without relying on the client to send `owner_id`:

```sql
CREATE OR REPLACE FUNCTION public.set_client_owner_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN NEW.owner_id := auth.uid(); END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_set_client_owner_defaults
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_client_owner_defaults();
```

Because `user_client_permission` already returns `'full'` when `owner_id = auth.uid() OR created_by = auth.uid()`, the creator automatically receives full edit/upload/view rights — no extra `client_access` row needed.

### 3. Frontend — show "New client" to all authenticated users

Update `src/contexts/AuthContext.tsx`:

```ts
canCreateClient: !!user,  // any signed-in user can create
```

This makes the **New client** button in `src/pages/Clients.tsx` visible to viewers and any other roles, matching the new RLS.

## Files changed

- New migration: `supabase/migrations/<timestamp>_clients_insert_open.sql` (policy + trigger above)
- `src/contexts/AuthContext.tsx` — broaden `canCreateClient`

## Result

- Any signed-in user can create a client.
- The creator is automatically the owner and has `full` permission on that client file.
- Admins retain full access to everything as before.
