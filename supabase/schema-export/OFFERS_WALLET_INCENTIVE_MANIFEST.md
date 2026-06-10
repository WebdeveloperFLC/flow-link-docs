# Offers, Wallet & Incentive — Schema Export Manifest

**Sprint 0 export date:** 2026-06-10  
**Source of truth:** Live Supabase schema reflected in `src/integrations/supabase/types.ts` + committed SQL migrations.

This directory documents every database object in the Offers & Discounts Revenue Growth Engine domain. Objects marked **COMMITTED** have SQL in `supabase/migrations/`. Objects marked **SPRINT0** were exported in Sprint 0 migrations (previously dashboard-only).

---

## Enums

| Enum | Status | Migration |
|------|--------|-----------|
| `wallet_alloc_status` | SPRINT0 | `20260610300000_sprint0_wallet_incentive_enums.sql` |
| `wallet_budget_kind` | SPRINT0 | same |
| `wallet_rollover_policy` | SPRINT0 | same |
| `incentive_period_type` | SPRINT0 | same |
| `incentive_rate_type` | SPRINT0 | same |
| `incentive_run_status` | SPRINT0 | same |
| `incentive_source_type` | SPRINT0 | same |
| `payout_status` | SPRINT0 | same |

---

## Offer tables (CRM)

| Table | Status | Migration(s) |
|-------|--------|----------------|
| `offers` | COMMITTED | `20260509144647_*.sql`, extended `20260529142142_*.sql` |
| `client_offers` | COMMITTED | `20260509144647_*.sql`, extended `20260529142142_*.sql` |
| `offer_groups` | COMMITTED | `20260509182951_*.sql` |
| `offer_group_members` | COMMITTED | `20260509182951_*.sql` |
| `offer_audience_targets` | COMMITTED | `20260509182951_*.sql` |
| `offer_templates` | COMMITTED | `20260529142142_*.sql` |
| `offer_tracking_codes` | COMMITTED | `20260529142142_*.sql` |
| `offer_events` | COMMITTED | `20260529142142_*.sql` |
| `service_offers` | COMMITTED | `20260519024118_*.sql` (registration — converge in Sprint 10) |
| `offer_status_history` | **Sprint 1** | `20260610310000_sprint1_offer_lifecycle.sql` |
| `offer_versions` | **Sprint 1** | same |

**Sprint 1 enums:** `offer_status`, `offer_funding_source` (same migration).

---

## Promotion / university tables

| Table | Status | Migration(s) |
|-------|--------|----------------|
| `upi_promotions` | COMMITTED | UPI migrations (see `types.ts` FK `institution_id`) |
| `upi_marketing_campaigns` | COMMITTED | UPI migrations |
| `referrals` | COMMITTED | `20260509144647_*.sql` |

---

## Wallet tables

| Table | Status | Migration |
|-------|--------|-----------|
| `discount_wallets` | SPRINT0 | `20260610302000_sprint0_wallet_engine_schema.sql` |
| `wallet_allocations` | SPRINT0 | same |
| `wallet_topups` | SPRINT0 | same |
| `wallet_ledger` | SPRINT0 | same |
| `wallet_topup_rules` | SPRINT0 | same |
| `wallet_settings` | SPRINT0 | same |

---

## Incentive tables

| Table | Status | Migration |
|-------|--------|-----------|
| `incentive_plans` | SPRINT0 | `20260610301000_sprint0_incentive_engine_schema.sql` |
| `incentive_schemes` | SPRINT0 | same |
| `incentive_slabs` | SPRINT0 | same |
| `incentive_targets` | SPRINT0 | same |
| `incentive_runs` | SPRINT0 | same |
| `incentive_line_items` | SPRINT0 | same |
| `incentive_payouts` | SPRINT0 | same |
| `incentive_adjustments` | SPRINT0 | same |

---

## Functions / RPCs

| Function | Status | Migration / location |
|----------|--------|----------------------|
| `offers_eligible_for_client(uuid, text[])` | COMMITTED | `20260529145140_*.sql` |
| `user_can_see_offer(uuid, uuid)` | COMMITTED | `20260509182951_*.sql` |
| `generate_offer_tracking_code(uuid, uuid)` | COMMITTED | `20260529145934_*.sql` |
| `log_offer_event(...)` | COMMITTED | `20260529145934_*.sql` |
| `fn_redeem_offer_on_invoice()` | COMMITTED | `20260530153341_*.sql` |
| `fn_counselor_period_achievement(text)` | **Sprint 0** | `20260610305000_*.sql` |
| `fn_offer_set_status(uuid, offer_status, text)` | **Sprint 1** | `20260610310000_*.sql` |
| `fn_clone_offer(uuid)` | **Sprint 1** | `20260610310000_*.sql` |
| `fn_close_due_wallets()` | SPRINT0 stub if missing | `20260610303000_*.sql` |
| `fn_close_wallet(uuid)` | SPRINT0 stub if missing | same |
| `fn_reinstate_wallet(uuid, text)` | SPRINT0 stub if missing | same |
| `fn_get_or_create_wallet(...)` | SPRINT0 stub if missing | same |
| `fn_next_period_key(text, date)` | SPRINT0 stub if missing | same |
| `fn_release_expired_reservations()` | SPRINT0 stub if missing | same |
| `trg_wallet_topup_apply()` | SPRINT0 | `20260610303000_*.sql` |
| `trg_wallet_allocation_apply()` | SPRINT0 | same |
| `user_has_module(uuid, text, text)` | COMMITTED | `20260516060234_*.sql` |

**Note:** Production may already have wallet/period-close function bodies from Lovable. Sprint 0 migrations use `IF NOT EXISTS` guards so live bodies are **not overwritten**.

---

## Triggers

| Trigger | Table | Status |
|---------|-------|--------|
| `trg_offers_touch` | `offers` | COMMITTED |
| `trg_redeem_offer_on_invoice` | `client_invoices` | COMMITTED |
| `trg_wallet_topup_apply` | `wallet_topups` | SPRINT0 (if missing) |
| `trg_wallet_allocation_apply` | `wallet_allocations` | SPRINT0 (if missing) |
| `trg_discount_wallets_touch` | `discount_wallets` | SPRINT0 (if missing) |

---

## Edge functions (application layer)

| Function | Path | Purpose |
|----------|------|---------|
| `incentive-calculate-run` | `supabase/functions/incentive-calculate-run/` | Incentive run preview/calculate/lock |
| `offers-lifecycle-tick` | `supabase/functions/offers-lifecycle-tick/` | Birthday / scheduled offer automation |

---

## Views

No dedicated offers/wallet views in repo. Analytics use direct table/RPC queries (`/offers-analytics`).

---

## Related non-wallet systems (do not merge)

| Table | Purpose |
|-------|---------|
| `credit_wallet` | Client loyalty credits — separate from counsellor `discount_wallets` |

---

## Applying migrations

```bash
# Local (requires Supabase CLI + Docker)
npx supabase db reset

# Remote — apply via Supabase dashboard or CI pipeline
# Sprint 0 files: 20260610300000 through 20260610305000
```

After applying, regenerate types:

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```
