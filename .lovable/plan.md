## Goal

Make every tab in the Institution Detail page (Overview, Sources, Documents, Agreements, Commissions, Claims, Promotions, Campaigns, AI Suggestions) end-to-end testable using a rich, realistic mock dataset and a metadata-driven dynamic field system — without touching any CRM code outside `src/institutions/`, without redesigning the page, and without adding npm packages.

## Architecture

```text
src/institutions/
  config.ts                       (existing) USE_MOCK_DATA + thresholds + field-group registry keys
  mock/
    canadianInstitutions.ts       (existing) extended with full dataset
    students.ts                   eligibility / blocked / carry-forward / payments
    campaigns.ts                  campaigns + sources mock
    fieldDefinitions.ts           NEW — dynamic field schema (per scope: agreement, commission, claim, promotion, campaign, renewal)
    types.ts                      extended types
  repositories/
    index.ts                      (existing) +studentsRepo, campaignsRepo, suggestionsRepo, fieldDefsRepo, paymentsRepo
  hooks/
    useInstitutionData.ts         (existing) + useStudents, useCampaigns, useSuggestions, useFieldDefs, usePayments
  lib/
    commissionEngine.ts           (existing, reused)
    claimEngine.ts                NEW — eligibility, carry-forward, dedupe, totals
    fieldRenderer.tsx             NEW — renders dynamic fields from definitions
  components/
    OverviewPanel.tsx             NEW — KPI dashboard + recent lists
    SourcesPanel.tsx              NEW — wraps existing sources list (extracted from page)
    DocumentsPanel.tsx            NEW — enhanced upload + auto-classify + extraction summary
    AgreementsPanel.tsx           (existing) extended: full action menu, dynamic fields
    CommissionsPanel.tsx          (existing) extended: simulator, conflict warnings, "why" panel
    ClaimsPanel.tsx               (existing) extended: eligible/blocked/carry-forward, invoices flow
    PromotionsPanel.tsx           NEW
    CampaignsPanel.tsx            NEW
    AiSuggestionsPanel.tsx        NEW (extracted from page)
    DynamicFieldGroup.tsx         NEW — renders a group of dynamic fields
  pages/
    InstitutionDetailPage.tsx     edit: just compose the panels into tabs (no business logic in page)
```

Data flow stays: **Panel → hook → repository → (Supabase | mock)**. Live rows always win; mock fills empty results only when `USE_MOCK_DATA=true`. Nothing in panels imports mock or Supabase directly.

## Dynamic field system

`fieldDefinitions.ts` exports a registry keyed by `scope` (`agreement | commission | claim | promotion | campaign | renewal`). Each definition:

```text
{ key, label, type: text|number|date|select|multiselect|currency|percent|boolean|textarea,
  group, options?, required?, visibleIf?, validate?, defaultValue?, helpText? }
```

- Panels render fixed accounting columns (status, dates, totals) directly.
- All institution-specific rules render via `<DynamicFieldGroup scope="agreement" values={agreement.extracted_data} onChange={...} />`.
- Adding a new field later = one entry in `fieldDefinitions.ts` (or, in future, a DB row) — no panel changes.
- `visibleIf` evaluates against current values for conditional fields (e.g. show `wire_deduction_amount` only if `wire_deduction_applies = true`).

## Mock dataset (extend `canadianInstitutions.ts` + new `students.ts`, `campaigns.ts`)

- **Institutions**: Seneca, Conestoga, Centennial, Fanshawe, UBC (partner / non-partner mix).
- **Agreements**: 1–2 per institution with mixed statuses (active, expiring-in-45-days, expired, draft) and full dynamic rule payloads (countries, claim/invoice deadlines, tax, wire deduction, clawback, governing law, minimum enrolments).
- **Commissions**: at least one each of fixed, percentage, slab, semester-wise, yearly, country-specific, intake-specific; plus rules with conflicts (two May-intake bonuses) to test the conflict warning.
- **Claim cycles**: Jan / May / Sep cycles per institution in states open / submitted / partially_paid / closed / disputed; carry_forward_from references.
- **Invoices**: states draft / reviewed / sent / approved / paid / overdue / disputed.
- **Students** (`students.ts`): 25–40 records across institutions/cycles with statuses eligible / pending_dues / deferred / withdrawn / missing_consent / carried_forward; one student appears in two consecutive cycles with carry-forward link (no duplication).
- **Payments**: one paid invoice with proof_path, one pending.
- **Promotions**: bonus_commission, fee_waiver, seasonal, intake_offer, country_offer — each linked to an agreement and/or commission rule.
- **Campaigns**: marketing + commission campaigns with periods, target countries, eligible institutions.
- **AI suggestions**: 8–10 covering every example case (expiring agreement, claim deadline, missing consent, invoice not submitted, rule mismatch, etc.).
- **Sources**: per institution — website, brochure pdf, excel sheet, scholarship page — each with confidence + status + linked agreement id.
- **Counselor incentives / B2B share**: stored as dynamic fields on commissions.

## Tab work

- **Overview**: KPI grid (active programs, claims submitted, approved/paid commission, renewals due, pending review, blocked students, active campaigns) + four "recent" lists + AI highlights. Pulls aggregates from hooks; no new repos beyond what's listed.
- **Sources**: move existing JSX into `SourcesPanel.tsx`, add "linked agreement" and "open details" sheet using mock metadata.
- **Documents**: add full type list (Agreement, Commission sheet, Program sheet, Promotion/Campaign, Invoice template, Renewal document, Other), per-row upload + processing + extraction confidence badges, extracted summary panel after upload, "linked record" chip + jump-to-tab action. When DB has no events, fall back to mock pipeline result so UX is testable.
- **Agreements**: full table with renewal countdown, action menu (view / edit / extract AI summary / renewal review / version history dialog). Edit dialog renders `DynamicFieldGroup scope="agreement"`.
- **Commissions**: master list grouped by agreement; commission simulator (reuses `commissionEngine`); rule conflict warning (detects overlapping bonus conditions); "why this rule applied" panel.
- **Claims**: cycles list with eligible/blocked/carry-forward counts (from `claimEngine`), invoice CRUD already exists; add "mark paid" + "upload proof" (mock) actions; show original vs processed intake; assert no duplicate students across cycles.
- **Promotions**: list + dialog with dynamic fields, linked agreement / commission rule pickers.
- **Campaigns**: list + dialog (period, bonus logic, eligible institutions, target countries, claim/renewal impact flags).
- **AI Suggestions**: card grid (title, severity pill, explanation, affected institution, accept / dismiss / defer actions) wired to existing `upi_ai_suggestions` repo with mock fallback.

Every tab: explicit loading skeleton, empty state with CTA, and error card.

## Out of scope

- New backend/edge-function work (existing functions stay as-is)
- New DB migrations (current schema already supports everything; dynamic fields live in `extracted_data` jsonb)
- Touching CRM modules outside `src/institutions/`
- Redesigning the institution page chrome
- Adding npm packages

## QA paths verified before completion

Upload agreement → pipeline shows extracted → Agreements row appears with AI summary · Upload commission sheet → Commissions row + rules appear · Upload program sheet → Sources/Documents/Course Review link works · Create claim cycle → only eligible students counted · Block one student → cycle still progresses, student carried to next cycle, no duplicates · Generate invoice → mark paid → totals update · Agreement nearing expiry → renewal alert badge + AI suggestion · Add new dynamic field in `fieldDefinitions.ts` → it appears in the edit dialog with no other code change.
