# Performance Hub — Phase 6B Deploy

## Phase 6B deliverables (Director read-only · Map §6 Task 4)

| # | Feature | Surface |
|---|---------|---------|
| 6B.1 | `director` app role | `app_role` enum + assign via admin-users |
| 6B.2 | Read-only helpers | `fn_is_director_only`, `fn_assert_not_director_read_only` |
| 6B.3 | Mutation guards | Period close, apply discount, approvals, classify payment, payroll, admin unlock/void |
| 6B.4 | Director SELECT RLS | Wallets, runs, payouts, allocations, approvals, offers |
| 6B.5 | Edge function | `incentive-calculate-run` → 403 `{ code: "DIRECTOR_READ_ONLY" }` |
| 6B.6 | Executive UI | Director role, alerts → “Open in Finance workflow” toast |
| 6B.7 | Runs admin | Disabled controls + friendly error mapping |

**Note:** Users with `director` **plus** admin/administrator/manager retain write access (executive hat only when director-only).

## Migration

**`20260711120000_incentive_platform_phase6b.sql`**

## Edge function

Republish **`incentive-calculate-run`** after Lovable Sync (director guard added).

## UAT

1. Assign test user role **`director`** only (Team & Roles or admin-users).
2. **Executive dashboard** — read-only badge; alert CTA shows Finance workflow toast (no navigate).
3. **Runs admin** — Calculate/Lock disabled; if invoked via API → `DIRECTOR_READ_ONLY`.
4. **Admin user** — lock run still succeeds.
5. Optional SQL: `select fn_is_director_only('<director-user-uuid>');` → `true`.

## Post–6B

| Phase | Focus |
|-------|--------|
| 6C | Mobile Give Discount W8 |
| 6D | O14 service_offers banner |
| 6E | Hub theming tokens |

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 6B — director read-only server enforcement" -- \
  supabase/migrations/20260711120000_incentive_platform_phase6b.sql \
  supabase/functions/incentive-calculate-run/index.ts \
  supabase/functions/admin-users/index.ts \
  src/lib/performanceDirectorReadOnly.ts \
  src/lib/invokeError.ts \
  src/contexts/AuthContext.tsx \
  src/components/layout/AppLayout.tsx \
  src/pages/PerformanceExecutive.tsx \
  src/pages/IncentivesAdmin.tsx \
  src/lib/constants.ts \
  src/integrations/supabase/types.ts \
  docs/INCENTIVE_PHASE6B_DEPLOY.md \
  docs/guides/CURSOR_IMPLEMENTATION_MAP\ REVISED.md \
  scripts/ship.sh
```

Then: **Lovable → Sync → Publish** → approve migration + republish edge function.
