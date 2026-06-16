# Future Link Consultants — Commercial Management Suite (CMS)
## Master Handoff Package for Cursor — START HERE

This bundle contains everything needed to transform the existing **Performance Hub** in the
`Future Link Flow` repository into the full **Commercial Management Suite (CMS)**, and to test it
automatically before human UAT.

---

## ⚠️ Read this first — the single most important instruction

**Do NOT rebuild the app from scratch. Do NOT treat the HTML prototype as code.**

- The **existing repository** (`Future Link Flow`, Vite + React + TS + Supabase) is the **source of truth and foundation**. It already has 281 tables, 120+ RPCs, 379 migrations, edge functions, RLS, and a mature commercial backend (wallets, offers, offer codes, incentives, payouts, invoice locking, FX, eligibility).
- Your job is to **transform and extend** it: modernize the UI/UX, fix known UAT defects, extend the architecture for new CMS requirements, and add only the genuinely missing pieces.
- The **HTML prototype and screenshots are visual/UX targets only** — they use mock data and standalone HTML. Never copy their code or data model.

---

## 📁 What's in this package

| # | File / folder | What it is | How Cursor should use it |
|---|---|---|---|
| 1 | **FLC_CMS_Transformation_Brief.md** | **THE primary build guide.** Gap analysis of every CMS requirement vs the existing code, classified (Already Supported / Partial / needs UI / Workflow / Reporting / New Logic / New Schema), with exact tables, RPCs, components to reuse and the smallest extensions for true gaps. | **Read first. This is the authoritative implementation plan.** Follow its phases and guardrails. |
| 2 | **FLC_CMS_QA_Testing_Framework.md** | The complete AI-driven QA & testing framework: 5 test layers, Playwright E2E plan, business-rule matrix, regression strategy, test-data generator, AI QA agent, QA dashboard, release-readiness gate, UAT package. | **Read second.** Implement the testing/AI-QA system so the CMS can self-validate ≥95% before UAT. |
| 3 | **cms-qa-scaffold/** | Drop-in starter files: `playwright.config.ts`, golden-path E2E spec, business-rule harness + example, test-data generator interface. | Copy into repo root; extend into the full suite per the QA framework. |
| 4 | **cms-prototype-screenshots/** | 31 labeled screenshots (every screen, all role-aware dashboard variants, key modals, mobile) + `00_INDEX.md`. | **Visual/UX target** for each screen. Match look & feel; do not copy code. |
| 5 | **FutureLink_CMS_Prototype.html** | Interactive standalone prototype (open in any browser). Mock data, not wired to backend. | Click-through reference for layout, flows, interactions. **Reference only.** |
| 6 | **FutureLink_CMS_Specification.md** | Full product/system specification (modules, schema concepts, API, roles, scalability, AI roadmap, requirement traceability matrix). | Background/context on *what* the CMS must do and *why*. Cross-reference for requirements. |

---

## 🔢 Recommended reading & execution order

1. **This README** — orientation.
2. **FLC_CMS_Transformation_Brief.md** — the plan. Note the four-phase approach:
   - **Phase 1 — Stabilize:** apply the documented migration fixes, fix the catalogued UAT defects (esp. PH-R-001: wallet KPI filter uses `month_to_month`, not `personal`), regenerate `types.ts`.
   - **Phase 2 — UI/UX modernization:** rebuild Performance Hub screens against the new UI/UX (screenshots = target), wiring to **existing** tables/RPCs. No backend changes.
   - **Phase 3 — Additive extensions:** only the genuine gaps — combination engine (build `logical` mode first, `package` extensible), existing-client eligibility rules, profitability view, future-service auto-inheritance, conflict-resolution columns, incentive threshold/cycle.
   - **Phase 4 — Reporting & consolidation:** multi-company (`firm_entity_id`) grouping, comparisons, forecasting, unified commercial-audit view.
3. **cms-prototype-screenshots/00_INDEX.md** + the HTML prototype — absorb the target UX per screen.
4. **FLC_CMS_QA_Testing_Framework.md** + **cms-qa-scaffold/** — build the test + AI-QA system in parallel; gate UAT on it.
5. **FutureLink_CMS_Specification.md** — consult for any requirement detail.

---

## ✅ Non-negotiable guardrails (apply throughout)

- **Reuse over rebuild.** Before creating any table/column/RPC/component, search `src/integrations/supabase/types.ts` and `supabase/migrations/` for an existing equivalent and use it.
- **No duplication of CRM master data.** Reference `branches`, `clients`, `leads`, `service_library`, `upi_*`, `country_pathways`, users/profiles by FK. The CMS is a commercial layer on the same Supabase DB — there is no external CRM to integrate.
- **Money:** INR is the base currency (`fx_rates.rate_to_inr`); CAD/USD are converted columns. Always convert via `fn_fx_rate` / invoice `*_in_*` columns. Use `decimal.js` — never floats.
- **After any migration:** `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`.
- **Respect existing RLS and the director read-only model.** Extend policies; don't bypass them.
- **Testing/generators/AI agent run on staging only** (URL allowlist). Never production.
- **Every fixed defect gets a named regression test** before it's closed.
- **AI QA findings are prioritized leads, not proof** — financial-critical paths still require deterministic tests to pass independently.
- **Gate:** the CMS is not UAT-ready until the automated gate passes (100% critical, ≥95% overall, zero financial-calc divergence, all regression green).

---

## 🔐 Security reminder
The uploaded codebase archive contained a `.env` file. **If those were live Supabase keys, rotate them** — credentials must not travel in shared archives. This work assumes one Supabase project backs both the CRM and the CMS.

---

## 🎯 Objective
Transform the Performance Hub into the full CMS with **maximum reuse, minimum disruption, zero duplication**, and a testing/AI-QA layer that lets Future Link validate **≥95% of the CMS automatically** before human UAT begins.
