# Performance Hub — UAT ↔ Demo Data Coverage Report

**Date:** 2026-06-13 (verified)  
**Sources:** [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) · [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md)  
**Goal:** Execute **100%** of UAT without creating ad-hoc records outside the demo pack.

---

## Coverage summary

| Metric | Count | Notes |
|--------|------:|-------|
| **Total UAT cases** | **51** | All IDs in `PERFORMANCE_HUB_UAT.md` |
| **Covered by demo data** | **51** | Baseline rows + users documented in demo pack |
| **Blocked (missing seed / permission)** | **0** | After demo pack patches (Jun 2026) |
| **Mutating tests** (change DB during steps; re-seed between full passes) | **7** | Not setup gaps — see § Mutating tests |

### Verdict

**Yes — 100% executable** using only [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md):

1. Create **§2.1** users (one-time, fixed emails — part of the pack, not ad-hoc).
2. Apply **§3** migrations + publish.
3. Run **§4** seed SQL once, then **§4.4** extended seed.
4. Set period bar to **`2026-06`**.

No tester-invented clients, offers, wallets, or queue rows are required. Seven cases **modify** seeded data during execution; use **§4.3 teardown + §4** to reset between full UAT cycles.

---

## Missing prerequisites

These are **not** inserted by §4 SQL. All are documented in the demo pack **§1 / §3** — DevOps or lead tester applies once before UAT.

| # | Prerequisite | Required for | Documented |
|---|--------------|--------------|:----------:|
| 1 | Migrations through `20260711120001` (Phase 6B enum + body) | Director, approvals RLS, SETUP-001 | §3 step 1 |
| 2 | Migration `20260712120000` (`offer_events.event_type` includes `sent`) | PH-UAT-V1, offer_events in §4 | §4 comment |
| 3 | Phase 5Q journey templates (`cross_sell_coaching_abroad`) | Q1, Q2, OFF-AUTO-001 | §1 |
| 4 | Phase 5U margin floors (coaching 75%, admission 85%) | U1, U2 | §1 |
| 5 | Wallet multiplier / unlock bands | WALLET-001, HOME-001 | §1 |
| 6 | **`service_library`** row matching IELTS/coaching | UNCL-001 classify UI, W2 Option A | §3 step 4 |
| 7 | Lovable Publish + edge functions (`incentive-calculate-run`) | Q4, T3 calculate/lock | §3 step 2 |
| 8 | Hub period bar **`2026-06`** | Most hub screens | §3 step 6 |
| 9 | System calendar month **`2026-06`** (recommended) | Client promotions strip / `fn_suggest_offer_for_client` wallet lookup uses `current_date` | ⚠ add to runbook |

**Count:** 9 environment prerequisites (0 missing from documentation; item 9 should be explicit in tester runbook).

---

## Missing users

All UAT actors are defined in demo pack **§2.1**. §4 SQL updates profile names/branches when auth users exist.

| Email | Role / modules | UAT cases | Status |
|-------|----------------|-----------|--------|
| `ph.counselor1@flowlink.demo` | counselor | Priya — home, give discount, client workspace | ✓ §2.1 + §4 |
| `ph.counselor2@flowlink.demo` | counselor | Rohit — HOME-002, HOME-003 | ✓ §2.1 + §4 |
| `ph.manager@flowlink.demo` | manager | TEAM-001, S4, WALLET-002, R4 | ✓ §2.1 + §4 |
| `ph.admin@flowlink.demo` | admin | Command center, queues, incentives | ✓ §2.1 + §4 |
| `ph.director@flowlink.demo` | director | 6B-001 | ✓ §2.1 + §4 |
| `ph.telecaller@flowlink.demo` | telecaller | TC-001 | ✓ §2.1 + §4 |
| `ph.marcom@flowlink.demo` | counselor + **`offers`** + **`offers_ai`** edit | Offers studio, PROMO-001, OFF-AI-001 | ✓ §2.1 + §4 |

**Missing users:** **0** (when §2.1 setup is completed).

---

## Missing permissions

| Test ID | Permission required | §2.1 documents? |
|---------|---------------------|:-----------------:|
| PH-UAT-PROMO-001 | MarCom: `offers` edit | ✓ |
| PH-UAT-OFF-AI-001 | MarCom: `offers_ai` edit (or admin) | ✓ |
| PH-UAT-OFF-LIB-001 … OFF-SEG-001 | MarCom: `offers` edit | ✓ |
| PH-UAT-6B-001 | Director role only (no admin/manager) | ✓ |
| PH-UAT-WALLET-002 | Manager role | ✓ |
| PH-UAT-S4 | Manager + admin | ✓ |

**Missing permissions:** **0** (when §2.1 module assignments match the table).

---

## Missing records

§4 seed rows referenced by UAT (verified present):

| Record | UUID / key | UAT cases | In §4? |
|--------|------------|-----------|:------:|
| Demo clients ×6 | `c1000001`–`c1000006` | Most | ✓ |
| Offers ×7 | `a0200001`–`a0200007` | Library, give discount, A/B | ✓ |
| Legacy service offer | `a0010001` | 6D-001 | ✓ |
| Wallets ×4 | `a0020001`–`a0020004` | Home, period close, branch pool | ✓ |
| Qualifying events | `a00e0001`–`a00e0004` | Revenue, unclassified | ✓ |
| Verified payments | `a00d0001`–`a00d0004` + invoices | T1, T2, UNCL-001, events | ✓ |
| Discount approvals | `d1000001`–`d1000004` | S4, S1, S3 | ✓ |
| Promotion requests | `a00f0001`–`a00f0003` | PROMO-001, W1 | ✓ |
| Wallet exception | `e1000001` | W1, HOME-003 (verify seed row) | ✓ |
| Incentive run / lines | `a0050001`, `a0060001`, `a0060002` | HOME-001, Q4, INC-RUN-001 | ✓ |
| Wallet allocation | `a0080001` | V1, V2 | ✓ |
| Performance score | `a0100001` | U3 | ✓ |
| Offer events | sent + redeemed on `a0200001` | V1 | ✓ (needs migration #2) |
| A/B experiment | `ab100001`, variants, `a1000001` | R1, R2, R3 | ✓ |
| Journey enrollment | `a00a0001` | Q1, Q2 | ✓ (if 5Q migration) |
| Branch contest | `a0090001` | INC-COMP-001 | ✓ |
| Contest branch revenue | `a00e0007`, `a00e0008` (Ajwa) | INC-COMP-001 standings | ✓ §4.4 |
| Campaign calendar ×3 | `cc100001`–`cc100003` | OFF-CAL-001 | ✓ §4.4 |
| Segments ×3 | `a0110001`–`a0110003` | OFF-SEG-001 | ✓ §4.4 |
| Auto-rules ×3 | `a0140001`–`a0140003` | OFF-AUTO-001 | ✓ §4.4 |
| Lifecycle offers ×6 | `a0200008`–`a0200013` | OFF-LIB-001 filters | ✓ §4.4 |
| Analytics ROI events | `a0220001`–`a0220008`, invoice attribution | V2, analytics | ✓ §4.4 |
| Plan rules + slabs | `a0160001`, `a0160002`, `a0170001`–`a0170002` | INC-PLAN-001 | ✓ §4.4 |
| Rohit team metrics | `a00e0005`, `a00e0006`, `a0100002`, `a0060003` | TEAM-001, HOME-002 | ✓ §4.4 |
| Plan / payout | `a0040001`, `a0070001` | INC-PLAN-001, INC-PAY-001 | ✓ |

**Soft gaps** (not blocking execution; dynamic or migration-backed):

| Gap | Impact | Mitigation |
|-----|--------|------------|
| No pre-seeded `client_offer_suggestion_dismissals` | Q3 creates row in-step | `fn_suggest_offer_for_client` returns suggestion for `c1000002` (allied upsell) |
| OFF-NEW-001 creates new offer UUID | Expected in-step | Not a setup gap |
| PROMO-001 publish `a00f0003` | Creates new draft in-step | `a00f0003` stays `approved` until tester publishes |

**Missing records (blocking):** **0**

---

## Per-case matrix (51 / 51)

| Test ID | Covered | Demo anchors |
|---------|:-------:|--------------|
| PH-UAT-SETUP-001 | ✓ | 6 clients, readiness RPC |
| PH-UAT-6A-001 | ✓ | Priya, hub nav |
| PH-UAT-6E-001 | ✓ | Theme shell (no rows) |
| PH-UAT-W1 | ✓ | Queue seeds |
| PH-UAT-W2 | ✓* | Blockers + classify/resolve in-step |
| PH-UAT-W3 | ✓ | Static page |
| PH-UAT-CC-001 | ✓ | Queue links |
| PH-UAT-EXEC-001 | ✓ | `a00e0001–3` |
| PH-UAT-HOME-001 | ✓ | `a0020001`, `a0030001`, `a0050001` |
| PH-UAT-HOME-002 | ✓ | `a0020002` |
| PH-UAT-HOME-003 | ✓* | `e1000001` or submit in-step |
| PH-UAT-Q4 | ✓* | `a0060001`, `a0060002` — update in-step |
| PH-UAT-T2 | ✓ | `c1000001`, `a00d0001` |
| PH-UAT-T3 | ✓* | `a0050001` — lock/recalc in-step |
| PH-UAT-U3 | ✓ | `a0010001` |
| PH-UAT-V1 | ✓ | `offer_events`, `a0080001` |
| PH-UAT-TEAM-001 | ✓ | Manager, `a00e0001–3` |
| PH-UAT-R4 | ✓ | Period context |
| PH-UAT-TC-001 | ✓ | Telecaller user |
| PH-UAT-S2 | ✓ | `c1000003`, `a0200001` |
| PH-UAT-U1 | ✓ | `c1000003`, floor preview |
| PH-UAT-S1 | ✓ | `d1000003` pattern |
| PH-UAT-S3 | ✓ | `a0200004`, `d1000004` |
| PH-UAT-6C-001 | ✓ | Mobile give discount |
| PH-UAT-WALLET-001 | ✓ | Migration bands |
| PH-UAT-WALLET-002 | ✓* | `a0020003` — allocate in-step |
| PH-UAT-UNCL-001 | ✓ | `a00e0004`, `a00d0004` |
| PH-UAT-S4 | ✓ | `d1000002–4` |
| PH-UAT-U2 | ✓* | Floor policy — edit in-step |
| PH-UAT-6B-001 | ✓ | Director, approvals queue |
| PH-UAT-PROMO-001 | ✓ | `a00f0001–3`, publish in-step |
| PH-UAT-OFF-LIB-001 | ✓ | `a0200001–7` |
| PH-UAT-OFF-NEW-001 | ✓* | Creates draft in-step |
| PH-UAT-V2 | ✓ | `a0080001` |
| PH-UAT-OFF-CAL-001 | ✓ | `a0200001` Jun 2026 |
| PH-UAT-OFF-AUTO-001 | ✓ | 5Q journey template |
| PH-UAT-Q2 | ✓ | `a00a0001` |
| PH-UAT-R1 | ✓ | `ab100001` |
| PH-UAT-R3 | ✓* | Complete experiment in-step |
| PH-UAT-OFF-AI-001 | ✓ | MarCom + `offers_ai` |
| PH-UAT-OFF-SEG-001 | ✓ | UI shell |
| PH-UAT-Q1 | ✓ | `c1000001`, `a00a0001` |
| PH-UAT-Q3 | ✓ | `c1000002`, dismiss in-step |
| PH-UAT-T1 | ✓ | `c1000001`, `a00d0001` |
| PH-UAT-R2 | ✓ | `c1000005`, `a1000001` |
| PH-UAT-6D-001 | ✓ | `c1000006`, `a0010001` |
| PH-UAT-INC-PC-001 | ✓ | `a0020001–4` |
| PH-UAT-INC-RUN-001 | ✓ | `a0050001`, `a0060001` |
| PH-UAT-INC-PLAN-001 | ✓ | `a0040001` |
| PH-UAT-INC-COMP-001 | ✓* | `a0090001` — standings may be empty |
| PH-UAT-INC-PAY-001 | ✓ | `a0070001` |

\* = **mutating test** — see below.

---

## Mutating tests (7)

These use seeded baselines but **change database state** during steps. Re-run **§4.3 teardown + §4** between full UAT passes.

| Test ID | What changes |
|---------|--------------|
| PH-UAT-W2 | Clears blockers (classify, approve, resolve queues) |
| PH-UAT-HOME-003 | Submits new exception (or verify seed `e1000001`) |
| PH-UAT-Q4 | Admin updates `a0060002` earned amount |
| PH-UAT-T3 | Admin locks/recalculates run |
| PH-UAT-WALLET-002 | Branch pool allocation |
| PH-UAT-U2 | Edits coaching margin floor |
| PH-UAT-R3 | Completes A/B experiment |

Also mutates but low impact: **OFF-NEW-001** (new draft offer), **PROMO-001** (publish), **Q3** (dismissal row), **S2** (instant apply).

---

## Recommended execution order

1. Complete **§3** prerequisites (migrations, users, service_library, publish).
2. Run **§4** seed.
3. Set period **`2026-06`** (hub bar + calendar month).
4. Run **HOME-003** before **W2** (wallet exception queue).
5. Run **R1** before **R3**.
6. After full pass: **§4.3 teardown → §4** to reset.

---

## Traceability

| Document | Role |
|----------|------|
| [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) | 51 test cases |
| [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) | Users + seed SQL |
| [`PERFORMANCE_HUB_UAT_READY.md`](./PERFORMANCE_HUB_UAT_READY.md) | Deploy smoke |
| This report | Coverage audit |
