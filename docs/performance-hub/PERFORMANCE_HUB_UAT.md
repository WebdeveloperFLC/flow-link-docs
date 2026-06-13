# Performance Hub — User Acceptance Testing (UAT)

**Environment:** Staging / Lovable preview after Phase **6B** publish  
**Tester quick start (non-technical):** [`PERFORMANCE_HUB_TESTER_QUICKSTART.md`](./PERFORMANCE_HUB_TESTER_QUICKSTART.md)  
**Demo data:** [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) — load before executing tests  
**Demo coverage audit:** [`PERFORMANCE_HUB_UAT_DEMO_COVERAGE.md`](./PERFORMANCE_HUB_UAT_DEMO_COVERAGE.md)
**Readiness review:** [`PERFORMANCE_HUB_READINESS_REVIEW.md`](./PERFORMANCE_HUB_READINESS_REVIEW.md) — fix/blockers before team UAT  
**UAT blockers:** [`PERFORMANCE_HUB_UAT_BLOCKERS.md`](./PERFORMANCE_HUB_UAT_BLOCKERS.md) — execution order & fix plan  
**Demo period:** `2026-06`  
**Screenshot folder:** `uat-screenshots/performance-hub/`  
**Screenshot name format:** `PH-UAT-{TestCaseID}_{YYYYMMDD}.png` (example: `PH-UAT-Q1_20260612.png`)

---

## How to use this document

Each test case includes all ten required fields. Fill in **Pass / Fail**, **Notes**, **Bug Severity**, and **Reproducible** during execution. Leave **Bug Severity** as `N/A` when the case passes.

**Severity guide**

| Level | When to use |
|-------|-------------|
| Blocker | Cannot proceed with UAT; core workflow broken |
| Critical | Major workflow broken; no workaround |
| Major | Feature wrong but workaround exists |
| Minor | Cosmetic or edge case |
| Trivial | Typo / polish |
| N/A | Test passed |

---

## Global preconditions (all tests)

- Migrations through `20260711120001` applied; Lovable Publish complete.
- Demo seed SQL from `PERFORMANCE_HUB_DEMO_DATA.md` §4 executed.
- Seven demo users exist (`ph.*@flowlink.demo`).
- Performance Hub period bar set to **`2026-06`**.

---

## Section A — Setup & shell

### PH-UAT-SETUP-001 — Demo data loaded

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-SETUP-001 |
| **2. Preconditions** | Global preconditions met. |
| **3. Steps** | 1. Run SQL: `SELECT count(*) FROM clients WHERE application_id LIKE 'PH-DEMO-%';`<br>2. Run SQL: `SELECT jsonb_pretty(fn_performance_hub_readiness_check('2026-06'));` |
| **4. Expected Result** | Six demo clients. Readiness JSON shows `period_key: 2026-06`, queue counts ≥1 for unclassified, discount approvals, promotion requests, wallet exceptions; `ready_for_period_lock: false`. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-SETUP-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-6A-001 — Hub navigation shell

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-6A-001 |
| **2. Preconditions** | Logged in as `ph.counselor1@flowlink.demo` (Priya Mehta). |
| **3. Steps** | 1. Open `/performance`.<br>2. Use hub sidebar / nav to open Command center, Give discount, Offers library (if visible).<br>3. Confirm period context bar visible on each screen. |
| **4. Expected Result** | Performance Hub shell loads; navigation works; period bar shows **2026-06** on all visited routes. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-6A-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-6E-001 — Theme tokens LIGHT / DARK / system

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-6E-001 |
| **2. Preconditions** | Logged in as Priya; on any `/performance/*` route. |
| **3. Steps** | 1. Open Performance Hub context bar theme control.<br>2. Switch to **Light**, then **Dark**, then **System**.<br>3. Observe hub background, cards, and context bar tokens. |
| **4. Expected Result** | Theme changes apply via `data-theme` / `performance-hub-theme.css` tokens; no layout break; system follows OS preference. |
| **5. Screenshot Required** | Yes (capture Dark + Light) |
| **6. Screenshot Name Format** | `PH-UAT-6E-001-light_{YYYYMMDD}.png`, `PH-UAT-6E-001-dark_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section B — Command center & readiness (5W)

### PH-UAT-W1 — Hub readiness queue counts

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-W1 |
| **2. Preconditions** | Logged in as `ph.admin@flowlink.demo`. Demo seed intact (queues not cleared). |
| **3. Steps** | 1. Open `/performance/admin`.<br>2. Locate **Hub readiness** card.<br>3. Compare counts to SQL: `fn_performance_hub_readiness_check('2026-06')`. |
| **4. Expected Result** | UI counts match RPC: unclassified payments ≥1 (`q1000004`), pending discount approvals ≥2 (`d1000002`, `d1000003`, `d1000004`), promotion requests ≥2 (`p1000001`, `p1000002`), wallet exceptions ≥1 (`e1000001`). Blockers list non-empty. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-W1_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-W2 — Clear blockers → ready for period lock

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-W2 |
| **2. Preconditions** | Admin user; fresh demo seed with blockers. |
| **3. Steps** | 1. Classify unclassified event for **PH-DEMO-004** (`q1000004`) via `/performance/admin/unclassified` or SQL Option B in demo doc.<br>2. Resolve pending discount approvals `d1000002`, `d1000003`, `d1000004` (approve/decline as appropriate).<br>3. Resolve promotion requests `p1000001`, `p1000002` and wallet exception `e1000001`.<br>4. Refresh command center; run `fn_performance_hub_readiness_check('2026-06')`. |
| **4. Expected Result** | `ready_for_period_lock: true`; blockers array empty; Hub readiness card shows green / ready state. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-W2_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | Re-seed demo data after this test if continuing UAT. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-W3 — How it works intelligence layer

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-W3 |
| **2. Preconditions** | Any authenticated user with Performance Hub access. |
| **3. Steps** | 1. Open `/performance/how-it-works`.<br>2. Scroll intelligence / phases section. |
| **4. Expected Result** | Page documents shipped intelligence layers **5Q through 5V** (cross-sell, A/B, margin floor, propensity, service floors, counselor influence). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-W3_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-CC-001 — Command center workflow rail

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-CC-001 |
| **2. Preconditions** | Admin user; period **2026-06**. |
| **3. Steps** | 1. Open `/performance/admin`.<br>2. Review period-end workflow steps (period close → calculate → lock → payouts).<br>3. Click queue links (unclassified, approvals, promotion requests). |
| **4. Expected Result** | Workflow rail renders four steps; queue links navigate to correct admin screens with non-zero counts from demo seed. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-CC-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-EXEC-001 — Executive dashboard

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-EXEC-001 |
| **2. Preconditions** | Admin user; demo qualifying events `q1000001`–`q1000003` loaded. |
| **3. Steps** | 1. Open `/performance/executive`.<br>2. Confirm period **2026-06** and branch filter if present. |
| **4. Expected Result** | Executive KPIs load without error; aggregates reflect seeded Jun-2026 revenue events. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-EXEC-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section C — Counselor home & team

### PH-UAT-HOME-001 — Wallet and earning cards (Priya)

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-HOME-001 |
| **2. Preconditions** | Priya logged in; wallet `w1000001`, target `t1000001`, run `r1000001`. |
| **3. Steps** | 1. Open `/performance`.<br>2. Read wallet card and cash / earning card. |
| **4. Expected Result** | Wallet: assigned target **₹5,00,000**, achievement ~**64%**, spendable from unlocked **₹15,000** (minus any allocations). Earning card shows ~**₹12,500** from open run `r1000001`. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-HOME-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-HOME-002 — No-target counselor copy (Rohit)

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-HOME-002 |
| **2. Preconditions** | Rohit logged in; wallet `w1000002` (`assigned_target` NULL). |
| **3. Steps** | 1. Open `/performance`.<br>2. Read wallet / target section. |
| **4. Expected Result** | No-target messaging displayed (`NO_TARGET_WALLET_NOTE`); wallet balance/unlocked still shown without achievement target bar. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-HOME-002_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-HOME-003 — Wallet exception request form

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-HOME-003 |
| **2. Preconditions** | Rohit logged in; wallet `w1000002`; no pending exception yet (or re-seed `e1000001`). |
| **3. Steps** | 1. On `/performance`, submit wallet exception: amount **5000**, reason **PH UAT exception test**.<br>2. Log in as admin; check command center wallet exception count. |
| **4. Expected Result** | Request created; appears in readiness queue; record links to Rohit wallet `w1000002`. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-HOME-003_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | Skip if `e1000001` already pending from seed. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-Q4 — Live earning ticker footer

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-Q4 |
| **2. Preconditions** | Priya logged in; run `r1000001` with line items `li100001`, `li100002`. |
| **3. Steps** | 1. Open `/performance`; note earning card total.<br>2. In another tab/session (admin), **update** `li100002` earned amount (e.g. 8000 → 9500) OR trigger calculate-run.<br>3. Wait up to 60s without full page refresh. |
| **4. Expected Result** | Cash card footer indicates live / ~60s refresh; earned total updates without manual reload (realtime or poll). |
| **5. Screenshot Required** | Yes (before + after) |
| **6. Screenshot Name Format** | `PH-UAT-Q4-before_{YYYYMMDD}.png`, `PH-UAT-Q4-after_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-T2 — Hot clients for offers list

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-T2 |
| **2. Preconditions** | Priya logged in; client **Aman Shah** (`PH-DEMO-001`, `c1000001`); verified payment `pay100001` in main seed. |
| **3. Steps** | 1. Open `/performance`.<br>2. Locate **Hot clients for offers** section. |
| **4. Expected Result** | **Aman Shah** listed with hot/warm band; propensity score ≥35 or band `hot`. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-T2_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-T3 — Realtime earning update

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-T3 |
| **2. Preconditions** | Same as PH-UAT-Q4. |
| **3. Steps** | 1. Keep `/performance` open as Priya.<br>2. Admin locks or recalculates run `r1000001` via `/incentives/admin`. |
| **4. Expected Result** | Earning snapshot updates on home without user refresh; live indicator active when subscribed. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-T3_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-U3 — WIR wallet impact card

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-U3 |
| **2. Preconditions** | Priya logged in; score `s1000001` (impact ₹80,000, used ₹10,000). |
| **3. Steps** | 1. Open `/performance`.<br>2. Locate wallet impact / WIR card. |
| **4. Expected Result** | Impact revenue **₹80,000**, wallet used **₹10,000**, ROI **8×** (or 8.0). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-U3_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-V1 — Offer influence O10 card

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-V1 |
| **2. Preconditions** | Priya logged in; offer events seeded for `o1000001` on `c1000001`. |
| **3. Steps** | 1. Open `/performance`.<br>2. Locate **Your offer influence (O10)** card. |
| **4. Expected Result** | Card visible with offers sent ≥1, redemptions ≥1, total influenced > 0 or wallet discount spent > 0. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-V1_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-TEAM-001 — Team performance view

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-TEAM-001 |
| **2. Preconditions** | Manager logged in; events `q1000001`–`q1000003` for Priya. |
| **3. Steps** | 1. Open `/performance/team`.<br>2. Confirm period bar shows **2026-06**.<br>3. Find Priya Mehta revenue breakdown. |
| **4. Expected Result** | Team view loads; Priya shows core + allied revenue from seeded events; period matches command center. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-TEAM-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-R4 — Period bar sync across hub

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-R4 |
| **2. Preconditions** | Admin or manager; period **2026-06** selected on command center. |
| **3. Steps** | 1. Set period to **2026-06** on `/performance/admin`.<br>2. Visit `/performance/team`, `/incentives/plans`, `/performance/offers/analytics` without changing period.<br>3. Compare period labels. |
| **4. Expected Result** | All screens show the same period **2026-06** from shared Performance period context. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-R4_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-TC-001 — Telecaller home layout

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-TC-001 |
| **2. Preconditions** | Tara Telecaller logged in (`ph.telecaller@flowlink.demo`); no higher role. |
| **3. Steps** | 1. Open `/performance`. |
| **4. Expected Result** | Telecaller-specific home (`PerformanceTelecallerHome`); counselor wallet/earning cards not shown. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-TC-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section D — Give discount & wallets (5S, 5U, 6C)

### PH-UAT-S2 — Instant apply small discount

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-S2 |
| **2. Preconditions** | Priya logged in; client **Farhan Ali** (`PH-DEMO-003`); offer **PH Demo · FL 10% IELTS** (`o1000001`); wallet `w1000001` has spendable balance. |
| **3. Steps** | 1. Open `/performance/give-discount`.<br>2. Select client `PH-DEMO-003`, offer `o1000001`.<br>3. Enter **10%** discount on reference amount ≤ ₹50,000.<br>4. Submit. |
| **4. Expected Result** | Approval level **instant**; discount applies without manager queue; wallet debited or allocation created; no admin escalation. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-S2_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | Historical applied row: `d1000001`. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-U1 — Admission 85% margin floor preview

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-U1 |
| **2. Preconditions** | Priya logged in; client `PH-DEMO-003`; admission service line selected. |
| **3. Steps** | 1. Open `/performance/give-discount`.<br>2. Select admission / university application line.<br>3. Enter **25%** discount on ₹1,00,000 reference.<br>4. Review margin preview before submit. |
| **4. Expected Result** | Preview shows **85% minimum net** floor for `admission_services` (5U); net after discount 75% flagged below floor. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-U1_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | Seeded pending row: `d1000003`. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-S1 — Below-floor escalates to admin

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-S1 |
| **2. Preconditions** | Priya logged in; client `PH-DEMO-003`; below-floor scenario from PH-UAT-U1. |
| **3. Steps** | 1. Submit the below-floor discount request from PH-UAT-U1.<br>2. Open `/performance/admin/approvals` as admin. |
| **4. Expected Result** | New or updated request at **admin** level with `below_floor=true`; appears as `d1000003` pattern; floor badge visible. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-S1_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-S3 — Full waiver blocked for counselor

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-S3 |
| **2. Preconditions** | Priya logged in; offer **PH Demo · Full Waiver** (`o1000004`, 100%). |
| **3. Steps** | 1. Open `/performance/give-discount`.<br>2. Select client `PH-DEMO-003` and waiver offer `o1000004`.<br>3. Attempt submit as counselor. |
| **4. Expected Result** | UI or API blocks counselor from submitting 100% waiver (`block_counselor_waiver`); error or disabled submit; seeded pending `d1000004` shows admin-only path. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-S3_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | Repeat as admin — submit should be allowed. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-6C-001 — Mobile give discount layout

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-6C-001 |
| **2. Preconditions** | Priya logged in; browser devtools device width **390px**. |
| **3. Steps** | 1. Open `/performance/give-discount` at 390px width.<br>2. Select client `PH-DEMO-003`.<br>3. Scroll form; attempt submit. |
| **4. Expected Result** | Single-column mobile layout; sticky submit bar visible at bottom; simplified field set per Phase 6C. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-6C-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-WALLET-001 — Wallet policy bands

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-WALLET-001 |
| **2. Preconditions** | Admin logged in. |
| **3. Steps** | 1. Open `/performance/wallet/policy`.<br>2. Review multiplier and unlock bands. |
| **4. Expected Result** | Migration-seeded bands visible; page loads without error. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-WALLET-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-WALLET-002 — Branch pool allocation

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-WALLET-002 |
| **2. Preconditions** | Manager logged in; branch pool `w1000003` balance ₹50,000; Priya wallet `w1000001`. |
| **3. Steps** | 1. Open `/performance/wallet/branch-pool`.<br>2. Allocate **₹5,000** to Priya Mehta for period **2026-06**.<br>3. Log in as Priya; check wallet spendable balance. |
| **4. Expected Result** | Pool balance decreases by ₹5,000; Priya wallet topup/applied allocation increases spendable amount. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-WALLET-002_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section E — Admin queues

### PH-UAT-UNCL-001 — Unclassified payments queue

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-UNCL-001 |
| **2. Preconditions** | Admin logged in; event `q1000004` for **PH-DEMO-004** (₹22,000, no `master_key`). |
| **3. Steps** | 1. Open `/performance/admin/unclassified`.<br>2. Locate **Unclassified Pay Client** / `PH-DEMO-004`. |
| **4. Expected Result** | One row showing ₹22,000; counselor Priya Mehta; classify action available. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-UNCL-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-S4 — Approvals depth matrix and floor badges

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-S4 |
| **2. Preconditions** | Demo approvals `d1000002` (manager), `d1000003` (admin/below floor), `d1000004` (waiver). |
| **3. Steps** | 1. Open `/performance/admin/approvals` as **manager** — review `d1000002`.<br>2. Log in as **admin** — review `d1000003`, `d1000004`. |
| **4. Expected Result** | Manager sees only manager-level pending; admin sees admin queue with floor badges and waiver flag on `d1000004`. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-S4-manager_{YYYYMMDD}.png`, `PH-UAT-S4-admin_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-U2 — Edit coaching margin floor on approvals

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-U2 |
| **2. Preconditions** | Admin logged in; policy `coaching_services` min net **75%** seeded (5U). |
| **3. Steps** | 1. On `/performance/admin/approvals`, open margin floor admin section.<br>2. Change coaching floor from 75% to 70%; save.<br>3. Re-open give discount for coaching line; verify preview uses new floor. |
| **4. Expected Result** | Floor policy updates; coaching discount preview reflects new **70%** minimum net. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-U2_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | Restore 75% after test if needed. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-6B-001 — Director read-only on approvals

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-6B-001 |
| **2. Preconditions** | Director logged in (`ph.director@flowlink.demo`); pending approvals from seed. |
| **3. Steps** | 1. Open `/performance/admin/approvals`.<br>2. Attempt approve/decline on `d1000002`. |
| **4. Expected Result** | Director **can view** queue rows; approve/decline actions **blocked** (`fn_assert_not_director_read_only` / UI disabled). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-6B-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-PROMO-001 — Promotion requests queue

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-PROMO-001 |
| **2. Preconditions** | MarCom logged in; requests `p1000001` (pending), `p1000002` (in_review), `p1000003` (approved). |
| **3. Steps** | 1. Open `/performance/offers/requests`.<br>2. Verify three demo titles visible.<br>3. Publish **PH Demo · Approved publish ready** (`p1000003`). |
| **4. Expected Result** | All three statuses render; publish creates draft offer linked to request; status → `published`. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-PROMO-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section F — Offers studio

### PH-UAT-OFF-LIB-001 — Offers library listing

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-OFF-LIB-001 |
| **2. Preconditions** | MarCom logged in; offers `o1000001`–`o1000005` seeded. |
| **3. Steps** | 1. Open `/performance/offers/library`.<br>2. Filter/search **PH Demo**. |
| **4. Expected Result** | Active offers (`o1000001`–`o1000004`, `o1000006`, `o1000007`) and draft `o1000005` listed with correct funding badges (FL / university / joint). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-OFF-LIB-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-OFF-NEW-001 — New offer wizard

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-OFF-NEW-001 |
| **2. Preconditions** | MarCom logged in. |
| **3. Steps** | 1. Open `/performance/offers/new`.<br>2. Create draft offer **PH UAT Wizard Test** (10%, FL-funded, coaching).<br>3. Save draft. |
| **4. Expected Result** | Draft saved with status `draft`; appears in library (new UUID — not demo fixed IDs). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-OFF-NEW-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-V2 — Offer analytics period alignment

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-V2 |
| **2. Preconditions** | MarCom logged in; period **2026-06**; wallet allocations in June. |
| **3. Steps** | 1. Open `/performance/offers/analytics`.<br>2. Confirm period label matches hub period bar.<br>3. Change period on command center; return to analytics. |
| **4. Expected Result** | Analytics wallet impact metrics follow shared period context (5V). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-V2_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-OFF-CAL-001 — Offers calendar

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-OFF-CAL-001 |
| **2. Preconditions** | MarCom logged in; offers valid Jun 2026 (`o1000001`). |
| **3. Steps** | 1. Open `/performance/offers/calendar`.<br>2. Navigate to June 2026. |
| **4. Expected Result** | **PH Demo · FL 10% IELTS Coaching** appears on calendar in validity window. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-OFF-CAL-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-OFF-AUTO-001 — Automation templates

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-OFF-AUTO-001 |
| **2. Preconditions** | MarCom logged in; journey templates from migration 5Q. |
| **3. Steps** | 1. Open `/performance/offers/automation`. |
| **4. Expected Result** | **IELTS → Study abroad cross-sell** template (`cross_sell_coaching_abroad`) listed and active. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-OFF-AUTO-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-Q2 — Journey enrollments view

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-Q2 |
| **2. Preconditions** | Enrollment `je100001` for Aman Shah OR eligible coaching-only client without enrollment. |
| **3. Steps** | 1. Open `/performance/offers/journeys`.<br>2. Find enrollment for **Aman Shah** / `PH-DEMO-001`.<br>3. (Optional) Run SQL: `SELECT fn_process_cross_sell_journey_enrollments(10);` and refresh. |
| **4. Expected Result** | Active enrollment visible on cross-sell journey; auto-enroll function adds eligible coaching-only clients. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-Q2_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-R1 — A/B experiment running

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-R1 |
| **2. Preconditions** | Admin logged in; experiment `ab100001` status `running`. |
| **3. Steps** | 1. Open `/performance/offers/ab-tests`.<br>2. Open **PH Demo · IELTS discount test**. |
| **4. Expected Result** | Experiment shows variants **A** (`o1000006`, 12%) and **B** (`o1000007`, 8%); status **running**. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-R1_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-R3 — Promote A/B winner

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-R3 |
| **2. Preconditions** | Experiment `ab100001` running; assignment on `c1000005`. |
| **3. Steps** | 1. On A/B tests screen, review variant stats.<br>2. Promote variant **A** as winner.<br>3. Complete experiment. |
| **4. Expected Result** | Experiment status → `completed`; winner variant A recorded; UI reflects completion. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-R3_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | Re-seed experiment if retesting R1/R2. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-OFF-AI-001 — AI studio shell

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-OFF-AI-001 |
| **2. Preconditions** | MarCom logged in. |
| **3. Steps** | 1. Open `/performance/offers/ai-studio`. |
| **4. Expected Result** | AI studio page loads without error; offer generation UI present. |
| **5. Screenshot Required** | No |
| **6. Screenshot Name Format** | N/A |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-OFF-SEG-001 — Segments builder

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-OFF-SEG-001 |
| **2. Preconditions** | MarCom logged in. |
| **3. Steps** | 1. Open `/performance/offers/segments`. |
| **4. Expected Result** | Segment builder UI loads; no fatal errors. |
| **5. Screenshot Required** | No |
| **6. Screenshot Name Format** | N/A |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section G — Client workspace

### PH-UAT-Q1 — Cross-sell promotions strip

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-Q1 |
| **2. Preconditions** | Priya logged in; client **Aman Shah** (`PH-DEMO-001`, `c1000001`); enrollment `je100001`. |
| **3. Steps** | 1. Open client profile for `PH-DEMO-001`.<br>2. Open **Promotions** strip / suggestions panel. |
| **4. Expected Result** | Cross-sell scenario shown: coaching-only client → study abroad pathway suggestion (O13 / 5Q). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-Q1_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-Q3 — Dismiss suggestion 7 days

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-Q3 |
| **2. Preconditions** | Priya logged in; client **Ritika Jain** (`PH-DEMO-002`, `c1000002`) with active suggestion. |
| **3. Steps** | 1. Open `PH-DEMO-002` promotions strip.<br>2. Dismiss suggestion.<br>3. Reload client profile. |
| **4. Expected Result** | Suggestion hidden for Priya for 7 days (`client_offer_suggestion_dismissals`); other counselors still see it if applicable. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-Q3_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-T1 — Propensity hot badge on client

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-T1 |
| **2. Preconditions** | Priya logged in; **Aman Shah** with verified payment `pay100001` (main §4 seed). |
| **3. Steps** | 1. Open `PH-DEMO-001` promotions strip. |
| **4. Expected Result** | **I5 · hot** or **warm** badge with factor bullets (verified payment, coaching-only cross-sell, recent activity). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-T1_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-R2 — A/B variant badge on client

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-R2 |
| **2. Preconditions** | Priya logged in; **AB Test Client** (`PH-DEMO-005`, `c1000005`); assignment `a1000001` variant A. |
| **3. Steps** | 1. Open `PH-DEMO-005` promotions strip. |
| **4. Expected Result** | Badge **A/B · variant A** (or variant label) on suggested offer. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-R2_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-6D-001 — Legacy service_offers convergence banner

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-6D-001 |
| **2. Preconditions** | Priya logged in; client **Legacy Reg Client** (`PH-DEMO-006`); legacy offer `PH-LEGACY-10` (`s1000001`); feature flag for convergence banner **enabled**. |
| **3. Steps** | 1. Open client **Invoice** / registration preview for `PH-DEMO-006`.<br>2. Observe offers section. |
| **4. Expected Result** | **Service offers convergence** banner visible (`ServiceOffersConvergenceBanner`); references migration from `service_offers` → `offers`. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-6D-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | If flag off, document environment config — test fails with note, not product bug. |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section H — Incentives (linked workflows)

### PH-UAT-INC-PC-001 — Period close open wallets

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-INC-PC-001 |
| **2. Preconditions** | Admin logged in; wallets `w1000001`–`w1000004` open for **2026-06**. |
| **3. Steps** | 1. Open `/incentives/period-close`.<br>2. Select period **2026-06**. |
| **4. Expected Result** | Four open wallets listed (Priya personal, Rohit personal, Genda branch pool, strategic DE). |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-INC-PC-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-INC-RUN-001 — Incentive run preview

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-INC-RUN-001 |
| **2. Preconditions** | Admin logged in; run `r1000001`, line `li100001`. |
| **3. Steps** | 1. Open `/incentives/admin`.<br>2. Open run for **2026-06**. |
| **4. Expected Result** | Run status calculated/open; Priya line item **₹12,500** visible; run not locked. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-INC-RUN-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-INC-PLAN-001 — Plans and rules

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-INC-PLAN-001 |
| **2. Preconditions** | Admin logged in; plan `pl100001`. |
| **3. Steps** | 1. Open `/incentives/plans`.<br>2. Search **PH Demo Counselor Plan**. |
| **4. Expected Result** | Plan `pl100001` visible and active for branch scope. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-INC-PLAN-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-INC-COMP-001 — Branch competition standings

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-INC-COMP-001 |
| **2. Preconditions** | Admin logged in; contest `ct100001` (Genda Circle vs Ajwa). |
| **3. Steps** | 1. Open `/incentives/competitions`.<br>2. Open **PH Demo · June branch challenge**. |
| **4. Expected Result** | Contest active for **2026-06**; both branches listed; standings reflect seeded revenue. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-INC-COMP-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

### PH-UAT-INC-PAY-001 — Payout desk

| Field | Value |
|-------|-------|
| **1. Test Case ID** | PH-UAT-INC-PAY-001 |
| **2. Preconditions** | Admin logged in; payout `py100001` for Priya. |
| **3. Steps** | 1. Open `/incentives/payouts`.<br>2. Locate Priya Mehta payout. |
| **4. Expected Result** | Approved payout net **₹11,250** (gross ₹12,500 − 10% TDS); status **approved**. |
| **5. Screenshot Required** | Yes |
| **6. Screenshot Name Format** | `PH-UAT-INC-PAY-001_{YYYYMMDD}.png` |
| **7. Pass / Fail** | ☐ Pass ☐ Fail |
| **8. Notes** | |
| **9. Bug Severity** | |
| **10. Reproducible** | ☐ Yes ☐ No |

---

## Section I — Test summary & sign-off

### Execution summary

| Metric | Count |
|--------|------:|
| Total test cases | 51 |
| Passed | |
| Failed | |
| Blocked | |
| Not run | |

### Batch UAT traceability (5Q–5W + 6A–6E)

| Batch ID | UAT test case(s) |
|----------|------------------|
| Q1 | PH-UAT-Q1 |
| Q2 | PH-UAT-Q2 |
| Q3 | PH-UAT-Q3 |
| Q4 | PH-UAT-Q4 |
| R1 | PH-UAT-R1 |
| R2 | PH-UAT-R2 |
| R3 | PH-UAT-R3 |
| R4 | PH-UAT-R4 |
| S1 | PH-UAT-S1 |
| S2 | PH-UAT-S2 |
| S3 | PH-UAT-S3 |
| S4 | PH-UAT-S4 |
| T1 | PH-UAT-T1 |
| T2 | PH-UAT-T2 |
| T3 | PH-UAT-T3 |
| U1 | PH-UAT-U1 |
| U2 | PH-UAT-U2 |
| U3 | PH-UAT-U3 |
| V1 | PH-UAT-V1 |
| V2 | PH-UAT-V2 |
| W1 | PH-UAT-W1 |
| W2 | PH-UAT-W2 |
| W3 | PH-UAT-W3 |
| 6A | PH-UAT-6A-001 |
| 6B | PH-UAT-6B-001 |
| 6C | PH-UAT-6C-001 |
| 6D | PH-UAT-6D-001 |
| 6E | PH-UAT-6E-001 |

### Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| QA / UAT lead | | | ☐ Pass ☐ Fail |
| Product | | | ☐ Pass ☐ Fail |
| Finance / admin | | | ☐ Pass ☐ Fail |
| MarCom / offers | | | ☐ Pass ☐ Fail |

---

## References

- Demo data pack: [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md)
- UAT sign-off form: [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md)
- Batch checklist (legacy): [`../INCENTIVE_PHASE5_BATCH_UAT.md`](../INCENTIVE_PHASE5_BATCH_UAT.md)
- Readiness RPC: `SELECT fn_performance_hub_readiness_check('2026-06');`
- UAT sign-off: [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md)
