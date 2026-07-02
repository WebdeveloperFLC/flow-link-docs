# Package summary

Generated: 2026-06-30  
Module: **performance-hub**  
Regenerate: `node scripts/build-claude-design-package.mjs`

## Files copied

**Total files in package:** 280 (including generated markdown)

### By destination folder

- `ASSETS/`: 1 files
- `COMPONENTS/`: 141 files
- `CONSTITUTIONS/`: 36 files
- `DASHBOARDS/`: 10 files
- `DESIGN_SYSTEM/`: 1 files
- `LAYOUT/`: 12 files
- `PERFORMANCE_HUB/`: 52 files
- `ROUTES/`: 3 files
- `SAMPLE_DATA/`: 2 files
- `STYLES/`: 12 files

## Source locations (repo root)

| Category | Source path |
|----------|-------------|
| Pages | `src/pages/Performance*.tsx`, `Incentive*.tsx`, wallet/incentive desk pages |
| Layout | `src/components/layout/`, hub shell in `src/components/performance/` |
| Components | `src/components/performance/`, `ui/`, `theme/`, `offers/`, `incentives/components/` |
| Routing | `src/AppRoutes.tsx`, `src/incentives/lib/performanceWorkspaceNav.ts` |
| Styling | `tailwind.config.ts`, `src/index.css`, `src/styles/performance-hub-theme.css`, `src/lib/performanceHub*` |
| Docs | `docs/performance-hub/`, `docs/guides/`, `docs/governance/`, `docs/system-map/` |
| Assets | `public/placeholder.svg` |

## Missing dependencies (expected)

- src/incentives/lib/* (business logic — excluded by design)
- src/hooks/usePerformance* (data hooks — excluded)
- Dedicated Scorecard page (KPI strips only)
- Dedicated Rewards page (competitions at /incentives/competitions)
- Local logo SVG (brand via CSS tokens + placeholder.svg)
- Screenshots (capture manually into SCREENSHOTS/)
- Competitor screenshots (add to COMPETITOR_REFERENCE/screenshots/)
- Accounting Constitution doc (use FEE_MASTER_ARCHITECTURE_V1.md instead)
- Rewards Constitution doc (use incentive-platform-spec-v1.md instead)

## Recommendations before sending to Claude

1. **Add screenshots** to `SCREENSHOTS/` for top 6 routes (see `SCREENSHOTS/README.md`).
2. **Add competitor PNGs** to `COMPETITOR_REFERENCE/screenshots/` (see readme there).
3. **Paste role context** in your prompt (e.g. "design as branch manager").
4. **Link prototype gaps doc** — clarify whether Claude should close gaps or polish current UI only.
5. **Do not send** `node_modules`, `.env`, or `supabase/`.
6. **Zip the folder:** `zip -r claude-design-package.zip claude-design-package`
7. **Delete after review:** `rm -rf claude-design-package`
8. For other modules later, extend `scripts/build-claude-design-package.mjs` with `--module commercial` (etc.).

## Excluded paths (never copy)

- `supabase/migrations/`, `*.sql`
- `src/platform/cae/`, `src/platform/foe/`, `src/platform/ewe/`
- `src/incentives/lib/` (except `performanceWorkspaceNav.ts` → ROUTES)
- `src/hooks/`, `*.test.ts`, `qa/`
- `.env*`, `node_modules/`, `dist/`
