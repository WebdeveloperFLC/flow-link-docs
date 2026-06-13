# Performance Hub — Phase 5D Deploy

Deploy: **GitHub → Lovable → Publish** (migration required)

## Phase 5D deliverables

| # | Feature | Route / surface |
|---|---------|-----------------|
| 5D.1 | Telecaller performance home (role variant) | `/performance` when user is telecaller-only |
| 5D.2 | `lead_converted` qualifying events + attribution | DB triggers on client conversion |
| 5D.3 | Dark mode toggle in top bar | Global (all pages) |
| 5D.4 | Accept & send suggestion via WhatsApp | Client record → Promotions strip |
| 5D.5 | Publish promotion → draft offer | `/performance/offers/requests` |

## Migration

Apply on Lovable publish:

**`20260620120000_incentive_platform_phase5d.sql`**

Creates / updates:

- `clients.converted_by` + backfill from call queue
- Triggers: `fn_set_client_converted_by`, `fn_incentive_record_lead_converted`
- RPCs: `fn_telecaller_period_home`, `fn_publish_promotion_from_request`
- `log_offer_event` — adds `sent` event type + telecaller role
- `incentive_rules.milestone` — adds `lead_converted`

## Depends on

- Phase 5A–5C deployed
- Telecaller users + call queue assignments for attribution backfill

## UAT checklist

1. **Telecaller home** — log in as telecaller-only → `/performance` shows conversions, projected cash, conversion rate (not wallet cards).
2. **Lead conversion** — convert a lead-linked client with telecaller on call queue → `lead_converted` event appears on telecaller home.
3. **Dark mode** — moon/sun toggle in top bar persists across navigation.
4. **Suggestion send** — client with phone → Accept & send logs `offer_events.sent` + opens WhatsApp.
5. **Promotion publish** — admin publishes request → draft offer in library; request status = published.

## Not in 5D

- Director role / read-only executive handoff polish
- Full event timeline (enrolment, stage_change emitters)
- AI suggestion layer (L1+)
- Auto-activate published offers (still manual in Offers library)

## YOUR ACTION

```bash
git add supabase/migrations/20260620120000_incentive_platform_phase5d.sql \
  src/hooks/usePerformanceTelecallerHome.ts \
  src/components/performance/PerformanceTelecallerHome.tsx \
  src/components/theme/ThemeModeToggle.tsx \
  src/components/layout/Topbar.tsx \
  src/pages/PerformanceHome.tsx \
  src/components/clients/ClientPromotionsStrip.tsx \
  src/pages/ClientDetail.tsx \
  src/pages/PerformancePromotionRequests.tsx \
  docs/INCENTIVE_PHASE5D_DEPLOY.md
git commit -m "feat(performance): Phase 5D — telecaller home, dark mode, WhatsApp suggestion send, promotion publish"
git push origin HEAD
# Lovable → Publish (migration: 20260620120000_incentive_platform_phase5d.sql)
```
