# Performance Hub — Component Library

**Status:** DRAFT — completed at v1 freeze  
**Classification:** See `ENTERPRISE_COMPONENT_CLASSIFICATION.md`  
**SSOT for props:** Source files in `src/components/performance/`

---

## Universal components

### `band()` — `src/lib/performanceHubTheme.ts`

| Field | Detail |
|-------|--------|
| **Purpose** | Map achievement % to frozen five-band scale |
| **Props** | `pct: number \| null` → `{ band, label, cssVar }` |
| **States** | null → no band |
| **Dependencies** | Achievement CSS tokens |
| **Reusable?** | Yes — Universal |
| **Future modules** | HR targets, Admissions conversion, CRM SLA |

### `StatusBar` / `StatusDot` / `StatusBadge` — `PerformanceAchievementStatus.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Visual achievement band indicators |
| **Props** | `pct`, optional `maxPct`, `label` |
| **States** | Loading via parent; no-target copy from `noTargetAchievementDetail` |
| **Dependencies** | `band()`, achievement tokens |
| **Reusable?** | Yes — Universal |
| **Future modules** | Any KPI with band thresholds |

### `TraceGraph` — `TraceGraph.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Read-only bidirectional business event lineage |
| **Props** | `entryLabel`, `direction?`, `nodes: TraceGraphNode[]`, `className?` |
| **States** | Empty nodes → placeholder card |
| **Dependencies** | Card, lucide-react |
| **Reusable?** | Yes — Universal (read-only; hub does not own events) |
| **Future modules** | CRM claim spine, Commission ledger trace, Finance audit |

### `PerformanceHubCommandPalette` — `PerformanceHubCommandPalette.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | ⌘K route jump across Performance Hub |
| **Props** | None (uses nav context) |
| **States** | Open/closed via context bar trigger |
| **Dependencies** | `command.tsx`, `performanceWorkspaceNav.ts` |
| **Reusable?** | Yes — extend to global ERP nav |
| **Future modules** | CRM, Finance, HR, Admissions, Compliance |

### `PerformanceRunLifecycleStrip` — `PerformanceRunLifecycleStrip.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Staged workflow: Preview → Lock → Payout |
| **Props** | `stage`, `locked?`, `className?` |
| **States** | Active stage highlight |
| **Dependencies** | Theme tokens |
| **Reusable?** | Yes — Universal |
| **Future modules** | Period close, payroll batches, compliance reviews |

### `PerformanceSetupWizard` — `PerformanceSetupWizard.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | 5-step admin plan setup shell with live preview |
| **Props** | `open`, `onOpenChange`, `fullEditorHref?` |
| **States** | Steps 1–5; disabled continue if plan name empty |
| **Dependencies** | Dialog, `PerformancePeriodContext` |
| **Reusable?** | Yes — Universal wizard pattern |
| **Future modules** | Onboarding wizards, policy setup |

### `PayoutCohortBar` / `BulkActionBar` — `PayoutBulkActionBar.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Filter payout desk by status; bulk approve / mark paid |
| **Props** | Cohort: `cohort`, `counts`, `onChange`; Bulk: `selectedCount`, action callbacks |
| **States** | Disabled when busy or zero selection |
| **Dependencies** | Button |
| **Reusable?** | Yes — Universal |
| **Future modules** | Finance AP batches, HR payroll, bulk approvals |

---

## Commercial components (selected)

### `PerformanceExceptionQueue` — `PerformanceExceptionQueue.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Typed exception rows with priority routing |
| **Props** | `items[]`, `loading?` |
| **States** | Empty → no exceptions message |
| **Dependencies** | Card, Link |
| **Reusable?** | Commercial tier |
| **Future modules** | Commission disputes, Finance exceptions |

### `PerformanceHubContextBar` — `PerformanceHubContextBar.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Period, branch, theme, queue badge, ⌘K |
| **Props** | Shell-level (no page props) |
| **States** | Queue count from hook |
| **Dependencies** | Period context, queue hook, command palette |
| **Reusable?** | Commercial tier |
| **Future modules** | Commission hub shell |

---

## Performance-only components (selected)

### `PerformanceDashboardHero` — `PerformanceDashboardHero.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Dashboard Q1 — hero achievement metric |
| **Props** | `period`, `achievementPct`, `assignedTarget`, `revenueAchieved`, `revenueCurrency`, `eventCount?`, `loading?` |
| **States** | No target, loading, band display |
| **Dependencies** | StatusBar, StatusBadge |
| **Reusable?** | Performance only (generalize later) |
| **Future modules** | Pattern for role dashboards |

### `RankSummaryCard` — `RankSummaryCard.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Dashboard Q2 — rank of N summary |
| **Props** | `entries`, `yourRank`, `totalRanked`, `period`, `currency`, `loading?` |
| **States** | Empty leaderboard |
| **Dependencies** | Achievement formatting |
| **Reusable?** | Performance only |
| **Future modules** | Admissions counselor rankings |

### `MilestoneCard` — `MilestoneCard.tsx`

| Field | Detail |
|-------|--------|
| **Purpose** | Dashboard Q6 — target gap path |
| **Props** | `period`, `achievementPct`, `assignedTarget`, `achievedAmount`, `currency`, `loading?` |
| **States** | No target |
| **Dependencies** | StatusBar |
| **Reusable?** | Performance only |
| **Future modules** | HR milestone tracking |

---

## Entry points — TraceGraph

| Page | Entry label |
|------|-------------|
| `PerformanceHome` | My performance · {period} |
| `PerformanceRevenueAnalytics` | Net revenue · {period} |

---

*Remaining components will be appended at v1 freeze. Do not duplicate — extend this file.*
