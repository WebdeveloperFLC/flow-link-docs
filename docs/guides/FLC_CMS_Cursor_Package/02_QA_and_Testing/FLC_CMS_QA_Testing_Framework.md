# Future Link CMS — AI-Driven QA & Testing Framework

**Version:** 1.0 · **Targets:** `Future Link Flow (11)` (Vite + React + TS, Supabase, Vitest)
**Goal:** Validate **≥95% of the CMS automatically** (unit + business-rule + E2E + AI QA) **before human UAT begins**. The CMS is **not UAT-ready until the automated gate passes** (§8).

> **Build on what exists. Do not replace.** The repo already has: **Vitest** (`vitest.config.ts`, 26 specs incl. `src/incentives/lib/walletEngineE2E.test.ts`), pure-function engine logic in `*Logic.ts`, `@testing-library/react`, a Supabase SQL test (`supabase/tests/incentive_wallet_e2e.sql`), and a full UAT suite (`docs/performance-hub/`, 183 `PH-UAT-*` cases, defect tracker, sign-off). This framework **extends** all of it and adds the missing layers: **Playwright E2E, business-rule matrix, regression gating, test-data generator, AI QA agent, QA dashboard, release gate.**

---

## Part A — Test Architecture

### A.1 The five test layers
| Layer | Tool (existing/new) | Scope | Runs against |
|---|---|---|---|
| **L1 Engine/unit** | Vitest *(existing)* | Pure functions: wallet sizing, slab math, FX, eligibility, combination resolver | Seeded fixtures, no DB |
| **L2 Business-rule** | Vitest + rule matrix *(new harness, existing pattern)* | Every configurable rule (§Part C) as a table-driven test | Seeded fixtures |
| **L3 Database/RPC** | pgTAP / SQL via `supabase/tests` *(extend existing)* | RPCs, RLS, triggers, constraints | Ephemeral Supabase (local `supabase db reset`) |
| **L4 E2E** | **Playwright** *(new)* | Full user workflows across UI + DB | Seeded staging / preview |
| **L5 AI QA** | AI QA Agent *(new, §Part G)* | Cross-checks calculations, permissions, reporting, anomalies | Runs after L1–L4, reads their artifacts |

### A.2 Principle: test the engine, not the mock
Follow the existing pattern — extract business logic into framework-free `*Logic.ts` modules and unit-test them deterministically (as `walletEngineLogic.ts` already does). UI components stay thin. This keeps L1/L2 fast and L4 focused on wiring.

### A.3 Directory layout (additive)
```
src/**/lib/*Logic.ts            # L1/L2 engine logic (existing convention)
src/**/lib/*.test.ts            # L1/L2 Vitest (existing)
qa/
  rules/                        # L2 business-rule matrices (JSON/TS tables)
  generators/                   # Test-data generator (Part E)
  ai-agent/                     # AI QA agent (Part G)
  fixtures/                     # shared seed fixtures (extends demo data)
supabase/tests/                 # L3 SQL/pgTAP (existing dir)
e2e/                            # L4 Playwright (new)
  fixtures/  specs/  pages/     # POM + scenarios
playwright.config.ts            # new
docs/qa/                        # this framework + generated reports
```

### A.4 Coverage map — required modules → layers
Every module below must have L1/L2 + at least one L4 E2E path; financial modules also need L3.

| CMS module | L1/L2 engine | L3 RPC/RLS | L4 E2E | Reuses existing |
|---|---|---|---|---|
| Wallet Management | sizing, multiplier, scope-match, carry-forward, expiry | `fn_size_wallet`, `fn_close_due_wallets`, `fn_pick_discount_wallet`, `fn_wallet_scope_matches` | allocate→ledger→close | `walletEngineLogic.ts`, `walletScopeLogic.ts` |
| Offer Management | discount calc, status transitions, conflict resolution | `fn_offer_set_status`, `fn_clone_offer`, `offer_status_history` | create→approve→live→redeem | `offers` tables |
| Offer Code Management | auto/manual gen, bulk, one-time, scope limits | `generate_offer_tracking_code` | generate→redeem→track | `offer_tracking_codes` |
| Offer Proposal Workflows | proposal validity, ROI threshold | promotion-request RPCs | submit→review→approve/reject | `upi_promotions` |
| Discount Workflows | over-limit detection, approval routing | discount approval RPCs, `fn_can_review_discount_level` | give-discount→approval→apply | `GiveDiscount` |
| Incentive Management | slab eval, base config (gross/net/profit/margin), client-type rules | `incentive-calculate-run` (edge fn) | plan→run→calculate→lock | `incentiveEngineLogic.ts`, `incentiveSlabValidation.ts` |
| Incentive Payouts | earned→approved→paid→reversed/clawback, threshold, partial | `incentive_payouts`, `incentive_adjustments` | run→payout→payroll export | `incentiveFinanceExport.ts` |
| Incentive Forecasting | projection from targets/enrollments/commissions | `incentive_targets` | forecast view assertions | `incentiveContestLogic.ts` |
| Commission Management | commission calc, reversal | `upi_commission_rules` | enrollment→commission→snapshot | `upi_commissions` |
| Combination Engine | logical sum vs package price, rule resolution | `fn_resolve_combination` (new) | build combo→apply rules→price | new `service_combinations` |
| Executive/Branch/Counselor Dashboards | KPI aggregation correctness | `fn_period_command_center` | role-scoped KPI render | `PerformanceExecutive/CommandCenter/Team` |
| Reports | aggregation, grouping, consolidation | report RPCs/views | build→export CSV/XLSX/PDF | `Reports` |
| Multi-Currency | FX conversion, INR base, manual override | `fn_fx_rate`, invoice `*_in_*` | CAD invoice→INR consolidation | `fx_rates`, `IncentiveFxRates` |
| Approval Workflows | routing, escalation, director read-only | approval RPCs, RLS | each approval type path | `PerformanceApprovals` |
| Audit Trails | append-only, completeness | `offer_events`, `*_audit` | mutate→assert audit row | existing audit tables |

---

## Part B — Playwright E2E Test Plan

### B.1 Setup (new)
```bash
npm i -D @playwright/test
npx playwright install chromium
```
`playwright.config.ts`: `baseURL` from env, `storageState` per role (auth once, reuse), trace on first retry, HTML + JSON reporter (the JSON feeds the QA dashboard and AI agent). Tests run against a **seeded staging/preview** DB created by the Test Data Generator (Part E), period bar `2026-06`.

### B.2 Page Object Model
One POM class per surface (`e2e/pages/`): `GiveDiscountPage`, `OfferStudioPage`, `WalletPolicyPage`, `IncentiveRunPage`, `PayoutDeskPage`, `ExecutiveDashboardPage`, `ApprovalsPage`, `CombinationBuilderPage`. Selectors via stable `data-testid` (add where missing during the UI rebuild — a deliverable of the transformation work).

### B.3 Authentication fixtures
Seed the 8 CMS roles (super, admin, regional/director, branch, lead, counselor, visa, finance) plus the existing `ph.*@flowlink.demo` users. Capture `storageState` per role so specs run as the right actor and **permission paths are part of E2E**.

### B.4 The golden-path scenario (your example, fully automated)
**`e2e/specs/golden-lifecycle.spec.ts`** — one test, asserted at every hop:
```
Lead created            → assert lead row + appears in counselor queue
Client created          → assert client row, stage history
Wallet applied          → assert wallet_allocations row, wallet_ledger debit, balance_after
Offer applied           → assert client_offers, offer_discount_amount on invoice, offer_events('redeemed')
Invoice generated       → assert client_invoices (subtotal, offer_discount, final), invoice_stage
Payment received        → assert client_invoice_payments, invoice_locked flips true (lock rule)
Incentive calculated    → run incentive-calculate-run; assert incentive_line_items.earned_amount
Dashboard updated       → assert Executive/Team KPI reflects the new revenue + wallet spend
```
Each hop verifies **UI state AND the underlying row** (Playwright + Supabase client assertion helper `expectRow(table, match)`).

### B.5 Full E2E scenario catalog (build all)
| Spec | Workflow | Key assertions |
|---|---|---|
| `golden-lifecycle` | lead→…→dashboard (B.4) | every hop above |
| `wallet-lifecycle` | allocate → consume → carry-forward → expire/close | ledger integrity, `rollover_policy`, `fn_close_due_wallets` |
| `wallet-overlimit` | discount > cap → approval required → approve → apply | `exceeded_cap`, approval routing |
| `offer-lifecycle` | draft → pending → approve → schedule → live → expire | `offer_status` transitions, history |
| `offer-conflict` | two eligible offers → resolution strategy applied | priority/stackable/ceiling |
| `offer-code` | auto + manual + bulk generate → redeem → one-time exhaustion | code caps, redemption events |
| `promotion-proposal` | counselor submit → manager → director → launch/reject | ROI threshold gating |
| `combination-logical` | group services → composed price → existing rules apply | sum price, rule links |
| `combination-package` | package price + custom rules → profitability | `package_price`, custom incentive |
| `eligibility-existing-client` | client active in IELTS → IELTS offer blocked, Germany allowed | `offers_eligible_for_client` + new rule |
| `invoice-lock` | apply discount pre-finalize OK → post-payment blocked → override (authorised) | lock flags, override audit |
| `incentive-run` | plan → calculate → preview → approve → lock | run status, line items |
| `payout-cycle` | monthly/quarterly run → threshold gate → partial → payroll export | `payout_status`, `accounting_ap_bill_id` |
| `clawback-refund` | refund → incentive adjustment/clawback recomputed | `incentive_adjustments` |
| `commission` | enrollment → commission rule → snapshot → invoice | `upi_commissions` |
| `multicurrency` | CAD invoice → INR consolidation → manual FX override | `fn_fx_rate`, `*_in_inr` |
| `dashboards-by-role` | exec/branch/counselor render scoped KPIs | role data isolation (RLS) |
| `approvals-by-type` | discount / wallet exception / offer / incentive-plan | routing + director read-only |
| `multicompany-consolidation` | two `firm_entity_id` → consolidated report | grouping correctness |
| `audit-completeness` | perform each mutation → audit row exists | append-only coverage |

### B.6 E2E acceptance
All catalog specs green on Chromium; golden-path also on mobile viewport (390px). Flaky tests quarantined, not skipped.

---

## Part C — Business-Rule Validation Tests

### C.1 Table-driven rule matrix (L2)
Each configurable rule is a row in a matrix file (`qa/rules/*.rules.ts`) with `{ id, given, when, then, severity }`, executed by one harness so adding a rule = adding a row. Rules are **financial-critical** (must pass 100%) or standard.

### C.2 Required rule coverage
| Rule group | Cases (examples) | Critical? |
|---|---|---|
| Wallet limits | spend ≤ `max_amount_per_client`; % ≤ `max_percent_per_client`; over-limit → `exceeded_cap=true` + approval | ✅ |
| Wallet carry-forward | `expire`/`partial`(cap)/`full` produce correct next-period base | ✅ |
| Wallet expiry | past `valid_to` → not spendable; `grace_days` honored; `fn_close_due_wallets` closes | ✅ |
| Wallet scope | service/country/institution scope match & mismatch | ✅ |
| Offer eligibility | audience new/existing/re-enrolled; `per_client_limit`; validity window | ✅ |
| Existing-client restriction | active service blocks same-service offer; allows different service | ✅ |
| Offer conflict | best-for-client / priority / non-stackable / ceiling | ✅ |
| Invoice lock | discount allowed pre-finalize; blocked after approve/payment/closed; override audited | ✅ |
| Incentive eligibility | base = gross/net/profit/margin; discounts reduce base per toggle; client-type formula | ✅ |
| Incentive slab | threshold boundaries (just-below / at / just-above), flat/per-unit/percent/slab | ✅ |
| Payout cycle | monthly/quarterly/half/yearly/custom; min threshold gate; carry-below; partial | ✅ |
| Refund adjustment | refund reduces earned; recompute on reversal | ✅ |
| Clawback | clawback amount + sign + audit | ✅ |
| Multi-currency | INR base, CAD/USD conversion via `fn_fx_rate`, manual override precedence | ✅ |
| Multi-company | rows grouped by `firm_entity_id`; consolidation = sum across entities | ✅ |
| Combination pricing | logical = Σ services; package = `package_price`; discount = Σ − package | ✅ |
| Approval routing | auto/manager/director/multi-level by amount & risk; director read-only | ✅ |

### C.3 Boundary discipline
For every numeric rule, test **just-below / exactly-at / just-above** the threshold. For every money rule, assert in **both INR and the original currency**. Use `decimal.js` (already a dependency) — never float — for all money assertions.

---

## Part D — Regression Testing Strategy

### D.1 Triggers → suites (CI-enforced)
| Change touches | Auto-run |
|---|---|
| `supabase/migrations/**` | L3 (pgTAP/SQL) + L2 financial rules + regenerate `types.ts` + typecheck |
| `**/*Logic.ts`, `qa/rules/**` | full L1 + L2 |
| `offers`, `incentive_*`, `wallet_*`, `service_combinations` code | L2 affected groups + matching L4 specs |
| `src/**/*.tsx` (UI) | typecheck + affected L4 specs + visual snapshot diff |
| any | lint + typecheck + L1 (always) |

### D.2 Pipeline (GitHub Actions or CI of choice)
```
on PR:   lint → typecheck → L1 → L2 → L3(ephemeral supabase) → L4(smoke: golden-path) → AI QA(diff mode) → gate
nightly: full L4 catalog + full AI QA + coverage report → QA dashboard
on main: full gate before deploy; block on §8 criteria
```

### D.3 Anti-regression rules
- A fixed bug gets a regression test **named after its ID** (e.g. `regression/PH-R-001.test.ts` asserts wallet KPI uses `month_to_month`, not `personal`). The 28 known PH-R issues each get one.
- Snapshot critical financial outputs (incentive run totals, payout amounts) as golden files; diffs require explicit review.
- Coverage ratchet: PRs may not lower coverage below the current threshold.

---

## Part E — Test Data Generator Strategy

### E.1 Purpose
Deterministically generate a realistic CMS environment so any layer can run from a clean state. Extends the existing `PERFORMANCE_HUB_DEMO_DATA.md` seed rather than inventing a parallel scheme.

### E.2 Design
- **Location:** `qa/generators/` (TS) + an idempotent SQL emitter for Supabase seeding.
- **Deterministic:** fixed seed → identical UUIDs/values (so assertions are stable). Mirrors the existing fixture style in `walletEngineE2E.test.ts` (fixed UUID namespaces, period `2026-06`).
- **Layered builders** (compose, FK-safe order): `firm_entity → branches → departments → users(roles) → leads → clients → service enrollments → invoices → payments → wallets+allocations+ledger → offers+codes+redemptions → incentive plans+runs+line items+payouts → commissions`.
- **Profiles:** `minimal` (smoke), `realistic` (8 branches incl. Vadodara×5, Bharuch, Anand, Toronto; 14 named counselors; INR+CAD), `stress` (thousands of clients/allocations for performance), `edge` (boundary cases: at-limit wallets, expiring offers, locked invoices, clawbacks).
- **Output modes:** direct Supabase insert (service-role, staging only) **or** SQL file for review.

### E.3 Generator interface (implement)
```ts
// qa/generators/index.ts
export interface GenProfile { name:'minimal'|'realistic'|'stress'|'edge'; seed:number; period:string; }
export function generate(p: GenProfile): GeneratedEnv;          // in-memory graph
export function toSQL(env: GeneratedEnv): string;               // idempotent upserts
export async function apply(env: GeneratedEnv, client): Promise<void>; // staging only
// Entities: company, branch, department, user, lead, client, invoice,
// walletTxn, offerUsage, incentiveRecord, commissionRecord — all FK-consistent.
```
### E.4 Safety
Generator refuses to run against a non-staging URL (env allowlist). Never touches production. PII is synthetic.

---

## Part F — AI QA Dashboard

### F.1 What it shows
A route (e.g. `/qa/dashboard`, admin-only) reading the latest CI run artifacts (JSON from Vitest + Playwright + AI agent):

| Metric | Source |
|---|---|
| Total tests | sum L1–L4 |
| Passed / Failed | runner JSON |
| Critical issues | failures flagged `critical` in rule/severity metadata |
| Regression failures | failures under `regression/*` |
| Business-rule failures | failures from `qa/rules/*` (split financial vs standard) |
| Coverage % | Vitest coverage + E2E module-coverage map (Part A.4) |
| Release gate status | computed against §H, green/amber/red |
| Trend | last N runs (recharts — already a dep) |

### F.2 Implementation
Reuse existing stack: a React page with recharts, fed by a `qa-report.json` aggregator that merges runner outputs. No new backend; the aggregator is a CI step that writes the JSON to storage the dashboard reads. Drill-down lists failing tests with IDs, module, severity, and the AI agent's diagnosis (Part G).

---

## Part G — AI Validation Agent

### G.1 Role
A post-run agent (`qa/ai-agent/`) that ingests test artifacts + DB state and produces **diagnoses and recommendations** — catching what assertions miss (silent calculation drift, permission gaps, reporting mismatches). It is an analysis layer, not a replacement for deterministic tests.

### G.2 Detectors (each emits findings with severity + recommendation)
| Detector | Method |
|---|---|
| Broken workflows | Parse Playwright traces; flag hops that passed UI but left DB inconsistent (e.g. invoice paid but no ledger entry). |
| Incorrect calculations | Independently recompute incentive/wallet/FX/profitability from raw rows using a **second, simpler reference implementation**; diff vs app output (decimal-exact). |
| Missing permissions | For each role × route × mutation, assert RLS + UI guard agree; flag where UI hides but RLS allows (or vice-versa) — directly targets PH-R-006/007/008/010. |
| Reporting discrepancies | Cross-foot dashboards vs source tables (Σ branch revenue = company revenue; consolidated = Σ firm_entity). |
| Incentive errors | Re-derive earned/approved/paid/clawback chain; assert conservation (earned − reversed − clawback = net). |
| Wallet calculation errors | Re-run sizing/multiplier/carry-forward from rules; diff vs `discount_wallets` snapshot. |
| Offer eligibility issues | Replay `offers_eligible_for_client` + existing-client rule against client history; flag false allow/deny. |

### G.3 Reference-implementation principle
The agent's calculation checks use an **independent re-implementation** of each formula (kept deliberately simple, in `qa/ai-agent/reference/`). Agreement between the production engine and the reference is the signal; divergence is a finding. This catches drift no single implementation can self-detect.

### G.4 Output
`qa-ai-findings.json`: `[{ detector, severity, entity, expected, actual, recommendation }]` → feeds dashboard + gate. Severity `critical` for any financial divergence.

### G.5 Honest scope
The agent reduces missed defects; it does **not** guarantee correctness. Financial-critical paths still require the deterministic L2/L3 tests to pass independently. Treat AI findings as prioritized leads, not proof.

---

## Part H — Release Readiness Criteria (gate before UAT)

The automated gate (CI job `release-gate`) blocks promotion to UAT unless **all** hold:

| Criterion | Threshold |
|---|---|
| Critical tests passed | **100%** |
| Overall tests passed | **≥95%** |
| Financial-calculation rules (L2 critical + AI calc detectors) | **100%, zero divergence** |
| Regression suite (incl. all PH-R-* tests) | **100%** |
| Business-rule matrix (financial group) | **100%** |
| Critical security/permission findings | **0** (RLS↔UI agree for all role×route) |
| Golden-path E2E | **green** |
| Migrations applied & `types.ts` regenerated | **yes** (no TS drift) |
| Coverage | **≥ agreed threshold**, not below previous |

Gate output is the dashboard's **release status**. Amber (≥95% but a non-critical fail) requires sign-off; red blocks.

---

## Part I — UAT Strategy & Preparation

### I.1 Reuse and extend the existing UAT system
The repo already has `docs/performance-hub/PERFORMANCE_HUB_UAT.md` (183 cases, 10-field format), a defect tracker CSV, demo data, and a sign-off form. **Extend these to full CMS scope**, keeping the format and `PH-UAT-*`-style IDs (e.g. `CMS-UAT-WALLET-001`).

### I.2 Deliverables (generate)
- **UAT test cases** — per CMS module, in the existing 10-field table format (ID, area, preconditions, steps, expected, pass/fail, notes, severity, reproducible, screenshot ref). Auto-derive first drafts from the L4 E2E catalog (each E2E spec → one manual UAT case) so coverage matches.
- **UAT checklist** — environment ready, migrations applied, demo seed loaded (generator `realistic`), period `2026-06`, all 8 roles provisioned, automated gate green.
- **UAT scenarios** — narrative role-based journeys (counselor day, branch-manager approvals, finance payout run, executive review) mapping to E2E specs.
- **UAT sign-off** — extend existing sign-off form: add automated-gate evidence (dashboard screenshot + `qa-report.json` hash), per-module pass rate, outstanding-defect register, named approver per role, go/no-go.

### I.3 Entry rule
Human UAT does **not** start until Part H gate is green — i.e. ≥95% validated automatically first (the stated objective).

---

## Part J — Deliverables Checklist (what Cursor produces)

| # | Deliverable | Location | Status |
|---|---|---|---|
| 1 | Test architecture (this doc, Part A) | `docs/qa/` | spec ✔ → implement |
| 2 | Playwright config + POM + full spec catalog (Part B) | `playwright.config.ts`, `e2e/` | implement |
| 3 | Business-rule matrices + harness (Part C) | `qa/rules/` | implement |
| 4 | Regression suite + CI pipeline + PH-R-* tests (Part D) | `.github/workflows/`, `qa/regression/` | implement |
| 5 | Test-data generator (Part E) | `qa/generators/` | implement |
| 6 | AI QA dashboard (Part F) | `src/pages` route + aggregator | implement |
| 7 | AI QA agent + reference impls (Part G) | `qa/ai-agent/` | implement |
| 8 | Release-gate job + criteria (Part H) | CI | implement |
| 9 | CMS UAT cases/checklist/scenarios/sign-off (Part I) | `docs/qa/uat/` | generate from catalog |

### Build order (low-risk)
1. Test-data generator (everything depends on it).
2. Lift/extend L1+L2 engine tests for all modules; add PH-R-* regression tests.
3. Playwright setup + golden-path, then the rest of the catalog.
4. L3 SQL/pgTAP for financial RPCs/RLS.
5. AI QA agent + reference implementations.
6. QA dashboard + report aggregator.
7. CI release-gate wiring (Part H).
8. Generate CMS UAT docs from the E2E catalog.

### Guardrails
- Extend existing Vitest/`*Logic.ts`/UAT conventions; don't fork them.
- Money assertions use `decimal.js`, INR base, both-currency checks.
- Generators/agents run on **staging only** (URL allowlist); never production.
- Each fixed defect → a named regression test before close.
- AI findings are prioritized leads; financial correctness still requires deterministic tests to pass.
