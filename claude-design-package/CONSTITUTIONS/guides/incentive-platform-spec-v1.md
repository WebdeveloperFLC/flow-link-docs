# Future Link Consultants — Incentive Platform Specification

**Cash Incentives, Centralized FX, Service-Scoped Rules & Competition Layer**

| Field | Value |
|-------|-------|
| **Version** | 1.1 (as-built reference) |
| **Date** | 12 June 2026 · updated June 2026 post Phase 4 |
| **Status** | **Active — Phases 0–4 deployed** |
| **Staff guide** | [incentives-module-guide.md](./incentives-module-guide.md) — operational how-to |
| **Related docs** | [offers-discounts-wallet-ai-scope-v2.md](./offers-discounts-wallet-ai-scope-v2.md), [offers-wallet-staff-guide.md](./offers-wallet-staff-guide.md), [OFFERS_WALLET_INCENTIVE_MANIFEST.md](../../supabase/schema-export/OFFERS_WALLET_INCENTIVE_MANIFEST.md) |
| **Classification** | Confidential — Internal |

**Status legend:** ✅ BUILT · 🟡 PARTIAL · 🔲 PLANNED

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Scope boundaries](#2-scope-boundaries)
3. [Business context](#3-business-context)
4. [Centralized FX with buffer (design note)](#4-centralized-fx-with-buffer-design-note)
5. [Current implementation status](#5-current-implementation-status)
6. [Platform architecture](#6-platform-architecture)
7. [Service catalogue & Allied & Travel](#7-service-catalogue--allied--travel)
8. [Scope model — any combination of filters](#8-scope-model--any-combination-of-filters)
9. [Rule types & pay structures](#9-rule-types--pay-structures)
10. [Settlement currency policy](#10-settlement-currency-policy)
11. [Qualifying events ledger](#11-qualifying-events-ledger)
12. [Competition & gamification](#12-competition--gamification)
13. [Roles beyond counselors](#13-roles-beyond-counselors)
14. [Admin UX & navigation](#14-admin-ux--navigation)
15. [Data model (proposed extensions)](#15-data-model-proposed-extensions)
16. [Governance & audit rules](#16-governance--audit-rules)
17. [Phased implementation roadmap](#17-phased-implementation-roadmap)
18. [Example plans & scenarios](#18-example-plans--scenarios)
19. [Risks & mitigations](#19-risks--mitigations)
20. [Sign-off](#20-sign-off)
21. [Technical appendix — built inventory](#21-technical-appendix--built-inventory)

---

## 1. Executive summary

This document defines a **complete enterprise incentive platform** for Future Link Consultants (FLC). It covers:

- **Cash incentives** for counselors and other staff (targets, enrolments, revenue slabs, commissions)
- **Centralized FX policy** with a permanent buffer so client collections are not short-paid when market rates fluctuate
- **Flexible service scoping** across Coaching, Visa & Immigration, Admissions, and **Allied & Travel** — including any combination of categories, sub-categories, and individual service codes
- **Study-abroad dimensions**: country, institution, program/intake
- **Branch and individual competition** via leaderboards, contests, and team pools
- Settlement in **INR** or **destination-country currency** where campaigns require it

### Strategic objective

> Pay the right people the right amount for the right outcomes — across every service line and add-on — without manual spreadsheets, while keeping every rupee auditable and every rate defensible.

### Relationship to other modules

| Module | What it is | Relationship |
|--------|------------|--------------|
| **`incentive_*` tables** | Staff **cash** incentives | **This document** |
| **`discount_wallets`** | Counsellor discount **authority** (not cash) | Related; shares targets & achievement; separate ledger |
| **`credit_wallet`** | Client loyalty points | **Not** in scope |
| **Offers & promotions** | MarCom offer library | Net revenue for incentives subtracts applied wallet/offer discounts |

Build approach: **extend existing schema and engine** (`incentive_plans`, slabs, targets, runs, line items, payouts) — do not rebuild from scratch.

---

## 2. Scope boundaries

### In scope

- Centralized FX + buffer configuration (CRM-wide)
- Incentive plan & rule configuration (any service combination)
- Target assignment (individual, branch, role)
- Period runs: preview → calculate → approve → lock
- Payout generation, TDS fields, adjustments on locked runs
- Qualifying events from verified payments, enrolment milestones, paid commissions
- Allied & Travel revenue as first-class incentive scope
- Competition layer (leaderboards, contests, branch pools)
- Counselor-facing dashboard (targets, earned, rank, allied vs core breakdown)

### Out of scope (future)

- Full payroll system API integration (CSV export ✅ Phase 4)
- Client-facing cash incentive visibility
- Unified Performance Hub UX redesign (planned)
- Complete migration of invoice FX off static matrix (partial)

---

## 3. Business context

FLC operates across:

| Dimension | Reality |
|-----------|---------|
| **Service lines** | Coaching (IELTS, PTE, aptitude, foreign language), Visa & Immigration (multi-country), Admissions (study abroad), **Allied & Travel** (forex, insurance, SIM, documentation, ticketing, loan assist, interview prep, etc.) |
| **Study abroad** | 100s of institutions, multiple countries, intakes (Sep/Jan/May, etc.) |
| **Organization** | Multiple branches, many counselors, telecallers, documentation, branch managers |
| **Competition** | Within branch, across branches, campaign-specific (country, institution, intake) |
| **Earn basis** | Revenue targets, enrolment counts, commission received, milestone-based (offer, visa lodge) |
| **Pay types** | Fixed amount, percentage, tiered slabs |
| **Settlement** | INR default; country currency when target/campaign is country-specific |

### Why Allied & Travel matters

Add-on services (forex card, travel insurance, SIM, documentation, ticketing) are often sold **during or after the visa process**. Without explicit incentive scope for allied revenue, counselors may neglect them after core visa/admission fees are collected. This spec treats **Allied & Travel as a first-class scope**, not an afterthought.

---

## 4. Centralized FX with buffer (design note)

### 4.1 Business requirement

Finance must set FX rates centrally so that sudden market moves do not cause **short collection** from clients paying in foreign currency.

**Example:**

| Field | Value |
|-------|-------|
| Base rate | CAD → INR = **66** (manual or imported market rate) |
| Default buffer | **+2** (fixed add-on, always applied) |
| **Effective rate** | **68** (used by the entire CRM) |

Even if the market drops to 64, client-facing and collection logic uses **68** unless Finance explicitly changes the policy.

### 4.2 Formula

```
effective_rate_to_inr =
  base_rate_to_inr + buffer_fixed
  OR
  base_rate_to_inr × (1 + buffer_pct / 100)
```

Finance chooses per currency whether buffer is **fixed** or **percent**. Both may be configured; effective rate uses the configured method.

### 4.3 Purpose-specific rates ✅ (Phase 4)

| Purpose (`rate_purpose`) | Use |
|------------------------|-----|
| `general` | Fallback for all uses |
| `billing` | Invoices, payment collection (when wired) |
| `incentive_settlement` | Run calculation (engine default) |
| `payout` | Counselor payout conversion (future) |

Engine and RPC prefer purpose-specific rate, then fall back to `general`.

### 4.4 Built ✅

| Location | Behavior |
|----------|----------|
| `fx_rates` | `base_rate_to_inr`, `buffer_fixed`, `buffer_pct`, `rate_purpose` |
| RPC | `fn_effective_fx_rate_to_inr(currency, period_key, purpose)` |
| Admin UI | `/incentives/fx-rates` |
| Incentive engine | `loadFxSnapshot()` — purpose-aware; frozen at lock |
| Invoice headers | Per-invoice rate snapshotted at issue (unchanged) |

### 4.5 Remaining 🟡

| Gap | Notes |
|-----|-------|
| `src/accounting/lib/fx.ts` static matrix | Migrate invoices to centralized RPC |
| FX audit log | Change history UI 🔲 |
| API import of market rates | 🔲 |

---

## 5. Current implementation status

Verified against repository — **Phases 0–4 deployed** (June 2026).

> **Staff operations:** see [incentives-module-guide.md](./incentives-module-guide.md)

### 5.1 Built ✅ (Phases 0–4)

| Area | What exists |
|------|-------------|
| **FX + buffer** | `fx_rates` columns, `fn_effective_fx_rate_to_inr`, `/incentives/fx-rates`, purpose-specific rates |
| **Qualifying events** | `incentive_qualifying_events` + trigger on verified payment |
| **Rules & scope** | `incentive_rules`, `scope_json`, presets, `IncentiveScopeFields` UI |
| **Engine** | `incentive-calculate-run` — preview, calculate, lock; closer-wins; role filter; discount penalty |
| **Revenue** | Verified payments; net subtracts wallet allocations; ancillary + commission source types wired |
| **Dimensions** | Country, institution, intake from `cf_client_programs` + `upi_commission_students` |
| **Targets & bonuses** | Target bonuses applied; auto-suggest RPC `fn_suggest_incentive_targets` |
| **Slabs** | Continuous chain validation in UI; rule-linked slabs |
| **Payouts** | Payout desk: generate → approve → TDS → paid; CSV export; AP bill ID |
| **Adjustments** | UI on run detail for locked runs |
| **Competition** | Branch contests, campaign overlays, dimension leaderboards RPCs |
| **Counselor UI** | My Incentives — period earned, forecast, revenue mix, leaderboards |
| **Admin UI** | Plans, Admin, Run detail, Competitions, Simulator, Payout desk |
| **Role plans** | `scope_type = role` + `role_key` filter via `user_roles` |
| **Plan versions** | Snapshot on lock via `fn_snapshot_incentive_plan_version` |

### 5.2 Partial 🟡

| Capability | Gap |
|------------|-----|
| Invoice FX migration | Static matrix in `fx.ts` not fully replaced |
| `incentive_schemes` | Table unused |
| Stacking modes (exclusive/cap) | Schema concept; engine additive only |
| Enrolment milestones beyond first payment | Partial — rule milestone field exists |
| Telecaller lead attribution | Role plans ✅; lead-converted events partial |
| UX polish | Functional admin tables; unified Performance Hub 🔲 |

### 5.3 Planned 🔲

- Unified Performance Hub (incentives + wallet + offers navigation)
- Payroll API beyond CSV
- FX change audit log
- AI target recommendation beyond prior-period suggest
- Full Offer Influence / Wallet Impact revenue analytics (offers module)

### 5.4 Verdict

**Phases 0–4 complete (~90% of v1 spec).** Remaining work is UX consolidation, offers/wallet wiring, and analytics depth — not core engine gaps.

---

## 6. Platform architecture

Four layers — configuration, events, calculation, settlement/competition:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CONFIGURATION                                               │
│     Plans · Rules (scope + rate) · Targets · Campaigns         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  2. QUALIFYING EVENTS LEDGER                                    │
│     payment_verified · enrolment · commission_paid · stage_*    │
│     (each event carries dimension tags: service, country, etc.) │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  3. CALCULATION ENGINE                                          │
│     Match events → rules → slabs → per-counselor totals         │
│     Preview | Calculate | Lock (FX frozen)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  4. SETTLEMENT & COMPETITION                                    │
│     Payouts · Adjustments · Leaderboards · Branch contests      │
└─────────────────────────────────────────────────────────────────┘
```

**Principle:** Every earnable fact becomes a **normalized event** with dimensions. Rules **match** events; the engine **aggregates and pays**. New campaigns = new rules, not new code.

---

## 7. Service catalogue & Allied & Travel

### 7.1 UI tabs → database mapping

| Lead/Client tab | `master_key`(s) | Stored on client/lead |
|-----------------|-----------------|------------------------|
| Coaching | `coaching_services` | `coaching_services[]` |
| Visa & Immigration | `visa_immigration` | `visa_services[]` |
| Admissions | `admission_services` | `admission_services[]` |
| **Allied & Travel** | `allied_services` + `travel_financial` | `allied_services[]` + `travel_financial_services[]` |

### 7.2 Service library hierarchy

Each row in `service_library` (via service catalogue):

| Field | Example |
|-------|---------|
| `master_key` | `allied_services`, `travel_financial` |
| `service` / `sub_service` | Grouping |
| `sub_category` | Documentation, Ticketing, Forex & Financial, Travel Insurance, … |
| `service_code` | `ALLIED-SIM`, `TRVL-FX-STUD`, `TRVL-INS-STUD`, `ALLIED-LOAN`, … |
| `country_tag` | Canada, Germany, … (where relevant) |
| `pricing_type` | FLEXIBLE, ON_REQUEST, … |

### 7.3 Allied & Travel examples (from catalogue)

**Allied (`allied_services`):**

- Documentation: Notary, Attestation, Translation, Photocopy, Courier
- Financial: Education Loan Assistance
- Communication: SIM Card Assistance
- Interview: Mock Interview
- Appointments: Biometrics, VFS/TLS booking

**Travel & Financial (`travel_financial`):**

- Ticketing: Flight booking (one-way, return)
- Travel Insurance: Student, Super Visa (Canada)
- Medical Insurance: International student
- Forex & Financial: Forex card (student/travel), Blocked account (Germany)
- Tour Packages: Study tour, custom educational tour

### 7.4 Revenue buckets (incentive attribution)

| Bucket | `master_key` set | Use |
|--------|------------------|-----|
| `core_service_revenue` | coaching + visa + admission | Main counselor targets |
| `allied_revenue` | allied + travel_financial | Add-on push |
| `allied_only` | allied_services only | Documentation, SIM, loan |
| `travel_financial_only` | travel_financial only | Insurance, forex, tickets |
| `total_revenue` | all five masters | Monthly “everything counts” |
| `commission_revenue` | (commission tables) | B2B / institution share |

Maps to existing enum `incentive_source_type` — extend usage, not necessarily rename:

- `service_revenue` → core + optionally total when scope is all services
- `ancillary` → **allied + travel_financial** (wire in engine)
- `direct_visa_commission`, `b2b_admission_commission` → commission paths

---

## 8. Scope model — any combination of filters

Every **rule** carries a **Scope Set**. Filters within a rule combine with **AND**. Multiple rules in one plan combine with **OR** (additive stacking) unless marked exclusive.

### 8.1 Dimension list

| Group | Dimensions |
|-------|------------|
| **Org** | `branch_id`, `role_key`, `counselor_id`, `team_id` |
| **Time** | `period_key`, `period_type`, `campaign_start`, `campaign_end`, `intake_season` |
| **Service** | `master_key[]`, `sub_category[]`, `service_code[]`, `scope_preset` |
| **Country** | `country_code`, `country_tag` (on service) |
| **Admission** | `institution_id`, `program_id`, `course_id`, `intake` |
| **Milestone** | `first_payment`, `offer_received`, `visa_lodged`, `commission_paid` |
| **Metric** | `gross_revenue`, `net_revenue`, `enrolment_count`, `commission_received`, `conversion_count` |
| **Settlement** | `settlement_currency` (override plan default) |

### 8.2 Scope presets (one-click in admin UI)

| Preset key | Scope |
|------------|-------|
| `all_services` | All five master keys |
| `allied_travel` | `allied_services` + `travel_financial` (matches UI tab) |
| `all_allied` | `allied_services` only |
| `all_travel` | `travel_financial` only |
| `core_only` | coaching + visa + admission |
| `post_visa_addons` | allied + travel, milestone ≥ `visa_lodged` |

Presets are shortcuts; admins can refine with sub-categories and individual `service_code`s.

### 8.3 Combination patterns

| Pattern | Example |
|---------|---------|
| Single service | `service_code = TRVL-FX-STUD` |
| Sub-category group | `sub_category IN (Documentation, Ticketing)` |
| Master bundle | `master_key IN (allied_services, travel_financial)` |
| Total revenue | all five masters |
| Core + allied kicker | Rule A: all revenue slabs; Rule B: +₹500 per allied sale |
| Exclude set | All revenue **except** coaching |
| Country + allied | `country = Canada` + allied_travel |
| Institution + all revenue | `institution_id = X` + all masters |

### 8.4 Stacking behavior

| Mode | Behavior |
|------|----------|
| `additive` (default) | Rule earnings sum |
| `exclusive` | Highest matching rule wins |
| `cap` | Sum rules but cap at max per counselor per period |

---

## 9. Rule types & pay structures

### 9.1 Target-based (primary)

- Assign target (revenue or count) per counselor/branch/period
- Achievement % drives slab rates
- Accelerator above 100% (e.g. 100–120% = 5%, 120%+ = 7%)
- Bonus when `achievement_pct ≥ bonus_trigger_pct` (wire existing schema fields)

### 9.2 Enrolment-based (per unit)

- Fixed amount per qualifying enrolment
- Qualifying milestone configurable:
  - First verified payment (default)
  - Offer letter received
  - Visa lodged / approved
  - Commission paid

### 9.3 Revenue-based (% or slab)

- % of gross or net revenue in scope
- Tiered slabs on revenue or count
- **Must respect `metric` field** on rule/s slab

### 9.4 Commission pass-through

- % of institution commission when `commission_status = paid`
- Separate from service fee revenue

### 9.5 Team / branch pool

- Branch collective target → pool split by formula (equal, weighted by achievement, top N)
- Branch vs branch ranking in same period

### 9.6 Campaign overlay

- Time-boxed rule on top of base plan
- Auto-expires; does not mutate base plan

### 9.7 Allied-specific recommendations

| Rule | Rationale |
|------|-----------|
| Count allied separately on dashboard | Visibility drives behavior |
| Allow allied kicker when core target missed | Don’t demotivate add-ons in slow months |
| Optional milestone: allied only after `visa_lodged` | Tie to “during visa process” |
| Incentivize on **verified payment** for ON_REQUEST services | Tour packages, custom quotes |

---

## 10. Settlement currency policy

| Scenario | Currency |
|----------|----------|
| Org-wide monthly plan | **INR** (default) |
| Country campaign (e.g. Canada Sep intake) | **CAD** or INR at locked FX — Finance chooses per plan/rule |
| Institution commission share | Currency of commission row |
| Cross-border counselor on CAD target | Pay in **CAD** with FX snapshot at **run lock** |

**Rule-level override:** `incentive_plans.settlement_currency` is default; each rule may override.

On lock, store `fx_snapshot` using **centralized effective rates** (§4), not ad hoc invoice rates.

---

## 11. Qualifying events ledger

### 11.1 Purpose

Replace inline payment queries in the calculator with a **normalized, auditable event stream** that carries full dimensions for scope matching.

### 11.2 Proposed table: `incentive_qualifying_events`

| Column | Purpose |
|--------|---------|
| `id` | UUID |
| `event_type` | `payment_verified`, `enrolment`, `commission_paid`, `stage_change`, `lead_converted` |
| `event_date` | Attribution date |
| `period_key` | Pre-computed (YYYY-MM) |
| `counselor_id` | Primary earner |
| `client_id`, `branch_id` | Context |
| `amount`, `currency` | For revenue/commission events |
| `dimensions` | JSONB: master_key, service_code, sub_category, country, institution_id, intake, … |
| `source_table`, `source_id` | Audit trail |
| `created_at` | Insert time |

### 11.3 Population

| Source | Event |
|--------|-------|
| `client_invoice_payments` (verified) | `payment_verified` — **line-level** tags from invoice lines |
| Pipeline / `client_services` | `enrolment`, `stage_change` |
| `upi_commission_students` | `commission_paid` |
| `leads` | `lead_converted` |
| `cf_client_programs` (final) | Enrich dimensions: program, intake, country |

### 11.4 Payment line attribution

```json
{
  "event_type": "payment_verified",
  "amount": 4500,
  "currency": "INR",
  "dimensions": {
    "master_key": "travel_financial",
    "sub_category": "Forex & Financial",
    "service_code": "TRVL-FX-STUD",
    "service_name": "Forex Card — Student",
    "country_tag": null,
    "intake": "Sep-2026",
    "institution_id": null
  }
}
```

**Priority:** invoice line `service_code` → join catalogue → fallback client service arrays → `unclassified` queue for admin.

---

## 12. Competition & gamification

Build on existing `counselor_performance_scores` and `fn_performance_leaderboard`.

| Feature | Description |
|---------|-------------|
| **Leaderboards** | By branch, country, service line, period |
| **Contests** | Time-boxed campaigns with cash or wallet prizes |
| **Rank tiers** | Gold / Silver / Bronze by achievement band |
| **Team boards** | Branch aggregate vs other branches |
| **Counselor transparency** | Target, achieved, projected earn, rank, gap to next tier |
| **Allied vs core breakdown** | Separate tallies on My Incentives |

**Cash vs wallet:** Competition rewards may be cash (payout) or discount wallet top-up — configurable per contest; keep ledgers separate.

---

## 13. Roles beyond counselors

| Role | Typical incentive basis |
|------|-------------------------|
| **Counselor** | Revenue, enrolments, placements, allied upsell |
| **Telecaller** | Lead conversion, demo → paid |
| **Documentation** | File completion, visa lodge volume |
| **Branch manager** | Branch pool achievement, collection rate |
| **Visa officer** | Visa lodged / approved by country |

Use `role_key` + plan `scope_type` (org / branch / individual). Requires attribution fields on leads/events (e.g. `converted_by`, task assignee) where not already present.

---

## 14. Admin UX & navigation

Current **Incentives** menu (Phases 0–4):

| Screen | Route | Status | Purpose |
|--------|-------|--------|---------|
| My Incentives | `/incentives` | ✅ | Wallet + cash earned + achievement + leaderboards + revenue mix |
| Incentive Plans | `/incentives/plans` | ✅ | Plans, rules, slabs, targets, auto-suggest |
| Incentives Admin | `/incentives/admin` | ✅ | Preview / calculate / lock |
| Run detail | `/incentives/runs/:runId` | ✅ | Line-item audit + adjustments |
| FX Rates | `/incentives/fx-rates` | ✅ | Central rates + buffer + purpose |
| Competitions | `/incentives/competitions` | ✅ | Branch contests + campaign overlays |
| Simulator | `/incentives/simulator` | ✅ | What-if period comparison |
| Payout desk | `/incentives/payouts` | ✅ | Generate, approve, TDS, CSV, AP ref |
| Give Discount | `/incentives/give-discount` | ✅ | Wallet (related — see offers-wallet guide) |
| Wallet Top-ups | `/incentives/wallet-topups` | ✅ | Wallet (related) |
| Period Close | `/incentives/period-close` | ✅ | Wallet + scores (related) |

**Planned 🔲:** Unified Performance Hub shell replacing separate nav groups.

### 14.1 Rule builder UX (proposed)

Mirror lead form **Services Required** tabs:

```
Scope: Services
  ○ All services (total revenue)
  ○ Pick categories: ☑ Coaching ☑ Visa ☑ Admissions ☑ Allied & Travel
  ○ Refine Allied & Travel:
      ☑ All  ○ Documentation  ○ Ticketing  ○ Forex …
      Individual codes: ☐ ALLIED-SIM  ☐ TRVL-INS-STUD  …
  ○ Exclude: ☐ Coaching
+ Country, Institution, Intake, Branch, Role, Period, Metric, Rate type
```

---

## 15. Data model (proposed extensions)

### 15.1 Extend `fx_rates` (or new `fx_rate_policy`)

| Column | Purpose |
|--------|---------|
| `base_rate_to_inr` | Market/manual base |
| `buffer_fixed` | e.g. +2 |
| `buffer_pct` | e.g. +3% |
| `effective_rate_to_inr` | Computed/stored |
| `purpose` | `all` \| `client_billing` \| `incentive` (v1.1) |

### 15.2 New / evolved: `incentive_rules`

Evolve from `incentive_slabs` + `incentive_schemes`:

| Column | Purpose |
|--------|---------|
| `plan_id` | Parent plan |
| `name` | Human label |
| `scope_json` | Structured filters (§8) |
| `scope_preset` | Optional preset key |
| `source_type` | Maps to revenue bucket |
| `metric` | net_revenue, enrolment_count, … |
| `rate_type` | flat, percent, slab |
| `settlement_currency` | Override |
| `stacking` | additive \| exclusive \| cap |
| `priority` | Evaluation order |
| `active_from`, `active_to` | Campaign window |

Slab tiers remain child rows: `incentive_rule_slabs` (or retain `incentive_slabs` with `rule_id`).

### 15.3 `incentive_qualifying_events`

See §11.

### 15.4 Retain unchanged (extend usage)

- `incentive_plans`, `incentive_targets`, `incentive_runs`, `incentive_line_items`
- `incentive_payouts`, `incentive_adjustments`

---

## 16. Governance & audit rules

| # | Rule |
|---|------|
| G1 | **Verified payments only** for revenue (keep existing engine behavior) |
| G2 | **Locked runs immutable** — corrections via `incentive_adjustments` only |
| G3 | **FX frozen at lock** using centralized **effective rate** (base + buffer) |
| G4 | **Single primary attribution** per event; split rules explicit (e.g. 50/50) |
| G5 | **Audit trail** — every line item links to source payment / event / commission |
| G6 | **Cash ≠ wallet** — separate menus, separate ledgers |
| G7 | **Net revenue** subtracts applied wallet/offer discounts pro-rata by payment |
| G8 | **ON_REQUEST services** — earn on verified payment, not lead selection alone |
| G9 | **Admin/manager** only for calculate, lock, payout approve |

---

## 17. Phased implementation roadmap

| Phase | Status | Summary |
|-------|--------|---------|
| **0 Foundation** | ✅ Deployed | FX buffer, qualifying events, engine fixes, period-scoped earned |
| **1 Core ops** | ✅ Deployed | Rules, scope UI, payout desk, adjustments, run audit |
| **2 Study abroad** | ✅ Deployed | Institution/intake dimensions, B2B commission, rule currency override |
| **3 Competition** | ✅ Deployed | Branch contests, campaign overlays, dimension leaderboards, revenue mix |
| **4 Advanced** | ✅ Deployed | Simulator, target suggest, CSV/AP export, role plans, FX purposes |
| **5 UX & integration** | 🔲 Planned | Performance Hub, offers/wallet wiring, analytics — see offers scope v2 §23 |

Migration files: `20260618120000` through `20260618150000_incentive_platform_phase*.sql`

---

## 18. Example plans & scenarios

### 18.1 June 2026 — All India Counselor Plan

**Plan:** settlement INR, period `2026-06`

| Rule | Scope | Metric | Pay |
|------|-------|--------|-----|
| R1 Base target | all_services | net_revenue | Target ₹8L; slabs 3%/5%/7% on achievement |
| R2 IELTS push | coaching + IELTS family | enrolment_count | ₹1,500 flat per first payment |
| R3 Canada Sep-26 | country=CA, intake=Sep-2026 | enrolment_count | ₹6,000 flat; settle **CAD** |
| R4 Institution ABC | institution_id=ABC | enrolment_count | ₹10,000 campaign overlay |
| R5 Allied kicker | allied_travel | enrolment_count | ₹1,500 flat per allied sale |
| R6 Commission | b2b_admission | commission_received | 8% |
| R7 Branch pool | branch=Mumbai, all_services | net_revenue | ₹50K pool if branch ≥ ₹1.2Cr |

### 18.2 Allied-only month

**Goal:** Stop neglecting add-ons during visa season.

| Rule | Scope | Metric | Pay |
|------|-------|--------|-----|
| A1 | allied_travel | net_revenue | 10% of allied revenue |
| A2 | sub_category=Documentation | enrolment_count | ₹300 per service |
| A3 | service_codes SIM + insurance | enrolment_count | ₹800 each |

### 18.3 Combination matrix (must be configurable without code)

| # | Scenario |
|---|----------|
| 1 | Monthly counselor target — all services — net revenue slab |
| 2 | Allied push — allied_travel — 10% |
| 3 | SIM + Insurance only — specific codes — flat each |
| 4 | Documentation bundle — sub_category — flat each |
| 5 | Canada intake — country + intake — all masters — slab |
| 6 | Institution X — institution + all masters incl. allied |
| 7 | Coaching-only target |
| 8 | Everything except coaching |
| 9 | Visa + allied after visa_lodged milestone |
| 10 | Branch contest — pool split |
| 11 | Forex & insurance focus — sub_categories |
| 12 | Commission + allied — mixed rates |

---

## 19. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Invoice lines missing service metadata | Backfill from client service arrays; unclassified queue; block run until resolved (configurable) |
| Double-counting hybrid rules | Stacking modes + caps; unit tests on scenario matrix |
| FX buffer confuses counselors vs clients | Clear labeling: “collection rate” vs “payout rate” if they diverge later |
| 100s of institutions — rule explosion | Presets, campaign templates, CSV import for targets |
| Performance on large payment volumes | Event ledger + indexed period_key; chunked run inserts (already in engine) |
| Allied ON_REQUEST never invoiced | Incentivize only on verified payment event |
| Scope creep with wallet module | Strict boundary: this spec = cash; wallet spec in offers-discounts v2 |

---

## 20. Sign-off

Phases 0–4 implemented June 2026. Operational sign-off for production UAT:

| Role | Name | Date | Approved |
|------|------|------|----------|
| Finance / Operations | | | ☐ |
| HR / Payroll | | | ☐ |
| Product / CRM Owner | | | ☐ |
| Engineering Lead | | | ☐ |
| Branch Management (representative) | | | ☐ |

**Decisions recorded (defaults in production):**

1. Buffer default: **fixed +2** per currency
2. FX purposes: **split** — `incentive_settlement` vs `general` vs `billing`
3. Allied kicker: **allowed** when core target missed (configurable per plan)
4. Primary enrolment milestone: **first verified payment**
5. Country campaigns: **rule-level currency override** (CAD etc.) with FX at lock

---

## 21. Technical appendix — built inventory

### 21.1 Database tables (existing)

See [OFFERS_WALLET_INCENTIVE_MANIFEST.md](../../supabase/schema-export/OFFERS_WALLET_INCENTIVE_MANIFEST.md).

### 21.2 Edge functions

| Function | Path | Purpose |
|----------|------|---------|
| `incentive-calculate-run` | `supabase/functions/incentive-calculate-run/` | Preview / calculate / lock |

### 21.3 RPCs (related)

| RPC | Purpose |
|-----|---------|
| `fn_counselor_period_achievement` | Achievement % for period |
| `fn_size_wallet` / `fn_size_wallets_for_period` | Wallet sizing from targets |
| `fn_compute_performance_score` | Performance score |
| `fn_period_close_and_reseed` | Period close loop |
| `fn_performance_leaderboard` | Leaderboard |

### 21.4 Frontend pages

| Route | Component |
|-------|-----------|
| `/incentives` | `MyIncentives.tsx` |
| `/incentives/plans` | `IncentivePlans.tsx` |
| `/incentives/admin` | `IncentivesAdmin.tsx` |
| `/incentives/runs/:runId` | `IncentiveRunDetail.tsx` |
| `/incentives/fx-rates` | `IncentiveFxRates.tsx` |
| `/incentives/competitions` | `IncentiveCompetitions.tsx` |
| `/incentives/simulator` | `IncentiveSimulator.tsx` |
| `/incentives/payouts` | `IncentivePayoutDesk.tsx` |
| `/incentives/give-discount` | `GiveDiscount.tsx` |
| `/incentives/wallet-topups` | `WalletTopups.tsx` |
| `/incentives/period-close` | `PeriodClose.tsx` |

### 21.5 Phase 4 RPCs

| RPC | Purpose |
|-----|---------|
| `fn_suggest_incentive_targets` | Auto-suggest targets from prior period |
| `fn_incentive_payout_export` | Finance CSV source data |
| `fn_incentive_dimension_leaderboard` | Country/service/branch leaderboards |
| `fn_incentive_branch_contest_standings` | Branch contest live standings |
| `fn_incentive_counselor_revenue_breakdown` | Core/allied/travel mix |

### 21.6 Service catalogue references

| File | Relevance |
|------|-----------|
| `src/components/leads/ServiceTabs.tsx` | Allied & Travel tab = dual master keys |
| `src/lib/leads/servicePickerGroups.ts` | Sub-category grouping |
| `supabase/migrations/20260519024118_*.sql` | Seed allied + travel_financial rows |

### 21.7 FX references

| File | Status |
|------|--------|
| `src/lib/fxPolicy.ts` | Client-side effective rate helper ✅ |
| `fx_rates` + Phase 0/4 migrations | Buffer + purpose columns ✅ |
| `src/accounting/lib/fx.ts` | Static matrix — migrate 🟡 |

---

*End of document — v1.1 as-built reference. Staff guide: [incentives-module-guide.md](./incentives-module-guide.md)*
