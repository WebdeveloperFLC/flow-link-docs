# Performance Hub — Phase 5U Deploy

## Phase 5U deliverables (service floors O16b · WIR lite)

| # | Feature | Surface |
|---|---------|---------|
| 5U.1 | Per-service margin floors O16b | Seeded overrides: coaching 75%, admission 85%, allied 80%, travel 82% |
| 5U.2 | Floor resolution | `fn_resolve_discount_margin_floor` — service → global fallback |
| 5U.3 | Admin CRUD | `fn_list_discount_margin_floor_policies`, `fn_upsert_discount_margin_floor_policy` |
| 5U.4 | Give discount | Service line picker + floor scope in preview |
| 5U.5 | Approvals admin | Global + per-service floor editor |
| 5U.6 | WIR lite | `fn_counselor_wallet_impact` — wallet impact card on `/performance` |

## Migration

**`20260707120000_incentive_platform_phase5u.sql`**

- Service floor seeds + resolve/list/upsert RPCs
- `fn_counselor_wallet_impact`
- Updated `fn_evaluate_discount_margin` (+ `_master_key`, `floor_scope_key`)
- Updated `fn_submit_discount_request` (+ `_master_key`)

## Edge functions

No edge function changes in 5U.

## UAT

1. **Coaching floor** — Give discount · service line Coaching · ₹20k base · ₹6k off → uses 75% floor (stricter than 80% global on net calc — actually 75% is looser, allows more discount).
2. **Admission floor** — Admission line · 85% min net → smaller max discount than global.
3. **Admin** — Approvals → edit coaching floor % → Give discount preview updates.
4. **WIR** — Performance home shows wallet impact revenue + ROI when scores synced for period.

## Post–5U (not in scope)

ML propensity model, custom WebSocket server, counselor-level O10 influence card.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5U — service floors O16b + WIR lite" -- \
  supabase/migrations/20260707120000_incentive_platform_phase5u.sql \
  src/pages/GiveDiscount.tsx \
  src/pages/PerformanceApprovals.tsx \
  src/pages/PerformanceHome.tsx \
  docs/INCENTIVE_PHASE5U_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish**.
