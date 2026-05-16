# Claims Export + Planned Client→Institution Bridge

## Status
- Part 1 (export): build now, fully active.
- Part 2 (bridge): scaffold dormant, no triggers fire, no existing behavior changes.
- Part 3 (docs): written alongside the dormant code.

---

## Part 1 — Claims tab export buttons

All changes confined to `src/institutions/components/ClaimsPanel.tsx` plus one new helper file. No new npm packages — use `window.print()` for PDF and a tiny CSV builder.

### 1.1 New helper: `src/institutions/lib/claimsExport.ts`
- `buildClaimCsv(cycle, students, institution)` — returns CSV string with the exact 19 columns specified.
- `downloadCsv(filename, csv)` — Blob + anchor download.
- `filenameForClaim(institution, term, date)` — `FLC_Claim_[Institution]_[Term]_[YYYY-MM-DD].csv` (spaces → `_`).
- `formatCAD(n)` helper for consistent currency formatting.

### 1.2 New components (inside ClaimsPanel or co-located)
- **`PrintableClaim`** — hidden by default (`hidden print:block`), rendered into a dedicated print root. Contains:
  - FLC header (name, 5 Vandorf Street address, phone, email, website)
  - Institution name + address (from agreement metadata)
  - Cycle name + term
  - Eligible students table: Name | Program | Intake | Tuition | Rate | Amount | Status
  - Blocked students section with reason badges
  - Carried-forward section
  - Totals (eligible, blocked, total CAD)
  - Invoice summary block when an invoice exists for the cycle
- **`PrintableInvoice`** — hidden print-only invoice with FLC header, Bill-To, invoice meta, line items, subtotal, HST note (0 — international commission), total, payment instructions pulled from agreement `extracted_data.payment_terms`, footer.

### 1.3 Print CSS
Add a small `@media print` block in `src/index.css` (scoped via classes — does not affect screen):
- `body * { visibility: hidden }` then `.fl-print-root, .fl-print-root *  { visibility: visible }`
- Hide app chrome via `.print\\:hidden` Tailwind utility on header/sidebar wrappers is already available — we just rely on the print root being absolutely positioned at top-left and everything else hidden.
- A4 page margins, table borders, no background colors except header band.

A single shared `printElement(rootId)` helper sets a body class, calls `window.print()`, then clears it on `afterprint`.

### 1.4 Buttons added to Claims tab
Per cycle card header (right-aligned button group, sm size, outline variant):
- **Print** → renders `PrintableClaim` for that cycle then `window.print()`.
- **Download CSV** → calls `buildClaimCsv` + `downloadCsv`.
- **Download PDF** → same flow as Print (browser print → Save as PDF). Tooltip clarifies.

Per invoice row:
- **Download Invoice PDF** → renders `PrintableInvoice` then `window.print()`.

All buttons are additive; existing Generate Invoice / Mark Paid actions untouched.

---

## Part 2 — Dormant Client→Institution bridge

### 2.1 New file `src/institutions/planned/clientIntegrationBridge.ts`
TypeScript module, fully typed, **never imported by runtime code**. Contains:
- File-level banner comment: `PLANNED — NOT ACTIVE. Do not import from runtime.`
- Type defs for the 5 trigger event payloads (VisaApproved, TuitionPaid, ApplicationSubmitted, ConsentFormSubmitted, StudentDeferred).
- `matchClientToCommissionStudent(clientId)` with priority order (passport → email → name+institution+intake → student_id_at_institution). Returns match or logs `match_failed`.
- Five handler stubs: `onVisaApproved`, `onTuitionPaid`, `onApplicationSubmitted`, `onConsentFormSubmitted`, `onStudentDeferred` — each starts with `// TODO(activation):` and `if (!BRIDGE_ENABLED) return;` (constant exported as `false`).
- Eligibility checker `evaluateCommissionEligibility(student)` returning the boolean checklist from the spec.
- Each function has a JSDoc block describing its trigger, action, and AI-suggestion message template.

### 2.2 Dormant Supabase functions
A migration file `supabase/migrations/<ts>_planned_bridge_functions.sql` creating four PL/pgSQL functions: `on_visa_approved`, `on_tuition_paid`, `on_application_submitted`, `on_consent_form_submitted`. Each body wrapped in `IF false THEN ... END IF;` and prefixed with `-- PLANNED: Enable after testing complete`. **No triggers attached** to any table.

### 2.3 `clients` table planned columns (safe nullable adds)
Same migration adds nullable columns to existing `public.clients`:
- `linked_institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL`
- `linked_student_record_id uuid REFERENCES upi_commission_students(id) ON DELETE SET NULL`
- `institution_student_id text`
- `consent_form_submitted boolean`
- `consent_form_date date`
- `study_permit_number text`
- `study_permit_approved_date date`
- `study_permit_expiry date`

All `ADD COLUMN IF NOT EXISTS`, all nullable, no defaults that change behavior, no triggers.

### 2.4 Manual "Link to Client" UI stub
In ClaimsPanel student row: small `Link2` icon button + label "Link to Client". Wired to a `Tooltip` reading "Coming soon — manual linking UI in development". No modal, no handler — disabled visual state only.

### 2.5 Dashboard indicator card
Add to `OverviewPanel.tsx` (or the existing institution dashboard grid) a greyed-out card:
- Title: "Client → Commission Sync"
- Subtitle: "Auto-sync planned — manual linking active"
- Badge: "In Development" (muted variant)
- No click handler, opacity-60, dashed border to signal placeholder.

---

## Part 3 — Documentation

Create `src/institutions/planned/INTEGRATION_PLAN.md` with the exact content from the user's spec (overview, activation checklist, data flow diagram, field-mapping table, manual-override section).

---

## Files touched
- New: `src/institutions/lib/claimsExport.ts`
- New: `src/institutions/planned/clientIntegrationBridge.ts`
- New: `src/institutions/planned/INTEGRATION_PLAN.md`
- New migration: `supabase/migrations/<ts>_planned_bridge_functions.sql` (dormant funcs + nullable `clients` columns)
- Edit: `src/institutions/components/ClaimsPanel.tsx` (export buttons, printable components, Link-to-Client stub)
- Edit: `src/institutions/components/OverviewPanel.tsx` (dormant indicator card)
- Edit: `src/index.css` (print media block scoped to `.fl-print-root`)

## Safety guarantees
- No changes to existing claim/invoice logic, mutations, or RPC calls.
- No triggers attached; dormant functions are no-ops (`IF false`).
- New `clients` columns are nullable with no defaults — zero behavioral impact.
- No new npm dependencies.
