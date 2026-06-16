# Future Link Consultants — Commercial Management Suite (CMS)
## Production System Specification & Build Reference — v1.1

**Client:** Future Link Consultants ("A way to career abroad")
**Document type:** Engineering build specification (no further business clarification required)
**Scope:** Discount wallets, offers, combinations, promotions, incentives, commissions, multi-currency revenue, profitability, approvals, dashboards, reporting, audit, RBAC, and AI roadmap.
**Target scale:** Multiple countries, multiple currencies, multiple branches, thousands of users, millions of dollars in annual revenue.
**Initial deployment:** 8 branches — Vadodara (Karelibaug, Genda Circle, Manjalpur, Ajwa, Bhayli), Bharuch, Anand (Gujarat, India) and Toronto (Canada). Base currency **INR**, with **CAD** live for the Canada operation; further currencies are configuration-ready.
**Companion artifact:** `FutureLink_CMS_Prototype.html` (interactive clickable prototype implementing this spec).

---

## 1. Product Architecture

### 1.1 Architectural style
A modular, service-oriented monolith-first design that can be decomposed into services as load grows. The CMS is the **commercial decision engine** that sits beside the existing CRM/lead system and the finance/ERP system.

```
                 ┌─────────────────────────────────────────────┐
                 │            CMS WEB / MOBILE CLIENT            │
                 │   (SPA, role-aware, responsive — prototype)  │
                 └───────────────────────┬─────────────────────┘
                                         │ HTTPS / JSON (REST v1)
                 ┌───────────────────────▼─────────────────────┐
                 │              API GATEWAY                      │
                 │   AuthN (OIDC) · AuthZ (RBAC) · rate limit    │
                 └───────────────────────┬─────────────────────┘
        ┌───────────────┬────────────────┼───────────────┬──────────────┐
        ▼               ▼                ▼               ▼              ▼
 ┌────────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────┐ ┌────────────┐
 │  Wallet &   │ │   Offer &    │ │  Incentive  │ │ Commission │ │  Reporting │
 │  Discount   │ │  Promotion   │ │   Engine    │ │  Ledger    │ │  & BI      │
 │  Service    │ │  Service     │ │             │ │            │ │  Service   │
 └─────┬──────┘ └──────┬───────┘ └──────┬──────┘ └─────┬──────┘ └─────┬──────┘
       └───────────────┴────────┬───────┴───────┬──────┴──────────────┘
                                ▼               ▼
                     ┌────────────────┐ ┌────────────────┐
                     │ Approval/Workflow│ │  Audit/Event   │
                     │     Engine       │ │  Log (append)  │
                     └────────┬─────────┘ └───────┬────────┘
                              ▼                    ▼
            ┌─────────────────────────────────────────────────┐
            │  DATA LAYER  — PostgreSQL (primary)              │
            │  Redis (cache: FX, permissions, rate limits)     │
            │  Object store (report exports)                   │
            │  Message bus (audit events, async payouts)       │
            └─────────────────────────────────────────────────┘
            External integrations: CRM (leads), Finance/ERP, FX rate provider, Email/SMS
```

### 1.2 Core services
| Service | Responsibility |
|---|---|
| **Wallet & Discount** | Wallet master, allocation, consumption, lifecycle (freeze/revoke/transfer/merge/carry-forward), rule enforcement |
| **Offer & Promotion** | Offer lifecycle, combination engine, promotion proposals & ROI forecasting |
| **Incentive Engine** | Plan definitions, slab evaluation, multi-plan stacking, payout computation |
| **Commission Ledger** | Institution/partner/referral commission tracking (received/pending/reversed/forecast) |
| **Approval/Workflow** | Configurable routing: auto / manager / director / multi-level |
| **Audit/Event** | Append-only, hash-chained event log for every mutation |
| **Reporting & BI** | Report builder, dashboards, comparison engine, exports |
| **Identity & RBAC** | Users, roles, role-switching, module-level capability matrix |

### 1.3 Design principles (non-negotiable)
1. **Config-as-data.** Every commercial rule (threshold, ceiling, slab, combination, currency) is a data row. New policy requires zero deployment.
2. **Currency-agnostic core.** Money is always stored as `(amount, currency_code, fx_rate_at_txn, amount_base)`. Consolidation is computed, never lossy.
3. **Append-only audit.** No hard deletes on commercial records; status transitions + audit events only.
4. **Idempotent mutations.** Allocation/consumption/approval endpoints accept an idempotency key.
5. **Region-partitioned.** Branch and country are partition dimensions for data residency and scale.

---

## 2. Database Schema

PostgreSQL. All tables carry `id` (UUID), `created_at`, `updated_at`, `created_by`, `region` (where applicable). Money columns are paired with a currency column. Soft-state via `status` enums; no hard deletes on commercial entities.

### 2.1 Identity & organisation
```sql
-- regions: top-level data-residency / expansion unit
CREATE TABLE regions (
  id UUID PRIMARY KEY, code TEXT UNIQUE,        -- 'CA','IN','DE'...
  name TEXT, base_currency CHAR(3), is_active BOOL DEFAULT true
);

CREATE TABLE branches (
  id UUID PRIMARY KEY, code TEXT UNIQUE,         -- 'BR-TOR'
  name TEXT, region_id UUID REFERENCES regions(id),
  country CHAR(2), timezone TEXT, is_active BOOL DEFAULT true
);

CREATE TABLE departments (
  id UUID PRIMARY KEY, name TEXT, branch_id UUID REFERENCES branches(id)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY, code TEXT UNIQUE,         -- 'super','admin','branch'...
  name TEXT, rank INT                            -- approval seniority
);

CREATE TABLE users (
  id UUID PRIMARY KEY, full_name TEXT, email TEXT UNIQUE,
  role_id UUID REFERENCES roles(id),
  branch_id UUID REFERENCES branches(id),
  department_id UUID REFERENCES departments(id),
  is_active BOOL DEFAULT true
);

-- module-level capability matrix (config-as-data)
CREATE TABLE permissions (
  role_id UUID REFERENCES roles(id),
  module TEXT,                                    -- 'wallets','offers'...
  capability TEXT,                               -- 'full','edit','create','approve','read','none'
  PRIMARY KEY (role_id, module)
);
```

### 2.2 Services & combinations (Module 2)
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY, code TEXT UNIQUE, name TEXT,
  category TEXT,                                  -- 'coaching','study_abroad','immigration','visa','settlement','allied'
  base_price NUMERIC(14,2), currency CHAR(3), is_active BOOL DEFAULT true
);

CREATE TABLE combinations (
  id UUID PRIMARY KEY, name TEXT,
  bundle_price NUMERIC(14,2), currency CHAR(3),
  max_discount_pct NUMERIC(5,2),
  is_active BOOL DEFAULT true
);
-- many-to-many: a combination is composed of N services (no hardcoding)
CREATE TABLE combination_services (
  combination_id UUID REFERENCES combinations(id),
  service_id UUID REFERENCES services(id),
  PRIMARY KEY (combination_id, service_id)
);
```

### 2.3 Wallets (Module 1)
```sql
CREATE TYPE wallet_type AS ENUM
 ('monthly','festival','campaign','country','institution','branch',
  'department','revival_lead','counselor','manager','promotional');
CREATE TYPE wallet_status AS ENUM ('draft','scheduled','active','frozen','revoked','expired');

CREATE TABLE wallets (
  id UUID PRIMARY KEY, code TEXT UNIQUE,          -- 'WL-9001'
  name TEXT, type wallet_type,
  scope_type TEXT, scope_ref TEXT,                -- e.g. ('branch','BR-TOR') ('service','PTE')
  allocation NUMERIC(14,2), consumed NUMERIC(14,2) DEFAULT 0,
  currency CHAR(3),
  -- rule limits
  max_amount NUMERIC(14,2), max_pct NUMERIC(5,2),
  service_limits TEXT[], country_limits TEXT[],
  department_limits TEXT[], branch_limits TEXT[], counselor_limits TEXT[],
  -- lifecycle
  approval_rule TEXT,                             -- 'auto','manager','director','multi_level'
  carry_forward TEXT,                             -- 'none','full','partial'
  carry_forward_pct NUMERIC(5,2),
  effective_from DATE, expiry DATE,
  status wallet_status DEFAULT 'draft',
  region_id UUID REFERENCES regions(id)
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY, wallet_id UUID REFERENCES wallets(id),
  txn_type TEXT,                                  -- 'allocate','consume','transfer_in','transfer_out','merge','carry_forward','revoke'
  amount NUMERIC(14,2), currency CHAR(3),
  fx_rate NUMERIC(12,6), amount_base NUMERIC(14,2),
  lead_ref TEXT,                                  -- FK to CRM lead when consume
  counselor_id UUID REFERENCES users(id),
  related_wallet_id UUID,                         -- for transfer/merge
  approval_id UUID, idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(), created_by UUID
);
```

### 2.4 Offers & promotions (Modules 3 & 4)
```sql
CREATE TYPE offer_type AS ENUM
 ('percentage','fixed','bundle','free_service','cashback',
  'seasonal','festival','institution','country','program','intake','counselor');
CREATE TYPE offer_status AS ENUM ('draft','pending_approval','scheduled','live','paused','expired','archived');

CREATE TABLE offers (
  id UUID PRIMARY KEY, code TEXT UNIQUE, name TEXT,
  type offer_type, value_pct NUMERIC(5,2), value_amount NUMERIC(14,2), value_text TEXT,
  -- applicability (any combination; NULL = all)
  branch_ids UUID[], department_ids UUID[], service_ids UUID[],
  country_codes TEXT[], institution_ids UUID[], program_ids UUID[],
  intake TEXT, lead_source TEXT, lead_age_min_days INT, counselor_ids UUID[],
  redemption_cap INT, redemptions INT DEFAULT 0,
  stackable BOOL DEFAULT false,
  effective_from DATE, end_date DATE,
  status offer_status DEFAULT 'draft', funding_wallet_id UUID REFERENCES wallets(id)
);

CREATE TABLE offer_redemptions (
  id UUID PRIMARY KEY, offer_id UUID REFERENCES offers(id),
  lead_ref TEXT, counselor_id UUID, branch_id UUID,
  discount_amount NUMERIC(14,2), currency CHAR(3), amount_base NUMERIC(14,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE promo_status AS ENUM ('submitted','manager_review','director_review','approved','rejected','launched','closed');
CREATE TABLE promotions (
  id UUID PRIMARY KEY, code TEXT UNIQUE, title TEXT, objective TEXT, notes TEXT,
  submitted_by UUID REFERENCES users(id), branch_id UUID,
  budget NUMERIC(14,2), currency CHAR(3),
  forecast_revenue NUMERIC(14,2), forecast_enrollments INT,
  expected_roi NUMERIC(8,2),                      -- computed = forecast_revenue / budget
  status promo_status DEFAULT 'submitted',
  linked_offer_id UUID, linked_wallet_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 Incentives (Module 5)
```sql
CREATE TYPE incentive_basis AS ENUM
 ('revenue','enrollment','margin','profit','commission','service','country',
  'institution','branch','department','team','referral','campaign','hybrid');
CREATE TYPE incentive_status AS ENUM ('draft','active','paused','closed');

CREATE TABLE incentive_plans (
  id UUID PRIMARY KEY, code TEXT UNIQUE, name TEXT,
  basis incentive_basis,
  rule_json JSONB,            -- slab/threshold definition, see §4 example
  applies_to_json JSONB,      -- {role:[], team:[], branch:[], service:[]}
  stackable BOOL DEFAULT true,
  payout_cycle TEXT,          -- 'monthly','quarterly','on_event'
  currency CHAR(3),
  status incentive_status DEFAULT 'draft',
  effective_from DATE, effective_to DATE
);

CREATE TABLE incentive_payouts (
  id UUID PRIMARY KEY, plan_id UUID REFERENCES incentive_plans(id),
  user_id UUID REFERENCES users(id),
  period TEXT,                -- '2026-06'
  basis_value NUMERIC(14,2),  -- e.g. revenue achieved
  payout_amount NUMERIC(14,2), currency CHAR(3), amount_base NUMERIC(14,2),
  status TEXT DEFAULT 'computed',   -- 'computed','approved','paid'
  computed_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.6 Commissions (Module 6)
```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY, name TEXT,
  type TEXT,                  -- 'institution','partner','referral'
  country CHAR(2), currency CHAR(3), default_rate_pct NUMERIC(5,2)
);

CREATE TABLE commissions (
  id UUID PRIMARY KEY, code TEXT UNIQUE,
  partner_id UUID REFERENCES partners(id),
  lead_ref TEXT, enrollment_ref TEXT,
  status TEXT,                -- 'received','pending','reversed','forecast'
  amount NUMERIC(14,2), currency CHAR(3),
  fx_rate NUMERIC(12,6), amount_base NUMERIC(14,2),
  expected_date DATE, settled_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.7 Multi-currency (Module 7)
```sql
CREATE TABLE currencies (
  code CHAR(3) PRIMARY KEY, name TEXT,
  is_base BOOL DEFAULT false, is_active BOOL DEFAULT false,
  status TEXT                 -- 'base','live','ready'
);

CREATE TABLE fx_rates (
  id UUID PRIMARY KEY,
  from_currency CHAR(3), to_currency CHAR(3),
  rate NUMERIC(12,6),
  source TEXT,                -- 'auto','manual'
  effective_from TIMESTAMPTZ, effective_to TIMESTAMPTZ,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);
-- The applicable rate for a txn is the row where ts ∈ [effective_from, effective_to).
-- Manual overrides supersede auto rows for their window and are audited.
```

### 2.8 Approvals (Module-wide governance)
```sql
CREATE TYPE approval_state AS ENUM ('pending','approved','rejected','escalated','withdrawn');
CREATE TABLE approvals (
  id UUID PRIMARY KEY, code TEXT UNIQUE,
  entity_type TEXT, entity_id UUID,    -- 'wallet','offer','promotion','discount_override','incentive_plan'
  requested_by UUID REFERENCES users(id),
  amount NUMERIC(14,2), currency CHAR(3),
  risk TEXT,                            -- 'low','med','high'
  route_json JSONB,                     -- ordered list of required stages
  current_stage TEXT,                   -- 'manager','director','multi_level'
  state approval_state DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE approval_decisions (
  id UUID PRIMARY KEY, approval_id UUID REFERENCES approvals(id),
  approver_id UUID, stage TEXT, decision TEXT, comment TEXT,
  decided_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.9 Audit (Module 12)
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID, actor_name TEXT, role_code TEXT,
  action TEXT,                          -- 'create','edit','approve','reject','allocate','consume','override'
  entity_type TEXT, entity_id UUID, entity_label TEXT,
  meta_json JSONB,                      -- before/after, amounts
  prev_hash TEXT, row_hash TEXT,        -- hash chain: row_hash = H(prev_hash || payload)
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Append-only. row_hash chains each entry to its predecessor for tamper-evidence.
```

---

## 3. User Roles & Permissions (Module 10)

Eight roles ship by default; more can be added as data. Role-switching lets an authorised user change perspective without logging out (top-right selector in the prototype). Capability per module is one of **Full / Edit / Create / Approve / Read / None**.

| Role | Wallets | Offers | Promotions | Incentives | Commissions | Currency | Dashboards | Reporting | Approvals | Audit | Config |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Super Admin | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Full | Full | Full | Full | Full | Approve | Read | Full |
| Regional Manager | Full | Full | Approve | Edit | Full | Read | Full | Full | Approve | Read | None |
| Branch Manager | Edit | Edit | Create | Read | Read | Read | Full | Full | Approve | Read | None |
| Team Leader | Edit | Create | Create | Read | None | None | Read | Read | None | None | None |
| Counselor | Read | Read | Create | Read | None | None | Read | Read | None | None | None |
| Visa Officer | Read | Read | None | Read | None | None | Read | Read | None | None | None |
| Finance | Read | Read | Read | Edit | Full | Full | Read | Full | Approve | Read | None |

**Enforcement.** The matrix lives in `permissions`. The API gateway resolves `(role, module) → capability` (cached in Redis) and authorises each call. UI hides/disables controls the role cannot use, but the server is the source of truth.

**Role switching.** Permitted for users whose primary role outranks the target (e.g. Super Admin can preview any role). Every switch and every action taken while switched is audited with both the real actor and the assumed role.

---

## 4. UX / UI Design

**Brand system (from the FLC logo).** Primary blue `#005BA4`; secondary "globe" blue `#2284C5`; action/critical red `#ED1B24` used sparingly (alerts, destructive actions, over-burn) exactly as the logo reserves red for the plane. White surfaces only, cool-neutral scale. Logo always on a white chip.

**Typography.** Sora (display/headings), Inter (UI/body), IBM Plex Mono (money, IDs, rates — tabular numerals).

**Layout.** Fixed left sidebar grouped Overview / Commercial Engine / Earnings / Governance / System; sticky top bar with global search, quick actions, notifications, and the role switcher. Content max-width ~1500px, 22px gutters.

**Components.** KPI cards with sparkline + delta; data tables with utilization meters (blue→amber→red as consumption rises); status pills; approval/lifecycle steppers; comparison "VS" panels with winner highlighting; donut and bar charts; right-docked detail modals; config forms with currency-prefixed inputs and toggles.

**Accessibility & responsiveness.** WCAG-AA contrast, focus rings, `prefers-reduced-motion` honoured. Sidebar collapses to a drawer under 980px; multi-column grids fold to two then one column on phones.

---

## 5. Navigation Structure

```
Overview
  • Dashboards            (role-aware home)
  • Revenue Analytics
  • Comparison Engine     (M9)
Commercial Engine
  • Discount Wallets      (M1)
  • Combination Engine    (M2)
  • Offer Management      (M3)
  • Promotion Requests    (M4)
Earnings
  • Incentive Management  (M5)
  • Commission Tracking   (M6)
  • Multi-Currency        (M7)
Governance
  • Approvals             (workflow)
  • Report Builder        (M11)
  • Audit Trail           (M12)
  • Roles & Permissions   (M10)
System
  • Configuration
  • Architecture & API
```

Navigation items render only if the active role has at least Read on the module. Badges surface pending counts (e.g. approvals, promotion requests).

---

## 6. Dashboard Design (Module 8)

Dashboards are **role-aware** — the same route renders different content by role:

- **Executive (Super/Admin/Regional):** consolidated revenue, gross margin, wallet utilization, pending approvals; revenue-vs-target by branch; revenue by service line; branch & counselor leaderboards; approval inbox. All figures consolidated to the base currency.
- **Branch Manager:** the above scoped to the branch, plus team leaderboard and branch wallet burn.
- **Counselor / Visa / Team Leader:** personal revenue, enrollments, conversion, incentive earned; personal wallet balance with utilization; recent discount applications; incentive-tier progress with next-tier nudge.
- **Finance:** revenue, discount given, effective discount %, commission income; commission ledger and FX exposure.

Every dashboard supports period selection (day/week/month/quarter/year/custom) and export.

---

## 7. Approval Workflows

Routing is configurable per entity type and threshold (config-as-data in `approvals.route_json`).

| Trigger | Default route |
|---|---|
| Discount within counselor ceiling | **Auto-approve** (logged) |
| Discount above branch threshold | **Manager** |
| Discount override / high value / wallet top-up | **Director** |
| Incentive plan or policy change | **Multi-level** (Manager → Director → Finance) |
| Offer / promotion launch | **Manager → Director** (ROI ≥ 8× passes to launch; below routes to Director review) |

**Mechanics.** A mutation that exceeds a configured limit creates an `approvals` row with an ordered `route_json`. Each stage records an `approval_decisions` row. On final approval the underlying action commits; on rejection it is discarded with reason. Escalation, withdrawal, SLA/aging, and risk flags (low/med/high) are first-class. Every transition is audited.

**Example rule (JSON).**
```json
{ "entity":"discount_override",
  "stages":[
    {"if":"pct <= role.ceiling","then":"auto"},
    {"if":"pct <= 15","then":"manager"},
    {"if":"pct > 15","then":["manager","director"]}
  ] }
```

---

## 8. Reporting Architecture (Module 11)

**Report builder** composes a query from: period (day/week/month/quarter/year/custom), group-by (branch, counselor, country, institution, service, campaign, currency), metrics (revenue, discount given, margin, wallet usage, commissions, incentives, enrollments), and filters. Output renders as an on-screen table/chart and exports to **CSV / XLSX / PDF**.

**Scheduling & delivery.** Reports can be saved, scheduled (e.g. weekly branch performance) and emailed. Exports are written to object storage with signed URLs.

**Standard reports shipped:** revenue by branch vs target, discount effectiveness, wallet utilization & burn-rate, commission statement by partner, incentive payout register, promotion ROI, counselor scorecard, multi-currency revenue consolidation.

**Performance.** Heavy aggregations run against read replicas / a materialised reporting schema refreshed on a schedule; large exports run async with a job record and notification on completion.

---

## 9. API Specifications

REST v1, JSON, OAuth2/OIDC bearer tokens, RBAC-enforced, idempotency keys on mutations, cursor pagination, ISO-8601 timestamps, money always returned as `{amount, currency, amount_base}`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/wallets` | List & filter wallets |
| POST | `/api/v1/wallets` | Create wallet |
| PATCH | `/api/v1/wallets/{id}` | Edit / freeze / revoke |
| POST | `/api/v1/wallets/{id}/allocate` | Allocate or consume (idempotent) |
| POST | `/api/v1/wallets/{id}/transfer` | Transfer / merge |
| GET | `/api/v1/combinations` | List service combinations |
| POST | `/api/v1/combinations` | Create combination |
| GET | `/api/v1/offers` | List offers |
| POST | `/api/v1/offers` | Create offer |
| POST | `/api/v1/offers/{id}/redeem` | Apply offer to a lead |
| GET | `/api/v1/promotions` | List proposals |
| POST | `/api/v1/promotions` | Submit proposal (returns computed ROI) |
| GET | `/api/v1/approvals` | Approval queue |
| POST | `/api/v1/approvals/{id}/decision` | Approve / reject a stage |
| GET | `/api/v1/incentives/plans` | List incentive plans |
| POST | `/api/v1/incentives/plans` | Create plan |
| GET | `/api/v1/incentives/payouts` | Computed payouts |
| GET | `/api/v1/commissions` | Commission ledger |
| GET | `/api/v1/fx/rates` | Current & historical FX |
| POST | `/api/v1/fx/rates` | Manual rate override (audited) |
| POST | `/api/v1/reports/build` | Run a report query |
| GET | `/api/v1/audit` | Query audit log |

**Conventions.** `4xx` with a problem+json body on validation/permission errors; `409` on idempotency replay with the original result; `202` + job id for async exports. All list endpoints accept `?branch=&country=&currency=&from=&to=&cursor=`.

---

## 10. Audit Trail Design (Module 12)

Every create/edit/approve/reject/allocate/consume/override writes an `audit_log` row capturing actor (and assumed role if switched), action, entity, before/after in `meta_json`, and timestamp. Records are **append-only**; corrections are new entries, never edits.

**Tamper-evidence.** Each row stores `row_hash = SHA-256(prev_hash ‖ canonical_payload)`, chaining entries so any retroactive change breaks the chain. A periodic verifier recomputes the chain and alerts on mismatch. The log is queryable by actor, entity, action, date and is exportable for compliance.

---

## 11. Scalability Considerations

- **Region partitioning.** `region`/`branch` partition keys enable data residency (Canada, India today; more later) and shard-friendly growth.
- **Currency-agnostic core.** Money stored as `(amount, currency, fx_rate_at_txn, amount_base)`; consolidation computed on read — no lossy conversion at write time.
- **Stateless API + cache.** Horizontally scalable behind a load balancer; Redis caches FX rates, the permission matrix and rate limits.
- **Read/write separation.** Heavy analytics hit read replicas / a materialised reporting schema; transactional writes stay on the primary.
- **Async by event.** Audit, payout computation and exports run off a message bus so spikes don't block request paths.
- **Idempotency & concurrency.** Idempotency keys on financial mutations; optimistic locking on wallet balances to prevent double-spend.
- **Config-as-data.** New thresholds, slabs, combinations, currencies and even countries are rows — scaling the business needs no redeploy.

---

## 12. Future Expansion Framework

**New country / region.** Add a `regions` row (+ base currency), activate currencies, add `branches`, `services` and combinations. The engine adapts with no code change.

**New service or combination.** Add `services`; the combination engine composes valid permutations at runtime (Module 2 has no hardcoded bundles).

**New currency.** Flip a `currencies` row to active and supply a rate source; all money fields work immediately.

**AI Recommendation Engine (Phase 2 roadmap).** Built on the audit + transaction history this system accrues:
- **Discount optimizer** — recommends the minimum discount likely to convert a given lead (by source, service, branch, history).
- **Campaign ROI forecast** — predicts revenue and enrollments before a promotion launches, improving the Module 4 proposal.
- **Anomaly detection** — flags unusual discount patterns, wallet over-burn and margin erosion in real time.
- **Incentive tuning** — suggests slab structures that maximise margin-adjusted output from historical performance.

These consume the same REST surface and data model; no schema redesign is required to introduce them.

---

## Appendix A — Module → Implementation map

| PRD module | Spec section(s) | Prototype page |
|---|---|---|
| M1 Discount Wallets | §2.3, §7 | Discount Wallets |
| M2 Combination Engine | §2.2 | Combination Engine |
| M3 Offer Management | §2.4 | Offer Management |
| M4 Promotion Requests | §2.4, §7 | Promotion Requests |
| M5 Incentive Management | §2.5 | Incentive Management |
| M6 Commission Management | §2.6 | Commission Tracking |
| M7 Multi-Currency | §2.7, §11 | Multi-Currency |
| M8 Executive Dashboards | §6 | Dashboards |
| M9 Comparison Engine | §6 | Comparison Engine |
| M10 Role Switching & RBAC | §3 | Roles & Permissions |
| M11 Reporting | §8 | Report Builder |
| M12 Audit | §2.9, §10 | Audit Trail |



---

## Appendix B — Initial deployment reference data

**Regions & currency.** Base currency **INR**. Canada operation transacts in **CAD** and consolidates to INR on read at the applicable `fx_rates` row (manual override supported). All other currencies are inactive but configuration-ready.

**Branches (8).**
| Code | Branch | City | Country | Currency |
|---|---|---|---|---|
| BR-KRB | Karelibaug | Vadodara | India | INR |
| BR-GND | Genda Circle | Vadodara | India | INR |
| BR-MNP | Manjalpur | Vadodara | India | INR |
| BR-AJW | Ajwa | Vadodara | India | INR |
| BR-BHY | Bhayli | Vadodara | India | INR |
| BR-BRC | Bharuch | Bharuch | India | INR |
| BR-AND | Anand | Anand | India | INR |
| BR-TOR | Toronto | Toronto | Canada | CAD |

**Counselors (14).** Insia, Meena, Ankita, Namrata, Sneha, Yashika, Heena, Dhara, Krishna, Yogita, Krati, Bhavna, Siya, Sonali — assigned across the branches above and across the Study Abroad, Immigration, Visa, Coaching, Settlement and Allied teams.

**Service master list.** The CMS, CRM, Wallet, Offer, Incentive and Reporting modules all draw from one shared catalog: Coaching (English/French/German/other test prep), Study Abroad destinations (Canada, US, UK, Ireland and 20+ European, Oceania, Asia & Middle East countries), Immigration/Settlement programs (Canada Express Entry/PNP/sponsorship, Germany Opportunity Card, Australia/NZ/UK/Portugal/EU pathways), Visa categories (visitor, student, work, spouse, business, dependent, transit), and Allied services (financial, documentation, credential evaluation, Germany-specific, travel). The list is data-driven and extensible without code changes.

**Departments (11).** Coaching, Study Abroad, Immigration, Visa Processing, Admissions, Allied Services, Finance, Marketing, Business Development, B2B Partnerships, HR.

---

## 13. CRM Integration (system-of-record boundary)

The CMS is a **commercial layer on top of the existing CRM**, not a replacement. It never duplicates master data.

**System of record.** The CRM owns: companies, branches, departments, users, roles, leads, clients, lead forms, countries, services, coaching programs, visa categories, immigration programs, institutions, intakes, lead sources. The CMS owns only commercial records: wallets, offers, offer codes, combinations, promotions, incentive plans/ledger, commissions, approvals, audit.

**Reference, don't copy.** Every commercial record references CRM entities by ID (`branch_id`, `service_id`, `institution_id`, `lead_ref`, `client_ref`, …). No CRM row is mirrored into CMS tables.

**Synchronisation.** The CMS subscribes to CRM change events (webhooks/event bus) and keeps a thin read-cache of entity IDs + labels for fast lookups. New CRM records (a new country, service, institution, program, intake) appear automatically.

**Auto-apply policy (config-as-data).** For each entity class, management chooses how existing commercial rules treat newly added CRM records: `auto_include`, `require_opt_in`, or `inherit_parent`. Example: new countries auto-join active wallets; new services require explicit opt-in.

```sql
CREATE TABLE crm_entity_cache (        -- read-only mirror of IDs/labels only
  entity_type TEXT, entity_id UUID, label TEXT,
  parent_id UUID, synced_at TIMESTAMPTZ, PRIMARY KEY(entity_type, entity_id)
);
CREATE TABLE rule_autoapply_policy (
  entity_type TEXT PRIMARY KEY,        -- 'country','service','institution','program','intake'
  policy TEXT                          -- 'auto_include','require_opt_in','inherit_parent'
);
```

Consolidated reporting therefore spans all companies, branches, countries, departments, services, institutions, programs and users without redeployment as the business expands.

---

## 14. Offer Code Management

```sql
CREATE TYPE code_type AS ENUM ('multi_use','one_time','bulk');
CREATE TABLE offer_codes (
  id UUID PRIMARY KEY, code TEXT UNIQUE,           -- 'FLC-EBIRD-7K3M'
  offer_id UUID REFERENCES offers(id),
  type code_type, prefix TEXT,
  generation TEXT,                                 -- 'auto','manual','bulk'
  bulk_batch_id UUID,                              -- groups a bulk pool
  -- scoping (NULL = unrestricted)
  branch_ids UUID[], campaign_id UUID, counselor_ids UUID[],
  service_ids UUID[], country_codes TEXT[], institution_ids UUID[], intake TEXT,
  usage_cap INT, used INT DEFAULT 0,
  expiry DATE, status TEXT DEFAULT 'active'        -- 'active','scheduled','redeemed','expired','disabled'
);
CREATE TABLE offer_code_redemptions (
  id UUID PRIMARY KEY, code_id UUID REFERENCES offer_codes(id),
  client_ref TEXT, lead_ref TEXT, counselor_id UUID, branch_id UUID,
  discount_amount NUMERIC(14,2), currency CHAR(3), redeemed_at TIMESTAMPTZ DEFAULT now()
);
```

Supports auto + manual generation, prefixes, branch/campaign/counselor scoping, limits by usage count/expiry/service/country/institution/intake, unique one-time codes, bulk pools, and per-code redemption analytics.

---

## 15. Client-Level Commercial Application

Counselors apply wallet discounts and offer codes **from the CRM lead/client profile**. The CMS validates eligibility, records the outcome and writes the commercial terms back to the CRM invoice.

```sql
CREATE TABLE client_commercials (
  id UUID PRIMARY KEY,
  client_ref TEXT, lead_ref TEXT,                  -- CRM references
  service_id UUID, branch_id UUID, counselor_id UUID,
  original_price NUMERIC(14,2), currency CHAR(3),
  offer_code_id UUID, offer_discount NUMERIC(14,2),
  wallet_id UUID, wallet_discount NUMERIC(14,2),
  final_amount NUMERIC(14,2),
  invoice_ref TEXT, invoice_state TEXT,            -- 'quote','draft','approved','partial_paid','full_paid','closed'
  payment_received NUMERIC(14,2) DEFAULT 0,
  terms_locked BOOL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Eligibility validation (auto, before applying).** Checks run server-side: (a) client not already enrolled/active in this service; (b) wallet has balance and the rule scope matches; (c) code valid for branch/service/country/intake and within usage cap & expiry; (d) invoice not yet finalized. Each check returns pass/fail with a reason.

**Recorded per transaction:** wallet used, offer used, discount amount, approval history, and final payable amount — surfaced as a complete discount history per client.

---

## 16. Eligibility Controls

```sql
CREATE TABLE eligibility_rules (
  id UUID PRIMARY KEY, name TEXT,
  audience TEXT[],                 -- 'new_lead','new_client','existing_client','re_enrolled','lead_status:<x>'
  scope_service_id UUID, scope_country CHAR(2), scope_institution_id UUID, scope_program_id UUID,
  block_if_active_service BOOL DEFAULT true,        -- e.g. already enrolled in IELTS → block IELTS offer
  evaluate_against TEXT[],         -- 'enrollments','invoices','payments','services_purchased'
  is_active BOOL DEFAULT true
);
```

Rules are configured **per service / country / institution / program**. Example: a client active in IELTS is blocked from an IELTS offer, but is eligible for a Germany Opportunity Card offer. Future services remain eligible while active services are restricted.

---

## 17. Invoice-Based Commercial Controls

Commercial terms are mutable only **before invoice finalization**. The engine enforces:
- Offer codes cannot be applied after an invoice is generated and approved.
- Wallet usage is blocked after any payment is received.
- Discounts are blocked once partial/full payment is received or the invoice is closed.
- **Auto-lock:** `terms_locked` flips true when payment activity begins; further changes require an authorised override.
- Overrides are role-gated and fully audited (who, why, before/after).

Every transaction displays: original price, offer discount, wallet discount, final invoice amount, payment received, outstanding balance.

---

## 18. Incentive Processing, Ledger, Payout & Forecast (expanded)

**Computation base (configurable).** Incentives compute on gross revenue, net revenue, profit or margin. Management toggles whether wallet, offer-code and promotional discounts reduce the base. Different formulas apply to full-fee, wallet, offer-code, promotional and combination clients, and can differ by service and campaign.

**Ledger lifecycle.** Each employee's incentives move through: earned → approved → pending → eligible → scheduled → paid/cashed-out, plus reversed and clawback. The ledger is the source for payroll export.

```sql
CREATE TABLE incentive_ledger (
  id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), plan_id UUID REFERENCES incentive_plans(id),
  client_commercial_id UUID,                       -- ties incentive to the exact transaction
  period TEXT, basis_value NUMERIC(14,2),
  amount NUMERIC(14,2), currency CHAR(3),
  state TEXT,                                      -- 'earned','approved','pending','eligible','scheduled','paid','reversed','clawback'
  computed_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE payout_cycles (
  id UUID PRIMARY KEY, plan_id UUID REFERENCES incentive_plans(id),
  frequency TEXT,                                  -- 'monthly','quarterly','half_yearly','annually','custom'
  custom_date DATE, min_threshold NUMERIC(14,2),
  carry_forward_below_threshold BOOL DEFAULT true,
  allow_partial BOOL DEFAULT false
);
CREATE TABLE payout_runs (
  id UUID PRIMARY KEY, cycle_id UUID REFERENCES payout_cycles(id),
  run_date DATE, total_amount NUMERIC(14,2), currency CHAR(3),
  exported_to_payroll BOOL DEFAULT false, audit_ref UUID
);
```

**Payout cycles** are configured independently per plan (monthly/quarterly/half-yearly/annually/custom), support a minimum threshold with carry-forward, allow partial payouts, and multiple plans run simultaneously. Manual adjustments are permitted with audit logs; a complete cash-out history is retained.

**Self-service.** Employees view current earned, pending, future-expected and already-cashed-out incentives.

**Forecasting.** Management forecasts incentive liability from current revenue, enrollments, expected commissions and projected targets — before payouts occur.

---

## 19. Offer Conflict Resolution

When multiple offers qualify for one transaction, the engine resolves by a configured strategy: **best-for-client**, **highest-priority**, **non-stackable**, or an **explicit stack list**. Stacking is allowed only when all participating offers are flagged stackable; the combined discount is capped by the wallet/combination maximum. Resolution is deterministic and logged.

---

## 20. Profitability Controls

The system computes profitability **before and after** discounts, wallet usage, offer codes, incentives and commissions, and compares revenue generated, discounts given, wallet consumed, incentives paid and net profit across every counselor, branch, country, institution, service and campaign. Incentive eligibility can be based on original invoice value, discounted value or net revenue collected.

---

## Appendix C — Requirement validation traceability

Every validation scenario is supported. Mapping to the implementing section (§) and prototype page:

**Wallet Management (1–10).** Multiple simultaneous types, allocation at counselor/team/branch/department/campaign, monthly/festival/promotional, carry-forward, expiry, transfer/merge, restrictions by service/country/institution/program/intake/branch, over-limit approval workflows, utilization & ROI reporting → §2.3, §7, §8; *Discount Wallets, Approvals, Report Builder*.

**Offers & Discounts (11–20).** Percentage/fixed/bundle/free-service/cashback; across coaching/study-abroad/immigration/visa/allied; scoped to country/institution/program/intake/branch; simultaneous offers; conflict resolution; proposal + approve/reject workflows; performance & ROI; cross-branch/counselor comparison; management dashboards → §2.4, §19, §6, §8; *Offer Management, Promotion Requests, Comparison Engine*.

**Combination Engine (21–25).** Discounts/offers/incentives for any combination incl. all listed examples; unlimited custom combinations without developers; different discount/offer/incentive rules per combination → §2.2, §19, §18; *Combination Engine* (D/O/I per-combination tags).

**Reporting & Analytics (42–49).** Counselor/branch/country/institution/service/campaign comparisons; daily→custom periods; **CAD + INR simultaneously**; profitability after discounts/incentives/commissions; executive/branch/counselor dashboards; forecasting & trends → §6, §8, §20, §2.7; *Comparison Engine, Report Builder, Profitability, Dashboards*.

**Future Link specifics (50–52).** All listed services (IELTS/PTE/CELPIP/TOEFL/French/German/study-abroad/Canada immigration/PNP/Germany Opp Card/PR/visitor/study/work/super/spouse visas/allied); add any future service/country/institution/program/visa without redesign; scalable multi-branch/country/currency → §2.2, §12, §11, §13, Appendix B; *Configuration (service catalog), CRM Integration*.

**CRM Integration (1–4).** Uses CRM master data (no duplicates); linked to countries/services/coaching/visa/immigration/institutions/intakes/branches/users/leads/clients; auto-apply policy for new CRM records; stays synced without development → §13; *CRM Integration*.

**Client-Level Offer & Wallet Usage (5–10).** Apply wallet/offer from lead/client profile; auto wallet + offer eligibility validation; records wallet/offer/discount/approval-history/final-payable; per-client discount history → §15, §16; *Client Commercials*.

**Offer Code Management (11–20).** Auto + manual generation; prefixes; branch/campaign/counselor specific; limits by usage/expiry/service/country/institution/intake; one-time; bulk; redemption performance → §14; *Offer Codes*.

**Incentive Processing (21–27).** Calculated on final transaction value; differs by full-fee/wallet/offer/promotional/combination client; configurable whether discounts/wallet/offer-codes affect base; gross/net/profit/margin basis; different formulas per service/campaign → §18; *Incentive Plans* (base config + client-type rules).

**Incentive Payout Management (28–35).** Per-employee ledger; earned/approved/pending/paid/reversed/clawback; payout history by employee/branch/department/service/country; payroll export; partial payout; manual adjustment with audit; cash-out history; employee self-view → §18; *Incentive Ledger & Payouts*.

**Revenue & Profitability (36–37).** Profitability before/after discounts/wallet/offers/incentives/commissions; compare revenue/discounts/wallet/incentives/net-profit per counselor/branch/country/institution/service/campaign → §20; *Profitability*.

**Approval & Audit (38–42).** Wallet usage, offer-code usage, incentive calculation, payout/cash-out all audited; full client commercial history reconstructable lead→payment→payout → §10, §15, §18; *Audit Trail, Client Commercials*.

**Incentive Pay Cycle & Forecasting (43–50).** Independent cycle per plan; monthly/quarterly/half-yearly/annually/custom; threshold-triggered with carry-forward; simultaneous differing cycles; full lifecycle states; employee view of earned/pending/future/cashed-out; management forecast from revenue/enrollments/commissions/targets; company-level liability forecast → §18; *Incentive Ledger & Payouts*.

**Offer & Wallet Eligibility (51–55).** Restrict by new-lead/new-client/existing/re-enrolled/lead-status; block applying to an already-enrolled service; eligibility from client history/enrollments/invoices/payments/services-purchased; allow future services while restricting active ones; rules per service/country/institution/program → §16; *Configuration (eligibility), Client Commercials*.

**Invoice-Based Controls (56–63).** Discounts/codes only before invoice finalization; block code after invoice approved; block wallet after payment; block discounts on partial/full/closed; authorised override exceptions; override audit trail; auto-lock when payment begins; full price-to-balance breakdown displayed → §17; *Configuration (invoice controls), Client Commercials*.

**Commercial Profitability Controls (64–67).** Incentive eligibility on original/discounted/net value; configurable whether wallet/offer/promotional discounts reduce incentives; different rules per client type; actual profitability impact of every wallet/offer/discount/incentive/commission → §18, §20; *Profitability, Incentive Plans*.

*End of specification v1.1.*
