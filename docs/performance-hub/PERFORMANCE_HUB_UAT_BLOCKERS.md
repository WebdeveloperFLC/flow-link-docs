# Performance Hub — UAT Blockers & Fix Plan

**Source:** [`PERFORMANCE_HUB_READINESS_REVIEW.md`](./PERFORMANCE_HUB_READINESS_REVIEW.md)  
**Goal:** Resolve all **Critical** issues and as many **High** issues as practical before team UAT, with **minimal migrations** and **low deployment risk**.

**Issue count:** 3 Critical · 8 High (PH-R-015 and PH-R-019 share one fix)

---

## Phase A — Critical UAT blockers

These must be cleared before meaningful demo-driven UAT. None require new application code except optional seed packaging.

---

### PH-R-018 — Phase 6B migrations not applied (or applied out of order)

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-018 |
| **2. Root Cause** | PostgreSQL cannot use a new `app_role` enum value in the same transaction as policies/functions that reference it. Phase 6B was split into **`20260711120000`** (enum only) and **`20260711120001`** (RLS + guards). Skipping, combining, or partial apply leaves director role, read policies, and mutation guards missing or broken. |
| **3. Affected Screens** | All Phase 6B surfaces: `/performance/executive` (director read-only), `/performance/admin/approvals` (RLS), discount review RPCs, classify payment, period close |
| **4. Recommended Fix** | In target Supabase: (1) confirm `20260711120000` applied alone first; (2) apply `20260711120001`; (3) verify `SELECT enum_range(NULL::app_role)` includes `director`; (4) Lovable Publish. Document completion in deploy checklist. |
| **5. Estimated Effort** | **0.5 day** (DevOps verification + publish) |
| **6. Migration Required** | **Yes** — existing migrations `20260711120000` + `20260711120001` (not new code) |
| **7. UAT Impact** | **Blocks entire UAT** if missing — RPC errors, missing director role, failed readiness checks |
| **8. Fix Priority** | **P0 — do first** |

---

### PH-R-017 — Demo seed not loaded (manual process)

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-017 |
| **2. Root Cause** | Performance Hub UAT depends on deterministic demo rows (users, clients, wallets, queues, runs) defined only in **`PERFORMANCE_HUB_DEMO_DATA.md` §4**. Migrations seed branches/floors/journey templates but **not** PH-DEMO clients, offers, or queue rows. No automated seed in repo or CI. |
| **3. Affected Screens** | **All 51 UAT cases** — empty library, zero queue counts, missing wallets, failed SETUP-001 |
| **4. Recommended Fix** | **Before UAT:** (1) Create seven `ph.*@flowlink.demo` users in Team & Roles; (2) run §4 seed SQL in Supabase SQL editor; (3) run verification queries from demo doc; (4) set period bar to **`2026-06`**. **Optional hardening:** add `supabase/migrations/20260712120000_performance_hub_uat_demo_seed.sql` (idempotent, staging-only) — see execution order. |
| **5. Estimated Effort** | **0.5 day** (ops runbook) · **+1 day** if repo migration for seed |
| **6. Migration Required** | **No** for minimum fix (manual SQL). **Optional Yes** for repeatable staging seed migration. |
| **7. UAT Impact** | **Blocks all demo-referenced UAT** without seed |
| **8. Fix Priority** | **P0 — parallel with PH-R-018** |

---

### PH-R-003 — Unclassified payment demo row missing (count vs UI mismatch)

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-003 |
| **2. Root Cause** | `fn_unclassified_payment_count` counts `incentive_qualifying_events` with null `dimensions.master_key` / `service_code` (seed row **`q1000004`**). `fn_unclassified_payments_for_period` **INNER JOINs** `client_invoice_payments` on `qe.source_id`. Main seed inserts the qualifying event referencing **`pay100004`** but **does not insert** the payment (or invoice) row → readiness count ≥ 1, **Unclassified admin list empty**. |
| **3. Affected Screens** | `/performance/admin` (readiness card), `/performance/admin/unclassified`, PH-UAT-UNCL-001, PH-UAT-W1, PH-UAT-W2 |
| **4. Recommended Fix** | Extend main demo seed §4 with minimal `client_invoices` + `client_invoice_payments` for **`PH-DEMO-004`** / `pay100004` (mirror §4.1 pattern for Aman). Re-run seed on staging. No app code change. |
| **5. Estimated Effort** | **2 hours** (SQL + verify) |
| **6. Migration Required** | **No** — demo doc / manual SQL only. Include in optional demo seed migration if PH-R-017 migration is added. |
| **7. UAT Impact** | **Blocks unclassified + W2 readiness UAT** unless testers run extra SQL manually |
| **8. Fix Priority** | **P0 — part of seed load (PH-R-017)** |

---

## Phase B — High priority UAT fixes

Fix before team UAT where practical. **One frontend deploy** can cover PH-R-001, 002, 004, 006, 007. **One DB migration** covers PH-R-015 / PH-R-019.

---

### PH-R-001 — Wallet KPIs filter wrong `budget_kind`

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-001 |
| **2. Root Cause** | `usePerformancePeriodMetrics.ts` and `usePerformanceTeamRows.ts` filter wallets with `(w.budget_kind ?? "personal") === "personal"`. Database enum is **`month_to_month`** (plus `branch_pool`, `scoped`, `festive`). Demo personal wallets never match → aggregated **wallet unlocked / spendable = 0**. |
| **3. Affected Screens** | `/performance/admin` (KPI grid, money rail), `/performance/executive`, `/performance/team` |
| **4. Recommended Fix** | Replace filter with `budget_kind === 'month_to_month'` (or exclude `branch_pool` / include counselor personal wallets explicitly). Align with `ClientPromotionsStrip` which already checks `month_to_month`. Add null-safe fallback for legacy rows if any. |
| **5. Estimated Effort** | **1 hour** |
| **6. Migration Required** | **No** |
| **7. UAT Impact** | PH-UAT-CC-001, EXEC-001, TEAM-001 show wrong KPIs; testers may false-fail wallet policy |
| **8. Fix Priority** | **P1** |

**Files:** `src/hooks/usePerformancePeriodMetrics.ts`, `src/hooks/usePerformanceTeamRows.ts`

---

### PH-R-002 — Give discount ignores hub period bar

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-002 |
| **2. Root Cause** | `GiveDiscount.tsx` sets `period = currentPeriodKey()` (calendar month) instead of `usePerformancePeriod()`. UAT uses demo period **`2026-06`** via context bar; wallet RPC `fn_counselor_wallets_for_period` queries wrong month when test date ≠ June 2026. |
| **3. Affected Screens** | `/performance/give-discount`, `/incentives/give-discount` (same component) |
| **4. Recommended Fix** | Import `usePerformancePeriod`; use `period` from context for wallet load, submit, and preview. Keep `currentPeriodKey()` only as fallback when context unavailable. |
| **5. Estimated Effort** | **1–2 hours** |
| **6. Migration Required** | **No** |
| **7. UAT Impact** | PH-UAT-S1, S2, S3, U1, 6C-001 fail or show empty wallet |
| **8. Fix Priority** | **P1** |

**Files:** `src/pages/GiveDiscount.tsx`

---

### PH-R-004 — `/offers-admin` opens legacy page

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-004 |
| **2. Root Cause** | `App.tsx` registers **`/offers-admin` twice**: first route renders legacy `OffersAdmin` (line ~457); second route redirects to `/performance/offers/library` (line ~704) but never matches. Command center and promotion requests link to `/offers-admin`. |
| **3. Affected Screens** | `/performance/admin` (admin tools grid), `/performance/offers/requests`, any `/offers-admin` bookmark |
| **4. Recommended Fix** | **Option A (preferred):** Remove first `OffersAdmin` route; keep redirect to `/performance/offers/library`. **Option B:** Change all links to `/performance/offers/library` and delete duplicate routes. Update `PerformanceCommandCenter.tsx` and `PerformancePromotionRequests.tsx`. |
| **5. Estimated Effort** | **1 hour** |
| **6. Migration Required** | **No** |
| **7. UAT Impact** | Testers land on non–hub-shell library; breaks 6D convergence UX expectations |
| **8. Fix Priority** | **P1** |

**Files:** `src/App.tsx`, `src/pages/PerformanceCommandCenter.tsx`, `src/pages/PerformancePromotionRequests.tsx`

---

### PH-R-006 — Director cannot view approvals queue (UAT 6B mismatch)

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-006 |
| **2. Root Cause** | `PerformanceApprovals.tsx` sets `canReview = admin \|\| manager` and **`Navigate`s away** if false. Phase 6B adds RLS **SELECT** for director on `discount_approval_requests` and `promotion_requests`, but UI never exposes read-only mode. UAT case PH-UAT-6B-001 expects view without approve. |
| **3. Affected Screens** | `/performance/admin/approvals` |
| **4. Recommended Fix** | Add `isDirectorOnly` branch (reuse `PerformanceExecutive` pattern): allow page access for director; hide/disable approve/decline/floor edit; show read-only badge. Optionally add director RLS SELECT on `wallet_exception_requests` (see Phase C PH-R-010). Update misleading label "Admin / director" → "Admin" on action buttons only. |
| **5. Estimated Effort** | **3–4 hours** |
| **6. Migration Required** | **No** for discount/promo read-only UI. **Optional Yes** for wallet exception director SELECT (small policy in new migration). |
| **7. UAT Impact** | PH-UAT-6B-001 fails; director testers redirected to home |
| **8. Fix Priority** | **P1** (or **defer** and update UAT to Executive-only — not ideal) |

**Files:** `src/pages/PerformanceApprovals.tsx`, optionally `20260711120001` or new migration for wallet exception RLS

---

### PH-R-007 — MarCom cannot review/publish promotions in UI

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-007 |
| **2. Root Cause** | `PerformancePromotionRequests.tsx` gates review/publish with `hasRole(['admin','administrator','manager'])`. Backend `fn_publish_promotion_from_request` also allows `user_has_module(..., 'offers', 'edit')`. Demo MarCom user is counselor + offers module — **RPC would succeed, UI hides buttons**. |
| **3. Affected Screens** | `/performance/offers/requests` |
| **4. Recommended Fix** | Extend `canReview` to include `useModulePermission('offers', 'edit')` (match RPC). Keep insert open to all staff. Align status update permissions with RPC. |
| **5. Estimated Effort** | **1–2 hours** |
| **6. Migration Required** | **No** |
| **7. UAT Impact** | PH-UAT-PROMO-001 fails for `ph.marcom@flowlink.demo` |
| **8. Fix Priority** | **P1** |

**Files:** `src/pages/PerformancePromotionRequests.tsx`

---

### PH-R-015 / PH-R-019 — `offer_events` cannot store `sent` (O10 + A/B metrics)

| Field | Detail |
|-------|--------|
| **1. Issue ID** | PH-R-015 (schema) · PH-R-019 (symptom — fix together) |
| **2. Root Cause** | Table `offer_events` CHECK allows only `viewed, claimed, redeemed, delivered` (`20260529142142`). Phase 5D+ RPCs and analytics count **`sent`**, but INSERT fails unless constraint altered. Demo seed uses inline ALTER workaround; production DB never migrated → O10 influence and A/B sent stats stay at zero. |
| **3. Affected Screens** | `/performance` (O10 card), `/performance/offers/analytics`, `/performance/offers/ab-tests`, client offer logging |
| **4. Recommended Fix** | New migration: `ALTER TABLE offer_events DROP CONSTRAINT offer_events_event_type_check; ADD CONSTRAINT ... IN ('viewed','claimed','redeemed','delivered','sent');` Re-run demo offer_events inserts. |
| **5. Estimated Effort** | **1 hour** (+ deploy) |
| **6. Migration Required** | **Yes** — single small migration |
| **7. UAT Impact** | PH-UAT-V1, R1, R3 — influence card empty, A/B stats incomplete |
| **8. Fix Priority** | **P1** |

**Suggested file:** `supabase/migrations/20260712120000_performance_hub_offer_events_sent.sql`

---

## Phase C — Post-UAT improvements

Medium/Low issues from readiness review. **Do not block UAT start** if Phase A + core Phase B are done.

| ID | Summary | Effort | Migration | Notes |
|----|---------|--------|-----------|-------|
| PH-R-008 | Command center URL unguarded; readiness RPC no auth | 0.5d | Optional (RPC guards) | Security hardening |
| PH-R-009 | `/incentives/*` outside hub theme shell | 2–3d | No | UX consistency |
| PH-R-010 | Director no SELECT on `wallet_exception_requests` | 1h | Yes (RLS policy) | Pair with PH-R-006 if director views approvals |
| PH-R-011 | Wallet policy missing from sidebar | 0.5h | No | Nav only |
| PH-R-005 | Team links to legacy give-discount path | 0.5h | No | One-line fix |
| PH-R-013 | Incomplete director guards on mutating RPCs | 1d | Yes | Harden 6B pattern |
| PH-R-020 | Offer analytics ROI not tied to period bar | 1d | No | V2 accuracy |
| PH-R-022 | No dedicated wallet spend analytics | 3d+ | No | Product backlog |
| PH-R-023 | Segment definitions not executable | 5d+ | Maybe | Product backlog |
| PH-R-026 | `service_offers` → `offers` data migration | 2w+ | Yes | O14 data phase |
| PH-R-027 | Hot clients need payment seed in main pack | 2h | No | Merge into demo §4 (recommended pre-UAT doc update) |
| PH-R-028 | MarCom needs `offers_ai` for AI studio UAT | 0.5h | No | Role/module assignment |
| PH-R-012, 014, 016, 021, 024, 025 | Copy, types, SLA UI, docs | varies | No | Polish |

**Recommended pre-UAT doc-only add (not Phase B code):** merge PH-R-027 payment seed for Aman Shah into demo §4 main script (same batch as PH-R-003).

---

## Execution order (minimize migrations & deployment risk)

Design principles:

1. **Ops first** — no code until DB baseline is correct.  
2. **One frontend release** — batch all no-migration fixes.  
3. **At most one new migration** before UAT — combine technical fixes only; keep demo seed as SQL doc unless staging automation is required.  
4. **Re-seed once** after migrations + doc updates.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 0 — Environment baseline (0 migrations added)          ~0.5 day   │
├─────────────────────────────────────────────────────────────────────────┤
│ • PH-R-018: Apply 20260711120000 then 20260711120001 on staging       │
│ • Verify prior 5C–5W + 5X migrations applied                          │
│ • Lovable Publish (current main)                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1 — Demo data pack (0 app migrations)                  ~0.5 day   │
├─────────────────────────────────────────────────────────────────────────┤
│ • PH-R-017: Create ph.*@flowlink.demo users + roles/modules             │
│ • PH-R-003: Add pay100004 + invoice to PERFORMANCE_HUB_DEMO_DATA §4   │
│ • PH-R-027: Add Aman payment block to main seed (not optional §4.1)   │
│ • Run seed SQL; verify SETUP-001 queries                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2 — Single DB migration (1 new file)                     ~1 hour   │
├─────────────────────────────────────────────────────────────────────────┤
│ • PH-R-015/019: offer_events CHECK includes 'sent'                      │
│   File: 20260712120000_performance_hub_offer_events_sent.sql            │
│ • Apply on staging; no enum split risk                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3 — Frontend fix batch (0 migrations)                  ~1 day     │
├─────────────────────────────────────────────────────────────────────────┤
│ Single PR / Lovable publish:                                            │
│ • PH-R-001  budget_kind → month_to_month                                │
│ • PH-R-002  GiveDiscount → usePerformancePeriod()                       │
│ • PH-R-004  /offers-admin redirect + link updates                       │
│ • PH-R-007  Promotion requests module permission                        │
│ • PH-R-006  Director read-only approvals page (if time; else UAT note)  │
│ • PH-R-005  Team → /performance/give-discount (quick win, same PR)      │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4 — Re-seed & smoke test                               ~2 hours   │
├─────────────────────────────────────────────────────────────────────────┤
│ • Re-run demo seed §4 (offer_events sent rows)                          │
│ • Smoke: fn_performance_hub_readiness_check('2026-06')                  │
│ • Smoke: unclassified list shows PH-DEMO-004                          │
│ • Smoke: Command center wallet unlocked > 0                             │
│ • Smoke: Give discount with period 2026-06                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5 — Team UAT kickoff                                     Day 0    │
├─────────────────────────────────────────────────────────────────────────┤
│ • Hand testers PERFORMANCE_HUB_UAT.md + known issues list               │
│ • Phase C items logged as post-UAT backlog                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Migration count summary

| Step | New migrations | Risk |
|------|---------------:|------|
| Step 0 | 0 (apply existing 6B split) | Low if order followed |
| Step 1 | 0 (manual/doc seed) | Low — staging data only |
| Step 2 | **1** (`offer_events` sent) | **Low** — constraint widen only |
| Step 3 | 0 | Low — UI-only |
| **Total before UAT** | **1 new** (+ verify existing 6B) | |

### Optional: combine Step 1 into one migration

If repeatability matters more than migration minimalism, add **`20260712120001_performance_hub_uat_demo_seed.sql`** (staging flag / idempotent PH-DEMO rows + payment rows). **Not recommended for production deploy** — use doc SQL for flexibility. This adds a **second** migration but removes manual ops errors.

### Defer if schedule is tight (accept UAT workarounds)

| Issue | Defer? | Workaround |
|-------|--------|------------|
| PH-R-006 | Yes | Test director on Executive only; mark 6B-001 blocked |
| PH-R-015/019 | No | Required for V1/R1 unless demo ALTER run manually each time |
| PH-R-007 | No | Run PROMO-001 as admin (5 min fix preferred) |
| PH-R-001, 002, 004 | No | High false-failure rate without fixes |

---

## Pre-UAT completion checklist

| Step | Issue(s) | Owner | Done |
|------|----------|-------|:----:|
| 0 | PH-R-018 | DevOps | ☐ |
| 1 | PH-R-017, PH-R-003, PH-R-027 | QA / DevOps | ☐ |
| 2 | PH-R-015, PH-R-019 | Engineering | ☐ |
| 3 | PH-R-001, 002, 004, 007 (+ 006, 005 if in scope) | Engineering | ☐ |
| 4 | Smoke tests | QA | ☐ |
| 5 | UAT kickoff | QA lead | ☐ |

**Minimum bar to start team UAT:** Steps **0, 1, 2** complete + Step **3** items **PH-R-001, 002, 004, 007** shipped.

**Target bar (recommended):** All Phase A + all Phase B complete.

---

## Traceability

| Document | Purpose |
|----------|---------|
| [`PERFORMANCE_HUB_READINESS_REVIEW.md`](./PERFORMANCE_HUB_READINESS_REVIEW.md) | Full audit |
| [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) | Seed SQL (update for PH-R-003, PH-R-027) |
| [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) | Test cases |
| [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md) | Sign-off after UAT |
| [`PERFORMANCE_HUB_UAT_READY.md`](./PERFORMANCE_HUB_UAT_READY.md) | Post-remediation readiness (Phase A+B complete) |
