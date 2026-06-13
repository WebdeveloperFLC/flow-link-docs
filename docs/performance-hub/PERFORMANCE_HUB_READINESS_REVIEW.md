# Performance Hub — Readiness Review (Pre–Team UAT)

**Review date:** 2026-06-12  
**Reviewer:** Automated codebase audit (routes, permissions, RPCs, migrations, widgets, workflows, demo pack)  
**Scope:** Performance Hub (`/performance/*`), linked incentive/offer flows, migrations through **`20260711120001`**, demo pack [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md)

---

## Executive summary

| Verdict | **Conditional go for UAT** — core screens are implemented (no placeholder pages), but **fix or document 4 high-severity defects** and **complete demo seed prerequisites** before human testers start. |

| Severity | Count | UAT impact |
|----------|------:|------------|
| **Critical** | 3 | Blocks demo-driven UAT scenarios unless mitigated |
| **High** | 9 | Test cases fail or produce misleading results |
| **Medium** | 12 | Workarounds exist; document for testers |
| **Low** | 8 | Polish / docs / non-blocking |

**Top blockers before team UAT**

1. Load demo seed **and** optional payment row for unclassified UI (`PH-R-003`).
2. Fix or accept **`budget_kind` filter bug** — Command center / Executive wallet KPIs show **₹0 unlocked** with valid demo wallets (`PH-R-001`).
3. Set hub period to **`2026-06`** and test Give discount in June calendar month, or fix period wiring (`PH-R-002`).
4. Reconcile **director** and **MarCom** UAT cases with actual role gates (`PH-R-006`, `PH-R-007`).
5. Confirm **all migrations 5C→6B** published in target Supabase (split **6B enum** migration first).

---

## 1. Performance Hub menu items

**Source:** `src/components/layout/AppLayout.tsx` (`performanceNav`), `OffersStudioNav.tsx`, `PerformanceCommandCenter.tsx` (`ADMIN_LINKS`, `QUEUE_LINKS`).

### Sidebar (19 items)

| Label | Route | Nav gate | Page guard | Status |
|-------|-------|----------|------------|--------|
| My performance | `/performance` | all | none | OK |
| How it works | `/performance/how-it-works` | all | none | OK |
| Give discount | `/performance/give-discount` | all | none | OK |
| Offers studio | `/performance/offers` | manager, admin, administrator | module + role | OK |
| Promotion requests | `/performance/offers/requests` | all | partial (review buttons role-gated) | See PH-R-007 |
| Team · branch | `/performance/team` | manager, admin, administrator | redirect if unauthorized | OK |
| Branch pool | `/performance/wallet/branch-pool` | manager, admin, administrator | redirect | OK |
| Executive dashboard | `/performance/executive` | admin, administrator, viewer, **director** | redirect | OK |
| Command center | `/performance/admin` | **adminOnly (nav only)** | **none** | See PH-R-008 |
| Discount approvals | `/performance/admin/approvals` | manager, admin, administrator | redirect | See PH-R-006 |
| Unclassified payments | `/performance/admin/unclassified` | manager, admin, administrator | redirect | OK |
| Plans & rules → `/incentives/plans` | adminOnly | varies | OK (legacy shell) |
| Runs → `/incentives/admin` | adminOnly | admin | OK |
| FX rates, Competitions, Simulator, Payout desk, Wallet top-ups, Period close | `/incentives/*` | adminOnly | admin | OK |

### Not in sidebar (reachable elsewhere)

| Route | Reachable from | Issue |
|-------|----------------|-------|
| `/performance/wallet/policy` | Command center, How it works | **Missing from sidebar** — PH-R-011 |
| `/performance/offers/library` … `/ai-studio` | Offers studio tabs | OK |
| `/offers-admin` | Command center “Offers library” | **Wrong destination** — PH-R-004 |

### Offers Studio tabs (11)

Dashboard, Library, Create, Calendar, Segments, Automation, Journeys, Requests, Analytics, A/B tests, AI Studio (conditional) — all routes exist in `App.tsx`. **No stub tabs.**

---

## 2. Routes

**Total `/performance/*` routes:** 22 — all map to real page components. **No “coming soon” placeholders.**

| Route | Component | Implementation |
|-------|-----------|----------------|
| `/performance` | `PerformanceHome.tsx` | Full |
| `/performance/how-it-works` | `PerformanceHowItWorks.tsx` | Static hub map |
| `/performance/give-discount` | `GiveDiscount.tsx` | Full (~978 lines) |
| `/performance/team` | `PerformanceTeam.tsx` | Full |
| `/performance/executive` | `PerformanceExecutive.tsx` | Full |
| `/performance/admin` | `PerformanceCommandCenter.tsx` | Full |
| `/performance/admin/approvals` | `PerformanceApprovals.tsx` | Full |
| `/performance/admin/unclassified` | `PerformanceUnclassifiedPayments.tsx` | Full |
| `/performance/wallet/policy` | `PerformanceWalletPolicy.tsx` | Full |
| `/performance/wallet/branch-pool` | `PerformanceBranchPool.tsx` | Full |
| `/performance/offers` | `PerformanceOffersStudio.tsx` | Full |
| `/performance/offers/library` | `PerformanceOffersLibrary.tsx` | Wrapper → `OffersAdmin` |
| `/performance/offers/new` | `PerformanceOfferWizard.tsx` | Full wizard |
| `/performance/offers/analytics` | `PerformanceOffersAnalytics.tsx` | Wrapper → `OffersAnalytics` |
| `/performance/offers/calendar` | `PerformanceOffersCalendar.tsx` | Full |
| `/performance/offers/segments` | `PerformanceOffersSegments.tsx` | Full |
| `/performance/offers/automation` | `PerformanceOffersAutomation.tsx` | Full (templates) |
| `/performance/offers/journeys` | `PerformanceOffersJourneys.tsx` | Full |
| `/performance/offers/ab-tests` | `PerformanceOffersAbTests.tsx` | Full |
| `/performance/offers/ai-studio` | `PerformanceOfferAiStudio.tsx` | Full (edge fn) |
| `/performance/offers/requests` | `PerformancePromotionRequests.tsx` | Full |

**Linked `/incentives/*` (8 admin routes + legacy aliases):** Full implementations; render **outside** Performance Hub theme shell (`isPerformanceHubPath` = `/performance/*` only) — PH-R-009.

### Broken / misaligned navigation

| ID | Issue | Severity |
|----|-------|----------|
| PH-R-004 | **`/offers-admin` duplicate route** — first match in `App.tsx` renders legacy `OffersAdmin`; redirect to `/performance/offers/library` is dead code. Command center + promotion requests link here. | **High** |
| PH-R-005 | **`PerformanceTeam`** links to `/incentives/give-discount` instead of `/performance/give-discount`. | Medium |
| PH-R-009 | Incentive admin pages linked from “Performance Hub” sidebar use **legacy layout** (no hub context bar / theme). | Medium |

**Not built (by design):** unified `/performance/settlement` — finance remains on `/incentives/*`.

---

## 3. Permissions

### Role matrix (summary)

| Surface | Counselor | Manager | Admin | Director | Telecaller | MarCom (counselor + offers edit) |
|---------|:---------:|:-------:|:-----:|:--------:|:----------:|:--------------------------------:|
| Performance home | ✓ | ✓ | ✓ | ✓ (counselor cards if also counselor) | telecaller home | ✓ |
| Give discount | ✓ | ✓ | ✓ | mutations blocked at RPC | — | ✓ |
| Command center | nav hidden | nav hidden | ✓ nav | nav hidden | — | — |
| Command center URL | **reachable** | **reachable** | ✓ | **reachable** | **reachable** | **reachable** |
| Discount approvals page | redirect | ✓ | ✓ | **redirect** (RLS allows SELECT) | redirect | redirect |
| Executive dashboard | redirect | redirect | ✓ | ✓ read-only UI | redirect | redirect |
| Offers studio | redirect | ✓ | ✓ | redirect | redirect | module `offers` |
| Promotion review/publish UI | — | ✓ | ✓ | — | — | **buttons hidden** (RPC allows module) |
| AI studio | redirect | ✓* | ✓ | redirect | redirect | needs **`offers_ai`** module |

\*Manager also needs `offers` module permission on studio routes.

### Issues

| ID | Finding | Severity |
|----|---------|----------|
| PH-R-006 | **Director vs UAT PH-UAT-6B-001:** Phase 6B adds RLS **SELECT** on approvals; UAT expects director can **view** `/performance/admin/approvals`. UI **`canReview` excludes director** → hard redirect to `/performance`. Director read-only mode exists on Executive/IncentivesAdmin only. | **High** |
| PH-R-007 | **MarCom vs UAT PH-UAT-PROMO-001:** `fn_publish_promotion_from_request` allows `user_has_module(..., 'offers', 'edit')`, but UI `canReview` requires **manager/admin role**. Demo user `ph.marcom@flowlink.demo` cannot publish without manager role. | **High** |
| PH-R-008 | **`/performance/admin` has no page-level role guard** — any authenticated user can open URL; loads `fn_period_command_center` + `fn_performance_hub_readiness_check` (firm-wide counts, no RPC auth). Nav hides link from non-admins only. | Medium |
| PH-R-010 | **Director has no RLS SELECT on `wallet_exception_requests`** — cannot view wallet exception rows even if approvals page were opened. | Medium |
| PH-R-012 | **`LEVEL_LABELS.admin` = "Admin / director"** on approvals page is **misleading** — directors cannot access page; `fn_can_review_discount_level` excludes director. | Low |
| PH-R-013 | Incomplete **`fn_assert_not_director_read_only`** on some mutating RPCs (wallet exception review, A/B, branch pool, promotion publish) — mitigated by UI/RLS today. | Medium |

---

## 4. RPCs

**UI-called Performance Hub RPCs:** 38 — **all exist in migrations.** No missing RPC definitions.

### RPC permission / data gaps

| ID | RPC | Issue | Severity |
|----|-----|-------|----------|
| PH-R-008 | `fn_performance_hub_readiness_check`, `fn_period_command_center` | No caller authorization; exposes firm-wide operational counts to any authenticated user with URL access. | Medium |
| PH-R-014 | `fn_review_wallet_exception_request` | No Phase 6B director guard (director cannot reach UI today). | Low |
| PH-R-015 | `offer_events` with `event_type = 'sent'` | **`fn_log_offer_event` / O10 / A/B accept `sent`**, but table CHECK is only `viewed, claimed, redeemed, delivered` — direct INSERT fails unless constraint altered. Demo SQL includes ALTER workaround; **no production migration**. | **High** |
| PH-R-016 | `src/integrations/supabase/types.ts` | Missing generated types for `promotion_requests`, `discount_approval_requests`, `wallet_exception_requests`, etc. — TypeScript drift; runtime OK. | Low |

### RPC index by workflow (verified present)

| Workflow | RPCs |
|----------|------|
| Readiness / command center | `fn_performance_hub_readiness_check`, `fn_period_command_center`, `fn_period_lock_readiness`, `fn_unclassified_payment_count`, `fn_wallet_exception_pending_count` |
| Home cards | `fn_counselor_offer_propensity_queue`, `fn_counselor_wallet_impact`, `fn_counselor_offer_influence`, `fn_counselor_earning_snapshot`, `fn_incentive_counselor_revenue_breakdown`, `fn_counselor_plan_stack_summary`, `fn_incentive_dimension_leaderboard` |
| Discount approvals | `fn_submit_discount_request`, `fn_review_discount_request`, `fn_evaluate_discount_margin`, `fn_list/set/upsert_discount_margin_floor_policy` |
| Wallet exceptions | `fn_submit_wallet_exception_request`, `fn_review_wallet_exception_request` |
| Unclassified | `fn_unclassified_payments_for_period`, `fn_classify_payment_service` |
| Wallets | `fn_counselor_wallets_for_period`, `fn_get_or_create_branch_pool_wallet`, `fn_allocate_from_branch_pool`, `fn_size_wallets_for_period` |
| Promotions | `fn_publish_promotion_from_request` |
| Offers studio | `fn_offer_studio_dashboard`, `fn_offer_segments_summary`, `fn_enroll_offer_journey`, A/B RPCs, analytics RPCs |
| Client context | `fn_suggest_offer_for_client`, `fn_client_cross_sell_profile`, `fn_dismiss_client_offer_suggestion` |

---

## 5. Migrations

### Required migration chain (Performance Hub)

Minimum set for UAT (in addition to core branch/service_library seeds):

| Phase | Migration file | Delivers |
|-------|----------------|----------|
| Sprint 0–5 | `202606103*` … `20260610352000` | Wallets, offers lifecycle, incentive engine |
| 5C | `20260619120000` | Approvals, promotions, unclassified |
| 5D–5W | `20260620120000` … `20260709120000` | Telecaller, studio, journeys, A/B, floors, propensity, WIR, O10, readiness |
| 5X | `20260710120000` | Multi-variant A/B create |
| **6B enum** | **`20260711120000`** | **`director` app_role enum value (must run alone)** |
| **6B body** | **`20260711120001`** | Director RLS + mutation guards |
| 6A–6E | UI-only (no extra migrations beyond above for hub shell/theme/mobile/banner) | |

### Migration / environment issues

| ID | Finding | Severity |
|----|---------|----------|
| PH-R-017 | **No repo migration for demo seed** — `PERFORMANCE_HUB_DEMO_DATA.md` SQL is manual; UAT depends on ops running it in Supabase. | **Critical** (process) |
| PH-R-018 | **Phase 6B two-step deploy** — if enum migration skipped or combined, 6B RLS/director guards fail. See `docs/INCENTIVE_PHASE6B_DEPLOY.md`. | **Critical** (environment) |
| PH-R-015 | Missing migration: **`ALTER offer_events CHECK` to include `'sent'`** | **High** |
| PH-R-019 | **`offer_events` / O10 / A/B stats** rely on `sent` events that may never persist without constraint fix. | **High** |

---

## 6. Dashboard widgets

### Widget readiness

| Screen | Widget | Data wired | Issue |
|--------|--------|------------|-------|
| **Home** | Wallet, cash, WIR, O10, hot clients, plans, leaderboard, payouts | ✓ RPC + tables | Hot list needs verified payment (demo §4.1) |
| **Command center** | Readiness, queues, workflow, KPI grid, money rail | ✓ | **Wallet unlocked KPI wrong** — PH-R-001 |
| **Executive** | KPI grid, alerts, branch table | ✓ | Same wallet KPI bug |
| **Team** | Member table, aggregates | ✓ | **Spendable/spent columns wrong** — PH-R-001 |
| **Give discount** | Wallet picker, margin preview, apply | ✓ | **Ignores period bar** — PH-R-002 |
| **Approvals** | Discount queue, exceptions, floor admin | ✓ | Director cannot access — PH-R-006 |
| **Offers analytics** | ROI charts, WIR | partial | ROI uses 30/90/365d; WIR uses period bar — PH-R-020 |
| **Offers studio dashboard** | Tiles from `fn_offer_studio_dashboard` | ✓ | — |

### PH-R-001 — `budget_kind` filter bug (**High**)

```91:92:src/hooks/usePerformancePeriodMetrics.ts
        (w) => inSet(w.counselor_id, counselorFilter) && (w.budget_kind ?? "personal") === "personal",
```

Same pattern in `usePerformanceTeamRows.ts` (line 99). Database enum is **`month_to_month`**, not `personal`. Demo wallets use `month_to_month` → **Command center “Wallet unlocked”, Executive KPIs, and team spendable columns aggregate to zero** despite seed data.

**Affected UAT:** PH-UAT-CC-001, PH-UAT-EXEC-001, PH-UAT-TEAM-001, W1 queue context.

### PH-R-002 — Give discount period context (**High**)

```113:113:src/pages/GiveDiscount.tsx
  const period = currentPeriodKey();
```

Uses calendar month, not `PerformancePeriodContext`. When UAT period is **2026-06** but test runs in another month, Give discount loads **wrong/no wallet** → PH-UAT-S1, S2, S3, U1, 6C-001 fail.

---

## 7. Demo seed data dependencies

| Prerequisite | Required for | Status |
|--------------|--------------|--------|
| 7 demo auth users `ph.*@flowlink.demo` | All role-based UAT | **Manual** — PH-R-017 |
| §4 seed SQL | All 51 UAT cases | **Manual** |
| Period bar = `2026-06` | Period-scoped cards | Tester action |
| §4.1 payment for Aman Shah | PH-UAT-T1, T2, Q1 propensity | **Optional in doc** |
| Journey templates (5Q migration) | PH-UAT-Q2, Q1 | Auto from migrations |
| `offer_events` constraint ALTER in seed | PH-UAT-V1, R1 stats | **Workaround in demo SQL only** |

### PH-R-003 — Unclassified demo mismatch (**Critical** for demo UAT)

- **`fn_unclassified_payment_count`** counts `incentive_qualifying_events` where `master_key` / `service_code` null → seed row **`q1000004`** satisfies this (readiness count ≥ 1).
- **`fn_unclassified_payments_for_period`** **JOINs `client_invoice_payments`** on `source_id` → payment **`pay100004` is not in main seed** → **Unclassified admin screen empty** while command center shows count ≥ 1.

**Affected UAT:** PH-UAT-UNCL-001, PH-UAT-W1, PH-UAT-W2.

**Mitigation:** Run demo doc §4.1 payment for `PH-DEMO-004` or add payment row to main seed before UAT.

---

## 8. Approval workflows

| Workflow | UI entry | Backend | Completeness | Issues |
|----------|----------|---------|--------------|--------|
| **Discount depth matrix** | Give discount → Approvals | `fn_submit_discount_request` → instant or pending → `fn_review_discount_request` | **Complete** | Floor badges, waiver guard (5S) |
| **Wallet exceptions** | Home form → Approvals | `fn_submit_wallet_exception_request` → `fn_review_wallet_exception_request` | **Complete** | Combined queue tile with discounts |
| **Promotion requests** | Offers requests | INSERT → status updates → `fn_publish_promotion_from_request` | **Complete** | MarCom UI gate PH-R-007 |
| **Unclassified payments** | Admin unclassified | List RPC → `fn_classify_payment_service` | **Complete** | Demo gap PH-R-003 |
| **Margin floor admin** | Approvals (admin) | `fn_list/set/upsert_discount_margin_floor_policy` | **Complete** | — |

**Incomplete:** Promotion SLA — badge only, no escalation workflow UI (Low, PH-R-021).

---

## 9. Wallet workflows

| Workflow | Route | Status | Issues |
|----------|-------|--------|--------|
| Give discount (apply / queue) | `/performance/give-discount` | Functional | PH-R-002 period |
| Multi-wallet picker (personal / strategic) | Give discount | Functional | — |
| Branch pool allocate | `/performance/wallet/branch-pool` | Functional | Needs manager + branch context |
| Wallet policy (bands, sizing) | `/performance/wallet/policy` | Functional | Not in sidebar PH-R-011 |
| Period close / reseed | `/incentives/period-close` | Functional | Outside hub shell |
| Wallet top-ups | `/incentives/wallet-topups` | Functional | Linked from command center |
| Counselor exception request | Performance home | Functional | — |

**Missing analytics:** No dedicated wallet spend trend dashboard beyond home WIR + command center KPIs (Medium, PH-R-022).

---

## 10. Offer workflows

| Workflow | Route | Status | Gaps |
|----------|-------|--------|------|
| Library CRUD | `/performance/offers/library` | Complete | PH-R-004 link |
| Create wizard | `/performance/offers/new` | Complete (draft) | — |
| Studio dashboard | `/performance/offers` | Complete | — |
| Analytics | `/performance/offers/analytics` | Complete | Period mismatch PH-R-020 |
| Calendar | `/performance/offers/calendar` | Complete | — |
| Segments | `/performance/offers/segments` | Partial | Definition stored as text; no execution engine PH-R-023 |
| Automation templates | `/performance/offers/automation` | Complete | Birthday-style rules only |
| Journeys | `/performance/offers/journeys` | Complete | Auto-tick is DB/cron; no “run now” UI PH-R-024 |
| A/B tests | `/performance/offers/ab-tests` | Complete | Depends on `sent` events PH-R-015 |
| AI studio | `/performance/offers/ai-studio` | Complete | Edge fn + `offers_ai` module |
| Client suggestions | Client promotions strip | Complete | Cross-sell, propensity, A/B badge |
| Legacy convergence banner | Invoice preview | Complete | Always shown for counselors on registration invoice (not flag-gated) |
| **`service_offers` data migration** | — | **Not implemented** | UX banner only (6D); no ETL — documented in `docs/migrations/service-offers-convergence.md` |

---

## Issue register

| ID | Severity | Category | Summary | Affected UAT / screens |
|----|----------|----------|---------|----------------------|
| PH-R-001 | **High** | Widgets / bug | `budget_kind === 'personal'` should be `month_to_month` | CC, Executive, Team KPIs |
| PH-R-002 | **High** | Wallet / bug | Give discount ignores `PerformancePeriodContext` | S1, S2, S3, U1, 6C |
| PH-R-003 | **Critical** | Demo seed | Unclassified count vs UI queue mismatch (no payment row) | UNCL-001, W1, W2 |
| PH-R-004 | **High** | Navigation | `/offers-admin` renders legacy page; dead redirect | CC, PROMO-001 |
| PH-R-005 | Medium | Navigation | Team → `/incentives/give-discount` legacy path | TEAM-001 |
| PH-R-006 | **High** | Permissions | Director cannot view approvals page; UAT 6B mismatch | 6B-001 |
| PH-R-007 | **High** | Permissions | MarCom module cannot review/publish promotions in UI | PROMO-001 |
| PH-R-008 | Medium | Permissions | Command center URL unguarded; readiness RPC open | CC-001 |
| PH-R-009 | Medium | UX | `/incentives/*` outside hub theme from hub nav | All incentive admin UAT |
| PH-R-010 | Medium | Permissions | Director no SELECT on wallet exceptions | 6B (partial) |
| PH-R-011 | Medium | Navigation | Wallet policy missing from sidebar | WALLET-001 |
| PH-R-012 | Low | Copy | “Admin / director” label on approvals misleading | S4 |
| PH-R-013 | Medium | Permissions | Incomplete director guards on some RPCs | — |
| PH-R-014 | Low | Permissions | Wallet exception review RPC no director guard | — |
| PH-R-015 | **High** | Migration / RPC | `offer_events` CHECK missing `'sent'` | V1, R1, R3 |
| PH-R-016 | Low | Types | Stale Supabase types for PH tables | Dev experience |
| PH-R-017 | **Critical** | Process | Demo seed not automated in migrations | SETUP-001, all cases |
| PH-R-018 | **Critical** | Environment | 6B enum split must be applied in order | Director, guards |
| PH-R-019 | **High** | Analytics | O10 / A/B `sent` metrics empty without event fix | V1, R1 |
| PH-R-020 | Medium | Analytics | Offer ROI charts not tied to hub period bar | V2 |
| PH-R-021 | Low | Workflow | Promotion SLA escalation UI only badge | PROMO-001 |
| PH-R-022 | Medium | Analytics | No wallet spend analytics page beyond WIR | U3, V2 |
| PH-R-023 | Medium | Offers | Segment definitions not executable | OFF-SEG-001 |
| PH-R-024 | Low | Offers | Journey processing not exposed in UI | Q2 |
| PH-R-025 | Low | Docs | Stale prototype gap docs vs shipped build | — |
| PH-R-026 | Medium | Data | `service_offers` → `offers` data migration not built | 6D (banner only) |
| PH-R-027 | Medium | Demo seed | Hot clients / cross-sell need optional payment seed | T1, T2, Q1 |
| PH-R-028 | Low | AI studio | Requires `offers_ai` module for MarCom demo user | OFF-AI-001 |

---

## Placeholder / missing implementation summary

| Type | Items |
|------|--------|
| **Placeholder screens** | **None** — all `/performance/*` routes have real implementations |
| **Missing implementations** | `service_offers` data migration; unified `/performance/settlement`; segment execution engine; journey admin tick UI; payroll API integration |
| **Broken navigation** | `/offers-admin` → legacy `OffersAdmin` (PH-R-004); Team → legacy give discount path (PH-R-005) |
| **Missing permissions** | Director approvals view (PH-R-006); MarCom promotion review UI (PH-R-007); director wallet exception read (PH-R-010) |
| **Missing RPCs** | **None** for UI-called functions |
| **Missing seed data** | Demo users (manual); unclassified payment row (PH-R-003); optional propensity payments (PH-R-027) |
| **Missing analytics** | Period-aligned ROI; wallet spend trends beyond WIR |
| **Incomplete workflows** | Promotion SLA escalation; segment run; journey cron visibility; O14 data convergence |

---

## Pre-UAT checklist (engineering)

| # | Action | Owner | Blocks UAT |
|---|--------|-------|:------------:|
| 1 | Apply migrations **5C through 6B** (enum split first) in target Supabase | DevOps | ✓ |
| 2 | Lovable Publish + republish `incentive-calculate-run` if needed | DevOps | ✓ |
| 3 | Create 7 demo users + run demo seed SQL | QA / DevOps | ✓ |
| 4 | Add **`pay100004`** (or §4.1) so unclassified UI matches readiness count | QA | ✓ |
| 5 | Fix **`budget_kind` filter** in `usePerformancePeriodMetrics` + `usePerformanceTeamRows` | Engineering | Recommended |
| 6 | Wire **`GiveDiscount`** to `usePerformancePeriod()` | Engineering | Recommended |
| 7 | Add migration for **`offer_events.sent`** OR document demo ALTER as mandatory step | Engineering | Recommended |
| 8 | Fix **`/offers-admin`** links → `/performance/offers/library` or remove duplicate route | Engineering | Recommended |
| 9 | Update UAT cases **6B** (director → Executive only) and **MarCom** (add manager role or fix UI) | QA lead | ✓ |
| 10 | Assign **`offers_ai`** module to MarCom demo user for AI studio case | QA | Optional |

---

## UAT workarounds (if fixes not shipped)

| Issue | Workaround |
|-------|------------|
| PH-R-001 | Validate wallets on **Performance home** (Priya card), not Command center KPI “Wallet unlocked” |
| PH-R-002 | Run UAT in **June 2026** calendar month OR always set system date context when testing Give discount |
| PH-R-003 | Execute demo doc **§4.1** payment insert for `PH-DEMO-004` before UNCL/W2 tests |
| PH-R-004 | Navigate to **`/performance/offers/library`** manually; ignore Command center “Offers library” link |
| PH-R-006 | Test director on **Executive dashboard** only; skip PH-UAT-6B-001 or mark **Blocked** |
| PH-R-007 | Run promotion publish UAT as **admin/manager**, not MarCom demo user |
| PH-R-015 / V1 | Run demo seed §4 `ALTER offer_events` block before O10 / influence tests |
| PH-R-027 | Run demo §4.1 for Aman Shah before propensity / hot client tests |

---

## Recommendation

| Decision | Criteria met? |
|----------|---------------|
| ☐ **Proceed with team UAT now** | Only if demo seed + payment row loaded, migrations verified, workarounds communicated, and HIGH bugs accepted as known defects |
| ☑ **Proceed with team UAT after checklist items 1–4 + 9** | Minimum bar for meaningful demo-driven testing |
| ☐ **Delay UAT until engineering fixes 5–8** | Recommended for accurate Command center / Give discount / navigation / analytics results |

**Suggested path:** Complete **Pre-UAT checklist 1–4 and 9** immediately; run UAT with documented workarounds; fix **PH-R-001, PH-R-002, PH-R-004, PH-R-015** in parallel before sign-off (`PERFORMANCE_HUB_UAT_SIGNOFF.md`).

---

## References

- **UAT blockers & fix plan:** [`PERFORMANCE_HUB_UAT_BLOCKERS.md`](./PERFORMANCE_HUB_UAT_BLOCKERS.md)
- Demo data: [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md)
- UAT cases: [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md)
- Sign-off form: [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md)
- Batch checklist: [`../INCENTIVE_PHASE5_BATCH_UAT.md`](../INCENTIVE_PHASE5_BATCH_UAT.md)
- 6B deploy: [`../INCENTIVE_PHASE6B_DEPLOY.md`](../INCENTIVE_PHASE6B_DEPLOY.md)
- Service offers migration (future): [`../migrations/service-offers-convergence.md`](../migrations/service-offers-convergence.md)
