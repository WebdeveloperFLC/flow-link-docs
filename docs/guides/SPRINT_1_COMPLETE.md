# Sprint 1 Complete — Offer Lifecycle & Library

**Date:** 10 June 2026  
**Depends on:** Sprint 0 migrations applied

## Delivered

| Item | Location |
|------|----------|
| `offer_status` + `offer_funding_source` enums | `20260610310000_sprint1_offer_lifecycle.sql` |
| Lifecycle columns on `offers` | same |
| `offer_status_history`, `offer_versions` | same |
| `is_active` sync trigger | `trg_offers_sync_is_active` |
| Version snapshot trigger | `trg_offer_version_snapshot` |
| `fn_offer_set_status`, `fn_clone_offer` | same |
| Eligibility RPC status filter | `offers_eligible_for_client` updated |
| Admin UI: status, funding, filter, clone, history | `src/pages/OffersAdmin.tsx` |
| Lifecycle constants | `src/lib/offers/lifecycle.ts` |
| Module gates | `offers`, `offers_analytics` permissions |
| Types | `src/integrations/supabase/types.ts` |

## Deploy steps

1. Apply migration `20260610310000_sprint1_offer_lifecycle.sql` on Supabase.
2. Regenerate types (optional — already patched in repo).
3. Grant MarCom users `offers` edit via Team Access (`/users`).

## Backward compatibility

- Existing active offers backfilled to `status = active`.
- Inactive offers backfilled to `archived`.
- Portal and invoice flows still use `is_active`, kept in sync automatically.

## Next: Sprint 2

Wire `wallet_topup_rules` + achievement RPC → wallet auto-sizing (`fn_size_wallet`).

See [SPRINT_2_COMPLETE.md](./SPRINT_2_COMPLETE.md).
