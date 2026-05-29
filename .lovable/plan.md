## Run Offers Phase 1 Step 2 — Eligibility RPC migration

Apply the provided SQL verbatim via `supabase--migration`. The tool auto-generates the timestamped filename (e.g. `supabase/migrations/<timestamp>_<slug>.sql`); I'll report it back after the run.

### What the migration does
- Creates (or replaces) one SECURITY DEFINER SQL function: `public.offers_eligible_for_client(_client_id uuid, _service_codes text[] DEFAULT NULL)` returning `SETOF public.offers`.
- Grants `EXECUTE` on that function to `authenticated`.
- Adds a `COMMENT` on the function.

### Guarantees
- No table, column, policy, trigger, or other function is created or altered.
- Idempotent via `CREATE OR REPLACE FUNCTION` and re-issuable `GRANT` / `COMMENT`.
- SQL is applied exactly as supplied — no reordering, edits, or additions.

### After applying
- Report the generated migration filename.
- Confirm success (and surface any linter warnings, though none are expected to be caused by this change).
- No code changes, no follow-up migrations.
