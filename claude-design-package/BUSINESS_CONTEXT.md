# Business context — Future Link Consultants

Claude must understand **who uses this software and why** — not a generic CRM.

---

## Company

**Future Link Consultants (FLC)** — international education and immigration consultancy operating at scale across **multiple countries**, **multiple branches**, and **multiple service lines**.

---

## What the business does

| Domain | User-facing work | Performance Hub connection |
|--------|------------------|----------------------------|
| **International education** | Student counselling, applications, admissions | Revenue KPIs, counselor performance, service mix |
| **Immigration / visa** | Filing, compliance, document workflows | Verified revenue events, multi-service clients |
| **Coaching** | Test prep, language, career coaching | Service library revenue attribution |
| **Finance & accounting** | Invoices, receipts, AR, full GL | Net revenue definitions, FX, profitability views |
| **Commercial agreements** | University/partner commission terms | Client commercials, combination engine, margin |
| **Offers & promotions** | Discounts, campaigns, codes | Wallet, offers studio, redemption analytics |
| **Incentives & payouts** | Counselor/branch cash incentives | Plans, runs, ledger, competitions |
| **HR & payroll** | Staff, attendance, payroll runs | Separate module; hub shows **commercial** performance only |

---

## Scale & complexity

- **Thousands of active students** across intake cycles
- **Multi-country** operations (Canada, UK, Australia, Europe, etc. — country-specific service libraries)
- **Multi-company / multi-entity** finance (accounting module handles entities; hub shows consolidated commercial KPIs)
- **Multi-branch** — achievement, wallets, and incentives often **branch-scoped**
- **Multi-role staff** — counselors, telecallers, managers, directors, finance, commission admins, MarCom

---

## Users of Performance Hub

| Persona | Daily question | Emotional bar |
|---------|----------------|---------------|
| **Counselor** | "Am I on track? Can I discount? What's my incentive?" | Clarity, fairness, speed |
| **Branch manager** | "Is my team hitting target? Who needs help?" | Coaching, accountability |
| **Director / executive** | "Is the firm healthy? Where are exceptions?" | Confidence, drill-down trust |
| **Finance / commission admin** | "Can we lock the period? Are payouts correct?" | Control, audit trail |
| **Administrator** | "Configure plans, wallets, offers without breaking prod" | Power + guardrails |

---

## Commercial model (UI implications)

1. **Period-first** — incentives and wallets align to **accounting periods** (e.g. `2026-06`), not calendar whims.
2. **Net revenue matters** — KPIs use verified / net definitions, not gross pipeline fantasy.
3. **Three money levers** — **cash incentive**, **discount wallet**, **offer/promotion** — one hub, three accents.
4. **Funding-aware discounts** — university-funded vs FL-funded discounts behave differently (copy must not oversimplify).
5. **Approvals exist** — deep discounts, wallet exceptions, promotions go through **human approval** — UI must show queue state.
6. **Partner commissions** — separate from counselor incentives (institution/UPI module); don't conflate in hub copy.

---

## Brand & trust

- Brand colors: **FLC blue (#005DAA)** and **red** — professional, not playful startup.
- Audience includes **university partners** and **parents** indirectly — internal tools should still feel **institutional-grade**.
- Staff span **English-first** UI; numbers often **INR** with multi-currency undertones.

---

## What this is NOT

- Not a generic **Salesforce clone**
- Not a **marketing website** — dense operational software
- Not **student portal** — staff-facing (portal is separate `/portal/*`)
- Not **full accounting** — hub links to accounting but owns **performance & promotions**

---

## Prototype success test

Ask: *Would a branch manager in Mumbai trust this to run month-end incentives?*  
If it looks like a weekend hackathon dashboard, it fails — even if navigation is correct.

See also: `CONSTITUTIONS/guides/incentives-module-guide.md`, `CONSTITUTIONS/guides/offers-wallet-staff-guide.md`, `UX_EXPECTATIONS.md`.
