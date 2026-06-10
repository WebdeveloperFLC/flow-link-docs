# Future Link Consultants — Offers, Discounts, Performance Wallet & AI Offer Studio

> **Superseded:** Use **[offers-discounts-wallet-ai-scope-v2.md](./offers-discounts-wallet-ai-scope-v2.md)** (merged with Claude PDF review). This v1 file is kept for history.

**Product Scope Document (v1 — archived)**

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | 9 June 2026 |
| **Organization** | Future Link Consultants |
| **Business** | Study abroad · Foreign exam coaching · Language training (DE/FR/ES) · Visa & immigration |
| **Operating model** | Multi-branch · Multi-counselor · Unified leads + clients CRM |
| **Document owner** | Product / CRM Admin |
| **Classification** | Internal — Product & Engineering |

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Build status audit](#2-build-status-audit)
3. [Vision and design principles](#3-vision-and-design-principles)
4. [Module navigation architecture](#4-module-navigation-architecture)
5. [Offer taxonomy](#5-offer-taxonomy)
6. [Performance-based discount wallet (Earn-to-Give)](#6-performance-based-discount-wallet-earn-to-give)
7. [Multi-channel orchestration](#7-multi-channel-orchestration)
8. [Eligibility and rules engine](#8-eligibility-and-rules-engine)
9. [AI Offer Studio (admin & MarCom only)](#9-ai-offer-studio-admin--marcom-only)
10. [Governance, fraud and margin controls](#10-governance-fraud-and-margin-controls)
11. [Analytics and KPIs](#11-analytics-and-kpis)
12. [Data model reference](#12-data-model-reference)
13. [Integration map](#13-integration-map)
14. [Sample offer catalog](#14-sample-offer-catalog)
15. [Phased delivery roadmap](#15-phased-delivery-roadmap)
16. [Roles and permissions matrix](#16-roles-and-permissions-matrix)
17. [Risks and mitigations](#17-risks-and-mitigations)
18. [Sign-off](#18-sign-off)
19. [Appendix — Confirmed built inventory](#19-appendix--confirmed-built-inventory)

**Status legend**

| Symbol | Meaning |
|--------|---------|
| ✅ **BUILT** | Exists in codebase / DB / UI and is usable today |
| 🟡 **PARTIAL** | Schema or backend exists; UI or automation incomplete |
| 🔲 **PLANNED** | Defined in scope; not yet implemented |

---

## 1. Executive summary

Future Link Consultants needs a unified **Offers & Discounts revenue engine** that:

1. **Converts leads faster** through urgency, personalization, and counselor attribution
2. **Increases wallet share** from existing clients via upsell, cross-sell, and family referrals
3. **Runs consistently** across WhatsApp, email, telecaller, social, portal, and walk-in
4. **Protects margin** via approval rules, caps, stacking rules, and branch budgets
5. **Rewards performance** through counselor discount wallets funded by targets and achievement
6. **Uses AI strategically** — restricted to **Admin** and **MarCom / designated departments** for offer *creation and campaign design*, not open to all counselors

### Strategic decisions (approved direction)

| Decision | Choice |
|----------|--------|
| Wallet funding | Based on monthly target + last-month performance; unlock gated by current-month achievement |
| Counselor autonomy | Give discounts and run assigned offers from wallet; **cannot** use AI to invent offers |
| AI access | **Admin + MarCom (or department-granted `offers_ai` permission) only** |
| Offer creation | Global/festival/segment offers by MarCom; personal mini-offers by counselors within wallet caps |
| Channel strategy | One offer engine, many campaigns |

---

## 2. Build status audit

### 2.1 Offers & Discounts

| Feature | Status | Location |
|---------|--------|----------|
| Offer CRUD (title, %, flat, dates, promo code) | ✅ BUILT | `/offers-admin` |
| Audience targeting (global / group / individual) | ✅ BUILT | `offers` table |
| Country targeting | ✅ BUILT | Offers Admin |
| Service targeting | ✅ BUILT | Offers Admin |
| Redemption caps (max total, per client) | ✅ BUILT | DB + eligibility RPC |
| Counselor tracking codes | ✅ BUILT | Offers Admin → Tracking codes |
| Offer groups (legacy) | ✅ BUILT | Offers Admin → Groups |
| Staff eligibility RPC | ✅ BUILT | `offers_eligible_for_client()` |
| Attach offer to client (staff) | ✅ BUILT | Client detail → Offers tab |
| Client portal offer center | ✅ BUILT | `/portal/offers` |
| Promo code self-claim (portal) | ✅ BUILT | PortalOffers |
| Apply offer on invoice | ✅ BUILT | ClientInvoicesPanel |
| Auto-redeem on invoice | ✅ BUILT | `fn_redeem_offer_on_invoice` |
| Offer event logging | ✅ BUILT | `offer_events` + `log_offer_event()` |
| Offer analytics dashboard | ✅ BUILT | `/offers-analytics` |
| Offer ROI RPC | ✅ BUILT | `offer_roi_stats()` |
| Counselor offer leaderboard | ✅ BUILT | `counselor_offer_stats()` |
| Birthday offer templates (DB) | 🟡 PARTIAL | `offer_templates` table |
| Birthday auto-generation (cron) | 🟡 PARTIAL | `offers-lifecycle-tick` edge function |
| Birthday template admin UI | 🔲 PLANNED | — |
| Campaign builder (multi-channel) | 🔲 PLANNED | — |
| Festival / Gen Z / family programs | 🔲 PLANNED | — |
| WhatsApp offer card send | 🔲 PLANNED | WhatsApp inbox exists separately |
| AI Offer Studio | 🔲 PLANNED | See Section 9 |
| Unify `service_offers` + `offers` | 🔲 PLANNED | Two parallel systems today |

### 2.2 Discount Wallet

| Feature | Status | Location |
|---------|--------|----------|
| Counselor wallet per period | ✅ BUILT | `discount_wallets` |
| Wallet types: month-to-month, festive, scoped | ✅ BUILT | `/incentives/wallet-topups` |
| Manual wallet creation and top-ups | ✅ BUILT | Wallet Top-ups |
| Give discount to own lead/client | ✅ BUILT | `/incentives/give-discount` |
| Max % and max amount per client | ✅ BUILT | Wallet setup + DB trigger |
| Wallet ledger and allocations | ✅ BUILT | `wallet_ledger`, `wallet_allocations` |
| Reverse discount | ✅ BUILT | Give Discount UI |
| Period close + rollover | ✅ BUILT | `/incentives/period-close` |
| Achievement % display | ✅ BUILT | Period Close (target vs run) |
| Allocation → offer / invoice link | 🟡 PARTIAL | FK columns exist |
| Auto-fund from target | 🔲 PLANNED | Wallets often created at ₹0 |
| Allocated vs unlocked balance | 🔲 PLANNED | Single `balance` field today |
| Achievement unlock spend gate | 🔲 PLANNED | Display only, no block yet |
| Counselor personal offers | 🔲 PLANNED | — |
| Unified Wallet + Offers UI | 🔲 PLANNED | Separate nav today |

### 2.3 Related modules

| Module | Status | Offers integration |
|--------|--------|-------------------|
| Incentives (plans, runs, targets) | ✅ BUILT | Achievement source for wallet |
| WhatsApp Inbox | ✅ BUILT | 🔲 Offer cards |
| Email / SMTP | ✅ BUILT | 🔲 Offer campaigns |
| Telecaller | ✅ BUILT | 🔲 Suggested offer scripts |
| Digital Success Hub | ✅ BUILT | 🔲 Creative generation |
| UPI institution promotions | ✅ BUILT | 🔲 Scholarship mapping |
| AI summarize (clients) | ✅ BUILT | Pattern for Offer Studio context |
| Module permissions | ✅ BUILT | Extend with `offers` + `offers_ai` |

---

## 3. Vision and design principles

1. **One Offer Engine, many Campaigns** — do not duplicate festival offers across channels
2. **Earn to Give** — counselors unlock discount budget by hitting targets
3. **Eligibility is computed** — system explains why an offer applies or does not
4. **Attribution is first-class** — counselor, branch, channel, campaign on every redemption
5. **Margin-safe by default** — discounts require rules; deep cuts need approval
6. **Segment-native** — study abroad, coaching, language, and visa buyers behave differently
7. **AI is a MarCom power tool, not a counselor free-for-all** — AI generates and optimizes offers; counselors execute within wallet and assigned campaigns

---

## 4. Module navigation architecture

### 4.1 Admin / MarCom — Offers Hub

```
Offers Hub
├── Dashboard              🔲 PLANNED — live KPIs, expiring offers
├── Offer Library          ✅ BUILT — /offers-admin
├── AI Offer Studio        🔲 PLANNED — Admin + MarCom only (Section 9)
├── Campaigns              🔲 PLANNED — multi-channel push
├── Auto Programs          🟡 PARTIAL — birthday cron only
├── Segments & Audiences   🔲 PLANNED — Gen Z, alumni, family, intake
├── Promo Codes            ✅ BUILT — tracking codes
├── Bundles & Combos       🔲 PLANNED
├── Wallet Schemes         🔲 PLANNED — auto-funding rules
├── Budget & Approvals     🔲 PLANNED
└── Analytics              ✅ BUILT — /offers-analytics
```

### 4.2 Counselor / branch staff (no AI offer creation)

```
My Sales Wallet
├── Wallet balance & unlock progress   🟡 PARTIAL
├── Give Discount                      ✅ BUILT
├── Assigned offers (from MarCom)      ✅ BUILT — eligible offers on client
├── Send via WhatsApp / copy link      🔲 PLANNED
└── My discounts this period           ✅ BUILT
```

### 4.3 Wallet admin

```
Wallet Admin
├── Wallet Top-ups         ✅ BUILT
├── Period Close           ✅ BUILT
└── Funding Schemes        🔲 PLANNED
```

---

## 5. Offer taxonomy

### 5.1 Discount mechanics

| Type | Example | Status |
|------|---------|--------|
| Percentage off | 15% off consultancy fee | ✅ BUILT |
| Flat INR off | ₹2,000 off visa filing | ✅ BUILT |
| Fixed price | IELTS crash @ ₹9,999 | 🔲 PLANNED |
| Free add-on | Free SOP review with package | 🔲 PLANNED |
| Combo / bundle | Admission + IELTS + visa = 20% off | 🟡 PARTIAL |
| Tiered / slab | 2 services = 10%, 3 = 18% | 🔲 PLANNED |
| Referral / family credit | Sibling 15% off | 🔲 PLANNED |
| Cashback to wallet | 5% back for next service | 🔲 PLANNED |
| Early-bird / intake | Sept 2026 Canada — register by 31 May | 🔲 PLANNED |

### 5.2 Audience segments

| Segment | Owner | Status |
|---------|-------|--------|
| Global campaigns | MarCom / Admin | ✅ BUILT |
| Festival & seasonal | MarCom (AI-assisted) | 🔲 PLANNED |
| Existing client / upsell | MarCom + auto triggers | 🔲 PLANNED |
| Family & referral | MarCom + system rules | 🔲 PLANNED |
| Gen Z (18–24) | MarCom (AI-assisted) | 🔲 PLANNED |
| Lead-stage auto | System workflows | 🔲 PLANNED |
| Birthday | System (template) | 🟡 PARTIAL |
| Branch / counselor scoped | Admin + branch manager | 🟡 PARTIAL |
| Counselor personal (wallet) | Counselor (manual, no AI) | 🔲 PLANNED |

### 5.3 Service-line offer ideas (Future Link portfolio)

| Vertical | High-impact offers |
|----------|-------------------|
| Study abroad / admission | Intake bundles, free shortlisting, application support packs |
| IELTS / PTE / Duolingo / GMAT / GRE | Batch-start discounts, crash course flash sales |
| German / French / Spanish | A1+A2 combos, Goethe/DELF/DELE prep bundles |
| Visa & immigration | Document prep packages, express processing add-ons |
| Allied | SOP/LOR, forex, travel insurance cross-sell |

---

## 6. Performance-based discount wallet (Earn-to-Give)

### 6.1 Concept

Each counselor receives a **monthly discount wallet**:

| Balance type | Definition |
|--------------|------------|
| **Allocated** | Full entitlement for the period (e.g. ₹15,000) |
| **Unlocked** | Spendable based on current-month achievement |
| **Spent** | Already applied to clients/leads |
| **Available** | Unlocked − Spent |

**Status:** 🔲 PLANNED (logic designed; not fully implemented)

### 6.2 Funding formula (example policy)

| Setting | Example |
|---------|---------|
| Monthly target | ₹3,00,000 |
| Wallet rate | 5% of target → **₹15,000 allocated** |
| Unlock threshold | 50% of current-month target before any spending |
| Unlock above threshold | Linear proportional |
| Max % per client | 10% (✅ already in wallet setup) |
| Max single discount | 25% of unlocked balance |
| Reservation expiry | 7 days without linked invoice |

**Achievement vs unlock example**

| Achievement | Unlocked | Can spend? |
|-------------|----------|------------|
| ₹1,00,000 / ₹3L (33%) | ₹0 | ❌ Below 50% threshold |
| ₹1,50,000 / ₹3L (50%) | ₹7,500 | ✅ Yes |
| ₹3,00,000 / ₹3L (100%) | ₹15,000 | ✅ Full wallet |

### 6.3 Auto-funding workflow (monthly job)

```
1st of each month:
  FOR each active counselor:
    1. Read last month achievement (incentive_runs — verified payments)
    2. Read current month target (incentive_targets)
    3. allocated = target × wallet_rate (+ performance bonus tier)
    4. Create or top-up discount_wallet for new period_key
    5. unlocked = f(MTD achievement, unlock rules)
    6. Log wallet_ledger entry
    7. Notify counselor (in-app + optional WhatsApp)
```

**Status:** 🔲 PLANNED

### 6.4 Counselor personal offers (no AI)

Counselors may create **manual** mini-offers within wallet limits:

- Title, description, % or flat amount
- Valid 7 / 14 / 30 days
- Audience: **their assigned leads/clients only**
- Each claim reserves wallet until invoice paid

**AI does not assist counselors in creating these offers** — only MarCom/Admin uses AI for offer design at scale.

### 6.5 Spend guardrails

| Rule | Default | Status |
|------|---------|--------|
| Max % per client | 10% | ✅ BUILT |
| Max flat per client | Optional | ✅ BUILT |
| Unlock threshold | 50% of target | 🔲 PLANNED |
| Max % of wallet per discount | 25% | 🔲 PLANNED |
| Reservation expiry | 7 days | 🔲 PLANNED |
| Over-cap → manager approval | Yes | 🟡 PARTIAL |

### 6.6 Branch competition

- Branch target → optional branch wallet pool
- Branch leaderboard: achievement %, wallet ROI, registrations influenced
- Inter-branch quarterly contests with extra wallet prizes

**Status:** 🔲 PLANNED

---

## 7. Multi-channel orchestration

| Channel | Capability | Status |
|---------|------------|--------|
| Client portal | View / claim offers | ✅ BUILT |
| WhatsApp | Offer card in inbox | 🔲 PLANNED |
| Email | Branded offer template | 🔲 PLANNED |
| Telecaller | Assigned offer script (from MarCom) | 🔲 PLANNED |
| SMS | Short link + code | 🔲 PLANNED |
| Social media | Shareable UTM links / QR | 🔲 PLANNED |
| Walk-in / branch QR | Branch landing → assign counselor | 🔲 PLANNED |
| Personalized link | `futurelink.in/o/{token}` | 🔲 PLANNED |

**Campaign object (planned):** bundles 1+ offers, target segment, channel mix, schedule, creatives, tracking, approval workflow.

---

## 8. Eligibility and rules engine

### 8.1 Currently built (✅)

- Offer is active
- Within validity window
- Audience match (global / group / individual)
- Country match (`clients.interested_country`)
- Service overlap (`applicable_services`)
- Redemption caps (global and per client)

### 8.2 Planned extensions (🔲)

| Dimension | Examples |
|-----------|----------|
| WHO | Lead/client stage, age band, Gen Z, alumni, family link, branch |
| WHAT | Intake month, institution (UPI), education level, visa category |
| WHEN | Day-of-week, countdown, festival window |
| WHERE | Branch, online vs walk-in |
| HOW | Channel allowed |
| BEHAVIOR | Lead score, last contact, campaign source |
| LIMITS | Branch cap, household cap, counselor quota |

### 8.3 Stacking and approval

| Discount depth | Approver |
|----------------|----------|
| ≤ 10% or ≤ ₹5,000 | Counselor (within wallet) |
| 11–20% | Branch manager |
| > 20% or below floor | Admin / director |
| MarCom AI-generated offer | Requires Admin/MarCom publish approval before go-live |

---

## 9. AI Offer Studio (Admin & MarCom only)

### 9.1 Access policy — RESTRICTED

**AI offer generation is NOT available to counselors, telecallers, or general staff.**

| Role / grant | AI Offer Studio access |
|--------------|------------------------|
| **Administrator** | Full access — create, edit, publish, configure |
| **MarCom / Marketing department** | Full access — via department membership OR explicit `offers_ai` module permission |
| **Branch manager** | 🔲 Optional read-only view of branch-scoped suggestions (no publish) |
| **Counselor** | ❌ No access — receives finished offers only |
| **Telecaller** | ❌ No access — receives scripts for assigned campaigns |
| **Client (portal)** | ❌ No access |

**Implementation approach (aligns with existing CRM patterns):**

1. New module key: `offers_ai` in `CRM_MODULES` / `user_module_permissions`
2. Route guard: `/offers-ai-studio` — requires `admin` role **OR** `offers_ai` edit permission **OR** user `department` = Marketing / MarCom (configurable in `departments` master)
3. Edge function: `offer-ai-studio` — verifies same gate server-side before any AI call
4. Audit: every AI generation logged with `created_by`, department, prompt context hash

**Rationale:** Prevents margin erosion, inconsistent messaging, and unauthorized discount promises. MarCom maintains brand, compliance, and pricing strategy; counselors execute within wallet and published campaigns.

### 9.2 What AI Offer Studio does

Central workspace for **Admin and MarCom** to design, generate, and publish offers using AI — scoped by:

- **Counselor** (personalized allocation, not AI creation by counselor)
- **Branch**
- **Country** (Canada, UK, Germany, etc.)
- **Visa category** (student, work permit, PR pathway, etc.)
- **Coaching type** (IELTS, PTE, German A1, etc.)
- **Language training** (DE/FR/ES levels)
- **Intake season** (Jan / Sep)
- **Audience segment** (Gen Z, family, alumni, festival)
- **Service bundle** (admission + coaching + visa)

### 9.3 AI Studio features

#### A. Offer brief → full offer pack

**Input (form):**

```
Campaign name:     Diwali 2026 — Canada Intake
Target:            Branch = Ahmedabad · Country = Canada
Services:          Admission + IELTS coaching
Segment:           Warm leads + existing coaching clients
Discount type:     Combo percentage
Budget cap:        Max 15% · Max ₹8,000 per client
Valid:             20 Oct – 5 Nov 2026
Channels:          WhatsApp, email, social, portal
Tone:              Energetic, family-friendly
```

**AI output (structured, human-reviewed before publish):**

- Offer title and description (terms-compliant)
- Discount mechanics (% / flat / bundle rules)
- Eligibility rules (JSON for `offers` table)
- Promo code suggestion
- WhatsApp broadcast (≤400 chars)
- Email subject + body
- Instagram / Facebook / LinkedIn copy
- SMS (≤160 chars)
- Counselor talking points (for telecaller handoff)
- Branch poster brief (for Digital Success Hub)
- **Suggested wallet allocation per counselor** (optional admin action)

#### B. Segment intelligence (read-only analytics feed to AI)

AI receives aggregated, anonymized patterns — not raw PII free-for-all:

- Conversion rates by country × service × offer type (from `offer_roi_stats`)
- Lead temperature distribution by branch
- Top services on leads/clients in target segment
- Active competing offers (avoid overlap)
- Historical best-performing campaigns

#### C. Country / visa / coaching offer templates

Pre-built MarCom templates AI customizes:

| Template | Example output |
|----------|------------------|
| Canada Sep intake early bird | 12% combo admission + visa |
| UK postgraduate bundle | Flat ₹5,000 off + free SOP review |
| Germany language pathway | A1+A2 bundle fixed price |
| IELTS crash Gen Z | ₹9,999 fixed · 48-hour flash |
| Student visa filing | Document prep package discount |
| Family sibling offer | 2nd child 15% off |

#### D. Branch rollout planner

MarCom selects branches → AI suggests:

- Branch-specific headline tweaks (regional language optional)
- Wallet top-up amounts per branch based on target size
- Counselor assignment of tracking codes
- Launch schedule (stagger by timezone / branch capacity)

#### E. Offer performance coach (admin analytics AI)

Post-campaign AI summary:

- "Summer Bonus: 33% redemption but 0 views — distribution problem"
- "Recommend: shift 20% budget to WhatsApp vs email for Gen Z"
- "Ahmedabad outperformed Mumbai on IELTS offers — clone creative"

**Counselors do not see this AI coach** — MarCom and Admin only.

### 9.4 AI architecture — three layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — RULES (deterministic, no AI bypass)              │
│  Eligibility, caps, wallet limits, approval matrix          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — AI OFFER STUDIO (Admin / MarCom only)            │
│  Generate offer copy, segments, campaigns, branch rollouts  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — EXECUTION (counselors, telecallers)             │
│  Send assigned offers · Give wallet discounts · No AI       │
└─────────────────────────────────────────────────────────────┘
```

### 9.5 AI guardrails (mandatory)

1. **Human publish gate** — AI output is always `draft`; MarCom/Admin publishes
2. **No discount beyond configured ceiling** — AI respects max % and max amount in brief
3. **Eligible services only** — AI picks from service library codes, not invented services
4. **Compliance language** — no "guaranteed visa" or misleading claims (align with academy metadata rules)
5. **No counselor-facing auto-send** — AI never messages clients directly without human publish
6. **Audit trail** — `offer_ai_generations` table: prompt, output, reviewer, published offer_id
7. **Rate limits & credits** — same pattern as existing `ai-summarize`, `dsh-ai-generate-copy`
8. **Department scope** — MarCom user in Marketing dept cannot publish branch-only offers outside their scope unless Admin

### 9.6 Planned edge function: `offer-ai-studio`

```
POST /functions/v1/offer-ai-studio
Auth: admin | offers_ai edit | department in ALLOWED_DEPTS

Body:
  action: "generate_offer_pack" | "suggest_segment" | "branch_rollout" | "campaign_review"
  brief: { ... }
  scope: { branches[], countries[], services[], visa_categories[], segments[] }

Process:
  1. Verify permission (server-side)
  2. Gather aggregated segment stats (no unauthorized client PII)
  3. Load active offers (avoid conflicts)
  4. Call AI with structured tool output
  5. Store draft in offer_ai_generations
  6. Return draft for MarCom review

Publish (separate action):
  1. MarCom clicks "Create offer from draft"
  2. Inserts into offers + optional campaign + optional wallet top-ups
  3. Logs offer_events (delivered)
```

### 9.7 UI: AI Offer Studio (`/offers-ai-studio`)

**Access badge shown in header:** `Admin` or `MarCom`

**Tabs:**

| Tab | Purpose |
|-----|---------|
| **New offer** | Brief form → AI generate → review → publish |
| **Drafts** | Pending MarCom review |
| **Segment explorer** | Pick country / visa / coaching → see stats → generate |
| **Branch rollout** | Multi-branch campaign wizard |
| **Campaign review** | AI post-mortem on past offers |
| **Settings** | Allowed departments, max discount AI can suggest, tone presets |

### 9.8 What counselors see instead (no AI)

On lead/client detail:

- **Eligible offers** (from MarCom-published catalog) — ✅ already built
- **Recommended for you** — **rule-based rank only** (score + service match + ROI), not generative AI
- **Your wallet balance** and unlock status
- **One-click send** of MarCom-approved templates (when built)

This gives counselors guidance without AI creation access.

---

## 10. Governance, fraud and margin controls

| Control | Detail |
|---------|--------|
| AI access restricted | Admin + MarCom / `offers_ai` permission only |
| Publish approval | All AI offers draft → review → publish |
| Wallet unlock threshold | Cannot spend until achievement met |
| Verified payments only | Achievement from verified payments, not drafts |
| Unique promo codes | Rate limiting on claim attempts |
| Household dedupe | Phone/email normalization |
| Counselor self-dealing | Cannot apply discretionary offer to own referral without approval |
| Refund clawback | Offer status reverts on invoice refund |
| Immutable event log | `offer_events` append-only |
| Incentive net basis | Discounts reduce net revenue in incentive runs (✅ built) |

---

## 11. Analytics and KPIs

### 11.1 Dashboards

| Dashboard | Audience | Metrics |
|-----------|----------|---------|
| Executive | Admin | Promo ROI, conversion lift, discount as % of revenue |
| MarCom | MarCom | Channel performance, segment lift, AI draft → publish rate |
| Branch manager | Branch | Budget consumed, counselor leaderboard, idle wallet |
| Counselor | Counselor | Own wallet, discounts given, attributed revenue (no AI analytics) |

### 11.2 KPI targets

| KPI | Target |
|-----|--------|
| Lead → paid conversion lift (offer cohorts) | +15% |
| Counselors with unlocked wallet mid-month | > 70% |
| Wallet-attributed conversion rate | > 25% |
| Revenue per ₹1 wallet spent | > ₹8 |
| Offer redemption rate (claims → paid) | > 35% |
| MarCom AI draft approval rate | > 80% within 48h |
| Unauthorized AI access attempts | 0 |

---

## 12. Data model reference

### 12.1 Existing tables (✅ BUILT)

| Table | Purpose |
|-------|---------|
| `offers` | Master offer definitions |
| `client_offers` | Per-client claims |
| `offer_audience_targets` | Individual / group targeting |
| `offer_groups` / `offer_group_members` | Group audiences |
| `offer_tracking_codes` | Per-counselor attribution |
| `offer_events` | Analytics event log |
| `offer_templates` | Birthday / workflow recipes |
| `discount_wallets` | Counselor period wallets |
| `wallet_topups` | Manual / scheme top-ups |
| `wallet_ledger` | Wallet audit trail |
| `wallet_allocations` | Discounts given |
| `wallet_settings` | Reinstate grace window |
| `wallet_topup_rules` | Achievement-band rules (schema only) |
| `incentive_targets` | Monthly counselor targets |
| `incentive_runs` | Verified revenue per period |
| `incentive_schemes` | Linked to wallet top-ups |
| `departments` | Department master for MarCom gate |
| `user_module_permissions` | Per-user module overrides |
| `service_offers` | Registration-flow offers (separate) |

### 12.2 Planned tables / columns (🔲)

| Entity | Purpose |
|--------|---------|
| `discount_wallets.allocated_balance` | Full entitlement |
| `discount_wallets.unlocked_balance` | Achievement-gated spend |
| `discount_wallets.unlock_threshold_pct` | Min achievement to spend |
| `offer_campaigns` | Multi-channel campaigns |
| `offer_ai_generations` | AI draft log (Admin/MarCom) |
| `offer_funding_schemes` | Auto wallet funding rules |
| `offer_approvals` | Manager approval queue |
| Module key `offers_ai` | Permission for AI Studio |

---

## 13. Integration map

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  INCENTIVES      │────▶│  WALLET          │────▶│  OFFERS          │
│  targets, runs   │     │  allocated/      │     │  library,        │
│  achievement     │     │  unlocked/spent  │     │  campaigns       │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
┌──────────────────┐     ┌──────────────────┐              │
│  AI OFFER STUDIO │────▶│  MARCOM PUBLISH  │──────────────┘
│  (Admin/MarCom)  │     │  draft → live    │
└──────────────────┘     └──────────────────┘
         │                                              │
         ▼                                              ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  DIGITAL SUCCESS │     │  WHATSAPP        │     │  EMAIL / CALLS   │
│  posters, copy   │     │  offer cards     │     │  scripts         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 14. Sample offer catalog (starter pack)

| # | Offer | Segment | Owner | Status |
|---|-------|---------|-------|--------|
| 1 | Summer Bonus Dhamaka 2026 | Global | MarCom | ✅ LIVE |
| 2 | Diwali Study Abroad Bundle | Festival | MarCom + AI | 🔲 PLANNED |
| 3 | Gen Z IELTS Flash ₹9,999 | Gen Z | MarCom + AI | 🔲 PLANNED |
| 4 | Sibling Second Child 15% | Family | MarCom | 🔲 PLANNED |
| 5 | Birthday Week ₹1,500 | Auto | System | 🟡 PARTIAL |
| 6 | Cold Pool Revival | Auto lead | MarCom | 🔲 PLANNED |
| 7 | German A1+A2 Pathway | Language | MarCom + AI | 🔲 PLANNED |
| 8 | Refer & Earn ₹5k | Referral | MarCom | 🔲 PLANNED |
| 9 | Counselor personal offer | Wallet | Counselor (manual) | 🔲 PLANNED |
| 10 | Jan Intake Last Call | Intake | MarCom + AI | 🔲 PLANNED |

---

## 15. Phased delivery roadmap

### Phase 1 — Foundation ✅ MOSTLY COMPLETE

- Offer library, eligibility, portal, tracking codes, invoice redemption
- Wallet create, top-up, give discount, period close
- Offer analytics + counselor leaderboard
- **Remaining:** birthday template admin UI; full offer_events instrumentation

### Phase 2A — Wallet automation (4 weeks) 🔲

- Auto-funding from targets
- `allocated_balance` / `unlocked_balance`
- Unlock gating on Give Discount
- Achievement progress UI for counselors

### Phase 2B — Unified counselor UX (3 weeks) 🔲

- Merge wallet + assigned offers view
- Wallet → client offer → invoice linkage
- MarCom-published offer templates for one-click send

### Phase 2C — Campaigns & channels (4 weeks) 🔲

- Campaign builder
- WhatsApp / email offer send
- Telecaller scripts (from MarCom campaigns, not AI per call)

### Phase 3A — AI Offer Studio (4 weeks) 🔲

- `offers_ai` module permission + department gate
- `/offers-ai-studio` UI
- `offer-ai-studio` edge function
- Draft → review → publish workflow
- Branch / country / visa / coaching segment generators

### Phase 3B — Intelligence & optimization (ongoing) 🔲

- Campaign review AI (MarCom only)
- Rule-based counselor recommendations (no generative AI)
- UPI scholarship mapping
- Unify `service_offers` + `offers`

---

## 16. Roles and permissions matrix

| Capability | Admin | MarCom | Branch Mgr | Counselor | Telecaller | Client |
|------------|-------|--------|------------|-----------|------------|--------|
| View offer library | ✅ | ✅ | ✅ | ✅ | ✅ | Own only |
| Create / edit global offers | ✅ | ✅ | 🔲 branch | ❌ | ❌ | ❌ |
| **AI Offer Studio** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Publish AI-generated offers | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create campaigns | ✅ | ✅ | 🔲 branch | ❌ | ❌ | ❌ |
| Wallet top-ups / schemes | ✅ | ❌ | 🔲 branch | ❌ | ❌ | ❌ |
| Give discount (wallet) | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Personal mini-offer (manual) | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| View offer analytics | ✅ | ✅ | ✅ branch | ❌ | ❌ | ❌ |
| Period close | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Claim offer (portal) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**MarCom access grant options (any one suffices for AI Studio):**

1. User role = `admin`
2. Module permission `offers_ai` = edit
3. User profile `department` ∈ configured list (e.g. Marketing, MarCom, Digital)

---

## 17. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Counselors misuse AI for deep discounts | AI restricted to Admin/MarCom only |
| Inconsistent brand messaging | MarCom publish gate + templates |
| Margin erosion | Wallet unlock, caps, approval matrix |
| Empty counselor wallets | Auto-funding job (Phase 2A) |
| AI hallucinated offers | Structured tool output; human review; service library codes only |
| Low counselor adoption | Rule-based "eligible offers" on client + wallet progress UI |
| Two offer systems confusion | Converge `offers` + `service_offers` in Phase 3B |
| GDPR / marketing consent | Opt-in before campaign send; unsubscribe tokens (email exists) |

---

## 18. Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Business owner | | | ☐ |
| MarCom / Marketing head | | | ☐ |
| Operations / Branch heads | | | ☐ |
| Finance / Accounting | | | ☐ |
| Product / CRM admin | | | ☐ |
| Technical lead | | | ☐ |

---

## 19. Appendix — Confirmed built inventory

*Codebase audit — 9 June 2026*

### UI routes

| Route | Page | Status |
|-------|------|--------|
| `/offers-admin` | OffersAdmin.tsx | ✅ |
| `/offers-analytics` | OffersAnalytics.tsx | ✅ |
| `/portal/offers` | PortalOffers.tsx | ✅ |
| `/incentives/give-discount` | GiveDiscount.tsx | ✅ |
| `/incentives/wallet-topups` | WalletTopups.tsx | ✅ |
| `/incentives/period-close` | PeriodClose.tsx | ✅ |
| `/incentives` | MyIncentives.tsx | ✅ |
| `/offers-ai-studio` | — | 🔲 PLANNED |

### Edge functions

| Function | Purpose | Status |
|----------|---------|--------|
| `offers-lifecycle-tick` | Birthday offer auto-generation | 🟡 |
| `incentive-calculate-run` | Incentive runs (net after discount) | ✅ |
| `ai-summarize` | Client AI summary (pattern for Offer Studio auth) | ✅ |
| `dsh-ai-generate-copy` | Marketing copy (reuse for offer pack) | ✅ |
| `offer-ai-studio` | MarCom offer generation | 🔲 PLANNED |

### Key RPCs

| RPC | Status |
|-----|--------|
| `offers_eligible_for_client()` | ✅ |
| `offer_roi_stats()` | ✅ |
| `counselor_offer_stats()` | ✅ |
| `log_offer_event()` | ✅ |
| `fn_close_due_wallets()` | ✅ |
| `fn_reinstate_wallet()` | ✅ |

---

## Document history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 9 Jun 2026 | Product | Initial scope: Offers, Wallet, AI Studio (Admin/MarCom only) |

---

*Future Link Consultants — Internal product scope. Not for external distribution.*
