# Performance Hub — Phase 5G Deploy

## Phase 5G deliverables

| # | Feature | Route |
|---|---------|--------|
| 5G.1 | Offers studio dashboard | `/performance/offers` |
| 5G.2 | Offers library (lifecycle) | `/performance/offers/library` |
| 5G.3 | 5-step create wizard | `/performance/offers/new` |
| 5G.4 | Analytics in studio shell | `/performance/offers/analytics` |
| 5G.5 | Studio sub-nav + legacy redirect | `/offers-admin` → library |

## Migration

**`20260624120000_incentive_platform_phase5g.sql`**

- `offers.distribution_channels` (wizard step 4)
- `fn_offer_studio_dashboard(_period_key)` — KPI tiles for studio home

## Depends on

- Phase 5C (`promotion_requests` for dashboard tile)
- Sprint 1 offer lifecycle (`offer_status`, `fn_offer_set_status`)

## UAT

1. **Dashboard** — `/performance/offers` loads KPI tiles (no RPC error).
2. **Wizard** — create draft → appears in library → Submit for review → Approve → Activate.
3. **Library** — lifecycle buttons, clone, status history still work.
4. **Legacy URL** — `/offers-admin` redirects to library.
5. **Analytics** — studio nav on `/performance/offers/analytics`.

## Not in 5G

- Corporate calendar (O4)
- Segments UI (O5)
- Auto-offer rules (O6)
- AI Offer Studio (5H)
