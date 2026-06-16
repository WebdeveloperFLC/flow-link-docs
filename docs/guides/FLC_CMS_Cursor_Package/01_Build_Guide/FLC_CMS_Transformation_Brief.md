# Future Link CMS — Performance Hub → Commercial Management Suite
## Transformation & CRM-Integration Brief (for Cursor)

**Version:** 1.0  ·  **Prepared against codebase:** `Future Link Flow (11)` (Vite + React + TS, Supabase)
**Audience:** Cursor / engineering. This is an *implementation brief*, not a redesign.

---

## 0. Prime directive (read first)

> **Transform the existing Performance Hub into the Commercial Management Suite. Do NOT replace it.**

The existing Performance Hub is the **foundation and source of truth**. It is a mature module in late-stage UAT — not scaffolding:

- **281 tables**, **120+ RPC functions**, **379 migrations**, Supabase edge functions, RLS, and a full UAT suite already exist.
- The commercial backend (wallets, offers, offer codes, incentives, payouts, invoice locking, FX, eligibility) is **already implemented at the database layer**.
- The documented "missing features" are mostly **catalogued UI/UX bugs and unapplied migrations** (see §6), not absent capability.

**Rules for every change:**
1. **Reuse** existing tables, RPCs, edge functions, RLS policies, hooks, and components wherever they exist.
2. **Extend, don't duplicate.** Never create a second table/column/RPC for something that already exists under a different name.
3. New schema is the **last resort**, only for the genuine gaps in §5. When added, follow the existing migration conventions (timestamped files, `IF NOT EXISTS` guards, regenerate `types.ts`).
4. **Base currency is INR** (`fx_rates.rate_to_inr`). CAD/USD are converted columns that already exist on invoices.

---

## 1. Stack & integration facts (ground truth)

| Aspect | Reality in repo |
|---|---|
| Frontend | React 18 + TypeScript + Vite; Tailwind; shadcn/Radix UI; TanStack Query; AG-Grid; recharts; react-hook-form + zod |
| Backend | Supabase (Postgres + RLS + Edge Functions). Auth via `@lovable.dev/cloud-auth-js` + `@supabase/supabase-js` |
| Generated types | `src/integrations/supabase/types.ts` (~18.3k lines) — **the schema source of truth**. Regenerate after any migration: `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts` |
| Migrations | `supabase/migrations/` (379 files, sprint-based: Sprint 0 = `20260610300000+`) |
| Edge functions | `supabase/functions/` incl. `incentive-calculate-run`, `offers-lifecycle-tick` |
| Schema manifest | `supabase/schema-export/OFFERS_WALLET_INCENTIVE_MANIFEST.md` — authoritative object list |
| CRM master data | Same Supabase project. CMS already references CRM entities by FK — **no separate CRM integration is needed; it is one database.** |

**Critical implication for "CRM integration":** The Performance Hub *is already inside the CRM*. There is no external system to connect. "CRM integration" here means **continue referencing existing master tables by FK** (`branches`, `clients`, `leads`, `service_library`, `upi_institutions`, `upi_course_intakes`, `country_pathways`, `users`/`profiles`) and never copy them. Multi-company is via `firm_entity_id` (already present on `client_invoices`).

---

## 2. How the existing module maps to CMS modules

| Revised CMS module | Existing implementation to reuse | Pages / hooks |
|---|---|---|
| Discount Wallets | `discount_wallets`, `wallet_allocations`, `wallet_ledger`, `wallet_topups`, `wallet_topup_rules`, `wallet_settings`, `wallet_multiplier_bands` | `WalletTopups`, `PerformanceWalletPolicy`, `PerformanceBranchPool`, `GiveDiscount` |
| Offers & Discounts | `offers`, `client_offers`, `offer_groups`, `offer_audience_targets`, `offer_templates`, `offer_status_history`, `offer_versions`, `offer_events` | `OffersAdmin`, `PerformanceOffersStudio/Library/Analytics`, `PerformanceOfferWizard` |
| Offer Codes | `offer_tracking_codes` + RPC `generate_offer_tracking_code`, `offers.promo_code` | `OfferTrackingCodes.tsx` |
| Promotion Requests | `upi_promotions`, `upi_marketing_campaigns`, promotion-request RPCs | `PerformancePromotionRequests` |
| Incentive Plans/Engine | `incentive_plans`, `incentive_schemes`, `incentive_slabs`, `incentive_targets`, `incentive_runs`, `incentive_line_items` + edge fn `incentive-calculate-run` | `IncentivePlans`, `IncentivesAdmin`, `IncentiveSimulator`, `IncentiveRunDetail` |
| Incentive Ledger & Payouts | `incentive_payouts`, `incentive_adjustments`, `payout_status` enum | `IncentivePayoutDesk`, `MyIncentives` |
| Commissions | `upi_commissions`, `upi_commission_rules`, `upi_commission_invoices`, `upi_commission_snapshots`, `upi_commission_students` | `CommissionsPage` |
| Multi-Currency | `fx_rates` (`rate_to_inr`, `period_key`) + RPC `fn_fx_rate`; invoice CAD/INR/USD columns | `IncentiveFxRates` |
| Executive / Branch / Counselor dashboards | `fn_period_command_center`, `fn_performance_hub_readiness_check`, performance hooks | `PerformanceExecutive`, `PerformanceCommandCenter`, `PerformanceTeam`, `PerformanceHome` |
| Approvals | discount approval + wallet exception RPCs, `fn_can_review_discount_level` | `PerformanceApprovals` |
| Period Close | `fn_period_close_and_reseed`, `fn_close_due_wallets` | `PeriodClose` |
| Profitability | accounting module `AccountingPLPage`, `AccountingConsolidatedPage` (extend, see §5) | accounting pages |

---

## 3. Gap analysis — every CMS requirement classified

Legend: **AS** Already Supported · **PS** Partially Supported · **UI** Requires UI/UX Enhancement · **WF** Requires Workflow Enhancement · **RPT** Requires Reporting Enhancement · **BL** Requires New Business Logic · **DB** Requires New Database Structure

### Advanced Wallet Management
| Requirement | Class | Reuse / Action |
|---|---|---|
| Multiple wallet types simultaneously | AS | `discount_wallets.budget_kind` enum (`month_to_month`, `festive`, `scoped`). Branch pool is handled via scope + `PerformanceBranchPool`, not a `budget_kind` value. No change. |
| Allocation at counselor/team/branch/dept/campaign | PS→UI | Counselor + branch_pool exist; team/dept/campaign use `scope_*` columns + `wallet_topup_rules.scope_type`. Add UI for dept/campaign scoping; no schema change. |
| Monthly allocations | AS | `period_key` + `fn_auto_fund_wallets_for_period`. |
| Festival/promotional wallets | AS | `budget_kind = 'festive'`; Sprint 5 `strategic_wallets` migration. |
| **Carry-forward rules** | AS | `wallet_rollover_policy` enum (`expire`/`partial`/`full`), `rollover_cap`, `carry_to_period`, `carried_to_wallet`; RPC `fn_period_close_and_reseed`. **Verify UI exposes policy selector.** |
| **Expiry rules** | AS | `valid_from`/`valid_to`, `closed_at`, `close_outcome`; `wallet_settings.grace_days`; RPC `fn_close_due_wallets`, `fn_close_wallet`. |
| Transfer between users/branches | PS→WF | No `wallet_transfer` RPC found. Add `fn_transfer_wallet(from_id, to_id, amount, reason)` writing paired `wallet_ledger` entries. Small BL. |
| Restrictions by service/country/institution/program | AS | `scope_service_code`, `scope_country_tag`, `scope_master_key`, `scope_sub_category` + RPC `fn_wallet_scope_matches`. Institution = `scope_master_key`. |
| Over-limit approval workflow | AS | `max_amount_per_client`, `max_percent_per_client`, `wallet_allocations.exceeded_cap`, discount approval RPCs. |
| Utilization & ROI reporting | PS→RPT | `achievement_pct`, `unlocked_amount`, `wallet_ledger`; `offer_roi_stats` for offers. Add wallet-ROI view. |

### Offers, Codes & Discounts
| Requirement | Class | Reuse / Action |
|---|---|---|
| %, fixed, bundle, free-service, cashback | PS | `offers.discount_type` + `discount_value` cover %/fixed. Bundle/free-service/cashback: extend `discount_type` values + handling in `GiveDiscount`/redemption. WF/BL, no new table. |
| Offers across coaching/study/immigration/visa/allied | AS | `offers.applicable_services` (string[]) referencing `service_library`. |
| Offers by country/institution/program/intake/branch | AS | `target_countries`, `branch_id`, `offer_audience_targets`; institution/intake via `upi_*` FKs. |
| Multiple offers simultaneously | AS | No single-offer constraint. |
| **Offer conflict resolution** | PS→BL | `offers.per_client_limit`, `offers_eligible_for_client` exist; explicit stacking/priority strategy is **not** modeled. Add `offers.priority int` + `offers.stackable bool` + resolution in redemption RPC. Small DB+BL. |
| Proposal workflow (counselor/manager) | AS | `upi_promotions` + promotion-request RPCs; `requires_approval`. |
| Approve/reject workflow | AS | `offers.status` (`offer_status` enum), `approved_by`/`approved_at`, `fn_offer_set_status`, `offer_status_history`. |
| Performance & ROI tracking | AS | `offer_events`, `offer_roi_stats`, `counselor_offer_stats`. |
| Cross-branch/counselor comparison | PS→RPT | Data present; add comparison view (see dashboards). |
| **Auto + manual code generation** | AS | RPC `generate_offer_tracking_code` (auto) + `offers.promo_code` (manual). `offer_tracking_codes` per counselor. |
| Prefixes / branch / campaign / counselor specific | PS→UI | `offer_tracking_codes.counselor_id` exists; prefix/branch/campaign need UI fields + minor RPC args. WF. |
| Limit by usage/expiry/service/country/institution/intake | PS | `offers.max_redemptions`, `per_client_limit`, `valid_to`, applicability arrays cover most; one-time = `max_redemptions=1`. |
| One-time & bulk codes | PS→BL | One-time via `max_redemptions`. Bulk pool generation: add a batch wrapper around `generate_offer_tracking_code`. Small BL. |
| Redemption performance | AS | `offer_events`, `client_offers.used_at`. |

### Commercial Combination Engine
| Requirement | Class | Reuse / Action |
|---|---|---|
| Discounts/offers/incentives for **any** service combination | **PS→DB** | No first-class combination entity. **§5.1** adds a two-mode engine: `logical` (rule-only, composed price — default) and `package` (custom price/rules). |
| Unlimited custom combinations w/o developers | DB | `service_combinations` is config-as-data; `logical` rows carry no pricing so thousands scale cleanly. |
| Different discount/offer/incentive rules per combination | DB+BL | `linked_offer_id` / `linked_incentive_scheme_id` / `wallet_eligible` per combination, reusing existing rule tables. Applies in both modes. |

### Incentives
| Requirement | Class | Reuse / Action |
|---|---|---|
| Calculated on final transaction value | AS | `incentive_line_items.base_amount` from `source_invoice_id`/`source_payment_id`; edge fn `incentive-calculate-run`. |
| Differs by full-fee/wallet/offer/promo/combination client | PS→BL | `source_type`, `service_filter`, slabs exist. Client-type differentiation needs rule inputs (combination depends on §5.1). |
| Configurable: do discounts/wallet/offer reduce base | PS→BL | `incentive_plans.revenue_basis` exists (gross/net). Add explicit toggles for wallet/offer/promo in plan config + calc fn. |
| Basis: gross/net/profit/margin | PS | `revenue_basis` present; ensure all four are handled in calc. |
| Different formulas per service/campaign | AS | `incentive_schemes.service_filter`, `scope_type`, `incentive_slabs`. |
| **Earned vs Approved vs Pending vs Paid vs Reversed vs Clawback** | AS | `incentive_line_items.earned_amount`; `incentive_runs.status` (`incentive_run_status`); `incentive_payouts.status` (`payout_status`: pending/approved/processed/paid/cancelled); `incentive_adjustments` (clawback/reversal). **Map lifecycle to these — no new table.** |
| Ledger per employee | AS | `incentive_line_items` + `incentive_payouts` + `incentive_adjustments` keyed by `counselor_id`. |
| Payout history by employee/branch/dept/service/country | AS | Columns present across line items/payouts. |
| Export to payroll | AS | `incentive_payouts.accounting_ap_bill_id` (links to accounting AP); `incentiveFinanceExport.ts`. |
| Partial payout / manual adjustment with audit | AS | `incentive_adjustments`, `gross/net/tds` on payouts. |
| Employee self-view | AS | `MyIncentives` page. |
| **Payout cycle config (monthly/quarterly/half/annual/custom)** | PS→BL | `incentive_period_type` enum + `incentive_plans.period_type` exist. **Verify enum includes half-yearly/annual/custom; add values if missing (DB enum extend).** |
| Threshold-triggered payout + carry-forward | PS→BL | Not explicitly modeled on payouts. Add `min_payout_threshold` to plan + carry logic in payout desk. Small. |
| Forecasting (earned/enrollments/commissions/targets) | PS→RPT | `incentive_targets`, line items, `upi_commissions` present. Add forecast view. |
| Company-level liability forecast | RPT | Aggregate of above; new report. |

### Invoice-based & Eligibility controls
| Requirement | Class | Reuse / Action |
|---|---|---|
| **Invoice-stage offer locking** | AS | `client_invoices`: `invoice_locked`, `invoice_locked_at/by`, `invoice_locked_for_edit`, `immutable_after_paid`, `payment_processing_lock`, `invoice_stage`, `applied_offer_id`, `offer_discount_amount`; trigger `fn_redeem_offer_on_invoice` / `trg_redeem_offer_on_invoice`. **Verify UI enforces; wire lock states.** |
| Block code after invoice approved; block wallet after payment | AS | Above lock flags + `payment_processing_lock`. |
| Block discounts on partial/full/closed | AS | `amount_paid*`, `paid_at`, `status`, locks. |
| Authorised override + audit | PS→WF | Locks exist; add explicit override RPC + audit row. |
| Price breakdown (original→offer→wallet→final→paid→outstanding) | AS | invoice columns: `subtotal_*`, `offer_discount_amount`, `amount`, `amount_paid*`, `balance_due_*`. UI surface. |
| **Existing-client eligibility (block already-enrolled service)** | **PS→DB** | `offers_eligible_for_client(uuid, text[])` + `client_offers` exist, but **"already enrolled in this service" rule is not modeled.** **Genuine gap — see §5.2.** |
| Audience: new/existing/re-enrolled/lead-status | PS→BL | `offers.audience` + `offer_audience_targets`; extend evaluation against `cf_client_programs`/enrollment history. |
| Future services eligible while active ones restricted | DB+BL | Depends on §5.2. |

### Reporting, Dashboards & Audit
| Requirement | Class | Reuse / Action |
|---|---|---|
| Counselor/branch/country/institution/service/campaign comparisons | PS→RPT | Data present; build comparison views on existing RPCs. |
| Daily→custom periods | AS | `period_key`, period bar. |
| **CAD + INR simultaneous reporting** | AS | invoice `*_in_cad/_inr/_usd` columns, `fx_rates`, `fn_fx_rate`. |
| Profitability after discounts/incentives/commissions | PS→RPT | accounting `AccountingPLPage`; join offer/wallet/incentive costs. Extend, see §5.3. |
| Executive / branch / counselor dashboards | AS | `PerformanceExecutive/CommandCenter/Team/Home`. UI modernization only. |
| Revenue forecasting & trends | PS→RPT | `vw_country_intake_trends`, performance scores; add trend widgets. |
| **Multi-company consolidated reporting** | PS→RPT | `firm_entity_id` on invoices; accounting `AccountingConsolidatedPage`. Ensure all commercial reports group by `firm_entity_id`. |
| Commercial audit trail | AS | `offer_events`, `offer_status_history`, `accounting_access_audit`, `upi_audit_logs`, `calendar_event_audit`, wallet/incentive ledgers. Optionally unify into one commercial-audit view (RPT). |

### Future Link domain coverage
| Requirement | Class | Notes |
|---|---|---|
| Coaching (IELTS/PTE/CELPIP/TOEFL/French/German), Study Abroad, Canada Immigration, PNP, Germany Opportunity Card, PR, visitor/study/work/super/spouse visas, allied | AS | `service_library` + seed migrations include Canada extended, EU visa academy, UAE parity, coaching grad admissions, etc. These are CRM master data — referenced, not duplicated. |
| Add future service/country/institution/program/visa w/o redesign | PS→BL | Adding rows works today. **Auto-inheritance** of commercial rules to new master rows is **not automatic — see §5.4.** |

---

## 4. Verification of the specifically-flagged items

The user asked to confirm whether these exist or need enhancement. Verdict from the live schema:

| Item | Verdict | Evidence |
|---|---|---|
| Incentive payout cycle config (monthly/quarterly/annual) | **Exists, verify enum** | `incentive_period_type` enum + `incentive_plans.period_type`. Enum already has `monthly`, `quarterly`, `half_yearly`, `yearly`. Only `custom` would need adding (one enum extend) if custom-date cycles are required. |
| Earned vs payable vs cashed-out ledger | **Exists** | `incentive_line_items.earned_amount` (earned) → `incentive_payouts.status` pending/approved/processed/**paid** (payable→cashed-out) + `incentive_adjustments` (reversal/clawback). UI-map only. |
| Offer code generator (auto + manual) | **Exists** | RPC `generate_offer_tracking_code` (auto), `offers.promo_code` (manual), `offer_tracking_codes`. Add bulk + prefix UI. |
| Existing-client eligibility rules | **Partial → small DB** | `offers_eligible_for_client` exists but no "block if already enrolled in service" rule. **§5.2.** |
| Invoice-stage offer locking | **Exists** | `client_invoices.invoice_locked*`, `immutable_after_paid`, `payment_processing_lock`, trigger `fn_redeem_offer_on_invoice`. Wire UI + override RPC. |
| Wallet carry-forward logic | **Exists** | `wallet_rollover_policy`, `rollover_cap`, `carry_to_period`, `fn_period_close_and_reseed`. |
| Wallet expiry logic | **Exists** | `valid_to`, `closed_at`, `wallet_settings.grace_days`, `fn_close_due_wallets`. |
| Multi-company consolidated reporting | **Partial → reporting** | `firm_entity_id` present; group existing reports by it; accounting `AccountingConsolidatedPage` exists. |
| Profitability after discounts/incentives | **Partial → reporting** | accounting P&L + cost sources; build a commercial-profitability view. **§5.3.** |
| Commercial combination engine | **Missing → DB** | Two-mode engine in §5.1: `logical` (rule-only, composed price) built first; `package` (custom pricing) extensible without redesign. |
| Future service auto-inheritance | **Missing → BL/DB** | Adding master rows works; auto-applying commercial rules to them does not. **§5.4.** |

**Net:** of the 11 flagged, **7 already exist** (UI/verify only), **4 need small extensions** (§5).

---

## 5. Genuine gaps — smallest possible extensions

Only four areas need new structure. Each is additive and reuses existing FKs.

### 5.1 Commercial Combination Engine *(new — two modes, build minimal first)*
No first-class combination object exists (`service_offers` is registration-time bundling only).

**Design intent (authoritative).** The combination engine is primarily a **rule engine**, not a pricing engine. It must support **two modes** behind one `combination_type` discriminator so the advanced mode can be added later without redesign:

- **`logical` (default — ~90% of cases):** groups existing services. Price = **sum of the individual `service_library` prices**. Existing offer, wallet and incentive rules apply. The combination exists so management can attach **combination-specific** offers / wallet eligibility / incentives / reports — *even when there is no package price*.
- **`package` (advanced — ~10% of cases):** a commercial package with its own **custom price**, custom offer / wallet / incentive rules, and its own profitability calculation. Used for things like a "Germany Premium Package" (individual ₹/$4,000 → package $3,500, $500 package discount, +$200 incentive bonus, 10% special offer, wallet-eligible).

**Phase 1 builds `logical` fully and stubs `package`** (the columns exist; the package-pricing UI/calc comes later). Because both modes share one schema, adding package pricing is data + UI only — never a re-architecture.

```sql
-- A combination is a named set of service codes. Mode decides whether pricing is composed or custom.
CREATE TABLE service_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  combination_type text NOT NULL DEFAULT 'logical',   -- 'logical' | 'package'
  service_codes text[] NOT NULL,            -- references service_library.service_code values
  branch_id uuid REFERENCES branches(id),
  firm_entity_id uuid,                       -- multi-company aware

  -- PACKAGE-MODE pricing (all NULL for logical; price is summed from services at read time)
  package_price numeric,                     -- custom all-in price (package mode only)
  package_currency text,                     -- defaults to INR base via fx
  package_discount numeric,                  -- informational: sum(services) − package_price
  custom_profitability boolean NOT NULL DEFAULT false,

  -- RULE LINKS (apply in BOTH modes — this is the engine's real purpose)
  linked_offer_id uuid REFERENCES offers(id),                 -- combination-specific offer
  linked_incentive_scheme_id uuid REFERENCES incentive_schemes(id), -- combination-specific incentive
  wallet_eligible boolean NOT NULL DEFAULT true,              -- combination-specific wallet eligibility
  wallet_scope_master_key text,                               -- optional wallet scope override
  max_discount_pct numeric,                                   -- ceiling for combined discount

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(), created_by uuid
);

-- Resolver RPC: returns effective price + applicable rules for a combination.
-- logical → SUM(service_library price) ; package → package_price. Rules returned identically for both.
-- fn_resolve_combination(combination_id, client_id) -> { price, currency, offer_id, incentive_scheme_id, wallet_eligible }
```

**Why this satisfies the requirement without scaling pain:**
- Default `logical` rows carry **no pricing** — management creates thousands of rule-only combinations (Coaching+Visa, Canada PR+IELTS, Germany Opp Card+German Language, …) without maintaining price tables.
- `package` rows opt into custom pricing/profitability only where it's genuinely sold as a bundle.
- Rule links (`linked_offer_id`, `linked_incentive_scheme_id`, `wallet_eligible`) **reuse existing `offers` / `incentive_schemes` / wallet scopes** — no rule logic is duplicated.
- The `combination_type` discriminator means future package features never require touching the `logical` path. Profitability (§5.3) reads `package_price` when present, else the composed sum.

### 5.2 Existing-client / service-enrollment eligibility *(extend existing RPC)*
`offers_eligible_for_client(uuid, text[])` exists — extend it; do not replace it.

```sql
-- New: per-service eligibility policy (config-as-data)
CREATE TABLE offer_eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers(id),     -- null = global policy
  audience text NOT NULL,                   -- 'new_lead','new_client','existing','re_enrolled','lead_status:<x>'
  block_if_active_service boolean NOT NULL DEFAULT true,
  evaluate_against text[] DEFAULT '{enrollments,invoices,payments}',
  scope_service_code text, scope_country_tag text, scope_master_key text,
  is_active boolean NOT NULL DEFAULT true
);
```
Then **extend** `offers_eligible_for_client` to check `cf_client_programs` / enrollment history against `block_if_active_service` (e.g. client active in IELTS → IELTS offer blocked, Germany Opportunity Card allowed). Reuse, don't fork, the RPC.

### 5.3 Commercial profitability view *(reporting, no new tables)*
Create a Postgres **view/RPC** joining what already exists — no new storage:
```
fn_commercial_profitability(period_key, group_by)  →
  revenue (client_invoices; for combinations use package_price when combination_type='package', else composed sum),
  discount (offer_discount_amount + wallet_allocations.amount),
  incentive cost (incentive_line_items.earned_amount), commission (upi_commissions),
  net = revenue − discount − incentive − commission,  grouped by counselor/branch/service/
  country/institution/campaign/firm_entity_id, consolidated to INR via fx_rates.
```

### 5.4 Future-service auto-inheritance *(config-as-data, small)*
```sql
CREATE TABLE commercial_autoapply_policy (
  entity_type text PRIMARY KEY,             -- 'service','country','institution','program','intake'
  policy text NOT NULL                      -- 'auto_include','require_opt_in','inherit_parent'
);
```
On CRM master insert (trigger or `offers-lifecycle-tick` tick), apply active wallet/offer scopes to new rows per policy. Reuses existing scope columns.

### 5.5 Minor additive columns (no new tables)
- `offers.priority int default 0`, `offers.stackable boolean default false` — for conflict resolution (§3 Offers).
- `incentive_plans.min_payout_threshold numeric`, `incentive_plans.carry_below_threshold boolean` — threshold payouts.
- Extend enums only if needed: `incentive_period_type` (+`custom` only; monthly/quarterly/half_yearly/yearly already exist), `offers.discount_type` handling (+`bundle`,`free_service`,`cashback`).

> **That is the entire net-new schema surface.** Everything else is reuse + UI + reporting.

---

## 6. UAT fixes to fold into the rebuild (from `docs/performance-hub/`)

Resolve these as part of the UI work — they are known and located. **Critical/High first.**

| ID | Sev | Fix | Location |
|---|---|---|---|
| PH-R-018 | Crit (env) | Apply Phase 6B in two steps: enum migration `20260711120000` **before** RLS `20260711120001`; verify `enum_range(NULL::app_role)` includes `director`. | `docs/INCENTIVE_PHASE6B_DEPLOY.md` |
| PH-R-017 | Crit (proc) | Package demo seed as idempotent staging migration (from `PERFORMANCE_HUB_DEMO_DATA.md §4`). | new seed migration |
| PH-R-003 | Crit (demo) | Add `client_invoices`+`client_invoice_payments` rows for `PH-DEMO-004`/`a00d0004` so unclassified count matches UI. | demo seed |
| **PH-R-001** | **High** | **Wallet KPI filter uses `budget_kind === "personal"`; correct enum is `month_to_month`.** Fixes ₹0-unlocked everywhere. | `src/hooks/usePerformancePeriodMetrics.ts`, `usePerformanceTeamRows.ts` |
| PH-R-002 | High | `GiveDiscount` ignores period bar; wire selected `period_key`. | `src/pages/GiveDiscount.tsx` |
| PH-R-004 | High | `/offers-admin` duplicate route; first match renders legacy `OffersAdmin` and redirect is dead. Point Command Center/promotion links to `/performance/offers/library`. | `src/App.tsx` |
| PH-R-006 | High | Director excluded from `/performance/admin/approvals` though RLS allows read. Add director read-only mode. | approvals page `canReview` |
| PH-R-007 | High | MarCom can publish per RPC (`offers:edit`) but UI `canReview` requires manager/admin. Align UI gate to module permission. | promotion requests page |
| PH-R-015/019 | High | `offer_events` CHECK lacks `'sent'`; add production migration `ALTER ... CHECK` to include it. | new migration |
| PH-R-005 | Med | `PerformanceTeam` links to `/incentives/give-discount`; should be `/performance/give-discount`. | `PerformanceTeam.tsx` |
| PH-R-008 | Med | `/performance/admin` has no page-level role guard; add guard + RPC auth on `fn_period_command_center`, `fn_performance_hub_readiness_check`. | command center + RPCs |
| PH-R-009 | Med | `/incentives/*` pages render outside hub theme shell; bring under hub layout/context bar. | layout `isPerformanceHubPath` |
| PH-R-010/013/014 | Med | Add director RLS SELECT on `wallet_exception_requests`; complete `fn_assert_not_director_read_only` guards. | RLS + RPCs |
| PH-R-011 | Med | `/performance/wallet/policy` missing from sidebar; add nav item. | `AppLayout.tsx` |
| PH-R-016 | Low | Regenerate `types.ts` (missing `promotion_requests`, `discount_approval_requests`, `wallet_exception_requests`). | `npx supabase gen types` |
| PH-R-012/020–028 | Low/Med | Labels, ROI window vs period bar, polish — fold into UI pass. | various |

---

## 7. Execution plan (phased, low-risk)

**Phase 1 — Stabilize (no new schema).** Apply Phase 6B correctly (PH-R-018), package seed (PH-R-017/003), fix PH-R-001/002/004/006/007/015. Regenerate types. → existing hub passes UAT.

**Phase 2 — UI/UX modernization (reuse all data).** Rebuild Performance Hub screens on the new UI/UX, wiring to the **existing** tables/RPCs in §2. Bring `/incentives/*` under the hub shell (PH-R-009). Surface carry-forward/expiry/scope controls already in schema. No backend changes.

**Phase 3 — Additive extensions (§5 only).** In order: (a) offer conflict columns + eligibility rules (§5.2, §5.5); (b) combination engine §5.1 — build `logical` mode fully first, stub `package` columns; (c) profitability view (§5.3); (d) auto-inheritance policy (§5.4); (e) incentive threshold/cycle enum extends. Each is one migration + UI; regenerate types after each.

**Phase 4 — Reporting & consolidation.** Multi-company grouping by `firm_entity_id`, comparison dashboards, forecasting widgets, unified commercial-audit view — all on existing data.

**Guardrails for Cursor**
- Before adding any table/column/RPC, search `types.ts` and `supabase/migrations/` for an existing equivalent; reuse it.
- Money is INR base; always convert via `fn_fx_rate` / invoice `*_in_*` columns — never hardcode rates.
- Never duplicate CRM master data (`branches`, `clients`, `leads`, `service_library`, `upi_*`, `country_pathways`, users). Reference by FK.
- After each migration: `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`.
- Respect existing RLS and the director read-only model; extend policies, don't bypass them.

---

## 8. Security note
The uploaded archive contained a `.env` file. If those were live Supabase keys, **rotate them** — credentials should not travel in a shared zip. This brief assumes the same Supabase project backs both CRM and CMS.
