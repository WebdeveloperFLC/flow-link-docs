# Performance Hub — Phase 5T Deploy

## Phase 5T deliverables (propensity I5 · realtime I8)

| # | Feature | Surface |
|---|---------|---------|
| 5T.1 | Rule-based propensity I5 | `fn_client_offer_propensity` — score 0–100, hot/warm/cool |
| 5T.2 | Counselor hot queue | `fn_counselor_offer_propensity_queue` — top clients by score |
| 5T.3 | O13 + I5 payload | `fn_suggest_offer_for_client` returns `propensity_score`, `propensity_band`, `propensity_factors` |
| 5T.4 | Client strip | Promotions strip — I5 badge + factor bullets |
| 5T.5 | Performance home hot list | `/performance` — Hot clients for offers card |
| 5T.6 | Realtime earning I8 | Supabase realtime on `incentive_line_items` + `incentive_runs`; live ticker on cash card |

## Migration

**`20260706120000_incentive_platform_phase5t.sql`**

- Realtime publication for incentive tables
- `fn_client_offer_propensity`, `fn_counselor_offer_propensity_queue`
- Enhanced `fn_suggest_offer_for_client` (I5 fields)

## Edge functions

No edge function changes in 5T.

## UAT

1. **Client strip** — Open coaching-only client → I5 badge (hot/warm) + factor list on suggestion card.
2. **Hot queue** — Performance home shows top propensity clients with links.
3. **Live ticker** — Admin runs incentive calculate → cash card updates without refresh; footer shows **Live ticker**.
4. **Poll fallback** — Disconnect realtime → footer falls back to 60s poll text.

## Post–5T (not in scope)

ML propensity model, per-service floor overrides, WebSocket custom server.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5T — propensity I5 + realtime I8" -- \
  supabase/migrations/20260706120000_incentive_platform_phase5t.sql \
  src/components/clients/ClientPromotionsStrip.tsx \
  src/hooks/usePerformanceHomeData.ts \
  src/pages/PerformanceHome.tsx \
  docs/INCENTIVE_PHASE5T_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish**.
