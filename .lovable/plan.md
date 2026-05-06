## Root cause

The PGRST202 error proves the `create_client` RPC was never actually applied to the database — querying `pg_proc` returns zero rows for it. The previous migration file exists in the repo but was not executed against the live DB. PostgREST has no function in its schema cache, so the call 404s.

## Fix

Create a NEW migration (fresh timestamp) with the same `create_client` function so it will actually be applied this time. No frontend changes needed — `NewClientDialog.tsx` already calls `supabase.rpc("create_client", ...)` with the right argument names.

### New migration content
- `CREATE OR REPLACE FUNCTION public.create_client(_full_name text, _country text, _application_type text, _email text DEFAULT NULL, _phone text DEFAULT NULL, _template_id uuid DEFAULT NULL)` returning `public.clients`, `SECURITY DEFINER`, `search_path = public`.
- Validates `auth.uid()` is not null (else raises `Not authenticated`).
- Inserts into `public.clients` with `owner_id = auth.uid()` and `created_by = auth.uid()`.
- `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;`
- `NOTIFY pgrst, 'reload schema';` to force PostgREST to refresh its schema cache immediately.

## Files
- New: `supabase/migrations/<new-timestamp>_create_client_rpc_v2.sql`

## Verification after apply
- Query `pg_proc` to confirm the function exists.
- Confirm a non-admin counselor can create a client end-to-end.