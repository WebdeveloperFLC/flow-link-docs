# Performance Hub — Phase 5I Deploy

## Phase 5I deliverables

| # | Feature | Route / surface |
|---|---------|-----------------|
| 5I.1 | Corporate calendar (O4) | `/performance/offers/calendar` |
| 5I.2 | Segment library (O5) | `/performance/offers/segments` |
| 5I.3 | Auto-offer rules UI (O6) | `/performance/offers/automation` |
| 5I.4 | Campaign auto-activation | `offers-lifecycle-tick` — planned → live on start date |

## Migration

**`20260626120000_incentive_platform_phase5i.sql`**

- `campaign_calendar` — annual promotions grid + linked offer
- `fn_can_manage_offers_studio()` — MarCom/admin gate
- `offer_groups` — `definition`, `segment_filters`, `is_active`
- `fn_offer_segments_summary()` — member + linked offer counts
- RLS broadened for `offer_groups`, `offer_group_members`, `offer_templates`

## Edge function

**`offers-lifecycle-tick`** — redeploys on Lovable Publish. Adds campaign calendar activation (birthday logic unchanged).

## Access

Grant **Offers** module (`offers` = edit) via Team Access for MarCom, or use admin/manager role.

## UAT (batch at end of all phases)

1. **Calendar** — schedule campaign with dates → appears in month grid → link draft offer.
2. **Lifecycle tick** — on start date, campaign status → `live`; linked offer → `active`.
3. **Segments** — create segment → visible in summary cards with member count.
4. **Automation** — create birthday template → toggle active → cron generates offers (existing birthday path).
5. **Permissions** — counselor without `offers` edit cannot create calendar/segment/rule rows.

## Not in 5I

- Workflow trigger execution (UI stores templates only)
- Automation journeys / win-back sequences (O7)
- Dynamic segment refresh from filters JSON
