# Enterprise Rewards & Payout Constitution

**Status:** Approved architecture reference (consolidated)  
**Scope:** Cash incentives, competitions, payouts, FX settlement, wallet↔incentive coupling  
**Sources:** `docs/guides/incentive-platform-spec-v1.md`, `docs/guides/incentives-module-guide.md`, `docs/guides/offers-discounts-wallet-ai-scope-v2.md`, `docs/governance/CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md`

> **Frozen rule:** Describes approved reward and payout mechanics only. Does not add new rates, rules, or workflows.

---

## 1. Three reward instruments (do not conflate)

| Instrument | What it is | What it is NOT |
|------------|------------|----------------|
| **Cash incentive** | Staff earnings via `incentive_plans`, runs, payouts | Salary payroll; wallet balance |
| **Counselor discount wallet** | Spend authority on client invoices (`discount_wallets`) | Cash payout; client loyalty points |
| **Competition / campaign overlay** | Time-boxed rules, branch contests, gamification layer | Base plan replacement |

**Client offers** (`offers`, `client_offers`) are promotions — they affect **net revenue** used in incentive calculation but are not staff rewards.

---

## 2. Platform architecture (four approved layers)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CONFIGURATION                                               │
│     Plans · Rules (scope + rate) · Targets · Campaigns         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  2. QUALIFYING EVENTS LEDGER                                    │
│     payment_verified · enrolment · commission_paid · stage_*    │
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

**Principle:** Every earnable fact becomes a **normalized qualifying event** with dimensions. Rules **match** events; the engine **aggregates and pays**. New campaigns = new rules, not new code.

---

## 3. Configuration layer (approved entities)

| Entity | Purpose |
|--------|---------|
| **Plan** | Container: period type, settlement currency, revenue basis (net/gross), scope (global / branch / role) |
| **Rule** | Scoped pay logic — country, institution, intake, service preset, metric, rate type |
| **Slab** | Tiered thresholds — must form **continuous chain from 0** (no gaps/overlaps; one open-ended slab per chain) |
| **Target** | Monthly goal per counselor — drives achievement % and bonus triggers |
| **Campaign overlay** | Time-boxed rule on top of base plan; auto-expires; does not mutate base plan |

### Plan scope types (approved)

| Scope | Behaviour |
|-------|-----------|
| Organization-wide | All counselors (default) |
| Branch-specific | Engine filters by client branch name |
| Role-specific | Only users with plan's `role_key` in `user_roles` earn |

---

## 4. Qualifying events (approved)

**Table:** `incentive_qualifying_events` (built ✅)

| Event type (approved) | Typical source |
|-----------------------|----------------|
| `payment_verified` | Verified `client_invoice_payments` — line-level service tags |
| `enrolment`, `stage_change` | Pipeline / client services |
| `commission_paid` | `upi_commission_students` |
| `lead_converted` | Leads (telecaller attribution — partial 🟡) |

Each event carries **dimensions**: master_key, service_code, country, institution_id, intake, etc.

---

## 5. Attribution rules (approved)

| Source | Attribution rule |
|--------|------------------|
| Verified payments | **Closer wins:** `closing_counselor_id` → `assigned_counselor_id` → `owner_id` |
| Commissions | Client's attributed counselor |
| Net revenue | Wallet discounts on invoice allocated **pro-rata** to payment |
| Discount penalty | High discount depth reduces incentive (approved tiers — see §8) |
| Branch filter | Client `branch` matched to branch name |
| Role filter | Counselor must have plan's `role_key` |

---

## 6. Calculation & run lifecycle (approved)

**Admin paths:** `/incentives/admin`, `/performance/incentives/plans`  
**Run detail:** `/incentives/runs/:runId`

| Step | Action | Result |
|------|--------|--------|
| 1 **Preview** | Admin previews plan + period (+ optional branch) | Counselor totals + FX snapshot — **no DB write** |
| 2 **Calculate** | Execute calculation | Creates/updates run + line items |
| 3 **Lock** | Lock run | Freezes run; snapshots plan version + FX — **immutable** |

**Who may run:** admin, administrator, or manager (edge function enforced).

**After lock:** Manual adjustments permitted on run detail with audit trail.

**Simulator:** `/incentives/simulator` — preview-only comparison; **nothing saved** to runs.

---

## 7. Settlement currency & FX (approved)

### Centralized FX with buffer

```
effective_rate_to_inr = base_rate_to_inr + buffer_fixed
                     OR base_rate_to_inr × (1 + buffer_pct / 100)
```

**Purpose-specific rates (built ✅):**

| `rate_purpose` | Use |
|----------------|-----|
| `general` | Fallback |
| `billing` | Invoices, collection (when wired) |
| `incentive_settlement` | Run calculation (engine default) |
| `payout` | Counselor payout conversion (future) |

**Admin UI:** `/incentives/fx-rates`  
**On lock:** Store `fx_snapshot` using centralized effective rates — not ad hoc invoice rates.

### Settlement currency policy

| Scenario | Currency |
|----------|----------|
| Org-wide monthly plan | **INR** (default) |
| Country campaign | **CAD** or INR at locked FX — Finance chooses per plan/rule |
| Cross-border counselor on CAD target | Pay in **CAD** with FX snapshot at **run lock** |

Rule-level override permitted on `incentive_rules`.

---

## 8. Wallet ↔ incentive coupling (approved)

Approved flow (Offers & Wallet Staff Guide):

```
Target set (incentive_targets)
    ↓
Verified payments → Achievement %
    ↓
Wallet sized / unlocked (discount_wallets)
    ↓
Give Discount → wallet_allocations on invoice
    ↓
Net revenue reduced → Cash incentive calculation
```

### Discount depth penalty (approved engine)

Deep client discounts reduce cash incentive earn — documented tiers:

| Discount depth | Incentive factor (approved reference) |
|----------------|--------------------------------------|
| ~5% | 100% |
| ~10% | 90% |
| ~15% | 75% |
| >15% | 0% |

### Wallet sizing (approved design — partial 🟡)

- **Formula (prototype-approved):** Wallet (potential) = Base Wallet × Performance Multiplier (last period)
- **Unlock:** Proportional to current-month achievement (configurable threshold)
- **Period close:** `/incentives/period-close` — separate from incentive run lock
- **Funding awareness:** University/Joint offers do **not** deduct counselor wallet

Built ✅: wallet CRUD, give discount, top-ups, period close, achievement RPC.  
Partial 🟡: auto-sizing from rules, hard block at give discount when over unlock, weighted Performance Score.

---

## 9. Payout constitution (approved)

**Path:** `/incentives/payouts` (Payout Desk)  
**CMS mirror:** `/performance/incentives/payouts` (ledger & liability view)

### Generate payouts

1. **Lock** the run first (Incentives Admin).
2. Enter **run ID**, set **TDS %** (e.g. 10%).
3. **Generate payouts** — one row per counselor with earnings.

### Approval workflow (approved states)

| Status | Next action |
|--------|-------------|
| `pending` | **Approve** |
| `approved` | **Mark paid** |
| `paid` | Complete — `paid_at` set |

### Finance export (built ✅ Phase 4)

- **Download CSV** — counselor, gross, TDS, net, currency, status
- Paste **AP bill ID** on payout row after AP upload
- **RPC:** `fn_incentive_payout_export(run_id, period_key)`

**Out of scope (approved):** Full payroll API integration — CSV ✅ only.

---

## 10. Competition & rewards layer (approved)

**Path:** `/incentives/competitions`

| Capability | Status |
|------------|--------|
| Branch contests | ✅ Built |
| Campaign overlays on calculate | ✅ Built |
| Dimension leaderboards (counselor, branch, country, service line) | ✅ Built |
| Branch collective pool split | ✅ Approved in spec |
| Real-time earning ticker | 🔲 Planned |

**Leaderboards:** Counselor home and executive views use RPC-backed rankings for current period.

Competition rewards are **cash incentive overlays** on line items — not a separate wallet instrument.

---

## 11. Governance & audit (approved)

| Rule | Requirement |
|------|-------------|
| **Immutability after lock** | Locked runs + FX snapshot cannot be silently changed |
| **Adjustments** | Manual adjustments on locked runs only — with audit trail on run detail |
| **Line-item audit** | Each earn line cites source payment, rule, slab, contest, campaign |
| **Plan version snapshot** | `fn_snapshot_incentive_plan_version` on lock |
| **Customer ownership** | Customer Attribution Engine must block ineligible settlements before payout — override workflow only via Super Admin / Finance Admin |
| **TDS** | Recorded on payout generation — finance-controlled % |

### Customer Ownership Protection (frozen)

Before any settlement, commission, referral, incentive, or bonus:

1. Verify customer is not an existing FLC customer under active relationship/agreement.
2. If ineligible → block → no payment.
3. Override only via **Override Workflow** — mandatory business reason, immutable audit.

Counselors, partners, branch users, and **managers** cannot override eligibility.

---

## 12. Roles & permissions (approved matrix summary)

| Action | Counselor | Branch mgr | Admin / Finance |
|--------|:---------:|:----------:|:---------------:|
| View My Incentives | ✅ Own | ✅ Own | ✅ All |
| Give discount (wallet) | ✅ | ✅ | ✅ |
| Configure plans / rules | ❌ | ❌ | ✅ |
| Preview / calculate / lock runs | ❌ | ✅ | ✅ |
| FX rates | ❌ | ❌ | ✅ |
| Competitions admin | ❌ | 🟡 | ✅ |
| Payout approve / paid | ❌ | 🟡 | ✅ |
| CSV export | ❌ | ❌ | ✅ |

---

## 13. Partial & planned (approved docs only — not invented)

| ID | Gap | Approved status |
|----|-----|-----------------|
| Invoice FX migration | Static matrix in `fx.ts` not fully replaced | 🟡 |
| Rule stacking modes | Engine additive only; exclusive/cap in schema concept | 🟡 |
| FX change audit log | | 🔲 |
| Payroll API | CSV only today | 🔲 |
| Wallet auto-sizing from `wallet_topup_rules` | Schema exists; manual top-ups today | 🟡 |
| Offer Influence / Wallet Impact revenue analytics | | 🔲 |

---

## Source index

| Document | Package path |
|----------|--------------|
| Incentive Platform Spec v1.1 | `CONSTITUTIONS/guides/incentive-platform-spec-v1.md` |
| Incentives Module Guide | `CONSTITUTIONS/guides/incentives-module-guide.md` |
| Offers & Wallet Guide | `CONSTITUTIONS/guides/offers-wallet-staff-guide.md` |
| Customer Ownership Constitution | `CONSTITUTIONS/governance/CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md` |
