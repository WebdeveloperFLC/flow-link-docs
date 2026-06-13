# Performance Hub — Phase 5Q Deploy

## Phase 5Q deliverables (cross-sell journeys · O13 · I8 lite)

| # | Feature | Surface |
|---|---------|---------|
| 5Q.1 | Cross-sell journey templates | Seeded: IELTS → study abroad · allied bundle |
| 5Q.2 | Auto-enroll | `offers-lifecycle-tick` → `fn_process_cross_sell_journey_enrollments` |
| 5Q.3 | Counselor suggestion card O13 | Client record → Promotions strip (why line, wallet cap, journey CTA) |
| 5Q.4 | Persistent dismiss | `fn_dismiss_client_offer_suggestion` — 7-day hide per counselor |
| 5Q.5 | Cross-sell profile | `fn_client_cross_sell_profile` — lifecycle stage for rules |
| 5Q.6 | Earning refresh I8 lite | `/performance` — 60s poll via `fn_counselor_earning_snapshot` |

## Migration

**`20260703120000_incentive_platform_phase5q.sql`**

- Extended journey `trigger_type` + `template_key`
- `client_offer_suggestion_dismissals`
- `fn_client_cross_sell_profile`, `fn_dismiss_client_offer_suggestion`
- Enhanced `fn_suggest_offer_for_client` (O13 payload)
- Seed cross-sell journeys + steps
- `fn_process_cross_sell_journey_enrollments`, `fn_counselor_earning_snapshot`

## Edge function

**`offers-lifecycle-tick`** — redeploy on Lovable Publish (cross-sell auto-enroll).

## UAT

1. **Cross-sell coaching client** — client with coaching payment, no admission → suggestion shows coaching→abroad scenario → Start cross-sell journey.
2. **Daily tick** — eligible clients auto-enrolled when journey active (check enrollments table).
3. **O13 dismiss** — Dismiss → hidden 7 days for that counselor → reappears after expiry.
4. **I8 poll** — Performance home cash card footer shows last refresh time; earned updates after admin calculate.

## Post–5Q (not in scope)

WebSocket real-time ticker, ML propensity (I5), A/B offer variants (O11).

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5Q — cross-sell journeys + O13 suggestion card" -- \
  supabase/migrations/20260703120000_incentive_platform_phase5q.sql \
  supabase/functions/offers-lifecycle-tick/index.ts \
  src/components/clients/ClientPromotionsStrip.tsx \
  src/hooks/usePerformanceHomeData.ts \
  src/pages/PerformanceHome.tsx \
  src/pages/PerformanceOffersJourneys.tsx \
  docs/INCENTIVE_PHASE5Q_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish** → redeploy `offers-lifecycle-tick`.
