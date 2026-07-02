## Apply two pending Platform Baseline catch-up migrations

Both files exist in the repo but have not run against the live database.

### Files (apply in strict order)
1. `supabase/migrations/20261102120000_platform_baseline_data_api_grants.sql` — D22 Data API GRANTs for `upi_commission_config`, `upi_commission_aggregator_invoices`, `upi_commission_aggregator_invoice_lines` (idempotent, `to_regclass`-guarded).
2. `supabase/migrations/20261102120100_commission_post_receipt_plpgsql_sa_ambiguity_fix.sql` — `CREATE OR REPLACE` of `fn_post_commission_receipt` renaming the record variable to `v_stu_alloc` to remove the `sa.student_commission_id` ambiguity error.

### Rules
- Schema-only, strict order, stop on first error.
- No edits to the SQL — apply exactly as committed.
- No other migrations included in this turn.

### Post-apply verification
- GRANTs: re-run `information_schema.role_table_grants` for the three tables → expect `SELECT,INSERT,UPDATE,DELETE` for `authenticated` and full privileges for `service_role` on each.
- Function fix: `pg_get_functiondef` for `public.fn_post_commission_receipt` contains `v_stu_alloc` and no bare `sa` record loop variable.
- Confirm `fn_post_commission_receipt` still calls `fn_resolve_aggregator_invoice_for_institution_invoice` (Gate 3 preserved).

### Deviation log
None expected. If any deviation occurs it will be recorded (D23+) in the Exception Register per `PLATFORM_BASELINE_RECOVERY.md`.