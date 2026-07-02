# Important Instructions to Claude

**Purpose:** Mandatory reading before any Performance Hub UX work in this package.  
**Authority:** Consolidates approved product, architecture, and UX constraints from this repository.

---

## 1. Your mandate

You are reviewing **Future Link Consultants Performance Hub** — staff-facing commercial performance software for an international education & immigration consultancy.

**You may:** Propose UI layout, visual hierarchy, typography, copy, interaction patterns, wireframes, and component composition.

**You may not:** Invent business rules, change payout logic, add routes, modify database schema, redesign incentive engine behaviour, or override frozen constitutions.

---

## 2. Required reading order

Read in this sequence before proposing anything:

| # | Document | Why |
|---|----------|-----|
| 1 | `BUSINESS_CONTEXT.md` | Domain — not a generic CRM |
| 2 | `PERFORMANCE_HUB_CONSTITUTION.md` | Module boundaries & hub rules |
| 3 | `ENTERPRISE_REWARDS_AND_PAYOUT_CONSTITUTION.md` | Cash vs wallet vs offers; payout lifecycle |
| 4 | `PERFORMANCE_USER_JOURNEYS.md` | Approved role flows |
| 5 | `PERFORMANCE_SCREEN_MASTER.md` | Every route that exists |
| 6 | `UX_EXPECTATIONS.md` | Quality bar |
| 7 | `CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md` | Known UI problems (do not re-discover) |
| 8 | `CONSTITUTIONS/guides/performance-hub-prototype-gaps.md` | Built vs partial vs planned |
| 9 | `COMPETITOR_REFERENCE/QUALITY_BENCHMARKS.md` | Craft level — not layout clone |

Supporting reference: `CURRENT_ARCHITECTURE.md`, `CURRENT_NAVIGATION.md`, `CURRENT_THEME.md`, `CURRENT_COMPONENTS.md`, `DESIGN_SCOPE.md`.

---

## 3. Non-negotiable architecture rules

1. **Three instruments stay separate:** cash incentives · counselor discount wallet · client offers. Never merge ledgers in UI copy or layout metaphor.

2. **Period-first:** Global period (`YYYY-MM`) and branch filter are hub context — do not remove or hide without replacement.

3. **Eight workspaces:** Dashboard, Discounts & Wallets, Offers & Promotions, Incentives & Payouts, Teams & Performance, Analytics & Reports, Finance & Profitability, Administration. Do not invent a ninth top-level module without mapping.

4. **Role gates are real:** Counselor, manager, director, viewer, commission_admin, administrator see different sub-links — respect `ROUTES/performanceWorkspaceNav.ts`.

5. **Run lifecycle is fixed:** Preview → Calculate → Lock → Payout. Do not reorder or skip steps in UX flows.

6. **Customer Ownership Constitution is frozen:** No UX that implies counselors or managers can override settlement eligibility without workflow.

7. **Module ownership:** Performance Hub does not own HR payroll or accounting GL.

---

## 4. UX expectations (summary)

### Do NOT produce

- Generic admin templates, Bootstrap-looking screens, typical CRM dashboard grids
- Lots of tiny equal cards, empty whitespace, chart-heavy landing pages
- Fancy animations, dark-only designs, overly colorful screens
- Engineering jargon in user-facing copy (RPC, scope_type, ledger CMS)

### DO produce

- Apple-quality craft, premium enterprise feel, executive command centre clarity
- Beautiful typography, large readable KPIs with **business explanation**
- Decision-first and **exception-first** layouts (queues before charts)
- Minimal clicks; command palette / quick jump acceptable as **UX proposal** if mapped to existing routes

Full detail: `UX_EXPECTATIONS.md`.

---

## 5. What is already known to be wrong

Do not spend tokens re-auditing from scratch. The team already knows:

- Command center does not feel like a cockpit (link grid vs workflow strip)
- KPIs lack "so what" business narrative
- Too much whitespace, too many clicks, sidebar too long
- Tables dominate; visual hierarchy inconsistent
- Duplicate period selectors; actions hidden on secondary routes

See `CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md` for full list and opportunities.

Your job is to **propose fixes** within approved architecture — not to contradict the analysis.

---

## 6. Built vs planned — do not assume

| Status | Meaning for you |
|--------|-----------------|
| ✅ Built | Design must work with existing routes & data shapes in package |
| 🟡 Partial | You may show **intended** UX from gaps doc — label as target state |
| 🔲 Planned | May wireframe only if aligned with `performance-hub-prototype-gaps.md` |

**Do not invent 🔲 features** (e.g. payroll API, real-time earning ticker) unless explicitly in approved gaps doc.

---

## 7. Deliverable format

Prefer:

1. **3–5 key screens** — counselor home, executive, command center, give discount or wallet, payout/ledger
2. **Light + dark** using tokens in `CURRENT_THEME.md` / `STYLES/`
3. **Component mapping** to existing `COMPONENTS/performance/*` where possible
4. **Copy examples** for KPI labels with business meaning
5. **Route mapping table** if proposing new layout regions (must map to `PERFORMANCE_SCREEN_MASTER.md` routes)

Avoid:

- Full platform re-spec
- SQL, API, RLS, edge functions
- Renaming modules or routes without explicit mapping to approved nav

---

## 8. Competitor reference

`COMPETITOR_REFERENCE/` communicates **quality level only**:

> Linear navigation clarity + Stripe money readability + SAP Fiori overview→drill pattern + Apple spacing discipline

**Do not copy** Salesforce clutter, HubSpot candy colours, or Notion free-form doc layouts wholesale.

---

## 9. Package limitations

This package is **UI reference only**:

- Files may not compile standalone (`@/` imports point to full repo)
- Hooks and business logic excluded intentionally
- Screenshots may be incomplete — ask user if missing

Regenerate package: `node scripts/build-claude-design-package.mjs` (from repo root).

Delete after exercise: `rm -rf claude-design-package`

---

## 10. Success test

Before submitting your design, verify:

- [ ] Counselor can see achievement, wallet, and next action in one screen concept
- [ ] Admin period workflow respects Preview → Lock → Payout order
- [ ] Cash / wallet / offers never conflated
- [ ] Role-appropriate empty states documented
- [ ] Exceptions (unclassified, approvals, run not locked) visible without hunting
- [ ] No new business rules introduced
- [ ] Every proposed screen links to an approved route or 🟡/🔲 gap doc item

---

## 11. Questions to ask the user (if unclear)

1. **Polish current UI** vs **close prototype gaps** — which priority?
2. **Primary persona** for this design pass — counselor, branch manager, or executive?
3. Are **competitor screenshots** in `COMPETITOR_REFERENCE/screenshots/` available?
4. **Light-first or dark-first** preference for mockups?

Do not guess answers — flag ambiguity in your response.

---

## Source constitution index

| Document | Path |
|----------|------|
| Performance Hub Constitution | `PERFORMANCE_HUB_CONSTITUTION.md` |
| Enterprise Rewards & Payout Constitution | `ENTERPRISE_REWARDS_AND_PAYOUT_CONSTITUTION.md` |
| User Journeys | `PERFORMANCE_USER_JOURNEYS.md` |
| Screen Master | `PERFORMANCE_SCREEN_MASTER.md` |
| Customer Ownership (frozen) | `CONSTITUTIONS/governance/CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md` |
| Commercial Agreement Summary (frozen) | `CONSTITUTIONS/governance/COMMERCIAL_AGREEMENT_SUMMARY_CONSTITUTION.md` |
| Incentive Platform Spec | `CONSTITUTIONS/guides/incentive-platform-spec-v1.md` |
| Offers Scope v2 | `CONSTITUTIONS/guides/offers-discounts-wallet-ai-scope-v2.md` |
