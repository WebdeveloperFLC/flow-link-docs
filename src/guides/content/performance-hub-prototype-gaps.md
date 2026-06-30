# Performance Hub — Gaps & Prototype Brief

**What is NOT covered in staff guides · NOT built in prod · Needed for UX prototype**

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | June 2026 |
| **Audience** | Product / design prototype (Claude, Figma, etc.) |
| **Companion docs** | [Incentives Module Guide](./incentives-module-guide.md) · [Offers & Wallet Guide](./offers-wallet-staff-guide.md) · [Offers Scope v2.1](./offers-discounts-wallet-ai-scope-v2.md) · [Incentive Spec v1.1](./incentive-platform-spec-v1.md) |

**Purpose:** Staff guides document **what exists and how to use it**. This document lists **everything missing, partial, or undocumented** so a prototype can show the **target state** (Performance Hub) without guessing.

---

## 1. Executive summary — three modules today

```text
┌─────────────────────────────────────────────────────────────────┐
│  LIVE (documented in guides)          │  NOT LIVE (prototype)    │
├───────────────────────────────────────┼──────────────────────────┤
│ Cash incentives Phases 0–4            │ Unified Performance Hub  │
│ Wallet CRUD + Give Discount           │ Auto wallet sizing       │
│ Offers library + analytics            │ Promotion request queue  │
│ My Incentives (wallet + cash mixed)   │ AI offer suggestions     │
│ Net revenue ↔ wallet in engine        │ Offer Influence Revenue  │
│ Funding source on offers (basic)      │ Approval workflows UI    │
└───────────────────────────────────────┴──────────────────────────┘
```

**Prototype should design for:** one mental model (“Performance & Promotions”), period-first admin, counselor single home, client in-context promotions strip.

---

## 2. What staff guides deliberately omit

| Topic | Why omitted | Prototype should include |
|-------|-------------|--------------------------|
| Lovable / Supabase deploy | Engineering only | N/A |
| Migration file names | `docs/INCENTIVE_PHASE*_DEPLOY.md` | N/A |
| Edge function auth internals | Technical | Error states: 403 forbidden on run |
| RLS policy details | Security | Role-based empty states |
| Static FX matrix (`fx.ts`) | Legacy debt | “Billing rate” vs “Incentive rate” labels |
| `incentive_schemes` table | Unused schema | Either hide or design “scheme templates” |
| `service_offers` vs `offers` | Dual system | Convergence UX or deprecation banner |
| Sprint reports | Engineering history | N/A |

---

## 3. Unified UX — not built (highest prototype priority)

### 3.1 Navigation today (fragmented)

Three sidebar groups:

- **Incentives** — 8 admin routes
- **Wallet** — 3 routes
- **Offers & Discounts** — 2 routes

### 3.2 Target: Performance Hub

| Screen | Route (proposed) | Combines |
|--------|------------------|----------|
| Counselor home | `/performance` | My Incentives + quick Give Discount + suggestions |
| Admin command center | `/performance/admin` | Period selector + 4 KPI tiles + workflow strip |
| Plans & rules | `/performance/admin/plans` | Current Incentive Plans tabs |
| Offers studio | `/performance/offers` | Offers admin + lifecycle + calendar |
| Wallet policy | `/performance/wallet` | Top-ups, rules, period close |
| Runs & finance | `/performance/settlement` | Admin + simulator + payouts |

### 3.3 Period command center (missing UI)

**One screen, one period (`2026-06`), one branch filter.**

| Tile | Data source | Actions |
|------|-------------|---------|
| Verified revenue | `incentive_qualifying_events` | Drill to events |
| Wallet unlocked | `discount_wallets` | Link to Give Discount stats |
| Offers redeemed | `offer_events` / analytics | Link to ROI |
| Cash incentive due | latest run / preview | Preview → Calculate → Lock |

**Workflow strip (linear):**

1. Review qualifying events / unclassified payments
2. Period Close (wallets)
3. Preview incentive run
4. Lock run
5. Generate payouts → Export CSV
6. Mark paid + AP refs

**Not in any guide as a single flow** — only described in pieces.

### 3.4 Client / lead context (missing)

On **client record**, prototype should show one **Promotions** strip:

- Active offers · wallet discounts applied · remaining wallet headroom
- **Suggested offer** card (not built) with Accept / Dismiss
- **Apply discount** inline (today: separate Give Discount page)

---

## 4. Incentives — built vs gaps

### 4.1 Built ✅ (do not re-prototype unless improving UX)

| Capability | Route / artifact |
|------------|------------------|
| Plans, rules, slabs, targets | `/incentives/plans` |
| Auto-suggest targets | RPC `fn_suggest_incentive_targets` |
| FX + buffer + purpose | `/incentives/fx-rates` |
| Preview / calculate / lock | `/incentives/admin` |
| Run line-item audit + adjustments | `/incentives/runs/:id` |
| Branch contests + campaign overlays | `/incentives/competitions` |
| What-if simulator | `/incentives/simulator` |
| Payouts + CSV + AP bill ID | `/incentives/payouts` |
| Role-scoped plans | `scope_type=role` |
| Qualifying events on verify | DB trigger |
| Discount penalty on deep discounts | Engine: 5%→100%, 10%→90%, 15%→75%, >15%→0 |

### 4.2 Partial 🟡 (prototype should show intended behavior)

| Gap | Today | Target for prototype |
|-----|-------|----------------------|
| **Rule stacking** | Additive only | UI: exclusive / cap per rule; “highest wins” toggle |
| **Enrolment milestones** | `first_payment` mostly wired | Offer received, visa lodged, commission paid selectors on rule |
| **Telecaller attribution** | Role filter on plan | Events from `lead_converted` + `converted_by` |
| **Slab metric** | UI has count/gross/net; engine mostly revenue | Show metric on line-item note; count-based rules prominent |
| **Unclassified revenue queue** | Payments without service tags still calc | Admin queue: “fix before lock” with assign service |
| **Plan on run** | Branch filter on admin | Plan-level `branch_id` auto-filter |
| **Invoice FX** | Incentive uses `fx_rates`; invoices may use static matrix | Single “Finance FX policy” screen with purpose tabs |
| **Adjustments** | On run detail | Dedicated adjustments report / export |

### 4.3 Not built 🔲 (incentives-only)

| ID | Feature | Prototype notes |
|----|---------|-----------------|
| I1 | Payroll API integration | CSV ✅; show “Sent to payroll” status |
| I2 | FX change audit log | Who changed rate, when, diff |
| I3 | `incentive_schemes` templates | Reusable plan templates library |
| I4 | Split attribution (50/50 counselors) | Explicit split rules on event |
| I5 | AI target recommendation | Beyond % growth suggest — ML optional |
| I6 | Counselor dispute / query on line item | Comment thread on run line |
| I7 | Multi-plan stacking per counselor | One counselor on two plans same period |
| I8 | Real-time earning ticker | WebSocket / poll on My Incentives |

---

## 5. Wallet — built vs gaps

### 5.1 Built ✅

| Capability | Route / artifact |
|------------|------------------|
| `discount_wallets` ledger | DB |
| Give Discount | `/incentives/give-discount` |
| Wallet top-ups (manual) | `/incentives/wallet-topups` |
| Period close + rollover | `/incentives/period-close` |
| Achievement RPC | `fn_counselor_period_achievement` |
| Allocations + ledger | `wallet_allocations`, `wallet_ledger` |
| Per-client cap | DB trigger |
| Funding-aware debit | University = 0 debit; joint = FL share % (Give Discount + RPC) |
| Strategic wallet schema | `scope_country_tag`, `scoped` budget kind on wallet |

### 5.2 Partial 🟡

| Gap | Today | Target for prototype |
|-----|-------|----------------------|
| **Proportional unlock** | Achievement shown; spend may not hard-block | Give Discount: red bar when discount > unlocked; block submit |
| **Unlocked vs potential** | My Incentives shows both | Give Discount header: “₹X unlocked of ₹Y potential” |
| **Auto sizing** | `wallet_topup_rules` schema exists | Period Close: “Apply rules” → auto-creates wallets |
| **Performance multiplier** | Documented formula, not applied | Top-ups UI: bands table (70%→0.5×, 100%→1.2×, etc.) |
| **Performance Score** | Leaderboard rank only | Score breakdown card: revenue 40%, conversion 20%, wallet ROI 20%, … |
| **Strategic wallet enforcement** | Schema only | Germany wallet cannot apply to Canada client — inline error |
| **Wallet Impact Revenue** | Not calculated | Metric on counselor dashboard + admin |

### 5.3 Not built 🔲

| ID | Feature | Prototype notes |
|----|---------|-----------------|
| W1 | Base wallet config by role/branch | Admin: “Counselor base ₹10k / month” |
| W2 | Branch pooled wallet | Manager allocates from branch pool |
| W3 | Wallet competition / gamification | Branch wallet leaderboard |
| W4 | No-full-burn rule | Cannot spend 100% unlocked in week 1 |
| W5 | Stepped unlock bands | 0–20% achievement → 0% unlock; 20%+ linear |
| W6 | Wallet expiry / use-it-or-lose-it | Unspent unlocked forfeited at period close |
| W7 | Counselor wallet request | “Request ₹5k exception” → manager approve |
| W8 | Mobile Give Discount | Simplified flow on phone |

### 5.4 Wallet sizing formula (for prototype copy)

```text
Wallet (potential) = Base Wallet × Performance Multiplier (last period)

Performance Multiplier bands (example — configurable):
  < 70% achievement  → 0.5×
  70–90%             → 1.0×
  100%               → 1.2×
  120%               → 1.5×
  150%+              → 2.0×

Unlocked (spendable) = potential × min(achievement%, 100%)  [linear default]
                      OR stepped bands
                      OR 0 until threshold (e.g. 50% achievement)

Performance Score (not live) — drives multiplier:
  Revenue achievement     40%
  Conversion rate         20%
  Wallet ROI              20%
  Collections received    10%
  Client satisfaction     10%
```

---

## 6. Offers & discounts — built vs gaps

### 6.1 Built ✅

| Capability | Route / artifact |
|------------|------------------|
| Offer CRUD | `/offers-admin` |
| Funding source field | FL / University / Joint + `fl_contribution_pct` |
| Offer analytics | `/offers-analytics` |
| Eligibility RPC | `offers_eligible_for_client` |
| Client offers panel | Client record |
| Portal claim | `/portal/offers` |
| Promo codes | `promo_code` on offers |
| Tracking codes | `offer_tracking_codes` |
| Invoice redeem trigger | `fn_redeem_offer_on_invoice` |
| Birthday cron | `offers-lifecycle-tick` 🟡 |

### 6.2 Partial 🟡

| Gap | Today | Target for prototype |
|-----|-------|----------------------|
| **Offer lifecycle** | `is_active` boolean | Draft → Review → Approved → Active → Expired → Archived |
| **Usage limits** | Partial caps | Per-client, per-offer, global redemption count |
| **Omni-channel** | DSH marketing copy | Send via WA / SMS / email from offer row |
| **University promos** | `upi_promotions` data | Link offer to institution promo campaign |
| **Restricted builder** | Counselors use Give Discount | Cannot create offer types — pick from catalogue only |
| **Approval matrix** | Documented §13.3 | UI queue when discount depth exceeded |

### 6.3 Not built 🔲

| ID | Feature | Prototype notes |
|----|---------|-----------------|
| O1 | Offers dashboard | Active, expiring, pending approvals, redemptions today |
| O2 | Create-offer wizard | Step: type → scope → funding → channels → review |
| O3 | Promotion request workflow | Counselor submits → MarCom queue → publish |
| O4 | Corporate calendar | Annual grid: Diwali, intakes, branch campaigns |
| O5 | Segment library | Gen-Z, family, lapsed 30d, cold pool — reusable audiences |
| O6 | Auto-offer rules UI | WHEN trigger + IF conditions + THEN offer |
| O7 | Automation journeys | Win-back day 2/7/15/30 sequences (§15 scope doc) |
| O8 | Unique per-person codes | One code per lead; QR |
| O9 | Fraud guards | Velocity limits, duplicate device, self-referral |
| O10 | Offer Influence Revenue | Direct / assisted / multi-service attribution |
| O11 | A/B testing | Two variants, winner auto-promote |
| O12 | AI Offer Studio | `/offers-ai-studio` — MarCom only |
| O13 | Counselor suggestion card | On lead/client — see §6.4 |
| O14 | Unify `service_offers` + `offers` | Migration / deprecation UX |
| O15 | Landing pages per offer | Auto-generated capture URL |
| O16 | Floor price protection | Block discount below margin floor |

### 6.4 Counselor suggestion card (spec — not built)

```text
┌─────────────────────────────────────────────────────────────┐
│ Suggested offer for this lead                               │
│ Recommended: 48-hour enrolment incentive (10% off IELTS)    │
│ Why: Counselling 5 days ago · study-abroad · no payment       │
│ Wallet: ₹12,000 unlocked · FL-funded · within cap           │
│ [ Accept & send ]  [ Adjust amount ]  [ Dismiss ]             │
└─────────────────────────────────────────────────────────────┘
```

**Data needed:** lifecycle stage, services, last activity, eligible offers, unlocked wallet, funding rules.

**AI level:** L0 suggest only (human sends) — no auto-send in v1 prototype.

### 6.5 Approval depth matrix (design — not enforced in UI)

| Depth | Approver | Prototype |
|-------|----------|-----------|
| ≤ 10% or ≤ ₹5,000 | Counselor (within wallet) | Instant apply |
| 11–20% | Branch manager | Pending badge + notify |
| > 20% or below floor | Admin / director | Escalation queue |
| Scholarship / full waiver | Admin only | Block counselor submit |

---

## 7. Cross-module wiring gaps

| ID | Connection | Status | Prototype implication |
|----|------------|--------|------------------------|
| X1 | Wallet spend → net revenue → incentives | ✅ Engine | Show “₹X discount reduced your incentive base” on My Incentives |
| X2 | University offer → no wallet debit | ✅ Give Discount | Clear badge on offer + confirmation |
| X3 | Achievement → wallet unlock | 🟡 Display only | Hard gate on Give Discount |
| X4 | Achievement → wallet size next month | 🔲 | Period Close preview: “Next month wallet ₹Y” |
| X5 | Offer redemption → qualifying events | 🟡 | Timeline: offer applied → payment verified → event |
| X6 | Competition prize → wallet OR cash | 🟡 Cash in engine | Toggle per contest: wallet top-up vs payout line |
| X7 | Target one place | 🟡 | Single target editor feeds wallet + incentive bonus |
| X8 | Performance Hub period selector | 🔲 | Global context bar on all admin screens |

---

## 8. Roles & permissions — gaps for prototype

| Capability | Admin | MarCom | Branch mgr | Counselor | Today |
|------------|-------|--------|------------|-----------|-------|
| AI Offer Studio | ✅ | ✅ | ❌ | ❌ | 🔲 route missing |
| Promotion requests | review | review | submit | submit | 🔲 |
| Wallet rules config | ✅ | ❌ | 🔲 | ❌ | 🔲 UI |
| Approve deep discount | ✅ | ❌ | ✅ | ❌ | 🔲 queue |
| Incentive calculate/lock | ✅ | ❌ | ✅ | ❌ | ✅ |
| Period close | ✅ | ❌ | ❌ | ❌ | ✅ |
| Give discount | ✅ | ❌ | ✅ | ✅ | ✅ |
| View offer analytics | ✅ | ✅ | branch | ❌ | ✅ partial |

**Prototype:** Permission-aware nav — counselor sees 2 items; admin sees full Hub.

---

## 9. Data model — exists but no UI

| Table / field | Purpose | Prototype screen |
|---------------|---------|------------------|
| `incentive_schemes` | Plan templates | “Scheme library” |
| `wallet_topup_rules` | Auto fund rules | “Wallet policy rules” |
| `incentive_adjustments` | Post-lock corrections | Adjustments tab (partial on run detail) |
| `offer_audience_targets` | Segments | Segment picker in offer wizard |
| `offer_groups` / `offer_group_members` | Bundles | Bundle builder |
| `offer_events` | Funnel analytics | Event timeline on offer detail |
| `accounting_ap_bill_id` on payouts | AP integration | ✅ payout desk — extend to bulk paste |
| `rate_purpose` on `fx_rates` | Multi-purpose FX | ✅ — extend to billing consumers |

---

## 10. Event types — partial coverage

| Event type | In qualifying events? | Incentive engine? | Prototype |
|------------|----------------------|-------------------|-----------|
| `payment_verified` | ✅ | ✅ | Primary |
| `commission_paid` | 🟡 | ✅ via commission table | Show on timeline |
| `enrolment` | 🔲 | 🔲 | Pipeline stage hook |
| `stage_change` | 🔲 | 🔲 | Visa lodged milestone |
| `lead_converted` | 🔲 | 🔲 | Telecaller incentives |

---

## 11. Empty & error states to prototype

| Screen | State | Message / action |
|--------|-------|------------------|
| My Incentives | No target | “No target set — contact admin” |
| My Incentives | ₹0 earned | Explain: no verified payments / no matching rules |
| Give Discount | Over unlock | “Only ₹X unlocked — reduce discount or wait” |
| Give Discount | University offer | “No wallet debit — university funded” |
| Incentives Admin | Preview ₹0 | Checklist: payments, attribution, slabs, branch |
| Payout desk | Run not locked | “Lock run before generating payouts” |
| Offers admin | No eligible clients | Segment too narrow warning |
| Promotion queue | SLA breach | “Pending 48h — escalate” (future) |

---

## 12. Sample personas for prototype flows

### Counselor (Priya)

- Opens **Performance home** → sees target 72%, wallet ₹8k unlocked / ₹12k potential, cash earned ₹24k projected
- On **client record** → suggestion card → applies 10% offer → wallet debits ₹2k
- End of month → cash payout appears after finance locks run

### Branch manager (Raj)

- **Command center** → branch filter Mumbai → preview run → approves team payouts
- **Approval queue** → 18% discount request from counselor → approve with note

### Finance (Anita)

- Sets **FX rates** (billing vs incentive purposes)
- **Lock run** → **Export CSV** → paste AP bill IDs
- Reviews **unclassified payments** before lock

### MarCom (Sneha)

- **AI Offer Studio** → generates Diwali pack → review → publish to library
- **Calendar** → schedules Sep intake Canada campaign
- Reviews **promotion requests** from field

---

## 13. Recommended prototype scope (MVP vs full)

### MVP prototype (2–3 screens)

1. **Counselor Performance home** — wallet + cash + achievement + suggestion placeholder
2. **Admin period command center** — 4 tiles + workflow strip
3. **Client promotions strip** — offers + apply + suggestion card

### Full prototype (add)

4. Offer wizard + lifecycle states
5. Promotion request queue
6. Wallet policy rules + multiplier bands
7. Approval queue (depth matrix)
8. Corporate calendar
9. AI Offer Studio (MarCom)
10. Analytics: Influence + Wallet Impact revenue

---

## 14. File references for builders

| Area | Key files |
|------|-----------|
| Incentive engine | `supabase/functions/incentive-calculate-run/index.ts` |
| Wallet logic | `src/incentives/lib/walletEngineLogic.ts` |
| Give Discount | `src/pages/GiveDiscount.tsx` |
| Offers admin | `src/pages/OffersAdmin.tsx` |
| My Incentives | `src/pages/MyIncentives.tsx` |
| Migrations | `supabase/migrations/20260618120000_*` through `20260618150000_*` |
| Scope (offers) | `docs/guides/offers-discounts-wallet-ai-scope-v2.md` §23 |
| Staff guides | `incentives-module-guide.md`, `offers-wallet-staff-guide.md` |

---

## 15. Document history

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jun 2026 | Initial prototype gaps brief |

---

*In CRM: **Guide → Performance Hub Gaps** (`/guides/performance-hub-gaps`). Copy into Claude for prototype generation. Staff guides cover the left column of §1; this doc covers the right column and all partial states.*
