# Performance Hub Constitution

**Status:** Approved architecture reference (consolidated from staff guides & engineering docs)  
**Scope:** `/performance/*`, `/incentives/*` (unified hub shell)  
**Sources:** `docs/engineering/03-Ownership-Principle.md`, `docs/guides/incentive-platform-spec-v1.md`, `docs/guides/offers-discounts-wallet-ai-scope-v2.md`, `docs/guides/performance-hub-prototype-gaps.md`, `src/incentives/lib/performanceWorkspaceNav.ts`

> **Frozen rule:** This document describes **what is approved**. It does not propose redesigns or new business rules.

---

## 1. Module ownership

| Module | Owns | Does not own |
|--------|------|--------------|
| **Performance Hub** | Cash incentives, counselor discount wallets, offers & promotions (staff-facing) | HR payroll engine, full accounting GL, institution UPI commission claims module |
| **CRM** | Leads, clients, services, verified payments | Incentive run calculation, wallet ledger rules |
| **Accounting** | Chart of accounts, journals, trust, AR (corporate) | Incentive plan configuration |
| **HR Payroll** | Employees, attendance, payroll cycles | Performance KPI definitions |

**Cross-module rule:** When a change touches two modules, extend the **primary owner's** single source of truth; do not duplicate state in Performance Hub UI.

---

## 2. Strategic objective

Performance Hub unifies three commercial levers under one mental model — **Performance & Promotions**:

| Lever | Ledger / tables | Purpose |
|-------|-----------------|---------|
| **Cash incentives** | `incentive_*` | Pay staff for verified outcomes (targets, slabs, campaigns) |
| **Counselor discount wallet** | `discount_wallets`, `wallet_allocations`, `wallet_ledger` | **Authority** to give client discounts — not cash |
| **Client offers & promotions** | `offers`, `client_offers`, `offer_events` | MarCom promotions clients claim; affects net revenue |

**Not in scope:** `credit_wallet` (client loyalty points — portal only).

**Strategic objective (incentive platform):**

> Pay the right people the right amount for the right outcomes — across every service line and add-on — without manual spreadsheets, while keeping every rupee auditable and every rate defensible.

**Strategic objective (offers module):**

> Increase enrolment conversion and repeat business by giving the **right offer to the right person at the right moment** — while keeping every discount auditable, approval-controlled, and measurable against revenue.

---

## 3. Revenue & net revenue (Performance Hub KPI basis)

Approved connections (as deployed):

1. **Qualifying events** derive from **verified payments** (`client_invoice_payments`), commission events, and related sources — normalized in `incentive_qualifying_events`.
2. **Net revenue for incentives** subtracts applied **wallet allocations** on invoices (pro-rata to payment).
3. **Offers & promotions** reduce net revenue when redeemed — incentive engine accounts for wallet/offer discounts.
4. **Discount depth penalty** (approved engine tiers): deep client discounts reduce cash incentive earn — documented tiers include 5% → 100%, 10% → 90%, 15% → 75%, >15% → 0% of incentive (see Incentives Module Guide §11).

Performance Hub dashboards display **commercial KPIs** aligned to these definitions — not gross pipeline or unverified totals.

---

## 4. Period-first operations

| Concept | Rule |
|---------|------|
| **Period key** | Format `YYYY-MM` — aligns incentive runs, wallet period close, and hub KPI filters |
| **Branch filter** | Optional global filter in hub context — branch-scoped plans, team views, and achievements respect branch |
| **Period close (wallets)** | Separate operational step from incentive run lock — `/incentives/period-close` |
| **Run lock (cash incentives)** | Freezes FX snapshot and plan version — immutable after lock |

Approved admin workflow (pieces — not yet one unified UI screen):

```
Set FX rates → Configure plans/rules/targets → Qualifying events accumulate
→ Period close (wallets) → Preview run → Calculate → Lock run
→ Generate payouts → Approve → Mark paid → Export CSV
```

---

## 5. Hub shell & navigation (approved structure)

### 5.1 Route prefixes

| Prefix | Shell |
|--------|-------|
| `/performance/*` | Performance Hub theme (`data-performance-hub`, `PerformanceHubContextBar`) |
| `/incentives/*` | Legacy desk routes — same CRM app; historically outside hub theme for some paths (see readiness review PH-R-009) |

Legacy aliases remain approved: `/incentives` → counselor home; `/incentives/give-discount` → `/performance/give-discount`; `/offers-admin` → `/performance/offers/library`.

### 5.2 Eight workspaces (sidebar)

Approved workspace IDs and primary routes:

| Workspace | Primary route | Combines (approved) |
|-----------|---------------|---------------------|
| **Dashboard** | `/performance` | My performance, executive, finance overview, command center, how-it-works |
| **Discounts & Wallets** | `/performance/wallets` | Wallets, give discount, client commercials, combinations, branch pool, wallet policy, wallet top-ups, period close |
| **Offers & Promotions** | `/performance/offers` | Offers studio, promotion requests, library, codes, eligibility, analytics, calendar, segments, automation, journeys, A/B tests, AI studio |
| **Incentives & Payouts** | `/performance/incentives/payouts` | Ledger, plans, approvals, payout desk, runs, competitions, simulator |
| **Teams & Performance** | `/performance/team` | Branch team, comparison, unclassified payments |
| **Analytics & Reports** | `/performance/analytics` | Revenue analytics, report builder |
| **Finance & Profitability** | `/performance/finance` | Finance dashboard, profitability, commissions, multi-currency, FX overrides |
| **Administration** | `/performance/configuration` | Configuration CMS, roles, audit trail, CRM integration, architecture reference |

Workspace visibility is **role-gated** via `isWorkspaceVisible` / `isWorkspaceSubLinkVisible` — counselors see a reduced subtree; finance/director/viewer/commission_admin see approved subsets.

### 5.3 Context bar (approved chrome)

On hub paths, `PerformanceHubContextBar` provides:

- Hub branding
- **Period + branch** selector (`PerformancePeriodBar`)
- **Role preview** switcher (`RoleViewSwitcher variant="hub"`)
- **Theme toggle** (light/dark hub tokens)

Global CRM `Topbar` defers duplicate controls on hub paths.

---

## 6. Service scope (approved incentive & offer dimensions)

Performance Hub KPIs and rules may scope across:

| Dimension | Examples |
|-----------|----------|
| **Service lines** | Coaching, Visa & Immigration, Admissions, **Allied & Travel** |
| **Study abroad** | Country, institution, program/intake |
| **Organization** | Branch, role (counselor, telecaller, documentation) |
| **Revenue buckets** | Core vs allied vs travel (counselor dashboard revenue mix) |

**Allied & Travel** is **first-class scope** — not an afterthought (Incentive Platform Spec §7).

---

## 7. Approvals & guardrails (approved)

| Flow | Approved behaviour |
|------|-------------------|
| **Give discount** | Debits counselor wallet; DB enforces cap & balance; funding-aware (university-funded offers do not debit counselor wallet — Offers Scope v2) |
| **Deep discounts** | Approval matrix + discount penalty on incentives |
| **Promotion requests** | Field → MarCom queue (`/performance/offers/requests`) |
| **Wallet exceptions** | Manager approval workflow (RPC `fn_submit_wallet_exception_request`) |
| **Payout approval** | pending → approved → paid (Payout Desk) |
| **Run lock** | Requires admin/administrator/manager for preview/calculate/lock |

AI offer **creation:** Admin + MarCom only (`offers_ai` permission). Counselors: **suggest + draft only** from approved catalogue.

---

## 8. Governance integration (frozen constitutions)

Performance Hub commercial flows must respect:

| Constitution | Rule (summary) |
|--------------|----------------|
| **Customer Ownership Protection** | No referral fee, incentive, commission, or bonus for **existing FLC customers** without authorized override workflow — Customer Attribution Engine gate before settlement |
| **Commercial Agreement Summary** | Operational commercial terms in structured business language; signed agreement remains legal source of truth |

Executive dashboard must surface ownership conflicts and override outcomes (Customer Ownership Constitution §Dashboard Alerts).

---

## 9. Implementation status legend (approved docs)

| Symbol | Meaning |
|--------|---------|
| ✅ | Built & deployed (Phases 0–4 incentives; Sprint wallet/offer baseline) |
| 🟡 | Partial — documented gap, approved target in scope docs |
| 🔲 | Planned — in prototype gaps or roadmap, not invented here |

**Verdict (Incentive Platform Spec §5.4):** Phases 0–4 complete (~90% of v1 spec). Remaining approved work is UX consolidation, offers/wallet wiring, analytics depth — not core engine replacement.

---

## 10. Out of scope for Performance Hub

Approved exclusions:

- Full payroll API (CSV export ✅; payroll integration 🔲)
- Client-facing cash incentive visibility
- HR payroll computation
- Institution UPI commission claims module (`/commissions`, `/institutions/*`) — separate module; hub may link commission KPIs only where approved
- Rebuilding incentive engine from scratch — **extend existing schema**

---

## 11. Agent & design rules

1. **Do not invent routes** outside `performanceWorkspaceNav.ts` without explicit product approval.
2. **Do not conflate** cash incentives, discount wallet, and client offers in copy or ledger UI.
3. **Preserve period-first** and role gates in any UX proposal.
4. **Respect module ownership** — Performance Hub does not own accounting GL or HR payroll.
5. **Reference prototype gaps** for 🟡/🔲 items — do not assume built.

---

## Source index

| Document | Location in package |
|----------|---------------------|
| Incentive Platform Spec v1.1 | `CONSTITUTIONS/guides/incentive-platform-spec-v1.md` |
| Offers Scope v2.1 | `CONSTITUTIONS/guides/offers-discounts-wallet-ai-scope-v2.md` |
| Prototype gaps | `CONSTITUTIONS/guides/performance-hub-prototype-gaps.md` |
| Ownership principle | `CONSTITUTIONS/system-map/03-Ownership-Principle.md` |
| Customer ownership constitution | `CONSTITUTIONS/governance/CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md` |
| Workspace nav (approved routes) | `ROUTES/performanceWorkspaceNav.ts` |
