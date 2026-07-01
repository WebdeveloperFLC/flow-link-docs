# Performance Hub — Component Library

**Status:** ✅ **COMPLETE** (v1 freeze)  
**Classification:** `ENTERPRISE_COMPONENT_CLASSIFICATION.md`  
**SSOT for props:** Source files in `src/components/performance/`

---

## How to read this document

Each component entry includes: **Purpose**, **Props**, **States**, **Dependencies**, **Reusable?**, **Future modules**.

Tier key: **U** = Universal · **C** = Commercial · **P** = Performance only

---

## Universal components

### `band()` — `src/lib/performanceHubTheme.ts` · **U**

| Field | Detail |
|-------|--------|
| **Purpose** | Map achievement % to frozen five-band scale |
| **Props** | `pct: number \| null` → `{ band, label, cssVar }` |
| **States** | null → no band |
| **Dependencies** | Achievement CSS tokens in `performance-hub-theme.css` |
| **Reusable?** | Yes |
| **Future modules** | HR targets, Admissions conversion, CRM SLA |

### `StatusBar` / `StatusDot` / `StatusBadge` — `PerformanceAchievementStatus.tsx` · **U**

| Field | Detail |
|-------|--------|
| **Purpose** | Visual achievement band indicators |
| **Props** | `pct`, optional `maxPct`, `label` |
| **States** | Loading via parent; no-target via `noTargetAchievementDetail` |
| **Dependencies** | `band()` |
| **Reusable?** | Yes |
| **Future modules** | Any KPI with band thresholds |

### `TraceGraph` — `TraceGraph.tsx` · **U**

| Field | Detail |
|-------|--------|
| **Purpose** | Read-only bidirectional business event lineage |
| **Props** | `entryLabel`, `direction?`, `nodes: TraceGraphNode[]`, `className?` |
| **States** | Empty nodes → placeholder card |
| **Dependencies** | Card, Link |
| **Reusable?** | Yes — hub reads events, does not own them |
| **Future modules** | CRM claim spine, Commission trace, Finance audit |

**TraceGraph entry points (v1):**

| Page | Entry label |
|------|-------------|
| `PerformanceHome` | My performance · {period} |
| `PerformanceRevenueAnalytics` | Net revenue · {period} |
| `PerformanceWallets` | Wallet utilization · {period} |
| `PerformanceIncentiveLedger` | Incentive ledger · {period} |

### `PerformanceHubCommandPalette` — `PerformanceHubCommandPalette.tsx` · **U**

| Field | Detail |
|-------|--------|
| **Purpose** | ⌘K route jump across Performance Hub |
| **Props** | None (context + nav hook) |
| **States** | Open/closed via context bar |
| **Dependencies** | `command.tsx`, `performanceWorkspaceNav.ts` |
| **Reusable?** | Yes — extend to global ERP |
| **Future modules** | CRM, Finance, HR, Admissions, Compliance |

### `PerformanceRunLifecycleStrip` — `PerformanceRunLifecycleStrip.tsx` · **U**

| Field | Detail |
|-------|--------|
| **Purpose** | Staged workflow: Preview → Lock → Payout |
| **Props** | `steps[]`, `className?` |
| **States** | Step complete/blocked/active |
| **Dependencies** | Card, theme tokens |
| **Reusable?** | Yes |
| **Future modules** | Period close, payroll batches |

### `PerformanceSetupWizard` — `PerformanceSetupWizard.tsx` · **U**

| Field | Detail |
|-------|--------|
| **Purpose** | 5-step admin plan setup shell with live preview |
| **Props** | `open`, `onOpenChange`, `fullEditorHref?` |
| **States** | Steps 1–5; continue disabled if plan name empty |
| **Dependencies** | Dialog, `PerformancePeriodContext` |
| **Reusable?** | Yes |
| **Future modules** | Policy onboarding wizards |

### `PayoutCohortBar` / `BulkActionBar` — `PayoutBulkActionBar.tsx` · **U**

| Field | Detail |
|-------|--------|
| **Purpose** | Filter payout desk by status; bulk approve / mark paid |
| **Props** | Cohort: `cohort`, `counts`, `onChange`; Bulk: `selectedCount`, callbacks |
| **States** | Disabled when busy or zero selection |
| **Dependencies** | Button |
| **Reusable?** | Yes |
| **Future modules** | Finance AP batches, HR payroll |

---

## Commercial components

### `PerformanceHubContextBar` — `PerformanceHubContextBar.tsx` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Period, branch, theme toggle, queue badge, ⌘K trigger |
| **Props** | None (shell) |
| **States** | Queue count from `usePerformanceQueueCounts` |
| **Dependencies** | Period context, command palette |
| **Reusable?** | Commercial tier |
| **Future modules** | Commission hub shell |

### `PerformanceHubQueueBadge` — `PerformanceHubQueueBadge.tsx` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Exception count linking to command center |
| **Props** | None |
| **States** | Hidden when count zero or role excluded |
| **Dependencies** | Queue counts hook |
| **Reusable?** | Commercial tier |
| **Future modules** | Global exception indicator |

### `PerformancePeriodBar` — `PerformancePeriodBar.tsx` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Period/branch selector |
| **Props** | `compact?`, `showBranch?`, `inContextBar?`, `className?` |
| **States** | Returns null on hub paths when not in context bar (dedup) |
| **Dependencies** | `PerformancePeriodContext`, `isPerformanceHubPath` |
| **Reusable?** | Commercial tier |
| **Future modules** | Any period-scoped module |

### `PerformanceHubHeader` — `PerformanceHubHeader.tsx` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Module title, subtitle, profile chip, primary action |
| **Props** | `title`, `subtitle?`, `period?`, `profileName?`, `branchName?`, `primaryAction?`, `showModuleLegend?` |
| **States** | Optional module legend strip |
| **Dependencies** | Theme tokens |
| **Reusable?** | Commercial tier |
| **Future modules** | Standard page header pattern |

### `PerformanceMetricCard` / `PerformanceMoneyRail` — `PerformanceMoneyRail.tsx` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Three-instrument KPI rail (cash / wallet / offer) |
| **Props** | `items[]` with `module`, `label`, `value`, `hint` |
| **States** | Loading skeleton via parent |
| **Dependencies** | Card, instrument CSS vars |
| **Reusable?** | Commercial tier |
| **Future modules** | Finance control dashboards |

### `PerformanceExceptionQueue` — `PerformanceExceptionQueue.tsx` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Typed exception rows with priority routing |
| **Props** | `items[]` (`id`, `type`, `label`, `detail`, `to`, `priority`), `loading?` |
| **States** | Empty → no exceptions |
| **Dependencies** | Card, Link |
| **Reusable?** | Commercial tier |
| **Future modules** | Commission disputes |

### `NextActionsCard` / `PendingListCard` — · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Routed best moves / in-flight items |
| **Props** | `actions[]` or `items[]`, `loading?` |
| **States** | Empty states |
| **Dependencies** | Card, Link |
| **Reusable?** | Commercial tier |
| **Future modules** | CRM task queues |

### `ReportIndex` — `ReportIndex.tsx` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Reports grouped by intent (decide / analyze / export) |
| **Props** | Optional `groups` override; defaults from Bible §11 |
| **States** | Static link groups |
| **Dependencies** | Card, Link |
| **Reusable?** | Commercial tier |
| **Future modules** | Finance report hub |

### `PerformanceApprovalQueueTable` / `PerformanceApprovalStageStrip` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Approval desk table + stage filter strip |
| **Props** | `items`, `readOnly`, `busyId`, approve/decline handlers |
| **States** | Read-only for director/viewer |
| **Dependencies** | Table, Badge, hooks |
| **Reusable?** | Commercial tier |
| **Future modules** | Compliance approval workflows |

### `ServiceOffersConvergenceBanner` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Dual offer system convergence messaging |
| **Props** | Context-specific copy |
| **States** | Dismissible |
| **Dependencies** | Alert/banner |
| **Reusable?** | Commercial tier |
| **Future modules** | Offers + service library UX |

### `PerformanceExecutiveKpiStrip` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Multi-KPI strip for executive/finance/CMS pages |
| **Props** | `items[]`, `loading?` |
| **States** | Per-card loading |
| **Dependencies** | Stat card pattern |
| **Reusable?** | Commercial tier |
| **Future modules** | Executive dashboards |

### `PerformanceCommissionLedgerTable` · **C**

| Field | Detail |
|-------|--------|
| **Purpose** | Display-only commission totals (until Commission freeze) |
| **Props** | `rows[]`, `loading?` |
| **States** | Empty ledger |
| **Dependencies** | Table, format helpers |
| **Reusable?** | Commercial tier — **no calculation** |
| **Future modules** | Commission module integration |

---

## Performance-only components

### `PerformanceDashboardHero` · **P**

| Field | Detail |
|-------|--------|
| **Purpose** | Dashboard Q1 — hero achievement |
| **Props** | `period`, `achievementPct`, `assignedTarget`, `revenueAchieved`, `revenueCurrency`, `eventCount?`, `loading?` |
| **States** | No target, loading, band display |
| **Dependencies** | StatusBar, StatusBadge |
| **Reusable?** | Performance only |
| **Future modules** | Role dashboard pattern |

### `RankSummaryCard` · **P**

| Field | Detail |
|-------|--------|
| **Purpose** | Dashboard Q2 — rank of N |
| **Props** | `entries`, `yourRank`, `totalRanked`, `period`, `currency`, `loading?` |
| **States** | Empty leaderboard |
| **Dependencies** | Achievement formatting |
| **Reusable?** | Performance only |

### `MilestoneCard` · **P**

| Field | Detail |
|-------|--------|
| **Purpose** | Dashboard Q6 — target gap path |
| **Props** | `period`, `achievementPct`, `assignedTarget`, `achievedAmount`, `currency`, `loading?` |
| **States** | No target |
| **Dependencies** | StatusBar |
| **Reusable?** | Performance only |

### `PerformanceWalletAllocationCard` / `PerformanceIncentiveProgressCard` · **P**

| Field | Detail |
|-------|--------|
| **Purpose** | Wallet runway + incentive progress on home |
| **Props** | `data: PerformanceHomeData` |
| **States** | No target, locked vs projected |
| **Dependencies** | Home data hook |
| **Reusable?** | Performance only |

### `PerformanceTelecallerHome` · **P**

| Field | Detail |
|-------|--------|
| **Purpose** | Telecaller-only home variant |
| **Props** | `userId`, `profileName`, `branchName` |
| **States** | Role-gated on home page |
| **Dependencies** | Telecaller RPCs |
| **Reusable?** | Performance only |

### `PerformanceExecutiveLeaderboards` · **P**

| Field | Detail |
|-------|--------|
| **Purpose** | Full leaderboard table (Reports tier) |
| **Props** | `rows[]`, `loading?`, title props |
| **States** | Empty |
| **Dependencies** | Table, period context |
| **Reusable?** | Performance only — **not on dashboard** |

### `PerformancePromotionWorkflowStrip` / `PerformancePromotionRequestCard` · **P**

| Field | Detail |
|-------|--------|
| **Purpose** | MarCom promotion pipeline |
| **Props** | Card model, `canReview`, `canPublish`, action callbacks |
| **States** | Status-driven action visibility |
| **Dependencies** | Promotion request logic |
| **Reusable?** | Performance only |

### Wallet CMS suite · **P/C**

| Component | Purpose |
|-----------|---------|
| `PerformanceWalletTable` | Wallet list with counselor column (admin) |
| `PerformanceWalletSummaryStrip` | Allocated / consumed / active / expiring |
| `PerformanceWalletTypeBreakdown` | Pie by budget_kind |
| `PerformanceWalletDialogs` | Detail + new wallet modals |

### Incentive CMS suite · **P/C**

| Component | Purpose |
|-----------|---------|
| `PerformanceIncentivePlansTable` | Plans overview |
| `PerformanceIncentiveLedgerTable` | Per-counselor ledger |
| `PerformanceIncentiveStructurePanel` | Plan structure display |
| `PerformanceIncentiveLiabilityForecast` | Liability forecast chart |

---

## Theme & layout utilities

| Asset | Location | Purpose |
|-------|----------|---------|
| `performance-hub-theme.css` | `src/styles/` | CSS variables, ph-* classes |
| `performanceHubTheme.ts` | `src/lib/` | `formatInr`, `formatAchievementPct`, `band()` |
| `performanceHubTokens.ts` | `src/lib/` | Token maps, `isPerformanceHubPath()` |
| `performanceMobileLayout.ts` | `src/lib/` | Mobile quick bar layout constants |
| Hub shell wrapper | `AppLayout.tsx` | `data-performance-hub` + context bar |

---

## Extension guidelines

1. **REUSE → EXTEND → CREATE** — log in `IMPLEMENTATION_DECISIONS.md`.  
2. Generalize Performance-only components by extracting domain nouns into props.  
3. Never fork TraceGraph or StatusBadge — extend in place.  
4. Command palette routes: add to `performanceWorkspaceNav.ts`, not hardcoded in palette.

---

*v1 freeze — 2026-07-01. Blueprint for shared FLEOS UI library.*
