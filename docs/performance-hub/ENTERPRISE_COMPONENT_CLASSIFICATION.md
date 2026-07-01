# Enterprise Component Classification — Performance Hub

**Status:** Living document (Agent 2)  
**Purpose:** Categorize reusable assets for ERP modernization — not just list them.  
**Final form:** `PERFORMANCE_COMPONENT_LIBRARY.md` at build completion (props, states, dependencies).

---

## Universal

Can be used in **any** FLEOS module (CRM, Finance, HR, Admissions, Compliance, Performance).

| Component / primitive | Location | Purpose |
|----------------------|----------|---------|
| `band()` | `src/lib/performanceHubTheme.ts` | Frozen five-band achievement scale |
| `StatusBar` | `PerformanceAchievementStatus.tsx` | Progress fill by achievement band |
| `StatusDot` | `PerformanceAchievementStatus.tsx` | 9px achievement indicator |
| `StatusBadge` | `PerformanceAchievementStatus.tsx` | Pill: band + label (not CRM lead badge) |
| `TraceGraph` | `TraceGraph.tsx` | Read-only bidirectional lineage spine |
| `PerformanceHubCommandPalette` | `PerformanceHubCommandPalette.tsx` | ⌘K route jump (extend to global ERP later) |
| `PerformanceRunLifecycleStrip` | `PerformanceRunLifecycleStrip.tsx` | Staged workflow Preview → Lock → Payout |
| `PerformanceSetupWizard` | `PerformanceSetupWizard.tsx` | Multi-step admin wizard shell |
| `PayoutCohortBar` | `PayoutBulkActionBar.tsx` | Filter desk rows by status cohort |
| `BulkActionBar` | `PayoutBulkActionBar.tsx` | Bulk approve / mark paid on selected rows |

**Migration note:** Command palette route source should eventually move to a shared `erpNavigation.ts`; achievement scale may apply to HR targets and Admissions conversion KPIs.

---

## Commercial

Shared by **Performance**, **Commission**, **Wallet**, **Incentives**, **Offers** — commercial operating layer.

| Component | Location | Purpose |
|-----------|----------|---------|
| `PerformanceHubContextBar` | `PerformanceHubContextBar.tsx` | Period + branch + theme + queue + ⌘K |
| `PerformanceHubQueueBadge` | `PerformanceHubQueueBadge.tsx` | Exception count → command center |
| `PerformancePeriodBar` | `PerformancePeriodBar.tsx` | Period/branch selector (context bar only on hub paths) |
| `PerformanceHubHeader` | `PerformanceHubHeader.tsx` | Module title + primary action |
| `PerformanceMetricCard` | `PerformanceMetricCard.tsx` | Instrument-accent KPI (cash/wallet/offer) |
| `PerformanceMoneyRail` | `PerformanceMoneyRail.tsx` | Three-instrument money flow |
| `PerformanceExceptionQueue` | `PerformanceExceptionQueue.tsx` | Typed exception rows with routing |
| `NextActionsCard` | `NextActionsCard.tsx` | Routed best moves |
| `PendingListCard` | `PendingListCard.tsx` | In-flight items |
| `ReportIndex` | `ReportIndex.tsx` | Reports grouped by intent |
| `PerformanceApprovalQueueTable` | existing | Approval desk table |
| `PerformanceApprovalStageStrip` | existing | Approval stage filter |
| `ServiceOffersConvergenceBanner` | existing | Dual offer system convergence UX |

**Commission integration (deferred):** `PerformanceCommissionLedgerTable` displays only until Commission Module frozen.

---

## Performance only

Specific to **achievement**, **milestones**, **rankings**, **incentive/wallet** counselor experience.

| Component | Location | Purpose |
|-----------|----------|---------|
| `PerformanceDashboardHero` | `PerformanceDashboardHero.tsx` | Dashboard Q1 — hero achievement |
| `RankSummaryCard` | `RankSummaryCard.tsx` | Dashboard Q2 — rank of N summary |
| `MilestoneCard` | `MilestoneCard.tsx` | Dashboard Q6 — target gap path |
| `PerformanceHomeKpiStrip` | existing | Legacy equal-weight strip (superseded on home) |
| `PerformanceWalletAllocationCard` | existing | Wallet spend runway |
| `PerformanceIncentiveProgressCard` | existing | Cash incentive progress |
| `PerformanceTelecallerHome` | existing | Telecaller role variant |
| `PerformanceExecutiveKpiStrip` | existing | Firm-wide KPI strip (executive/finance) |
| `PerformanceExecutiveLeaderboards` | existing | Full leaderboard (Reports tier only) |
| `PerformanceIncentivePlansTable` | existing | Plans CMS |
| `PerformancePromotionWorkflowStrip` | existing | MarCom promotion pipeline |

---

## Classification rules (for future components)

1. If it references **achievement %**, **wallet unlock**, or **incentive run** → Performance only until generalized.  
2. If it references **period + commercial instruments** → Commercial.  
3. If it has **no domain nouns** (status, trace, wizard, lifecycle, palette) → Universal.  
4. When generalizing: **EXTEND** with props; do not fork — log in `IMPLEMENTATION_DECISIONS.md`.

---

## Reuse roadmap by module

| Module | Start with |
|--------|------------|
| CRM | Command palette, TraceGraph, ExceptionQueue |
| Finance | RunLifecycleStrip, ReportIndex, BulkActionBar |
| HR | StatusBadge, DashboardHero pattern, MilestoneCard |
| Admissions | StatusBar, RankSummaryCard, NextActionsCard |
| Compliance | TraceGraph, PendingListCard, ApprovalQueueTable |
| Commission | Commercial tier + TraceGraph (read-only claims spine) |

---

*Updated each implementation session. Full props/states in `PERFORMANCE_COMPONENT_LIBRARY.md` at v1 freeze.*
