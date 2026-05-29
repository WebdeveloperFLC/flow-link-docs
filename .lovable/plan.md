## Offers Phase 1 — Schema Migration

Create the migration file at the exact path you specified, with your SQL content used verbatim (no reordering, no edits, no "improvements").

### File
`supabase/migrations/20260530090000_offers_phase1_schema.sql`

### What it does (additive only)
- Extends `public.offers` with: `target_countries`, `max_redemptions`, `per_client_limit`, `redemption_count`, `template_id`, `currency`.
- Extends `public.client_offers` with: `attached_by`, `source` (CHECK: portal/counselor/auto/trigger).
- Adds `public.clients.date_of_birth` (Gate B; canonical DOB for birthday offers).
- Creates `public.offer_templates` (+ RLS admin/view policies, `touch_updated_at` trigger).
- Adds `offers.template_id` FK to `offer_templates(id)` via idempotent `pg_constraint` guard.
- Creates `public.offer_tracking_codes` (+ indexes, RLS admin/view).
- Creates `public.offer_events` (+ indexes, RLS: staff insert, admin read).

### Guarantees
- No existing column, table, policy, or trigger is altered or dropped.
- Fully idempotent (`IF NOT EXISTS` on columns/tables/indexes; `pg_constraint` guard on FK).
- All new columns are nullable or defaulted, so existing `offers` / `client_offers` / `clients` rows remain valid.

### Note on GRANTs
Your SQL does not include `GRANT` statements on the three new tables (`offer_templates`, `offer_tracking_codes`, `offer_events`). Per your instruction not to modify or "improve" the SQL, I will paste it exactly as provided. If PostgREST returns permission errors at runtime, we can add the GRANTs in a follow-up migration. Confirm to proceed as-is, or tell me to add the standard GRANTs before applying.

### Nothing else
No other files, no code changes, no follow-up migrations in this step.