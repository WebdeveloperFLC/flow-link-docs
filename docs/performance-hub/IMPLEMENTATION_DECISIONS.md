# Performance Hub — Implementation Decisions Log

**Purpose:** Engineering decisions only — not architecture, not UX.  
**Companion:** `PERFORMANCE_HUB_BUILD_STATUS.md` · `V2_BACKLOG.md`  
**Final deliverable:** Included in Performance Hub Build Report at completion.

---

## 2026-06-30 — View As removeChild crash fix (EXTEND)

**Issue:** `NotFoundError: removeChild` on Performance Hub startup (FIN-R-001 class).

**Cause:** Radix Select portals nested inside Popover + Tooltip; auth sync loop on mount.

**Fix:** Native `<select>` in View As panel; remove Tooltip nesting; defer hydrate/auth sync via `requestAnimationFrame`; lift `PerformanceHubViewAsProvider` to wrap full AppLayout.

---

## 2026-07-01 — Performance Hub View As preview (CREATE)

**Components:** `PerformanceHubViewAsPanel.tsx`, `PerformanceHubViewAsContext.tsx`, `performanceHubViewAs.ts`

**Existing asset:** HR Payroll `RoleViewSwitcher` + `roleViewAs.ts` (REUSE)

**Decision:** CREATE hub-scoped View As with Role + Branch + User; EXTEND AuthContext `setViewAsRole` only while on hub paths; EXTEND period context via preview bridge for branch.

**Reason:** UAT/QA preview without logout. Preview layer only — no auth/DB/audit changes. Replaces icon-only hub RoleViewSwitcher.

**Visibility:** `canUsePerformanceHubViewAs` — platform owner + administrators only.

---

**Deliverables:** `PERFORMANCE_HUB_BUILD_REPORT.md`, completed `PERFORMANCE_COMPONENT_LIBRARY.md`, frozen `PERFORMANCE_HUB_BUILD_STATUS.md`.

**Code (final session):** TraceGraph on `PerformanceWallets`, `PerformanceIncentiveLedger`.

**Decision:** No further v1 feature work. UAT → stabilization sprint → freeze.

**Ready for UAT:** YES (deployment gates in build report §6).

---

## 2026-07-01 — Enterprise component classification (CREATE)

**File:** `docs/performance-hub/ENTERPRISE_COMPONENT_CLASSIFICATION.md`

**Decision:** CREATE living classification doc — Universal / Commercial / Performance Only.

**Reason:** Owner directive — categorize reusable assets for ERP modernization, not just list them. Full props catalog deferred to `PERFORMANCE_COMPONENT_LIBRARY.md` at v1 freeze.

---

## 2026-07-01 — SetupWizard shell (CREATE)

**Component:** `PerformanceSetupWizard.tsx`

**Decision:** CREATE 5-step wizard shell; final step links to existing `/incentives/plans` editor (REUSE).

**Reason:** Bible §12 — configuration easier than operation; no new engine logic or plan persistence in wizard.

**Wired on:** `PerformanceIncentivePlans`, `PerformanceConfiguration`.

---

## 2026-07-01 — Payout cohort + bulk bar (CREATE)

**Component:** `PayoutBulkActionBar.tsx` (`PayoutCohortBar`, `BulkActionBar`)

**Decision:** CREATE; wire on `IncentivePayoutDesk.tsx` with batch Supabase update.

**Reason:** Bible §6.5 — bulk payout desk processing by cohort.

---

## 2026-07-01 — PH-R-006 / PH-R-007 role gates (EXTEND)

**Pages:** `PerformanceApprovals`, `PerformanceApprovalsCms`, `PerformancePromotionRequests`, `PerformancePromotionRequestCard`

**Decision:** EXTEND read-only access for `viewer` role on approvals; split `canReview` (manager/admin) from `canPublish` (MarCom offers edit).

**Reason:** Director/viewer read-only queue visibility; MarCom publishes approved promotions without approve/decline rights.

---

## 2026-07-01 — TraceGraph dashboard entry (EXTEND)

**Page:** `PerformanceHome.tsx`

**Decision:** EXTEND TraceGraph on counselor home — revenue → target → incentive spine.

**Reason:** Bible §3.4 — more entry points from dashboard KPI drill-through.

---

## 2026-07-01 — Command palette (CREATE)

**Component:** `PerformanceHubCommandPalette.tsx`

**Existing asset:** `src/components/ui/command.tsx` (shadcn/cmdk)

**Decision:** CREATE hub-specific palette; EXTEND shadcn CommandDialog.

**Reason:** Bible §2.1 / §13 — ⌘K accelerates navigation across 40+ routes. Route list sourced from `performanceWorkspaceNav.ts` (REUSE), not hand-maintained.

---

## 2026-07-01 — TraceGraph (CREATE)

**Component:** `TraceGraph.tsx`

**Decision:** CREATE read-only lineage component; wire first on Revenue Analytics.

**Reason:** Bible §3.4 / §6.8 — every figure traceable; UI displays rules, never recalculates.

---

## 2026-07-01 — Leaderboards tier move (EXTEND)

**Pages:** `PerformanceExecutive.tsx` → link only; `PerformanceComparison.tsx` → full `PerformanceExecutiveLeaderboards`

**Decision:** EXTEND comparison page; REMOVE leaderboard table from executive dashboard.

**Reason:** Bible §11 — leaderboards belong in Reports tier, not dashboard.

---

## 2026-07-01 — Hub queue badge (CREATE)

**Component:** `PerformanceHubQueueBadge.tsx` on context bar

**Decision:** CREATE; REUSE `usePerformanceQueueCounts`.

**Reason:** Gap Analysis Phase 8 — exceptions visible without hunting command center.

---

## 2026-07-01 — Give Discount unlock bar (EXTEND)

**Page:** `GiveDiscount.tsx`

**Decision:** EXTEND with `StatusBar` showing unlocked/potential narrative.

**Reason:** Gaps doc §5.2 — "₹X unlocked of ₹Y potential" with achievement band.

---

## 2026-07-01 — Achievement status primitives (CREATE)

**Components:** `StatusBar`, `StatusDot`, `StatusBadge` in `src/components/performance/PerformanceAchievementStatus.tsx`

**Existing asset considered:** `src/components/ui/status-badge.tsx` (CRM lead statuses: hot/warm/cold)

**Decision:** CREATE Performance-specific achievement status primitives.

**Reason:** CRM `StatusBadge` maps **workflow/lead states**. Performance Hub requires the **frozen five-band achievement scale** (red → gold) driven by `band(pct)` in `performanceHubTheme.ts`. Mixing the two would break Bible §4 and accessibility rules (achievement % must map to one color everywhere).

**Approved:** Yes — Bible §6.3 prescriptive.

---

## 2026-07-01 — Period selector deduplication (EXTEND)

**Component:** `PerformancePeriodBar.tsx`

**Existing asset:** Context bar already renders `PerformancePeriodBar` via `PerformanceHubContextBar`.

**Decision:** EXTEND `PerformancePeriodBar` with `inContextBar` prop; page-level instances return `null` on hub paths (`isPerformanceHubPath`).

**Reason:** Bible §5 — period + scope live **only** in the context bar. Duplicates on `/performance` and `/incentives/*` were a documented defect (UI analysis).

**Approved:** Yes — no route or API changes.

---

## 2026-07-01 — Dashboard six-question layout (EXTEND + CREATE)

**Page:** `PerformanceHome.tsx`

**Existing assets:** `PerformanceHomeKpiStrip`, `PerformanceWalletAllocationCard`, `PerformanceIncentiveProgressCard`, leaderboard list inline

**Decision:** CREATE six Bible §6.2 components; EXTEND home page layout; REMOVE inline leaderboard and revenue-mix cards from dashboard tier.

**Reason:** Bible §10 — dashboard answers six questions only. Leaderboard detail belongs in Reports (`/performance/compare`). Revenue mix belongs in `/performance/analytics`.

**Approved:** Yes — tier discipline, not redesign.

---

## 2026-07-01 — Run lifecycle strip (CREATE)

**Component:** `PerformanceRunLifecycleStrip.tsx`

**Existing asset:** Inline workflow `<ol>` in `PerformanceCommandCenter.tsx`

**Decision:** CREATE shared strip component; wire command center first; reuse on `/incentives/admin` in a later phase.

**Reason:** Bible §6.5 and §13 — Preview → Calculate → Lock → Payout must be staged inline, not buried in link grids.

**Approved:** Yes.

---

## 2026-07-01 — Report index (CREATE)

**Component:** `ReportIndex.tsx` on `/performance/reports`

**Existing asset:** Report builder page only; analytics reached via sub-nav.

**Decision:** CREATE intent-grouped report index above existing builder.

**Reason:** Bible §11 — reports organized by intent, not a flat dump.

**Approved:** Yes — builder logic unchanged (`reportBuilderCmsLogic.ts`).

---

## 2026-07-01 — V2 backlog file (CREATE)

**File:** `V2_BACKLOG.md` (repo root)

**Decision:** All post-v1 ideas go here; never interrupt v1 build.

**Reason:** Owner directive — prevent scope creep during stabilization.

**Approved:** Yes.

---

## 2026-07-01 — Protected modules (POLICY)

**Not modified:** CRM pages, `commission-module-handoff/`, Accounting, Supabase migrations, `incentiveEngineLogic.ts`, `walletEngineLogic.ts`, Commission engine.

**Decision:** Performance Hub consumes via existing hooks/RPCs and interfaces only until Commission Module is frozen.

**Reason:** Gap Analysis + Agent 2 constitution — build on ERP, do not rewrite engines.

**Approved:** Yes.

---

*Add new entries at the top. One decision per heading. Include date, assets considered, decision (REUSE/EXTEND/CREATE), reason, approval.*
