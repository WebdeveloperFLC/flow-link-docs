# Incentives Module — Staff Operational Guide

Use the **search bar** at the top of this page to find answers — try keywords like *preview*, *slabs*, *payout*, *FX*, or *contest*.

> **TIP:** Cash incentives (this guide) are separate from the **counselor discount wallet** and **client offers**. All three connect through verified payments and net revenue — see [§15](#15-how-incentives-connect-to-wallet--offers).

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | June 2026 |
| **Status** | Active — covers Phases 0–4 (as deployed) |
| **Technical spec** | [Incentive Platform Spec v1.1](./incentive-platform-spec-v1.md) |
| **Related** | [Offers & Wallet Staff Guide](./offers-wallet-staff-guide.md) |

**Status legend:** ✅ Live · 🟡 Partial · 🔲 Planned

---

## 1. Quick search — find your answer

| I want to… | Search for | Section |
|------------|------------|---------|
| See my earnings this month | `my incentives` `earned` | §4 |
| Preview or calculate a run | `preview` `calculate` `lock` | §10 |
| Set up a new incentive plan | `create plan` `rules` | §6 |
| Add country / institution scope | `rules tab` `scope` | §6.3 |
| Fix slab validation errors | `slab chain` `continuous` | §6.4 |
| Auto-fill targets from last month | `suggest targets` | §6.5 |
| Run a branch contest | `competitions` `contest` | §8 |
| Compare two periods (what-if) | `simulator` | §9 |
| Set FX rates for incentives | `FX` `buffer` `purpose` | §7 |
| Generate counselor payouts | `payout desk` `TDS` | §12 |
| Export CSV for finance / AP | `CSV export` `AP bill` | §12.3 |
| Understand why preview is ₹0 | `troubleshoot` `zero` | §16 |
| See leaderboard by country/service | `dimension leaderboard` | §4.4 |

### At-a-glance: admin monthly workflow

```flow
Set FX rates (start of month)
Configure plan / rules / targets
Counselors earn via verified payments → qualifying events
Period-end: Preview → Calculate → Lock run
Generate payouts → Approve → Mark paid → Export CSV
(Optional) Period Close for wallets — separate module
```

---

## 2. Where to find it in the app

```navmap
Incentives → My Incentives | /incentives | Counselor dashboard
Incentives → Incentives Admin | /incentives/admin | Preview / calculate / lock runs
Incentives → Incentive Plans | /incentives/plans | Plans, rules, slabs, targets
Incentives → FX Rates | /incentives/fx-rates | Central rates + buffer + purpose
Incentives → Competitions | /incentives/competitions | Campaigns + branch contests
Incentives → Simulator | /incentives/simulator | What-if period comparison
Incentives → Payout Desk | /incentives/payouts | Generate payouts, CSV, AP ref
Incentives → [run link] | /incentives/runs/:runId | Line-item audit + adjustments
Guide → Incentives Module | /guides/incentives-module | This guide
```

### System map — how screens connect

```flow
Incentive Plans (config)
    ↓
Verified payments → Qualifying events
    ↓
Incentives Admin (preview → calculate → lock)
    ↓
Run Detail (line items, manual adjustments)
    ↓
Payout Desk (TDS, approve, paid, CSV export)
```

> **NOTE:** **Give Discount**, **Wallet Top-ups**, and **Period Close** live under the **Wallet** menu but affect **net revenue** used in incentive calculation. See [Offers & Wallet Staff Guide](./offers-wallet-staff-guide.md).

---

## 3. Who can do what

| Action | Counselor | Branch mgr | Admin / Finance |
|--------|:---------:|:----------:|:---------------:|
| View My Incentives | ✅ Own | ✅ Own | ✅ All (via admin) |
| Give discount (wallet) | ✅ | ✅ | ✅ |
| Configure plans / rules | ❌ | ❌ | ✅ |
| Preview / calculate / lock runs | ❌ | ✅ | ✅ |
| FX rates | ❌ | ❌ | ✅ |
| Competitions admin | ❌ | 🟡 | ✅ |
| Payout approve / paid | ❌ | 🟡 | ✅ |
| CSV export | ❌ | ❌ | ✅ |

Run actions require **admin**, **administrator**, or **manager** role (enforced by edge function).

---

## 4. Counselor: My Incentives

**Path:** Incentives → **My Incentives** (`/incentives`)

### 4.1 Summary cards

| Card | Meaning |
|------|---------|
| **Wallet balance** | Discount authority (not cash) — unlocked amount you can spend on client discounts |
| **Achievement** | Progress vs assigned target for current period |
| **Earned this period** | Cash incentive from **locked or calculated** runs for this month |
| **Projected** | Forecast from live data if a preview-equivalent calculation exists |

### 4.2 Revenue mix

Shows **core** vs **allied** vs **travel** revenue from qualifying events — use this to see whether add-on services are being sold.

### 4.3 Dimension leaderboard

Dropdown filter: **counselor**, **branch**, **country**, **service line** — top 10 for the current period.

### 4.4 Payout history

Lists approved/paid cash payouts when finance has processed them.

---

## 5. Core concepts (read once)

| Term | Meaning |
|------|---------|
| **Plan** | Container: period type, settlement currency (INR/CAD/…), revenue basis (net/gross), scope (global / branch / role) |
| **Rule** | Scoped pay logic — country, institution, intake, service preset, metric, rate type |
| **Slab** | Tiered thresholds (must form a **continuous chain** from 0) |
| **Target** | Monthly goal per counselor — drives achievement % and bonus triggers |
| **Qualifying event** | Auditable fact (verified payment, commission paid) with dimension tags |
| **Run** | One calculation for plan + period (+ optional branch) — preview → calculate → lock |
| **Line item** | Per-counselor earn line with source payment / rule / slab audit |
| **Payout** | Cash to counselor after lock — gross, TDS, net |

### Cash vs wallet vs client offers

| | Cash incentives | Counselor wallet | Client offers |
|--|-----------------|------------------|---------------|
| **Purpose** | Pay staff for performance | Authority to give discounts | Promotions clients claim |
| **Ledger** | `incentive_*` | `discount_wallets` | `offers` / `client_offers` |
| **Menu** | Incentives | Wallet | Offers & Discounts |

---

## 6. Incentive Plans & Rules

**Path:** Incentives → **Incentive Plans** (`/incentives/plans`)

Four tabs: **Plans · Rules · Slabs · Targets**

### 6.1 Create a plan

1. **Plans** tab → fill name, period type, settlement currency, revenue basis.
2. **Scope:**
   - **Organization-wide** — all counselors (default).
   - **Branch-specific** — pick branch; engine filters clients by branch name.
   - **Role-specific** — pick app role (`counselor`, `telecaller`, `documentation`); only users with that `user_roles` entry earn.
3. Click **Create plan**.

### 6.2 Rules tab (preferred for scope)

Use **Rules** for country, institution, intake, and service presets — not the legacy slab text filter.

| Field | Guidance |
|-------|----------|
| **Scope preset** | `all_services`, `allied_travel`, `core_only`, etc. |
| **Scope JSON** | Fine-tune: country codes, institution IDs, intakes, service codes |
| **Source type** | `service_revenue`, `ancillary`, commission types |
| **Metric** | `net_revenue`, `enrolment_count`, `commission_received`, … |
| **Rate type** | `flat`, `percent`, `slab` (slab tiers linked via `rule_id`) |
| **Settlement currency** | Optional override (e.g. CAD campaign) |

### 6.3 Slabs tab (legacy + rule slabs)

- **Legacy slabs** (no `rule_id`): shared chain per source type + optional service filter text.
- **Rule slabs**: attached to a specific rule when rate type = `slab`.

**Slab rules (enforced in UI):**

1. First slab in a chain must start at **0**.
2. Each next slab `min` = previous slab `max` (no gaps, no overlaps).
3. Only one open-ended (∞) slab per chain.

If you see amber **slab issues** card — delete bad rows and rebuild the chain.

> **Legacy note:** Service filter on Slabs tab is text-only until rules exist. Blank = all services. Use **Rules** tab for real scope.

### 6.4 Targets tab

**Manual:** pick counselor, period key (e.g. `2026-06`), metric, target value, optional bonus.

**Auto-suggest (Phase 4):**

1. Enter **target period** (e.g. `2026-06`).
2. Optional **source period** (defaults to prior month).
3. Set **growth %** (default 10%).
4. Click **Suggest targets** — bulk inserts from prior month qualifying event totals.

Requires qualifying events in the source period (verified payments).

---

## 7. FX Rates & Buffer

**Path:** Incentives → **FX Rates** (`/incentives/fx-rates`)

Finance sets centralized rates so collections are not short-paid when markets move.

| Field | Example |
|-------|---------|
| **Base rate → INR** | 66 (CAD) |
| **Buffer fixed** | +2 (default) |
| **Effective** | 68 |
| **Purpose** | See table below |

### Rate purposes (Phase 4)

| Purpose | Used for |
|---------|----------|
| `general` | Fallback for all uses |
| `billing` | Client invoices (when wired) |
| `incentive_settlement` | Run calculation (engine default) |
| `payout` | Counselor payout conversion (future) |

Engine prefers purpose-specific rate, then falls back to `general`.

**RPC:** `fn_effective_fx_rate_to_inr(currency, period_key, purpose)`

Rates are **frozen on run lock** in `fx_snapshot`.

---

## 8. Competitions

**Path:** Incentives → **Competitions** (`/incentives/competitions`)

### 8.1 Branch contests

1. Name, period, pool amount, metric.
2. Select **2+ branches**.
3. **Refresh standings** — live totals from qualifying events.
4. On **calculate run**, winning branch pool splits appear as line items.

### 8.2 Campaign overlays

1. Set scope (preset + country/intake quick fields).
2. Bonus: flat per event / % revenue / fixed pool.
3. Matching qualifying events add overlay lines on calculate.

---

## 9. What-if Simulator

**Path:** Incentives → **Simulator** (`/incentives/simulator`)

- Pick plan, optional branch, period A (and optional period B).
- **Run simulation** — preview only; **nothing saved** to runs.
- Compare totals and per-counselor delta.

Use before locking a run to sanity-check a different period or branch filter.

---

## 10. Incentives Admin — Runs

**Path:** Incentives → **Incentives Admin** (`/incentives/admin`)

### 10.1 Standard workflow

| Step | Action | Result |
|------|--------|--------|
| 1 | **Preview** | See counselor totals + FX snapshot — no DB write |
| 2 | **Calculate** | Creates/updates run + line items |
| 3 | **Lock** | Freezes run, snapshots plan version + FX — immutable |

Pick **plan**, **period key** (`YYYY-MM`), optional **branch**.

### 10.2 After calculate

Click **Run** link → **Run Detail** (`/incentives/runs/:runId`):

- Per-counselor line items with notes (slab, rule, contest, campaign).
- **Manual adjustments** on locked runs (audit trail).

---

## 11. Attribution rules (why someone earns)

| Source | Attribution |
|--------|-------------|
| Verified payments | **Closer wins:** `closing_counselor_id` → `assigned_counselor_id` → `owner_id` |
| Commissions | Client's attributed counselor from client record |
| Net revenue | Wallet discounts on invoice allocated **pro-rata** to payment |
| Discount penalty | High discount depth reduces incentive (5–15%+ tiers) |
| Branch filter | Client `branch` text matched to branch name |
| Role filter | Counselor must have plan's `role_key` in `user_roles` |

---

## 12. Payout Desk & Finance Export

**Path:** Incentives → **Payout Desk** (`/incentives/payouts`)

### 12.1 Generate payouts

1. **Lock** the run first (Incentives Admin).
2. Copy **run ID** from Recent runs.
3. Enter run ID, set **TDS %** (e.g. 10).
4. **Generate payouts** — one row per counselor with earnings.

### 12.2 Approval workflow

| Status | Next action |
|--------|-------------|
| `pending` | **Approve** |
| `approved` | **Mark paid** |
| `paid` | Done — `paid_at` set |

### 12.3 Finance export (Phase 4)

1. **Finance export** section — optional run ID filter.
2. **Download CSV** — counselor, gross, TDS, net, currency, status.
3. After AP upload, paste **AP bill ID** on each payout row.

**RPC:** `fn_incentive_payout_export(run_id, period_key)`

---

## 13. Example: June counselor plan

**Plan:** INR, monthly, net revenue, global scope.

| Component | Configuration |
|-----------|---------------|
| R1 Base | Legacy slabs on `service_revenue`, net_revenue, 3%/5%/7% tiers |
| R2 IELTS push | Rule: coaching scope, flat per first payment |
| R3 Canada Sep-26 | Rule: country=CA, intake=Sep-2026, settle CAD |
| R4 Allied kicker | Rule: `allied_travel` preset, flat per event |
| Target | ₹8L per counselor — bonus at 100%+ |
| Contest | Mumbai vs Ajwa branch pool ₹50K |

See [Incentive Platform Spec §18](./incentive-platform-spec-v1.md#18-example-plans--scenarios) for full scenario matrix.

---

## 14. Governance rules

| # | Rule |
|---|------|
| G1 | **Verified payments only** count toward revenue |
| G2 | **Locked runs immutable** — use adjustments for corrections |
| G3 | **FX frozen at lock** |
| G4 | **Net revenue** subtracts wallet/offer discounts pro-rata |
| G5 | Every line item traceable to source payment / event |
| G6 | **Cash ≠ wallet** — separate ledgers and menus |
| G7 | Admin/manager only for calculate, lock, payout approve |

---

## 15. How incentives connect to wallet & offers

```flow
Counselor hits target → Achievement % → Wallet unlock (Wallet module)
Counselor gives discount → wallet_allocations → Reduces net revenue
Net revenue → Incentive engine → Cash earned
MarCom offer (university-funded) → May NOT debit counselor wallet
```

**Monthly order of operations (recommended):**

1. Counselors work the month — payments verified, discounts applied.
2. **Period Close** (wallet) — achievement finalized, wallets rolled.
3. **Incentives Admin** — preview → calculate → lock.
4. **Payout Desk** — generate → approve → paid → CSV.

Details: [Offers & Wallet Staff Guide](./offers-wallet-staff-guide.md)

---

## 16. Troubleshooting

### Preview / earned shows ₹0

| Check | Fix |
|-------|-----|
| No verified payments in period | Verify payments in Accounting / client invoices |
| Counselor not attributed | Set closing counselor on client |
| Branch filter too narrow | Remove branch filter or check client branch name |
| Role-scoped plan | Counselor must have matching app role |
| No matching rules/slabs | Add rules or legacy slabs for revenue source type |
| Slab chain broken | Fix continuous slabs in Plans |

### Slab insert rejected

- Min must continue from previous max.
- Cannot add after an open-ended (∞) slab.

### Suggest targets returns empty

- No qualifying events in source period — need verified payment activity first.

### FX looks wrong on preview

- Check **Incentive settlement** purpose rate for currency + period.
- Fallback uses `general` purpose.

### Payout generation fails

- Run must be **locked** first.
- Run must have line items with earnings > 0.

---

## 17. Advanced / planned (not yet in UI)

| Feature | Status |
|---------|--------|
| Unified Performance Hub UX | 🔲 Planned — see spec discussions |
| Full invoice FX migration off static matrix | 🟡 Partial |
| Payroll API integration | 🔲 CSV export ✅ |
| AI target recommendation | 🔲 Suggest from prior period ✅ |
| Telecaller / documentation attribution on leads | 🟡 Role plans ✅; event sources partial |
| `incentive_schemes` table usage | 🔲 Unused |

---

## 18. Related documents

| Document | Purpose |
|----------|---------|
| [Incentive Platform Spec v1.1](./incentive-platform-spec-v1.md) | Technical reference & data model |
| [Offers & Wallet Staff Guide](./offers-wallet-staff-guide.md) | Discount wallet & offers operations |
| [Offers & Discounts Scope v2](./offers-discounts-wallet-ai-scope-v2.md) | Product roadmap for offers/wallet/AI |

---

*Future Link Consultants — Internal staff guide. Phases 0–4 as deployed June 2026.*
