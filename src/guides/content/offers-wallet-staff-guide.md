# Offers & Wallet — Staff Operational Guide

Use the **search bar** at the top of this page — try *give discount*, *top-up*, *period close*, *offer*, or *wallet*.

> **TIP:** This guide covers **counselor discount wallets** and **client offers**. For **cash incentives** (salary-style payouts), see [Incentives Module Guide](./incentives-module-guide.md).

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | June 2026 |
| **Status** | Active |
| **Product scope & roadmap** | [Offers & Discounts Scope v2](./offers-discounts-wallet-ai-scope-v2.md) |

**Status legend:** ✅ Live · 🟡 Partial · 🔲 Planned

---

## 1. Quick search

| I want to… | Section |
|------------|---------|
| Apply a discount to a client | §5 Give Discount |
| Create or edit an offer | §4 Offers Admin |
| Top up a counselor wallet | §6 Wallet Top-ups |
| Close the month for wallets | §7 Period Close |
| See offer performance | §8 Offer Analytics |
| Client claims offer on portal | §9 Portal & client record |
| Understand wallet vs cash incentives | §3 |
| See what's coming next | §12 Advanced features |

---

## 2. Where to find it

```navmap
Offers & Discounts → Offers & discounts | /offers-admin | Offer library CRUD
Offers & Discounts → Offer analytics | /offers-analytics | ROI & counselor stats
Wallet → Give Discount | /incentives/give-discount | Apply discount from wallet
Wallet → Wallet Top-ups | /incentives/wallet-topups | Create / fund wallets
Wallet → Period Close | /incentives/period-close | Month-end close + rollover
Incentives → My Incentives | /incentives | Wallet balance + achievement (counselor)
Client record → Offers tab | ClientOffersPanel | Active offers on client
Portal → Offers | /portal/offers | Client self-claim
Guide → Offers & Wallet | /guides/offers-wallet-staff | This guide
```

---

## 3. Three wallets — do not confuse

| Name | Who | What |
|------|-----|------|
| **`discount_wallets`** | Counselor | **Discount authority** — budget to give client discounts (this guide) |
| **`incentive_*` / payouts** | Counselor | **Cash incentives** — earned via runs ([Incentives Guide](./incentives-module-guide.md)) |
| **`credit_wallet`** | Client | **Loyalty points** — client portal; NOT counselor wallet |

### How they connect

```flow
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

---

## 4. Offers Admin — Offer library

**Path:** Offers & Discounts → **Offers & discounts** (`/offers-admin`)

### 4.1 Create an offer

| Field | Notes |
|-------|-------|
| Title / description | Shown to staff and portal |
| Discount type | Percentage or flat amount |
| Discount value | Cap-aware |
| Audience | Country, service, client segment |
| Valid from / to | Expiry enforcement |
| Promo code | Optional bulk code (e.g. DIWALI15) |
| Active flag | Must be active to assign |

### 4.2 Assign to client

- From **client record → Offers** tab, or during **Give Discount** flow.
- Eligibility checked via `offers_eligible_for_client()` RPC.

### 4.3 What's not built yet 🔲

- Offer lifecycle workflow (Draft → Approved → Active)
- Create-offer wizard
- Funding source (FL / University / Joint) on offer row
- Promotion request queue (field → MarCom)
- AI Offer Studio (`/offers-ai-studio`)

---

## 5. Give Discount

**Path:** Wallet → **Give Discount** (`/incentives/give-discount`)

### 5.1 Workflow

1. Select **client** (and invoice if applying to specific invoice).
2. Pick **offer** from eligible list (pre-approved catalogue).
3. System checks:
   - Wallet **balance** and **unlocked** amount
   - Per-client discount cap
   - Offer eligibility (country, service, audience)
4. Confirm → creates **`wallet_allocations`** + ledger entry.
5. Invoice net amount reduced — affects **incentive net revenue**.

### 5.2 Funding awareness (planned 🔲)

| Funding | Wallet impact |
|---------|---------------|
| Future Link funded | Debits counselor wallet |
| University funded | Should NOT debit wallet — 🔲 field not fully wired |
| Joint | Partial debit — 🟡 partial |

### 5.3 Counselor restrictions (planned 🔲)

Counselors should pick from **pre-approved offer types** only. Custom waivers → manager approval queue (not built).

---

## 6. Wallet Top-ups

**Path:** Wallet → **Wallet Top-ups** (`/incentives/wallet-topups`)

**Admin only.**

| Action | When |
|--------|------|
| Create wallet for counselor + period | Start of month or new joiner |
| Manual top-up | Exception / campaign bonus |
| Configure top-up rules | 🟡 Schema exists; auto-fund from rules partial |

### Planned: Base × Performance Multiplier 🔲

```
Wallet = Base Wallet × Performance Multiplier (from last period achievement)
```

Today: manual sizing is primary; achievement displays on My Incentives.

---

## 7. Period Close

**Path:** Wallet → **Period Close** (`/incentives/period-close`)

**Admin only.** Run at month end **before** incentive run lock (recommended order).

| Step | What happens |
|------|--------------|
| Review open wallets | Achievement % calculated via `fn_counselor_period_achievement` |
| Close period | `fn_close_due_wallets` — freezes wallet, rolls balance rules |
| Reseed next period | New wallet rows for upcoming month |
| Performance scores | Feeds leaderboard on My Incentives |

---

## 8. Offer Analytics

**Path:** Offers & Discounts → **Offer analytics** (`/offers-analytics`)

| Metric | Source |
|--------|--------|
| Offer ROI | `offer_roi_stats` |
| Counselor offer stats | `counselor_offer_stats` |
| Redemptions / claims | `offer_events`, `client_offers` |

### Planned analytics 🔲

- **Offer Influence Revenue** — assisted / multi-service attribution
- **Wallet Impact Revenue** — revenue specifically from wallet-applied discounts
- A/B testing, best-time-to-send

---

## 9. Portal & client record

| Location | Behavior |
|----------|----------|
| **Client → Offers tab** | Staff view of active/used offers |
| **Portal → Offers** | Client claims with promo code |
| **Invoice apply** | `fn_redeem_offer_on_invoice` trigger on invoice |

---

## 10. My Incentives — wallet section

Counselors see wallet on **My Incentives** (`/incentives`):

| Display | Meaning |
|---------|---------|
| Balance | Current wallet balance |
| Unlocked / potential | Spendable vs total sized wallet |
| Spent this period | Sum of allocations |
| Achievement % | Target progress — drives unlock |

Unlock threshold configurable (default 50% achievement before spending).

---

## 11. Monthly operations checklist

| # | Task | Owner | Screen |
|---|------|-------|--------|
| 1 | Verify payments through month | Accounts | Client invoices |
| 2 | Review offer redemptions | MarCom | Offer analytics |
| 3 | **Period Close** | Admin | Period Close |
| 4 | Preview / lock incentive run | Finance | Incentives Admin |
| 5 | Generate payouts | Finance | Payout Desk |

---

## 12. Advanced features backlog (June 2026)

Consolidated from [Offers Scope v2 §23](./offers-discounts-wallet-ai-scope-v2.md#23-advanced-features-backlog-june-2026). **Not yet built** unless marked 🟡.

### Offers — next priorities

| Priority | Feature | Benefit |
|----------|---------|---------|
| P1 | Promotion request workflow | Field asks MarCom for custom offers |
| P1 | Funding source on offers | University offers don't hit counselor wallet |
| P2 | Offer lifecycle (draft → approved → active) | Audit + margin control |
| P2 | Corporate promotions calendar | Festival / intake campaigns |
| P2 | Omni-channel send (WA, SMS, email) | Reach customers at scale |
| P3 | Segment library UI | Gen-Z, family, lapsed leads |
| P3 | Unique per-person coupon codes | Fraud reduction |
| P4 | AI Offer Studio (MarCom only) | Fast campaign creation |
| P4 | On-screen offer suggestions on lead/client | Counselor assist L0/L1 |

### Wallet — next priorities

| Priority | Feature | Benefit |
|----------|---------|---------|
| P1 | Auto wallet sizing from `wallet_topup_rules` | Remove manual top-ups |
| P1 | Enforce unlocked balance at Give Discount | Can't overspend before achievement |
| P2 | Base × performance multiplier bands | Reward high achievers |
| P2 | Performance Score (ROI, conversion weights) | Smarter wallet sizing |
| P3 | Strategic / scoped wallets | Germany-only campaign ring-fence |
| P3 | Branch pooled wallets + competition | Team gamification |
| P4 | Wallet Impact Revenue metric | Size wallet on discount-driven revenue |

### Cross-module (Performance Hub) 🔲

| Feature | Description |
|---------|-------------|
| Unified navigation | One "Performance" area instead of 3 sidebar groups |
| Client promotions strip | Offers + wallet headroom on client record |
| Period command center | Wallet close + incentive run + offer ROI in one view |
| Wallet-aware offer suggestions | "₹12K unlocked — suggest 10% enrolment offer" |

---

## 13. Troubleshooting

| Issue | Check |
|-------|-------|
| Can't apply discount — insufficient wallet | Top-up or wait for unlock threshold |
| Offer not in eligible list | Audience, country, service, expiry, active flag |
| Achievement shows — | Target set? Verified payments in period? |
| Period close fails | Open allocations? Run as admin? |
| Incentive net lower than expected | Wallet discounts reduce net revenue — expected |

---

## 14. Related documents

| Document | Purpose |
|----------|---------|
| [Offers & Discounts Scope v2](./offers-discounts-wallet-ai-scope-v2.md) | Full product spec & roadmap |
| [Incentives Module Guide](./incentives-module-guide.md) | Cash incentives operations |
| [Incentive Platform Spec v1.1](./incentive-platform-spec-v1.md) | Incentive engine reference |

---

*Future Link Consultants — Internal staff guide.*
