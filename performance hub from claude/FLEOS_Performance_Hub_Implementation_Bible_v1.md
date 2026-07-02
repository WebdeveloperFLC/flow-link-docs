# FLEOS Performance Hub — Developer Implementation Bible

**Version:** 1.0
**Status:** Official engineering specification. Design is frozen.
**Audience:** Engineering (including AI pair-programmers such as Cursor).
**Scope:** The Performance Hub module only. This is the reference implementation for future FLEOS modernization.

---

## How to use this document

This Bible is **prescriptive**. It tells you what to build, not what to decide. Every UX decision is already made and recorded here. If something is ambiguous, the correct action is to **match the nearest documented pattern**, not to invent one.

Three rules govern every line of implementation:

1. **Do not redesign.** Build exactly what is specified. New ideas go to §18 (Future Enhancements v2), never into v1.
2. **Preserve existing investment.** This module drops into a live ERP. Preserve existing business logic, workflows, routes, APIs, and database structures. The UX evolves; the backend does not get rewritten.
3. **The engine calculates; the UI displays.** No screen performs business math. The UI fetches verified data and presents it for review and approval.

---

## Table of contents

1. Design Constitution
2. UI Standards
3. UX Standards
4. Color Rules
5. Navigation Architecture
6. Component Library
7. Screen Catalogue
8. Route Catalogue
9. Role Matrix
10. Dashboard Rules
11. Reports Rules
12. Admin Rules
13. Interaction Rules
14. State Management Expectations
15. Accessibility Standards
16. Responsive Standards
17. Animation Standards
18. Future Enhancements (v2)
19. Implementation Order
20. QA Checklist

---

## 1. Design Constitution

The Performance Hub is an **Enterprise Commercial Operating System**, not a reporting tool. Its purpose is to help users make better decisions in less time. Power lives in the backend; simplicity lives in the frontend; the user never feels the complexity of the engine.

### 1.1 The three tiers

| Tier | Holds | Feels |
|------|-------|-------|
| **Dashboard** | Daily decisions only | Extremely simple |
| **Reports** | All analytical depth | Powerful, opened on purpose |
| **Engine** | All calculations & rules | Invisible to end users |
| **Admin Console** | Module configuration | Wizard-driven, easier than operation |

### 1.2 The four homes (never cross over)

- **Decision-making** lives on the **Dashboard**.
- **Analysis** lives in **Reports**.
- **Configuration** lives in **Admin**.
- **Business rules** live in the **Engine**.

A screen that does two of these jobs is a defect. Split it.

### 1.3 Frozen architectural rules (must be respected, never re-implemented)

These are constitutional. The UI communicates them; it never recalculates or overrides them.

1. **Three instruments stay separate:** cash incentive, counselor discount wallet, and client offers are distinct ledgers. Never merge them in copy, layout, or color.
2. **Period-first.** A global period (`YYYY-MM` or intake) and branch/scope filter are hub context. Never remove or hide them without replacement.
3. **Eight workspaces** (see §5). Do not invent a ninth top-level module.
4. **Role gates are real.** Counselor, manager, director, viewer, commission_admin, administrator see different links (see §9). Respect `performanceWorkspaceNav.ts`.
5. **Run lifecycle is fixed:** Preview → Calculate → Lock → Payout. Never reorder or skip.
6. **Customer Ownership is frozen.** No UX may imply a counselor or manager can override settlement eligibility without workflow.
7. **Module ownership.** The Performance Hub reads finance/GL data but does not own HR payroll or the accounting GL.
8. **Revenue recognition is frozen:** receipt/invoice is the single source of truth; tax is set by the issuing legal entity and excluded before performance; performance uses **net recognized revenue**; FX converts via the approved Currency Master and **locks at period close**.

### 1.4 The one-line test

Before writing any screen, card, or feature, ask: *Does this make FLEOS easier to learn, operate, and manage than every competing ERP while preserving full enterprise capability?* If no, it does not belong in v1.

---

## 2. UI Standards

### 2.1 Shell (identical on every screen)

- **Context bar** (top, dark `--topbar #101A2E`): product mark, module name, global search / command palette (⌘K), period + scope selector, role badge where relevant, theme toggle. Component: `PerformanceHubContextBar` + `PerformanceHubHeader`.
- **Workspace rail** (left, ~56px): the eight workspaces as icons; one active. Role-gated. Component: derived from `PERFORMANCE_WORKSPACE_SIDEBAR`.
- **Main pane:** follows the Scan → Decide → Act spine (see §3.1).

### 2.2 Typography

- Display/headings: **Sora**, weight 500. h1 22px, h2 18px, h3 16px.
- Body/UI: **Manrope** (or system sans fallback), weight 400; 500 for emphasis. Body 13–14px, labels 11–12px, never below 11px.
- Numbers always use `font-variant-numeric: tabular-nums`.
- Sentence case everywhere. Never Title Case, never ALL CAPS (except short uppercased section eyebrows at 11px with letter-spacing).

### 2.3 Spacing, grid, shape

- 8px spacing rhythm. Card padding 14–18px. Section gaps 12–16px.
- Border radius: cards `12–14px`, controls `8–9px`, pills `99px`. Corner radius tokens: md 8px, lg 12px.
- Borders: `0.5px solid var(--line)`. Thin, refined — never 1–2px.
- One hero region per route. Never two competing focal points.

### 2.4 Module instrument colors (frozen tokens)

From `performanceHubTokens.ts`. These identify the **instrument**, not achievement status (see §4 for the separate achievement scale).

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `cash` / `cashBg` / `cashTxt` | `#0E8F62` / `#E9F6F0` / `#0B5F42` | `#2BBE8A` / `#10271E` / `#7FD9B4` | Cash incentive |
| `wallet` / `walletBg` / `walletTxt` | `#C97A06` / `#FCF3E3` / `#7A5104` | `#E09A2D` / `#2A2110` / `#E8C07A` | Discount wallet |
| `offer` / `offerBg` / `offerTxt` | `#C0392B` / `#FBEDEA` / `#7A2A20` | `#E2604F` / `#2C1512` / `#F2A092` | Offers |
| `blue` / `blueBg` | `#1257D6` / `#EDF2FD` | `#5B8DEF` / `#16243F` | Primary / neutral action |

Instrument color is used as a **left-border accent or label signal**; card bodies stay neutral. Light/dark switch via `data-theme` and the token set in `lib__performanceHubTheme.ts` / `performance-hub-theme.css`.

---

## 3. UX Standards

### 3.1 The Scan → Decide → Act spine

Every workspace main pane is structured top to bottom:

1. **Scan — "what happened?"** One hero truth for this role, with business narrative and achievement status color. Never a wall of equal tiles.
2. **Decide — "what needs my attention, and why?"** The exception queue: typed, ranked, each row one-tap to its real destination. Queues appear **before** charts.
3. **Act — "what should I do next?"** Best next actions plus the module's full-power tools, ≤3 clicks deep.

### 3.2 Decision-first, exception-first

KPIs carry a "so what" business explanation, never a bare number. Exceptions (approvals, unclassified payments, run-not-locked, expiring items) are surfaced without hunting.

### 3.3 Auto-fetch & review-not-calculate (frozen)

- Users never manually calculate or re-enter data that already exists.
- Fetch from verified records: receipts, commissions, client allocations, directory, CRM.
- The engine performs revenue recognition, tax exclusion, currency conversion, achievement and incentive math.
- **Period-bound:** only records within the selected period are eligible. Never include prior-period receipts.
- Show verified data only; the user reviews and approves.
- Label auto-derived values (`auto-fetched`, `auto-calculated`).

### 3.4 Drill-down (frozen)

Every number drills to its source, and back — a **bidirectional trace graph**, not a one-way drill. Spine: Achievement → Client Contribution → Client → Invoice → Receipt → Ledger → Audit. Lateral branches (tax, FX, wallet impact) stay visually separate where the business rule keeps them separate. Each node shows its governing rule. Clicking a dashboard number opens the trace/report — it does not expand inline on the dashboard.

---

## 4. Color Rules

### 4.1 The universal achievement scale (FROZEN — never extend)

One status scale, identical across dashboards, reports, leaderboards, branch/team/executive comparisons, and historical trends.

| Color | Meaning | Band | Light hex | Dark hex |
|-------|---------|------|-----------|----------|
| 🔴 Red | Far from target / danger | below 50% | `#C0392B` | `#E2604F` |
| 🟣 Purple | Progressing | 50–74% | `#6D4AC9` | `#9C7DF0` |
| 🔵 Blue | Close to target | 75–99% | `#1257D6` | `#5B8DEF` |
| 🟢 Green | Target achieved | 100–119% | `#0E8F62` | `#2BBE8A` |
| 🟡 Gold | Over-achieved | 120%+ | `#C98A06` | `#E0A92D` |

### 4.2 Color rules

- **Color is always paired with a number or label.** Never the only signal (accessibility).
- The same percentage is the same color everywhere. 78% is blue on the dashboard, in a report, on a leaderboard.
- Renderings: `StatusBar` (fill), `StatusDot` (9px circle), `StatusBadge` (pill). All three read from the same band function.
- **Do not confuse** the achievement scale (red→gold) with the instrument colors (cash/wallet/offer in §2.4). They coexist and never substitute for each other.

### 4.3 Band function (single source)

```
band(pct):
  pct < 50   → red    "Danger"
  pct < 75   → purple "Progressing"
  pct < 100  → blue   "Close"
  pct < 120  → green  "Achieved"
  else       → gold   "Over-achieved"
```

Implement once; import everywhere. No screen reimplements thresholds.

---

## 5. Navigation Architecture

### 5.1 The eight workspaces (frozen)

Source of truth: `PERFORMANCE_WORKSPACE_SIDEBAR` in `performanceWorkspaceNav.ts`.

| Workspace id | Default route | Label | Visible to |
|--------------|---------------|-------|------------|
| `dashboard` | `/performance` | Dashboard | all |
| `discounts-wallets` | `/performance/wallets` | Discounts & Wallets | all |
| `offers-promotions` | `/performance/offers` | Offers & Promotions | manager, admin, administrator, counselor, director, viewer |
| `incentives-payouts` | `/performance/incentives/payouts` | Incentives & Payouts | manager, admin, administrator, director, viewer, commission_admin |
| `teams-performance` | `/performance/team` | Teams & Performance | manager, admin, administrator, director, viewer |
| `analytics-reports` | `/performance/analytics` | Analytics & Reports | manager, admin, administrator, director, viewer |
| `finance-profitability` | `/performance/finance` | Finance & Profitability | director, viewer, manager, commission_admin |
| `administration` | `/performance/configuration` | Administration | manager, administrator, director, viewer |

### 5.2 Navigation behavior

- Active-workspace highlight is computed by `isPathInWorkspace(pathname, id)`. Use it verbatim — do not re-derive prefix matching.
- Sub-links per workspace come from `PERFORMANCE_WORKSPACE_SUB_LINKS`, filtered by `visibleWorkspaceSubLinks(id, ctx)`.
- **Counselor reduction:** links flagged `hideFromCounselor` are hidden from counselor-only users. Links with `adminOnly` require `ctx.isAdmin`. Links with `roles` require `ctx.hasRole(roles)`.
- **Offers studio** renders its own tab bar; suppress the duplicate workspace nav where `usesOffersStudioNav(pathname)` returns true. Counselors default to `/performance/offers/requests` via `offersWorkspaceDefaultRoute(ctx)`.
- Command palette (⌘K) is global and routes to any screen in §7. Never a substitute for the rail; an accelerator on top of it.
- Period + scope selectors live **only** in the context bar. No duplicate period selectors anywhere (this was a known defect — do not reintroduce).
## 6. Component Library

Build from these components. New screens compose existing components; they do not invent new patterns. Names match the package where one exists; new shared primitives are marked **(new)**.

### 6.1 Shell & navigation

| Component | Responsibility |
|-----------|----------------|
| `PerformanceHubContextBar` | Top context bar: search/⌘K, period, scope, theme toggle |
| `PerformanceHubHeader` | Module title + breadcrumb region |
| `PerformancePeriodBar` | Period (`YYYY-MM` / intake) selector — context only, never duplicated |
| `PerformanceLegacyDeskNav` / workspace rail | Left rail from `PERFORMANCE_WORKSPACE_SIDEBAR` |
| `PerformanceMobileQuickBar` | Bottom quick-action bar on mobile |

### 6.2 Dashboard (the six questions)

| Component | Question answered |
|-----------|-------------------|
| `PerformanceMetricCard` / `PerformanceHomeKpiStrip` | How am I performing (hero + status color + trace entry) |
| `RankSummaryCard` **(new)** | Where do I rank (rank of N, ahead/behind, distance) |
| `PerformanceExceptionQueue` **(new)** | What needs my attention (typed, ranked, routed rows) |
| `NextActionsCard` **(new)** | What should I do today (routed best moves) |
| `PendingListCard` **(new)** | What is pending |
| `MilestoneCard` **(new)** | What is my next milestone (target + gap + path) |
| `PerformanceIncentiveProgressCard` | Achievement-to-unlock progress instrument |
| `PerformanceMoneyRail` | The three separated instruments (cash/wallet/offer) |

### 6.3 Status primitives (the frozen color scale)

| Component | Rendering |
|-----------|-----------|
| `StatusBar` **(new)** | Progress fill colored by band |
| `StatusDot` **(new)** | 9px circle colored by band |
| `StatusBadge` **(new)** | Pill: dot + label, band-colored |

All three call the §4.3 band function. No screen reimplements thresholds.

### 6.4 Reports

| Component | Use |
|-----------|-----|
| `ReportIndex` **(new)** | Reports home, grouped by intent |
| `PerformanceReportBuilderConfig` | Report builder configuration |
| `PerformanceReportPreviewTable` | Report preview/table |
| `PerformanceComparisonVsGrid` / `PerformanceComparisonModeStrip` / `PerformanceComparisonTrendOverlay` | Comparison reports |
| `PerformanceBranchTeamTable` | Branch/team comparison table (color-coded, traceable) |
| `PerformanceExecutiveLeaderboards` | Leaderboards (Reports only, never dashboard) |
| `PerformanceRevenueServiceTable` / `PerformanceCurrencyMixPanel` | Revenue mix, currency mix |
| `PerformanceAuditTimeline` / `PerformanceAuditTypePanel` | Audit trail |

### 6.5 Incentives & payouts

| Component | Use |
|-----------|-----|
| `RunLifecycleStrip` **(new)** | Preview → Calculate → Lock → Payout strip |
| `PerformanceIncentiveLedgerTable` / `PerformanceCommissionLedgerTable` | Ledger & liability |
| `PerformanceIncentiveLiabilityForecast` | Liability forecast |
| `PerformanceApprovalQueueTable` / `PerformanceApprovalStageStrip` | Approvals |
| `PerformanceIncentivePlansTable` / `PerformanceIncentiveBaseRulesPanel` / `PerformanceIncentiveStructurePanel` | Plans & rules |
| `PerformanceIncentivePayoutConfigPanel` | Payout config (TDS, schedule) |
| `BulkActionBar` / `PayoutCohortBar` **(new)** | Bulk payout processing by status cohort |

### 6.6 Wallets & offers

| Component | Use |
|-----------|-----|
| `PerformanceMoneyRail` / wallet summary | Wallet balances & runway |
| `PerformanceClientCommercialsTable` / `PerformanceClientCommercialDetail` | Client commercials |
| `PerformanceCombinationCard` / `PerformanceCombinationDetail` | Service combinations |
| `PerformanceOfferManagementTable` / `PerformanceOfferLifecycleStrip` | Offers studio |
| `PerformanceOfferCodesTable` / `PerformanceOfferCodesGeneratePanel` / `PerformanceNewOfferCodeDialog` | Offer codes |
| `PerformancePromotionRequestCard` / `PerformancePromotionWorkflowStrip` | Promotion requests (counselor path) |
| `PerformanceOfferEligibilityTable` / `PerformanceOfferConflictPanel` | Eligibility & conflicts |

### 6.7 Finance, currency, configuration

| Component | Use |
|-----------|-----|
| `PerformanceProfitabilityMatrix` | Profitability |
| `PerformanceCurrencyConfigTable` / `PerformanceFxHistoryPanel` | FX config & history (read; locks at close) |
| `PerformanceConfigurationPanels` / `PerformanceConfigurationTileGrid` | Admin configuration |
| `SetupWizard` **(new)** | Admin plan/target/rule wizard (5–6 questions, auto-fill, live preview) |
| `PerformanceCrmEntityGrid` / `PerformanceCrmHealthPanel` | CRM integration |
| `PerformanceArchitecturePanels` / `PerformanceArchitectureScalabilityPanel` | Architecture & API reference |

### 6.8 Trace

| Component | Use |
|-----------|-----|
| `TraceGraph` **(new)** | The universal bidirectional trace; parameterized by entry object + direction. Reads lineage only; never recalculates. |

---

## 7. Screen Catalogue

Each screen lists its tier, primary component(s), and the role gate. Tier legend: **D** dashboard, **R** report, **A** admin, **W** workspace tool.

### Dashboard workspace
- **My performance** (`/performance`) — D — six-question dashboard; `PerformanceMetricCard`, `RankSummaryCard`, `PerformanceExceptionQueue`, `NextActionsCard`, `PendingListCard`, `MilestoneCard`. All roles.
- **Executive overview** (`/performance/executive`) — D — `PerformanceExecutiveKpiStrip`, `PerformanceExecutiveBranchChart`, `PerformanceExecutiveServiceMix`, `PerformanceExecutiveApprovalsPanel`. admin/administrator/director/viewer.
- **Finance overview** (`/performance/finance`) — D — adminOnly.
- **Command center** (`/performance/admin`) — D/W — adminOnly.
- **How it works** (`/performance/how-it-works`) — reference — all.

### Discounts & Wallets workspace
- **My wallets** (`/performance/wallets`) — D/W — all.
- **Give discount** (`/performance/give-discount`) — W — all.
- **Client commercials** (`/performance/client-commercials`) — W — most roles incl. counselor.
- **Branch pool** (`/performance/wallet/branch-pool`) — W — manager/admin; hidden from counselor.
- **Service combinations** (`/performance/combinations`) — W — hidden from counselor.
- **Wallet policy** (`/performance/wallet/policy`) — A — adminOnly.
- **Wallet top-ups** (`/incentives/wallet-topups`) — A — adminOnly.
- **Period close** (`/incentives/period-close`) — A — adminOnly.

### Offers & Promotions workspace
- **Promotion requests** (`/performance/offers/requests`) — W — counselor default landing.
- **Offers studio** (`/performance/offers`) — W — hidden from counselor; renders own tab bar (`usesOffersStudioNav`). Sub-areas: library, codes, eligibility, new, analytics, calendar, segments, automation, journeys, ab-tests, ai-studio.

### Incentives & Payouts workspace
- **Ledger & liability** (`/performance/incentives/payouts`) — W — gated roles.
- **Incentive plans** (`/performance/incentives/plans`) — A — adminOnly.
- **Approvals** (`/performance/approvals`) — W — manager/admin/administrator/director.
- **Payout desk** (`/incentives/payouts`) — W — adminOnly; bulk cohort processing; `pending → approved → paid`.
- **Runs** (`/incentives/admin`) — A/W — adminOnly; Preview → Calculate → Lock → Payout.
- **Plans & rules** (`/incentives/plans`) — A — adminOnly.
- **Competitions** (`/incentives/competitions`) — A — adminOnly.
- **Simulator** (`/incentives/simulator`) — W — adminOnly.

### Teams & Performance workspace
- **Team & branch** (`/performance/team`) — D/W — gated roles.
- **Comparison** (`/performance/compare`) — R — manager+.
- **Unclassified payments** (`/performance/admin/unclassified`) — W — manager/admin.

### Analytics & Reports workspace
- **Revenue analytics** (`/performance/analytics`) — R — gated roles.
- **Report builder** (`/performance/reports`) — R — manager+.

### Finance & Profitability workspace
- **Finance dashboard** (`/performance/finance`) — D — adminOnly.
- **Profitability** (`/performance/profitability`) — R — manager+.
- **Commissions** (`/performance/commissions`) — R — manager+.
- **Multi-currency** (`/performance/multi-currency`) — R — manager+.
- **Currency Master** (`/masters?section=__currencies`) — A — adminOnly (shared ERP master).
- **Performance FX overrides** (`/incentives/fx-rates`) — A — adminOnly.

### Administration workspace
- **Configuration** (`/performance/configuration`) — A — adminOnly.
- **Roles & permissions** (`/performance/roles`) — A — manager+.
- **Audit trail** (`/performance/audit-trail`) — R — manager+.
- **CRM integration** (`/performance/crm-integration`) — A — manager+.
- **Architecture & API** (`/performance/architecture`) — reference — manager+.
- **Legacy approvals desk** (`/performance/admin/approvals`) — W — adminOnly.

---

## 8. Route Catalogue

Routes are **preserved as they exist** in `AppRoutes.tsx` / `performanceWorkspaceNav.ts`. Do not rename routes for visual consistency (migration philosophy). New screens reuse existing routes where practical.

Two route namespaces coexist and must both be supported:
- `/performance/*` — workspace-oriented routes.
- `/incentives/*` — incentive engine routes (runs, payouts, plans, fx-rates, competitions, simulator, wallet-topups, period-close).

Active-workspace mapping for both namespaces is defined by `isPathInWorkspace`. The full list of paths per workspace is enumerated in §5/§7 and in `performanceWorkspaceNav.ts`; treat that file as canonical. Shared ERP masters (e.g. `/masters?section=__currencies`) are external to this module and must not be reimplemented.

---

## 9. Role Matrix

Roles: `counselor`, `manager`, `director`, `viewer`, `commission_admin`, `administrator` (plus `admin`/`isAdmin` super-flag). Visibility is resolved by `isWorkspaceVisible`, `isWorkspaceSidebarVisible`, and `isWorkspaceSubLinkVisible` — use these functions; do not hardcode role checks in components.

| Workspace | counselor | manager | director | viewer | commission_admin | administrator/admin |
|-----------|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Discounts & Wallets | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Offers & Promotions | ✓ (requests only) | ✓ | ✓ | ✓ | – | ✓ |
| Incentives & Payouts | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| Teams & Performance | – | ✓ | ✓ | ✓ | – | ✓ |
| Analytics & Reports | – | ✓ | ✓ | ✓ | – | ✓ |
| Finance & Profitability | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| Administration | – | ✓ | ✓ | ✓ | – | ✓ |

Additional gates:
- **Counselor reduction:** sub-links flagged `hideFromCounselor` are hidden from counselor-only users.
- **adminOnly** sub-links require `ctx.isAdmin`.
- **Director read-only:** director (and viewer) accounts see operational desks (e.g. payout desk) in read-only form. Implement via `lib__performanceDirectorReadOnly.ts`. No write actions render for these roles.
- **Counselor default routes:** Offers → `/performance/offers/requests`.
## 10. Dashboard Rules

The dashboard is a daily workspace, not a report. It answers **exactly six questions** and nothing else:

1. How am I performing? — hero metric, status color, trace entry point.
2. Where do I rank? — rank of N, who's ahead, who's behind, distance to each. Summary only; full leaderboard is a Report.
3. What needs my attention? — exception queue, typed/ranked, each row routed.
4. What should I do today? — 2–3 routed best actions.
5. What is pending? — in-flight items awaiting the user or system.
6. What is my next milestone? — concrete next target and the gap, framed as a path.

**Subject adapts by role** (executive: firm net revenue; manager: branch achievement; counselor: personal achievement), but the six questions are fixed.

**Prohibited on the dashboard:** large tables, charts that require study, analytical drill-in-place, manual data entry, any duplicate of information shown elsewhere, any duplicate period selector.

**Empty states:** explain why empty + a single CTA. Use approved no-target copy from `lib__performanceNoTargetCopy.ts` when a target is unset; do not render a broken hero.

**Every dashboard number is one click from its report/trace.** The dashboard provides the entry point; depth opens elsewhere.

---

## 11. Reports Rules

Reports are the intelligence center. Density is permitted because the user opened it intentionally.

- **Organized by intent** (e.g. "My performance" vs "Compare & investigate"), never one undifferentiated list.
- **Every status colored by the §4 scale** so large tables read at a glance.
- **Every figure traceable** to source via `TraceGraph` — no dead ends.
- **Filters, cross-comparison, export live here** — never on the dashboard.
- **Auto-fetched, verified, period-bound data only**, and the screen says so.

Reports include: complete client/entity detail, revenue analysis, commission analysis, client & institution contribution, receipt & payment history, historical trends, team/branch/institution comparison, rankings/leaderboards, audit trails, advanced filters, exports.

Leaderboards belong in Reports; the dashboard shows only a rank summary (§10 Q2).

---

## 12. Admin Rules

**One principle: configuration must always be easier than operation.**

- **Wizard-driven:** creating a plan/target/rule set is **5–6 plain-language business questions** (`SetupWizard`), not a technical form.
- **Auto-fill** anything the system knows; label it `auto-filled`. The admin reviews; they don't enter.
- **No technical terminology** in user-facing copy.
- **Frozen rules render as guardrails, never editable settings** (e.g. "FX locks at close — you don't set rates here"; status colors "not configurable"; lifecycle "fixed"). The wizard must be unable to produce an invalid configuration.
- **Live preview:** show what the end user will see, assembling as answers are given.

---

## 13. Interaction Rules

- **Run lifecycle actions are staged inline** with plain-language consequences and confirmation. Lock is irreversible and snapshots FX — state this in the confirm dialog. Never link irreversible actions away to a bare secondary route.
- **Bulk + individual:** high-volume desks (payout desk) default to bulk processing by status cohort, with row-level action always available. Flagged/exception rows cannot be bulk-swept.
- **Drill is bidirectional** (§3.4). Chevrons and numbers open `TraceGraph`; breadcrumbs walk back up.
- **Command palette (⌘K)** routes to any screen; never the only path to a screen.
- **One primary action per screen**, visually dominant. Secondary actions are quieter.
- **Confirmation is reserved for irreversible or money-moving actions**; everything else is direct.
- **Cross-module handoffs** (e.g. Admissions → Visa) appear as exception/action rows; modules connect, never merge.

---

## 14. State Management Expectations

- **Server state is the source of truth.** All figures derive from verified backend records via existing APIs. The frontend caches and displays; it never computes business values.
- **Period + scope are global context**, held in a hub-level store and read by every screen. Changing period refetches; it never recalculates client-side.
- **Theme** (`light`/`dark`) is global, persisted, applied via `data-theme` and `lib__themeStore.ts`.
- **Role/permission context** (`isAdmin`, `hasRole`) is provided once and consumed by nav + components via the §5 functions. No component hardcodes roles.
- **Run lifecycle state** (`preview`/`calculated`/`locked`/`paid`) is owned by the backend; the UI reflects it and disables actions that the current state forbids.
- **Optimistic UI** is permitted for non-financial toggles (filters, selection). Financial state changes (approve, mark paid, lock) wait for server confirmation.
- **Preserve existing APIs and data shapes.** Map new UI to existing endpoints; do not require schema changes for visual goals.

---

## 15. Accessibility Standards

- **Color is never the only signal.** Every status pairs color with a number or text label (§4.2).
- Contrast: text on colored fills uses the matching dark `…Txt` token; meets WCAG AA.
- All interactive elements are keyboard reachable; visible focus rings; logical tab order.
- Icon-only buttons carry `aria-label`; decorative icons `aria-hidden`.
- Semantic landmarks: `nav`, `main`, `aside`, section `aria-label`s.
- Tables use proper header semantics; status cells are labeled, not color-only.
- Respect `prefers-reduced-motion` (§17).
- Minimum font size 11px; body 13–14px.

---

## 16. Responsive Standards

- **Desktop-first**, but every screen degrades to tablet and mobile.
- **Mobile (~390px):** single column; the six dashboard questions stack in priority order (attention and today first); `PerformanceMobileQuickBar` provides primary actions one-handed at the bottom.
- **Heavy admin/lifecycle actions defer to desktop.** On mobile, surface read + light actions; gate irreversible run actions (lock, payout generation) behind a desktop notice rather than rendering them cramped. Use `lib__performanceMobileLayout.ts` for breakpoints/layout.
- **Tablet:** two-column where space allows; rail collapses to icons.
- Tables become card lists or horizontally scrollable with a frozen first column on narrow widths; never nested scroll.

---

## 17. Animation Standards

- Motion communicates state change, never decoration. Transitions ~150–250ms ease.
- Allowed: progress-bar fill transitions, expand/collapse, status changes, lifecycle-step advance, modal in/out.
- Animate only `transform` and `opacity`. No gradients/shadows mid-stream.
- All non-essential motion wrapped in `prefers-reduced-motion: no-preference`.
- No carousels, no auto-advancing content, no motion that blocks interaction.

---

## 18. Future Enhancements (Version 2)

Recorded but **not** part of v1. Do not implement now; do not let these alter v1.

- AI next-best-action suggestions surfaced in the "What should I do today" card.
- Real-time earning ticker (live incentive accrual).
- Payroll API handoff (currently CSV export only).
- Cross-module unified exception inbox spanning CRM/Admissions/Visa/Finance.
- Configurable dashboard card order per user (within the fixed six questions).
- Trace graph saved-paths / shareable deep links.

---

## 19. Implementation Order

Build in dependency order so each phase unblocks the next.

1. **Foundation:** token set + theme (`performance-hub-theme.css`, `lib__performanceHubTheme.ts`), `band()` function, status primitives (`StatusBar/Dot/Badge`), context bar, workspace rail + nav functions.
2. **Trace:** `TraceGraph` (read-only lineage) — unblocks "every number drills".
3. **Dashboard:** the six-question counselor dashboard, then executive/manager variants reusing the same components.
4. **Reports:** `ReportIndex`, then `ComparisonTable`/branch comparison, then the remaining reports (revenue, commission, contribution, audit, trends).
5. **Incentives & Payouts:** run lifecycle strip + runs screen, ledger & liability, payout desk (bulk + states), approvals.
6. **Wallets & Offers:** wallet summary/give-discount, client commercials, offers studio + promotion requests.
7. **Finance & Profitability:** profitability, commissions, multi-currency, FX (read).
8. **Admin:** `SetupWizard`, configuration, roles, audit trail, CRM integration.
9. **Responsive + mobile quick bar**, then accessibility and animation passes.

Throughout: reuse existing routes/APIs; no backend rewrite.

---

## 20. QA Checklist

A screen is done only when all of the following pass.

**Tier discipline**
- [ ] Dashboard answers the six questions and nothing else.
- [ ] No analysis, large table, or study-chart on a dashboard.
- [ ] Reports grouped by intent; filters/export only in Reports.
- [ ] Admin setup is a 5–6-question wizard with auto-fill + live preview.
- [ ] No screen performs business math; all values auto-fetched and verified.

**Frozen rules**
- [ ] Achievement status uses the 5-color scale via the shared `band()`; never extended; always paired with number/label.
- [ ] Cash / wallet / offers never conflated in copy, layout, or color.
- [ ] Period + scope only in the context bar; no duplicate selectors.
- [ ] Run lifecycle Preview → Calculate → Lock → Payout never reordered; lock confirms irreversibility + FX snapshot.
- [ ] Customer-ownership eligibility never bypassable in UX.
- [ ] Revenue is net recognized; tax excluded by issuing entity; period-bound; FX from Currency Master, locked at close.

**Navigation & roles**
- [ ] Workspace highlight uses `isPathInWorkspace`; sub-links filtered by the nav functions.
- [ ] Role gates use the provided functions; no hardcoded role checks in components.
- [ ] Director/viewer see read-only desks; no write actions render.
- [ ] Existing routes/APIs preserved; nothing renamed for visual consistency.

**Trace & drill**
- [ ] Every dashboard number opens its report/trace in one click (not inline expansion).
- [ ] Trace is bidirectional; no dead ends; each node shows its governing rule.

**Cross-cutting**
- [ ] Light + dark both correct via tokens.
- [ ] Keyboard reachable; focus visible; `aria-label`s present; landmarks correct.
- [ ] Responsive to tablet + mobile; heavy admin actions deferred on mobile.
- [ ] Motion only on transform/opacity; respects reduced-motion.
- [ ] No duplicate information, calculation, or data entry anywhere.

---

*End of FLEOS Performance Hub — Developer Implementation Bible v1.0. This document is the permanent Design Constitution for FLEOS Version 1. Changes require a new version; v1 is frozen.*
