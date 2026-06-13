# Performance Hub — Phase 6E Deploy

## Phase 6E deliverables (Production theming · Map §6 Task 5)

| # | Feature | Surface |
|---|---------|---------|
| 6E.1 | Prototype CSS tokens | `src/styles/performance-hub-theme.css` — LIGHT/DARK on `[data-performance-hub]` |
| 6E.2 | Token constants | `src/lib/performanceHubTokens.ts` |
| 6E.3 | Hub shell | `AppLayout` wraps `/performance/*` with `data-performance-hub` + context bar |
| 6E.4 | Context bar | `PerformanceHubContextBar` — topbar, period/branch, dark/light toggle |
| 6E.5 | Module accents | `PERFORMANCE_MODULE` → `--cash` / `--wallet` / `--offer` token classes |
| 6E.6 | Theme wiring | `data-theme` on `<html>`, default `mode: system`, FOUC guard in `index.html` |

Implements **Implementation Map §6 Task 5** (phase 1A).

## Migration

**None** — UI + theme only.

## UAT

1. Open any **Performance Hub** route (`/performance`, `/performance/give-discount`, etc.).
2. Confirm **navy context bar** with period/branch + **Dark/Light** toggle.
3. Toggle dark mode — hub background, cards, and module badges (Cash / Wallet / Offers) restyle with prototype hex values.
4. Refresh — theme persists via saved CRM theme (`fl-theme-v2` in user settings / paintbrush panel).
5. Set **System** in theme customizer → hub follows OS preference.
6. Non-hub CRM pages unchanged (hub tokens scoped to `[data-performance-hub]` only).

## §6 complete

All build tasks (6A–6E) from Implementation Map §6 are shipped. Task 6 remains backlog tickets only.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 6E — Hub prototype theming tokens" -- \
  src/styles/performance-hub-theme.css \
  src/lib/performanceHubTokens.ts \
  src/lib/performanceHubTheme.ts \
  src/lib/themeStore.ts \
  src/components/performance/PerformanceHubContextBar.tsx \
  src/components/performance/PerformanceHubHeader.tsx \
  src/components/performance/PerformanceMetricCard.tsx \
  src/components/performance/PerformanceMoneyRail.tsx \
  src/components/performance/PerformancePeriodBar.tsx \
  src/components/theme/ThemeModeToggle.tsx \
  src/components/layout/AppLayout.tsx \
  src/main.tsx \
  index.html \
  docs/INCENTIVE_PHASE6E_DEPLOY.md \
  docs/guides/CURSOR_IMPLEMENTATION_MAP\ REVISED.md \
  scripts/ship.sh
```

Then: **Lovable → Sync from GitHub → Publish** (no migration).
