# Future Link Consultants — Offers & Discounts Module

**Advanced Scope & Specification (Merged v2)**

| Field | Value |
|-------|-------|
| **Version** | 2.1 |
| **Date** | 9 June 2026 · updated June 2026 |
| **Status** | Canonical scope — supersedes v1. **Staff guide:** [offers-wallet-staff-guide.md](./offers-wallet-staff-guide.md) |
| **Sources** | Codebase audit + stakeholder review + [FutureLink_Offers_Discounts_Module_Claude.pdf](./FutureLink_Offers_Discounts_Module_Claude.pdf) |
| **Classification** | Confidential — Internal |

**Status legend:** ✅ BUILT · 🟡 PARTIAL · 🔲 PLANNED

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Current implementation status](#2-current-implementation-status)
3. [Business goals & success metrics](#3-business-goals--success-metrics)
4. [Module architecture & navigation](#4-module-architecture--navigation)
5. [Offer types catalogue](#5-offer-types-catalogue)
6. [Offer lifecycle management](#6-offer-lifecycle-management)
7. [Promotion request workflow](#7-promotion-request-workflow)
8. [Targeting, segments & audiences](#8-targeting-segments--audiences)
9. [Omni-channel distribution](#9-omni-channel-distribution)
10. [University-funded promotions](#10-university-funded-promotions)
11. [Corporate promotions calendar](#11-corporate-promotions-calendar)
12. [Coupon & code management](#12-coupon--code-management)
13. [Business rules, approvals & guardrails](#13-business-rules-approvals--guardrails)
14. [Offer analytics & attribution](#14-offer-analytics--attribution)
15. [Automation journeys](#15-automation-journeys)
16. [Performance-linked counsellor offer wallet](#16-performance-linked-counsellor-offer-wallet)
17. [AI-powered offer intelligence](#17-ai-powered-offer-intelligence)
18. [Implementation roadmap](#18-implementation-roadmap)
19. [Roles & permissions matrix](#19-roles--permissions-matrix)
20. [Risks & mitigations](#20-risks--mitigations)
21. [Sign-off](#21-sign-off)
22. [Technical appendix — built inventory](#22-technical-appendix--built-inventory)
23. [Advanced features backlog (June 2026)](#23-advanced-features-backlog-june-2026)

---

## 1. Executive summary

This document defines the scope of an advanced **Offers & Discounts module** embedded in the Future Link Consultants CRM. The module transforms a simple discount list into a full **promotions engine** that creates, targets, distributes, tracks, and optimises offers across all service lines and customer touchpoints.

Future Link operates **multiple branches** with **multiple counsellors** per branch, serving leads and existing clients across:

- Study abroad (admission)
- Foreign exam coaching (IELTS, PTE, GRE, GMAT, SAT, etc.)
- Foreign language training (German, French, Spanish, etc.)
- Visa & immigration services

### Core objective

> Increase enrolment conversion and repeat business by giving the **right offer to the right person at the right moment, through the right channel** — while keeping every discount auditable, approval-controlled, and measurable against revenue.

### What this module delivers

- A **central offer library** — create once, reuse everywhere
- **Smart targeting** — leads, clients, family, Gen-Z, lapsed enquiries
- **Automation** — behaviour and date-triggered auto-offers
- **Omni-channel distribution** — WhatsApp, SMS, email, calls, social, portal
- **Approval workflows & guardrails** — margin protection
- **Analytics** — redemptions, revenue, branch/counsellor performance
- **Performance-linked counsellor wallets** — earn-to-give discount budgets
- **AI (restricted)** — Admin/MarCom creates offers; counsellors get suggestions & drafts only

### Strategic decisions (v2)

| Decision | Choice |
|----------|--------|
| Build approach | **Extend existing CRM** — mostly wiring, not rebuild (see §2) |
| Wallet sizing | Base wallet × **Performance Multiplier** (not flat % only) |
| Wallet unlock | **Proportional to current-month achievement** (configurable threshold) |
| Counsellor offers | **Restricted builder** — pre-approved types only; waivers need approval |
| AI offer **creation** | **Admin + MarCom / Digital Marketing only** (`offers_ai` permission) |
| AI for counsellors | **Suggest + draft only** from approved catalogue (L0/L1) |
| Funding awareness | University/Joint offers do **not** deduct counsellor wallet |
| Phase priority | Channels + auto-offers early; wallet Phase 4; predictive AI Phase 7 |

---

## 2. Current implementation status

Verified against live schema, frontend pages, and RPCs (June 2026).

> **Sprint 0 (10 Jun 2026):** Wallet/incentive DDL exported to `supabase/migrations/202606103*.sql`; achievement RPC `fn_counselor_period_achievement` fixes Period Close; see [SPRINT_0_READINESS_REPORT.md](./SPRINT_0_READINESS_REPORT.md).

### 2.1 Already built — reuse ✅

| Area | What exists |
|------|-------------|
| **Offer engine** | `offers`, `offer_templates`, `offer_groups`, `offer_group_members`, `offer_audience_targets`, `offer_events`, `offer_tracking_codes`, `client_offers`, `service_offers` |
| **Offers admin UI** | `/offers-admin` — CRUD, %, flat, audience, active flag |
| **Offer analytics** | `/offers-analytics` — `offer_roi_stats`, `counselor_offer_stats` |
| **Counsellor wallet** | `discount_wallets` — balance, caps, budget kind, scope tags, rollover |
| **Give discount** | `/incentives/give-discount` — `wallet_allocations`; DB trigger enforces cap & balance |
| **Wallet ledger** | `wallet_ledger` — movements with `balance_after` |
| **Wallet top-ups** | `/incentives/wallet-topups` — manual create/top-up; `wallet_topup_rules` schema |
| **Incentive engine** | `incentive_plans`, rules, runs, payouts — **Phases 0–4 deployed** |
| **Incentive UI** | Plans, Admin, FX, Competitions, Simulator, Payout desk, Run audit |
| **Period close** | `/incentives/period-close` — `fn_close_due_wallets`, `fn_reinstate_wallet`, achievement via `fn_counselor_period_achievement` |
| **Eligibility & analytics RPCs** | `offers_eligible_for_client`, `user_can_see_offer`, `log_offer_event` |
| **Family & referrals** | `client_family_members`, `referrals`, portal refer |
| **University promos (partial)** | `upi_promotions`, `upi_marketing_campaigns` |
| **Portal offers** | `/portal/offers` — claim, promo codes |
| **Invoice redemption** | `fn_redeem_offer_on_invoice` trigger |
| **Birthday cron** | `offers-lifecycle-tick` edge function 🟡 |

### 2.2 Partially built — needs connecting 🟡

| Capability | Exists | Missing |
|------------|--------|---------|
| Achievement-linked wallet sizing | Achievement % at Period Close; `wallet_topup_rules` | Auto-size/top-up from rules; manual only today |
| Proportional unlock | Balance, caps, allocations; achievement on My Incentives | Hard block at Give Discount when over unlock 🔲 |
| Base × multiplier | Incentive slabs, `bonus_trigger_pct`; target suggest RPC | Not applied to discount wallet sizing 🔲 |
| Strategic wallets | `scope_country_tag`, `scoped` budget kind | Ring-fence enforcement at allocation 🔲 |
| Performance Score | Targets, runs, leaderboard on My Incentives | Weighted score for multiplier 🔲 |
| Offer lifecycle | `is_active` flag | Draft → Approved → Active workflow 🔲 |
| Wallet ↔ offer link | FK on `wallet_allocations`; net revenue in incentive engine | Funding-aware deduction UI 🔲 |
| Analytics | ROI & counsellor stats | Offer Influence Revenue, Wallet Impact Revenue 🔲 |
| Cross-module UX | My Incentives shows wallet + cash | Unified Performance Hub navigation 🔲 |

### 2.3 Not yet built 🔲

- Funding source on offers (Future Link / University / Joint)
- Promotion Request workflow
- Corporate Promotions Calendar
- Restricted offer-builder enforcement
- AI Offer Studio (`/offers-ai-studio`)
- On-screen offer suggestions for counsellors
- Offer Influence Revenue attribution
- Campaign builder, segment library UI
- Unify `service_offers` + `offers`

### 2.4 How it connects internally (TO WIRE)

```
TARGETS & ACHIEVEMENT          WALLET                    OFFERS
─────────────────────          ──────                    ──────
incentive_targets ──┐          discount_wallets          offers
incentive_runs ─────┤          (balance, caps,           applied →
(achievement %) ────┘──TO WIRE scope tags)              client_offers
         │                         ▲                           │
wallet_topup_rules ───────────────┘                           │
         │                         │ allocate                  │
         └─────────────────────────┼─────────────────────────┘
                                   ▼
                          wallet_allocations
                                   │ writes
                                   ▼
                          wallet_ledger
                                   │ month end
                                   ▼
                          fn_close_due_wallets → next period
```

**Headline for developers:** Wallet, ledger, allocations, caps, targets/runs, and achievement calculation **already work**. Performance-linked behaviour is largely **wiring**: connect `wallet_topup_rules` + Period Close achievement to sizing/unlocking, enforce scope tags, add lifecycle + funding + analytics.

### 2.6 Incentive Platform integration ✅ (Phases 0–4 — June 2026)

The **cash incentive platform** is now deployed and wired to this module:

| Connection | How it works |
|------------|--------------|
| **Net revenue** | Incentive engine subtracts `wallet_allocations` pro-rata from verified payments |
| **Discount penalty** | Deep discounts (5–15%+) reduce cash incentive multiplier |
| **Qualifying events** | Verified payments feed `incentive_qualifying_events` — shared period_key |
| **Targets** | `incentive_targets` shared concept; achievement via `fn_counselor_period_achievement` |
| **My Incentives** | Single counselor view: wallet balance + cash earned + leaderboards |
| **Competitions** | Branch contests use same qualifying event stream |
| **Payouts** | Separate cash ledger (`incentive_payouts`) — not wallet |

**Staff guides:**

- [Incentives Module Guide](./incentives-module-guide.md) — cash incentives operations
- [Offers & Wallet Staff Guide](./offers-wallet-staff-guide.md) — this module's operations
- [Incentive Platform Spec v1.1](./incentive-platform-spec-v1.md) — technical reference

**Still to wire 🔲:** Wallet Impact Revenue metric · funding-aware deduction · unified Performance Hub UX · offer suggestions showing unlocked wallet balance.

### 2.5 Naming — do not confuse ⚠️

| Name | What it is |
|------|------------|
| `credit_wallet` | **Client** loyalty points — NOT this module |
| `discount_wallets` | **Counsellor** discount budget — this document |
| `incentive_*` | Staff **cash** incentives — related but distinct |

---

## 3. Business goals & success metrics

| Business goal | Module helps | Primary KPI |
|---------------|--------------|-------------|
| Convert more leads | Urgency, first-enrolment offers | Lead → enrolment % |
| Repeat business | Existing-client, cross-sell offers | Repeat enrolment rate |
| Grow referrals | Family & referral offers | Referrals per client |
| Lift ticket value | Bundle offers | Avg revenue per client |
| Reduce manual effort | Auto-offers, campaigns | Auto vs manual sends |
| Protect margin | Approvals, caps, floor price | Avg discount % vs cap |
| Channel ROI | Per-channel attribution | Redemptions & revenue per channel |
| Wallet efficiency | ROI-based scoring | Revenue per ₹1 wallet spent |

---

## 4. Module architecture & navigation

Expands current **Offers & Discounts** menu:

| Sub-section | Purpose | Status |
|-------------|---------|--------|
| Dashboard | Active offers, redemptions, expiring, pending approvals | 🔲 |
| Offer Library | Master list — create, clone, archive | ✅ `/offers-admin` |
| Create Offer | Step-by-step wizard | 🔲 |
| Offer Lifecycle | Status workflow, version history | 🔲 |
| **AI Offer Studio** | MarCom/Admin AI generation | 🔲 `/offers-ai-studio` |
| Promotion Requests | Field → MarCom queue | 🔲 |
| Auto-Offer Rules | Behaviour triggers | 🟡 birthday cron |
| Campaigns & Calendar | Bundles + annual calendar | 🔲 |
| Segments & Audiences | Gen-Z, family, lapsed, etc. | 🔲 |
| Funding & Partners | FL / University / Joint | 🔲 |
| Coupon & Code Manager | Bulk/unique codes, QR | 🟡 tracking codes |
| Approvals | Manager queue | 🔲 |
| Channels & Templates | WA, SMS, email, social | 🟡 DSH copy exists |
| Offer Analytics | Full reporting | ✅ `/offers-analytics` |
| Settings & Permissions | Caps, roles, branch rules | 🔲 |

**Design principle:** *Create once, use everywhere.*

---

## 5. Offer types catalogue

### 5.1 Standard offers

| Type | Example |
|------|---------|
| Percentage discount | 15% off IELTS coaching |
| Flat amount | ₹5,000 off Germany package |
| Free add-on | Free visa filing with study package |
| Bundle / combo | IELTS + German A1 |
| Tiered discount | ₹3k off above ₹50k; ₹8k above ₹1L |
| BOGO | 2nd language course at 50% |
| Instalment offer | 3-instalment fee plan |
| Scholarship waiver | Top scorer 25% off |

### 5.2 Auto-offers (behaviour-triggered) 🔲

**WHEN** trigger · **IF** conditions · **THEN** send offer

| Trigger | Auto-offer |
|---------|------------|
| New lead, no enrolment | Welcome / first-consultation |
| Inactive 7 days | Win-back discount |
| Inactive 30 days | Deep discount + counsellor task |
| Demo attended, not paid | 48-hour incentive |
| Course completing | Cross-sell next service |
| Exam approaching | Crash / retake offer |
| Birthday | Personalised discount 🟡 |
| Enrolment anniversary | Loyalty reward |
| Abandoned application | Assistance + nudge |

### 5.3 Festival & seasonal 🔲

Diwali, New Year, intake seasons (Fall/Spring), exam results, back-to-school, year-end — auto-activate on calendar dates.

### 5.4 Existing-client 🔲

Loyalty, cross-sell (IELTS → study abroad), upsell, renewal, milestone rewards (visa approved, admission secured).

### 5.5 Family 🔲

Sibling enrolment, family referral, dependent visa bundle, household language package — uses `client_family_members`.

### 5.6 Gen-Z 🔲

Student-ID discount, squad/group enrol, flash drops, referral gamification, ambassador program — primarily WhatsApp/social.

### 5.7 Additional types 🔲

Early-bird, last-minute urgency, win-back, corporate/institutional bulk, geo/branch-specific, limited slots, pay-in-full discount.

---

## 6. Offer lifecycle management

### 6.1 Statuses 🔲

| Status | Meaning |
|--------|---------|
| Draft | Being created |
| Pending Review | Awaiting MarCom/admin |
| Approved | Cleared, not live |
| Scheduled | Future start date |
| Active | Live |
| Expiring Soon | Within warning window |
| Expired | Past end date |
| Archived | Retired, kept for records |

### 6.2 Features 🔲

Auto status updates · approval history · version history · change log · clone · restore · expiry reminders.

### 6.3 Dashboard widgets 🔲

Active · Expiring · Draft · Archived offer counts.

---

## 7. Promotion request workflow

Counsellors and branch managers **request** — MarCom **builds**. No unrestricted field creation.

**Flow:** Request → MarCom Review → Approval → Offer Creation → Campaign Launch

**Request fields:** reason, target audience, country, service, estimated volume, competitor info, expected impact.

---

## 8. Targeting, segments & audiences

### 8.1 Building blocks 🔲

Lifecycle stage · service interest · demographics (Gen-Z) · behaviour · commercial · geography/branch.

### 8.2 Pre-built audiences 🔲

Hot leads · Cold leads · Gen-Z students · Existing clients · Family groups · Cross-sell ready · High-value · At-risk · Exam-soon · Intake-deadline-soon.

**Today:** ✅ `offers_eligible_for_client()` handles country, service, audience, caps.

---

## 9. Omni-channel distribution

| Channel | Capability | Status |
|---------|------------|--------|
| WhatsApp | Broadcasts, click-to-claim | 🔲 inbox exists |
| SMS | Personalised codes, short links | 🔲 |
| Email | Templates, drip, A/B | 🔲 SMTP exists |
| Counsellor calls | Scripts + one-tap send | 🔲 |
| Social | UTM links, scheduled posts | 🔲 DSH partial |
| Portal | Banner offers | ✅ `/portal/offers` |
| Landing pages | Auto-generated capture pages | 🔲 |

Personalisation tokens: name, course, counsellor, expiry, code.

---

## 10. University-funded promotions

| Funding model | Who pays | Wallet impact |
|---------------|----------|---------------|
| Future Link funded | Future Link | Deducts counsellor/company wallet |
| University funded | Partner university | **No wallet deduction** |
| Joint funded | Shared | Only FL share deducts |

**Track:** funding source, university contribution, FL contribution, revenue, ROI, university-wise reporting.

**Starting point:** ✅ `upi_promotions` for institution data.

---

## 11. Corporate promotions calendar 🔲

Single annual view: festivals, intakes, country campaigns, branch campaigns, university promos, open houses, fairs, webinars, social campaigns — with owner, budget, status (planned → live → completed).

---

## 12. Coupon & code management

| Feature | Status |
|---------|--------|
| Unique per-person codes | 🔲 |
| Bulk/generic codes (DIWALI15) | ✅ promo_code on offers |
| QR codes | 🔲 |
| Usage limits & validity | 🟡 partial caps |
| Counselor tracking codes | ✅ `offer_tracking_codes` |
| Fraud guards | 🔲 |

---

## 13. Business rules, approvals & guardrails

### 13.1 Guardrails

- Max discount caps by service line and role
- Stacking rules + max total discount per transaction
- Floor price protection
- Expiry enforcement

### 13.2 Approval workflow

Within cap + approved template → instant apply. Exceeds cap or custom offer → branch manager/admin queue with margin impact view.

### 13.3 Discount depth matrix

| Depth | Approver |
|-------|----------|
| ≤ 10% or ≤ ₹5,000 | Counsellor (within wallet) |
| 11–20% | Branch manager |
| > 20% or below floor | Admin / director |
| Scholarship / full waiver | Admin only |

---

## 14. Offer analytics & attribution

### 14.1 Core metrics ✅ (partial)

Offers sent · claims · redemptions · conversion · discount cost · ROI · channel · branch/counsellor leaderboard — via `/offers-analytics`.

### 14.2 Offer Influence Revenue 🔲

| Type | Counts |
|------|--------|
| Direct | Revenue on service offer applied to |
| Assisted | Later purchases influenced |
| Multi-service | Additional service lines from same lead |

*Example:* Germany offer → study abroad + German course + visa — all attributed.

### 14.3 Wallet Impact Revenue 🔲

Revenue through wallet offers specifically — prevents sizing wallet on total revenue when counsellor never used the system.

### 14.4 Optimisation 🔲

A/B testing · best-offer suggestions (rule-based → ML) · best-time-to-send · margin-vs-volume view.

---

## 15. Automation journeys

### 15.1 Cold-lead win-back
Day 2 WhatsApp → Day 7 email → Day 15 SMS → Day 30 counsellor task + manager-approved final offer.

### 15.2 Cross-sell after coaching
Completion message → +2 days study-abroad loyalty offer → +7 days family referral.

### 15.3 Festival family campaign
Auto-activate from calendar → target clients + family groups → multi-channel send → family discount at checkout.

---

## 16. Performance-linked counsellor offer wallet

### 16.1 Concept

Monthly **Offer Wallet** = discount **authority** (not cash). Counsellors spend it on **pre-approved offer types** within guardrails. Strong performers earn larger wallets next period.

### 16.2 Wallet allocation — Base × Performance Multiplier

```
Wallet = Base Wallet × Performance Multiplier
```

**Example:** Target ₹3,00,000 · Base ₹10,000 · Last period 120% achievement → 150% multiplier → **₹15,000 wallet**.

| Last-period achievement | Multiplier | Wallet on ₹10k base |
|-------------------------|------------|---------------------|
| Below 70% | 50% | ₹5,000 |
| 70–90% | 100% | ₹10,000 |
| 100% | 120% | ₹12,000 |
| 120% | 150% | ₹15,000 |
| 150%+ | 200% | ₹20,000 |

*Bands configurable per service line / role.*

### 16.3 Performance Score (drives multiplier) 🔲

| Metric | Weight |
|--------|--------|
| Revenue achievement | 40% |
| Conversion rate | 20% |
| Wallet ROI | 20% |
| Collections received | 10% |
| Client satisfaction | 10% |

**Guard:** Bigger discounts alone must **not** earn a bigger wallet — ROI and conversion matter.

### 16.4 Proportional unlock

Wallet size ≠ spendable on day 1. **Unlocked % = achievement %** (linear default; stepped optional).

| Revenue achieved | % target | Wallet ₹15k | Spendable |
|------------------|----------|-------------|-----------|
| ₹0 | 0% | | ₹0 |
| ₹1,00,000 | 33% | | ≈ ₹5,000 |
| ₹1,50,000 | 50% | | ≈ ₹7,500 |
| ₹3,00,000 | 100% | | ₹15,000 |

**Configurable:** unlock threshold floor (e.g. nothing until 20%) · stepped bands · "close to threshold" tolerance · per-client % cap (✅ exists) · no-full-burn rule.

### 16.5 Strategic wallet allocation 🔲

Ring-fenced bonus wallets — Germany-only, Italy campaign, language push — using existing `scope_country_tag`, `scope_service_code`, `scope_master_key`, `scoped` budget kind. **Half-built in schema; needs allocation enforcement.**

### 16.6 Branch wallets & competition 🔲

Branch pooled budget · counsellor leaderboard · branch leaderboard · gamification · manager reserve for key deals.

### 16.7 Restricted offer builder

| Allowed without approval | Requires approval |
|--------------------------|-------------------|
| Flat discount (within wallet) | Custom scholarship |
| % discount (within max % per client) | Full fee waiver |
| Free SOP / doc support | Premium service free |
| Free consultation | Unlimited discount |
| Free language assessment | Exceeds wallet or cap |

Counsellors **pick from pre-approved types** — they do **not** use AI to invent offers.

### 16.8 Mapping to existing screens

| Screen | Today (June 2026) | Enhancement |
|--------|-------------------|-------------|
| Give Discount | Apply discount; allocation + ledger | Show unlocked vs potential; block beyond unlock; funding-aware |
| Wallet Top-ups | Manual create | Base wallet + multiplier bands; auto-fund from rules |
| Period Close | Close + rollover; achievement RPC | Performance Score → next wallet multiplier |
| My Incentives | ✅ Wallet + achievement + cash earned + leaderboards + revenue mix | Wallet Impact Revenue, ROI vs team |
| Incentive Plans | ✅ Full plan/rule/slab/target builder + suggest | Hold multiplier bands, score weights |
| Incentives Admin | ✅ Preview/calculate/lock + run audit | Period command center integration |

### 16.9 Counsellor wallet dashboard 🟡

**Partially live on My Incentives:** target · achievement % · potential/unlocked/spent · cash earned · leaderboard rank · revenue mix.

**Still 🔲:** Performance Score breakdown · Wallet Impact Revenue · ROI vs team · strategic wallet balances · next unlock threshold UI.

---

## 17. AI-powered offer intelligence

### 17.1 Principle — central creates, field chooses

| Role | AI capability |
|------|---------------|
| **Admin / MarCom / Digital Marketing** | Full AI offer creation, campaigns, copy, variants |
| **Branch manager** | Run approved offers; **request** custom from centre |
| **Counsellor** | **Suggest + draft only** — never author new offer types |
| **Telecaller** | Read MarCom scripts; no AI creation |

### 17.2 Access control (implementation)

Grant AI Offer Studio if **any** of:

1. Role = `admin`
2. Module permission `offers_ai` = edit (add to `CRM_MODULES`)
3. User `profiles.department_id` → `departments.name` ∈ {Marketing, MarCom, Digital} (configurable)

Route: `/offers-ai-studio` · Edge function: `offer-ai-studio` · All AI calls server-side gated.

### 17.3 Three AI capabilities

| Capability | Who | Where |
|------------|-----|-------|
| **Offer suggestion** | Counsellor (from approved catalogue) | Lead/client record, Give Discount |
| **Message drafting** | Counsellor + MarCom | Channel composer |
| **Offer creation** | **Admin/MarCom only** | AI Offer Studio |

### 17.4 AI Offer Studio (MarCom/Admin) 🔲

Generate offer packs scoped by: branch · country · visa category · coaching type · language · intake · segment.

**Output:** title, terms, eligibility JSON, promo code, WhatsApp/email/social copy, counselor talking points, optional wallet allocation suggestion.

**Workflow:** AI draft → human review → publish to Offer Library.

### 17.5 On-screen suggestions for counsellors (build sooner) 🔲

```
Suggested offer for this lead
Recommended: 48-hour enrolment incentive (10% off)
Why: Counselling 5 days ago, study-abroad interest, no payment
Wallet: ₹12,000 unlocked available
[ Accept & send ]  [ Adjust ]  [ Dismiss ]
```

Uses: lifecycle, services, behaviour, eligibility, wallet fit — **only approved offers**.

### 17.6 Auto-send levels (phased)

| Level | Behaviour | When |
|-------|-----------|------|
| L0 Suggest only | Human sends everything | Launch |
| L1 Auto-draft | AI writes; human clicks send | Early |
| L2 Auto-send safe | Birthday, festival, abandoned form | After L1 trusted |
| L3 Auto-send broad | AI picks offer + channel | Data mature |
| L4 Self-optimising | Tunes depth + timing | Mature only |

### 17.7 Build sooner vs defer

| Build sooner | Defer |
|--------------|-------|
| On-screen suggestions + reasons | Predictive propensity scoring |
| AI-drafted messages | AI optimal discount depth |
| Auto-send safe triggers | Fully autonomous send |
| Wallet-aware suggestions | Self-optimising experiments |

### 17.8 AI guardrails

Wallet-bounded · creation-restricted · cap-respecting · approval-aware · explainable · auditable · human override · privacy-respecting · **no guaranteed visa language**.

---

## 18. Implementation roadmap

| Phase | Scope | Outcome | Status |
|-------|-------|---------|--------|
| **1 Foundation** | Offer library, types, codes, roles, caps | Create & apply offers | ✅ mostly done |
| **2 Channels** | WA, SMS, email, segments, approvals | Reach customers | 🔲 |
| **3 Automation** | Auto-rules, festival calendar, journeys, family/Gen-Z | Hands-free promos | 🟡 birthday |
| **4 Wallet** | Performance wallet, unlock, leaderboards | Earn-to-give | 🟡 schema + My Incentives partial |
| **4b Incentives** | Cash incentive platform Phases 0–4 | Runs, rules, payouts, contests | ✅ deployed — see [incentives-module-guide.md](./incentives-module-guide.md) |
| **5 Intelligence** | Influence revenue, A/B, attribution, social | Data-driven ROI | 🔲 |
| **6 AI assistive** | Suggestions, drafts, safe auto-send, AI Studio | MarCom + counsellor assist | 🔲 |
| **7 AI autonomous** | Predictive scoring, optimal depth, self-tuning | Mature AI | 🔲 |
| **8 UX Hub** | Unified Performance navigation | One module for incentives + wallet + offers | 🔲 |

**Developer priority (immediate):** Wire `wallet_topup_rules` + achievement % → wallet size/unlock (§2.4) · funding source on offers · Promotion request workflow.

---

## 19. Roles & permissions matrix

| Capability | Admin | MarCom | Branch Mgr | Counsellor | Telecaller | Client |
|------------|-------|--------|------------|------------|------------|--------|
| View offer library | ✅ | ✅ | ✅ | ✅ | ✅ | Own |
| Create / edit offers | ✅ | ✅ | 🔲 branch | ❌ | ❌ | ❌ |
| **AI Offer Studio** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Promotion requests | ✅ | ✅ review | ✅ submit | ✅ submit | ❌ | ❌ |
| Campaigns | ✅ | ✅ | 🔲 branch | ❌ | ❌ | ❌ |
| Wallet admin / schemes | ✅ | ❌ | 🔲 | ❌ | ❌ | ❌ |
| Give discount | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Restricted offer types | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| AI suggest/draft on lead | ✅ | ✅ | ✅ | ✅ | 🔲 | ❌ |
| Analytics | ✅ | ✅ | ✅ branch | ❌ | ❌ | ❌ |
| Period close | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Portal claim | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 20. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Over-discounting | ROI in Performance Score; floor price; restricted builder |
| Counselors use AI to create offers | AI creation Admin/MarCom only |
| Empty wallets | Auto-funding from rules (Phase 4) |
| University offer hits counsellor wallet | Funding source field + deduction logic |
| Confuse client vs counsellor wallet | Clear UI labels (§2.5) |
| Two offer systems | Converge `offers` + `service_offers` |
| Slow approval queue | SLA + notifications to approvers |

---

## 21. Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Business owner | | | ☐ |
| MarCom / Marketing head | | | ☐ |
| Operations / Branch heads | | | ☐ |
| Finance / Accounting | | | ☐ |
| Product / CRM admin | | | ☐ |
| Technical lead | | | ☐ |

---

## 22. Technical appendix — built inventory

*Codebase audit — updated June 2026*

### UI routes

| Route | Component | Status |
|-------|-----------|--------|
| `/offers-admin` | OffersAdmin.tsx | ✅ |
| `/offers-analytics` | OffersAnalytics.tsx | ✅ |
| `/portal/offers` | PortalOffers.tsx | ✅ |
| `/incentives/give-discount` | GiveDiscount.tsx | ✅ |
| `/incentives/wallet-topups` | WalletTopups.tsx | ✅ |
| `/incentives/period-close` | PeriodClose.tsx | ✅ |
| `/incentives` | MyIncentives.tsx | ✅ wallet + cash + leaderboards |
| `/incentives/plans` | IncentivePlans.tsx | ✅ |
| `/incentives/admin` | IncentivesAdmin.tsx | ✅ |
| `/incentives/fx-rates` | IncentiveFxRates.tsx | ✅ |
| `/incentives/competitions` | IncentiveCompetitions.tsx | ✅ |
| `/incentives/simulator` | IncentiveSimulator.tsx | ✅ |
| `/incentives/payouts` | IncentivePayoutDesk.tsx | ✅ |
| `/incentives/runs/:runId` | IncentiveRunDetail.tsx | ✅ |
| Client → Offers tab | ClientOffersPanel.tsx | ✅ |
| Invoice offer apply | ClientInvoicesPanel.tsx | ✅ |
| `/offers-ai-studio` | — | 🔲 |

### Edge functions

| Function | Purpose | Status |
|----------|---------|--------|
| `offers-lifecycle-tick` | Birthday auto-offers | 🟡 |
| `incentive-calculate-run` | Incentive runs (net after discount) | ✅ |
| `ai-summarize` | Client summary (auth pattern) | ✅ |
| `dsh-ai-generate-copy` | Marketing copy pack | ✅ |
| `offer-ai-studio` | MarCom offer generation | 🔲 |

### Key RPCs & triggers

| Name | Status |
|------|--------|
| `offers_eligible_for_client()` | ✅ |
| `offer_roi_stats()` | ✅ |
| `counselor_offer_stats()` | ✅ |
| `log_offer_event()` | ✅ |
| `fn_close_due_wallets()` | ✅ |
| `fn_reinstate_wallet()` | ✅ |
| `fn_redeem_offer_on_invoice` | ✅ |
| `fn_suggest_incentive_targets` | ✅ Phase 4 |
| `fn_incentive_payout_export` | ✅ Phase 4 |
| `fn_incentive_dimension_leaderboard` | ✅ Phase 3 |

### Related documents

| Document | Purpose |
|----------|---------|
| [offers-wallet-staff-guide.md](./offers-wallet-staff-guide.md) | **Staff operations** — offers + wallet |
| [incentives-module-guide.md](./incentives-module-guide.md) | **Staff operations** — cash incentives |
| [incentive-platform-spec-v1.md](./incentive-platform-spec-v1.md) | Incentive technical reference v1.1 |
| [offers-discounts-wallet-ai-scope.md](./offers-discounts-wallet-ai-scope.md) | v1 scope (superseded) |
| [FutureLink_Offers_Discounts_Module_Claude.pdf](./FutureLink_Offers_Discounts_Module_Claude.pdf) | Stakeholder narrative source |
| [offers-discounts-wallet-ai-scope-v2.html](./offers-discounts-wallet-ai-scope-v2.html) | Print-friendly HTML |

### Export to PDF

```bash
node scripts/md-to-print-html.mjs docs/guides/offers-discounts-wallet-ai-scope-v2.md
# Open the .html in browser → Cmd+P → Save as PDF
```

---

## 23. Advanced features backlog (June 2026)

Prioritized list of **not-yet-built** capabilities across offers, wallet, and cross-module integration. Staff summary in [offers-wallet-staff-guide.md §12](./offers-wallet-staff-guide.md#12-advanced-features-backlog-june-2026).

### P1 — High impact, wiring mostly exists

| # | Feature | Module | Notes |
|---|---------|--------|-------|
| A1 | Auto wallet sizing from `wallet_topup_rules` | Wallet | Schema ✅; connect Period Close achievement |
| A2 | Enforce unlocked balance at Give Discount | Wallet | Show unlocked vs potential; hard block |
| A3 | Funding source on offers (FL / University / Joint) | Offers | University offers must not debit counselor wallet |
| A4 | Promotion request workflow | Offers | Field → MarCom queue with margin view |
| A5 | Wallet-aware offer suggestions on client/lead | Offers + Wallet | L0 suggest only; show unlocked ₹ |

### P2 — Operational maturity

| # | Feature | Module | Notes |
|---|---------|--------|-------|
| B1 | Offer lifecycle (draft → approved → active) | Offers | Version history |
| B2 | Corporate promotions calendar | Offers | Tie to festival / intake seasons |
| B3 | Base × performance multiplier for wallet | Wallet | Bands from last-period achievement |
| B4 | Performance Score (weighted metrics) | Wallet | ROI guard — don't reward discount-only behavior |
| B5 | Omni-channel distribution (WA, SMS, email) | Offers | DSH copy partial |
| B6 | Manager approval queue for deep discounts | Offers | Depth matrix §13.3 |
| B7 | Restricted offer builder enforcement | Offers | Pre-approved types only for counselors |

### P3 — Analytics & segments

| # | Feature | Module | Notes |
|---|---------|--------|-------|
| C1 | Offer Influence Revenue | Offers | Direct + assisted + multi-service |
| C2 | Wallet Impact Revenue | Wallet | Size wallet on discount-driven revenue |
| C3 | Segment library UI | Offers | Gen-Z, family, lapsed, cold pool |
| C4 | Unique per-person coupon codes | Offers | Fraud guards |
| C5 | Strategic / scoped wallets | Wallet | Ring-fence by country/service |
| C6 | Branch pooled wallets | Wallet | Team competition |

### P4 — AI & automation (defer until P1–P2 stable)

| # | Feature | Module | Notes |
|---|---------|--------|-------|
| D1 | AI Offer Studio (`/offers-ai-studio`) | Offers | MarCom/Admin only |
| D2 | Auto-send safe triggers (birthday ✅ partial) | Offers | L2 after L0/L1 trusted |
| D3 | Automation journeys (win-back, cross-sell) | Offers | §15 |
| D4 | Predictive propensity / optimal depth | AI | Phase 7 |
| D5 | Self-optimising campaigns | AI | Phase 7 |

### P5 — Unified UX (Performance Hub)

| # | Feature | Notes |
|---|---------|-------|
| E1 | Single sidebar: Performance | Replace Incentives + Wallet + Offers groups |
| E2 | Period command center | Wallet close + incentive run + offer ROI one screen |
| E3 | Client promotions strip | Offers + wallet headroom + apply in-context |
| E4 | Counselor mobile-friendly Give Discount | Optional |

**Recommended build order:** A1 → A2 → A3 → A5 → B1 → E1 (UX can run parallel once A1–A3 scoped).

---

## Document history

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 9 Jun 2026 | Initial scope (Cursor) |
| 2.0 | 9 Jun 2026 | Merged with Claude PDF; canonical spec |
| 2.1 | Jun 2026 | Incentive Phases 0–4 integration; §23 advanced backlog; staff guides linked |

---

*Future Link Consultants — Confidential. Internal product & engineering scope.*
