# Performance Hub — Phase 6C Deploy

## Phase 6C deliverables (Mobile Give Discount W8 · Map §6 Task 1)

| # | Feature | Surface |
|---|---------|---------|
| 6C.1 | 390px phone layout | `/performance/give-discount` — max-width + mobile padding |
| 6C.2 | Sticky submit bar | Fixed bottom CTA with discount/debit/unlock summary + safe-area inset |
| 6C.3 | Simplified mobile form | Margin floor fields collapsed into optional `<details>` |
| 6C.4 | Mobile history | Allocation list cards instead of wide table |
| 6C.5 | Depth-matrix label | Submit button reads “Apply discount” vs “Submit for approval” |

Implements **Implementation Map §6 Task 1** (phase 2A / W8).

## Migration

**None** — UI-only phase.

## UAT

1. Open **Give discount** on a phone or DevTools viewport **390×844**.
2. Confirm content fits without horizontal scroll; bottom submit bar stays visible while scrolling.
3. Pick client + offer + amount — sticky bar shows discount, wallet debit, unlocked remaining.
4. Exceed unlocked budget — bar shows red “submit blocked”; button disabled (same as desktop).
5. Expand **Margin floor — optional** on mobile; desktop still shows inline O16 fields.
6. **My discounts** section renders card list on mobile, table on desktop.
7. Instant vs approval path — button label switches correctly.

## Post–6C

| Phase | Focus |
|-------|--------|
| 6D | O14 `service_offers` convergence banner |
| 6E | Performance Hub dark/light tokens |

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 6C — mobile Give Discount W8" -- \
  src/pages/GiveDiscount.tsx \
  docs/INCENTIVE_PHASE6C_DEPLOY.md \
  docs/guides/CURSOR_IMPLEMENTATION_MAP\ REVISED.md \
  scripts/ship.sh
```

Then: **Lovable → Sync from GitHub → Publish** (no migration to approve).
