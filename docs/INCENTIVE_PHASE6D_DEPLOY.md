# Performance Hub — Phase 6D Deploy

## Phase 6D deliverables (O14 service_offers convergence · Map §6 Task 2)

| # | Feature | Surface |
|---|---------|---------|
| 6D.1 | Convergence banner | Client registration invoice preview (`InvoicePreviewSection`) |
| 6D.2 | Feature flag | `VITE_LEGACY_OFFERS_READ_ONLY` — legacy pickers view-only when `true` |
| 6D.3 | Retirement copy | `VITE_LEGACY_OFFERS_RETIREMENT_DATE` (default `December 2026`) |
| 6D.4 | Migration map | `docs/migrations/service-offers-convergence.md` |

Implements **Implementation Map §6 Task 2** (phase 2C / O14).

## Migration

**None** — UI + env flag only. Data backfill documented for a future SQL phase.

## Env (Lovable / `.env`)

```bash
# Optional — default false (counselors can still apply legacy offers on registration)
VITE_LEGACY_OFFERS_READ_ONLY=false

# Banner copy
VITE_LEGACY_OFFERS_RETIREMENT_DATE=December 2026
```

Set `VITE_LEGACY_OFFERS_READ_ONLY=true` in Lovable env to flip legacy screens to read-only **without a code deploy**.

## UAT

1. Open **client registration** flow as counselor → invoice preview.
2. Amber banner appears with retirement date + link to **Offer Library**.
3. Dismiss banner → stays hidden on refresh (localStorage).
4. Set `VITE_LEGACY_OFFERS_READ_ONLY=true` → republish → legacy offers list visible but **Apply/Remove** hidden.
5. Give Discount / Offers studio unchanged (already on `offers` table).

## Post–6D

| Phase | Focus |
|-------|--------|
| **6E** | Performance Hub dark/light CSS tokens |

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 6D — O14 service_offers convergence banner" -- \
  src/lib/legacyOffersConvergence.ts \
  src/components/performance/ServiceOffersConvergenceBanner.tsx \
  src/components/clients/registration/InvoicePreviewSection.tsx \
  docs/migrations/service-offers-convergence.md \
  docs/INCENTIVE_PHASE6D_DEPLOY.md \
  docs/guides/CURSOR_IMPLEMENTATION_MAP\ REVISED.md \
  scripts/ship.sh \
  .env.example
```

Then: **Lovable → Sync from GitHub → Publish** (no migration).
