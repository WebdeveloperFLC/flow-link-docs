# Performance Hub — UAT ↔ Demo Data Coverage Report

**Date:** 2026-06-13  
**Sources:** [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) (51 cases) · [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md)  
**Goal:** Every UAT case runnable from the demo pack alone — no ad-hoc records outside [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md).

---

## Executive summary

| Metric | Count | % |
|--------|------:|--:|
| **Total UAT cases** | 51 | 100% |
| **Fully covered** (seed §4 + §2.1 users + migration prerequisites in demo doc §1/§3) | 44 | 86% |
| **Partially covered** (baseline OK; test mutates data or needs re-seed between runs) | 7 | 14% |
| **Gaps** (missing user permission, seed row, or prerequisite not in demo pack) | 0 | 0% |

**Verdict:** After demo pack patches (wallet allocation, pay100002/003, `li100002`, MarCom `offers_ai`), **all 51 cases have a seeded baseline**. **7 cases** still mutate data during execution — re-run §4 teardown + seed between sections if you need a clean queue state. **0 cases** are blocked by missing seed rows or permissions documented in the pack.

---

## What counts as “demo data”

| Layer | Source | Tester action |
|-------|--------|---------------|
| Auth users + roles/modules | Demo doc **§2.1** | Create once in Team & Roles (emails fixed) |
| SQL rows | Demo doc **§4** | Run once in Supabase SQL editor |
| Schema / bands / journeys / floors | Migrations listed in demo doc **§1, §3** | DevOps / Lovable migrate |
| Hub period bar `2026-06` | Browser | Set once per session |
| Records created **during** a test step (submit discount, publish promo, dismiss suggestion) | UAT step itself | Allowed — not “manual setup” |

**Out of scope for “manual records”:** one-time §2.1 users and §4 seed (documented pack).

---

## Coverage by status

### Fully covered (44)

| Test ID | Demo anchors |
|---------|----------------|
| PH-UAT-SETUP-001 | 6 clients, queues, readiness RPC |
| PH-UAT-6A-001 | Priya user, offers, period bar |
| PH-UAT-6E-001 | Any hub route (no rows) |
| PH-UAT-W1 | `q1000004`, `d1000002–4`, `p1000001–2`, `e1000001` |
| PH-UAT-W3 | Static page |
| PH-UAT-CC-001 | Same queue seeds as W1 |
| PH-UAT-EXEC-001 | `q1000001–3`, `pay100001–3` |
| PH-UAT-HOME-001 | `w1000001`, `t1000001`, `r1000001`, `li100001` |
| PH-UAT-HOME-002 | `w1000002`, Rohit user |
| PH-UAT-T2 | `c1000001`, `pay100001` |
| PH-UAT-U3 | `s1000001` |
| PH-UAT-V1 | `offer_events` + `wa100001` allocation |
| PH-UAT-V2 | `wa100001` applied allocation Jun 2026 |
| PH-UAT-TEAM-001 | Manager user, `q1000001–3` |
| PH-UAT-R4 | Period context |
| PH-UAT-TC-001 | `ph.telecaller@flowlink.demo` |
| PH-UAT-S2 | `c1000003`, `o1000001`, `w1000001` |
| PH-UAT-U1 | `c1000003`, `d1000003` pattern |
| PH-UAT-S1 | Same as U1 |
| PH-UAT-S3 | `o1000004`, `d1000004` |
| PH-UAT-6C-001 | `c1000003`, Priya |
| PH-UAT-WALLET-001 | Multiplier/unlock bands (migration §1) |
| PH-UAT-UNCL-001 | `q1000004`, `pay100004` |
| PH-UAT-S4 | `d1000002–4` |
| PH-UAT-6B-001 | Director user, pending approvals |
| PH-UAT-PROMO-001 | MarCom + `offers` edit, `p1000001–3` |
| PH-UAT-OFF-LIB-001 | `o1000001–7` |
| PH-UAT-OFF-CAL-001 | `o1000001` |
| PH-UAT-OFF-AUTO-001 | Journey template (migration 5Q) |
| PH-UAT-OFF-AI-001 | MarCom + **`offers_ai`** edit (§2.1) |
| PH-UAT-R1 | `ab100001` |
| PH-UAT-OFF-SEG-001 | UI shell |
| PH-UAT-Q1 | `c1000001`, `je100001` |
| PH-UAT-Q3 | `c1000002`, eligible offers (allied upsell RPC) |
| PH-UAT-T1 | `c1000001`, `pay100001` |
| PH-UAT-R2 | `c1000005`, `a1000001` |
| PH-UAT-6D-001 | `c1000006`, `s1000001` |
| PH-UAT-INC-PC-001 | `w1000001–4` |
| PH-UAT-INC-RUN-001 | `r1000001`, `li100001` |
| PH-UAT-INC-PLAN-001 | `pl100001` |
| PH-UAT-INC-PAY-001 | `py100001` |
| PH-UAT-OFF-NEW-001 | MarCom (creates draft in-step) |
| PH-UAT-Q2 | `je100001` + 5Q migration |
| PH-UAT-W2 | Blocker rows; resolves in-step |
| PH-UAT-Q4 | `li100001`, `li100002` (admin updates `li100002` in-step) |

---

### Partially covered (7) — runnable, with caveats

| Test ID | Issue | Workaround / order |
|---------|-------|-------------------|
| **PH-UAT-HOME-003** | Seed already has pending `e1000001` | Run before W2 resolves it, or re-seed §4; notes allow verifying seed row instead of new submit |
| **PH-UAT-T3** | Admin locks/recalculates run in-step | Re-seed §4 before retest |
| **PH-UAT-WALLET-002** | Allocates from branch pool in-step | Re-seed to reset pool balance |
| **PH-UAT-U2** | Admin changes coaching floor in-step | Restore floor or re-migrate |
| **PH-UAT-R3** | Completes A/B experiment in-step | Re-seed A/B block before R1 retest |
| **PH-UAT-INC-COMP-001** | Standings may show zero without branch contrib rows | Pass when contest active + both branches listed |
| **PH-UAT-OFF-NEW-001** | Creates new draft UUID in-step | By design — not a setup gap |

---

## Missing prerequisites (not in §4 SQL)

These are documented in demo doc **§1 / §3** but must be applied **before** UAT — not created by the tester ad hoc:

| Prerequisite | Required for | In demo doc? |
|--------------|--------------|:------------:|
| Migrations through `20260711120001` (6B) | Director, approvals RLS, SETUP-001 | ✓ §3 |
| Migration `20260712120000` (`offer_events.sent`) | PH-UAT-V1, offer event seed | ✓ §4 comment |
| Phase 5Q journey templates | Q1, Q2, OFF-AUTO-001 | ✓ §1 |
| Phase 5U margin floors (coaching 75%) | U1, U2 | ✓ §1 |
| Wallet multiplier/unlock bands | WALLET-001, HOME-001 | ✓ §1 |
| `service_library` rows (IELTS, etc.) | UNCL-001 classify via UI, W2 Option A | ✓ §3 step 4 |
| Lovable Publish / edge functions | Q4, T3 calculate-run | ✓ §3 |
| Hub period **`2026-06`** | Most cases | ✓ §3 step 5 |
| Calendar month **`2026-06`** when running UAT | `fn_suggest_offer_for_client` wallet lookup uses `current_date` month — promotions strip / Q3 if hub period ≠ calendar month | ⚠ implicit |

---

## Missing users (§2.1 vs UAT)

All UAT users are defined in demo doc **§2.1**. None are inserted by §4 SQL.

| Email | UAT cases | In §2.1? | Gap |
|-------|-----------|:--------:|-----|
| `ph.counselor1@flowlink.demo` | Priya — majority of counselor tests | ✓ | §4 updates profile name only if user exists |
| `ph.counselor2@flowlink.demo` | Rohit — HOME-002, HOME-003 | ✓ | Same |
| `ph.manager@flowlink.demo` | S4, TEAM-001, WALLET-002, R4 | ✓ | Same |
| `ph.admin@flowlink.demo` | Admin queues, incentives, W1–W2 | ✓ | Same |
| `ph.director@flowlink.demo` | 6B-001 | ✓ | §4 does **not** UPDATE profile (name/branch) |
| `ph.telecaller@flowlink.demo` | TC-001 | ✓ | §4 does **not** UPDATE profile |
| `ph.marcom@flowlink.demo` | PROMO, offers studio, OFF-AI-001 | ✓ | **`offers` + `offers_ai` edit** (§2.1) |

**UAT global text:** “Seven demo users” — matches §2.1 (no separate `ph.viewer` case).

---

## Missing permissions

| Test ID | Required permission | §2.1 documents? |
|---------|---------------------|:-----------------:|
| PH-UAT-PROMO-001 | `offers` module **edit** on MarCom | ✓ |
| PH-UAT-OFF-AI-001 | `offers_ai` module **edit** on MarCom (or admin) | ✓ §2.1 |
| PH-UAT-OFF-LIB-001 … OFF-SEG-001 | `offers` view/edit | ✓ (counselor + offers) |
| PH-UAT-6B-001 | `director` role only | ✓ |
| PH-UAT-WALLET-002 | `manager` | ✓ |

---

## Missing records (§4 seed gaps)

| Record | Referenced by | In §4? | Impact |
|--------|---------------|:------:|--------|
| `pay100001` + invoice | T1, T2, Q1, `q1000001` | ✓ | — |
| `pay100004` + invoice | UNCL-001, `q1000004` | ✓ | — |
| `pay100002`, `pay100003` | `q1000002`, `q1000003` | ✓ | — |
| `wallet_allocations` (`wa100001`) | V2, V1, promotions strip spendable | ✓ | — |
| `incentive_line_items` `li100002` | Q4 ticker update | ✓ | — |
| `client_offer_suggestion_dismissals` | Q3 (dismiss creates row in-step) | N/A | OK — created by test |
| Explicit cross-sell suggestion seed | Q3 Ritika `c1000002` | ✗ | Relies on `fn_suggest_offer_for_client` + eligible offers (usually OK for `allied_upsell`) |
| Branch contest contribution metrics | INC-COMP-001 standings | ✗ | Partial — contest shell only |

---

## Recommended test execution order

1. §2.1 users + §4 seed + migrations (§3).
2. Section C **HOME-003** before Section B **W2** (wallet exception queue).
3. Section F **R1** before **R3**; re-seed §4 before repeating R1/R3.
4. Run §4.3 teardown + §4 seed between full UAT passes to reset mutated queues.

---

## Section rollup

| UAT section | Cases | Full | Partial | Gap |
|-------------|------:|-----:|--------:|----:|
| A — Setup & shell | 3 | 3 | 0 | 0 |
| B — Command center | 5 | 4 | 1 (W2) | 0 |
| C — Counselor home & team | 11 | 9 | 2 (HOME-003, T3) | 0 |
| D — Give discount & wallets | 7 | 6 | 1 (WALLET-002) | 0 |
| E — Admin queues | 5 | 4 | 1 (U2) | 0 |
| F — Offers studio | 10 | 9 | 1 (R3 / NEW) | 0 |
| G — Client workspace | 5 | 5 | 0 | 0 |
| H — Incentives | 5 | 4 | 1 (COMP) | 0 |
| **Total** | **51** | **44** | **7** | **0** |

---

## Traceability

| Document | Role |
|----------|------|
| [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) | Test steps |
| [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) | Seed + user matrix |
| [`PERFORMANCE_HUB_UAT_READY.md`](./PERFORMANCE_HUB_UAT_READY.md) | Deploy + smoke |
| This report | Coverage audit |
