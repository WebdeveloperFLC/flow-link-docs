## Run Offers Phase 1 Step 3 — Redemption Tracking & Code Generator

Apply the provided SQL verbatim via `supabase--migration`. The tool auto-generates the timestamped filename; I'll report it back after the run.

### What the migration does
- Creates `public.generate_offer_tracking_code(uuid, uuid)` — SECURITY DEFINER, idempotent per (offer, counselor), staff-gated. GRANT EXECUTE to `authenticated`.
- Creates `public.fn_increment_redemption_count()` + trigger `trg_client_offers_redemption` on `public.client_offers` (AFTER INSERT OR UPDATE OF status) to maintain `offers.redemption_count`.
- Creates `public.log_offer_event(...)` — SECURITY DEFINER append helper for `offer_events`, gated to staff or portal user for the client. GRANT EXECUTE to `authenticated`.

### Guarantees
- No table, column, policy, or unrelated function is created or altered.
- No change to `client_invoices` or any financial logic.
- Idempotent: `CREATE OR REPLACE` on functions; trigger dropped + recreated.
- SQL applied exactly as supplied — no reordering, edits, or additions.

### After applying
- Report the generated migration filename and confirm success.
- Surface any new linter warnings caused by this migration (none expected).
- No code changes, no follow-up migrations.
