# Performance Hub — Phase 6A Deploy

## Phase 6A deliverables (No target empty state · Map §6 Task 3)

| # | Feature | Surface |
|---|---------|---------|
| 6A.1 | Shared copy | `src/lib/performanceNoTargetCopy.ts` |
| 6A.2 | Performance home | Achievement + wallet cards when `assigned_target` is null |
| 6A.3 | Give discount | Amber banner + wallet footer note when no target |

Implements **Implementation Map §6 Task 3** (phase 2B).

## Migration

**None** — UI-only phase.

## UAT

1. Pick a counselor with a wallet but **no** `assigned_target` for the period (or clear target in admin).
2. **Performance home** — Achievement shows `—` with full “No target set for {period}…” copy; wallet card shows unlock note in amber.
3. **Give discount** — Amber banner under header; wallet section repeats unlock note.
4. Restore target → messages disappear; no NaN or divide-by-zero on achievement %.

## Post–6A (Map §6 remaining)

| Phase | Task |
|-------|------|
| 6B | Director read-only server-side (Task 4) |
| 6C | Mobile Give Discount W8 (Task 1) |
| 6D | O14 service_offers convergence banner (Task 2) |
| 6E | Performance Hub theming (Task 5) |

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 6A — no target empty states" -- \
  src/lib/performanceNoTargetCopy.ts \
  src/pages/PerformanceHome.tsx \
  src/pages/GiveDiscount.tsx \
  docs/INCENTIVE_PHASE6A_DEPLOY.md \
  docs/guides/CURSOR_IMPLEMENTATION_MAP\ REVISED.md \
  scripts/ship.sh
```

Then: **Lovable → Sync from GitHub → Publish** (no migration to approve).
