# Student-Level Commission Tracking — Claims Tab

Adds per-student commission records and a proper invoice model to the Claims tab without touching any existing tab, route, or working flow.

## 1. Database migration (new tables only)

Three new tables, fully separate from existing `upi_invoices`/`upi_claim_cycles` so nothing currently working breaks.

- `upi_commission_students` — one row per student per claim cycle. All fields from the spec (identity, program, study permit, consent, enrollment, tuition, commission calc, block reason enum, carry-forward, invoice link, submission tracking, metadata).
- `upi_commission_invoices` — Future Link branded invoice header (agency defaults, institution snapshot, totals, status, payment tracking).
- `upi_invoice_line_items` — one row per student on an invoice.

RLS: enable RLS on all three; policies mirror existing `upi_*` tables (authenticated users full CRUD — matches current pattern used by other `upi_*` tables so it works with the existing app session).

Indexes: `(claim_cycle_id)`, `(institution_id)`, `(commission_status)`, `(invoice_id)` on students; `(institution_id, claim_cycle_id)` and unique `(invoice_number)` on invoices.

Trigger: reuse `public.touch_updated_at()` on both parent tables.

## 2. Seed data (insert via supabase--insert after migration approved)

Uses existing institution + claim-cycle + commission IDs already in the DB. Will use the `d1aaaaaa-000X-...` cycle row for each institution's Fall 2025 and the `d2aaaaaa-000X-...` row for Winter 2026 (these match the `Fall/Winter` cycles that the Claims UI already shows).

Students seeded exactly per spec:

| Institution | Cycle | # Students | Eligible | Blocked | Carried |
|---|---|---|---|---|---|
| Seneca | Fall 2025 | 6 | 4 | 2 | 0 |
| Seneca | Winter 2026 | 2 | 0 (pending) | 0 | 0 |
| Conestoga | Fall 2025 | 5 | 3 | 1 | 1 |
| Fanshawe | Fall 2023 (historical) | 3 | 3 (paid) | 0 | 0 |
| Humber | Fall 2025 | 4 | 4 | 0 | 0 |
| Centennial | Fall 2025 | 5 | 3 | 1 | 1 |
| George Brown | Fall 2025 | 6 | 5 | 1 | 0 |

All names, nationalities, programs, tuition, study-permit/consent dates, block reasons with agreement-article references, and commission amounts use the exact values from the spec.

For Fanshawe a historical claim cycle row will be inserted into `upi_claim_cycles` (Fall 2023, status `closed`) since none exists today.

Invoices: one `upi_commission_invoices` row per institution per spec (`FLC-2025-SEN-001`, `-CON-001`, `-HUM-001`, `-CEN-001`, `-GBR-001`, plus `FLC-2023-FAN-001`) with matching line items, statuses (submitted / paid / approved / sent / draft / paid), payment metadata, and student linkage. Each student's `invoice_id` is back-filled.

## 3. UI — Claims tab redesign

`src/institutions/components/ClaimsPanel.tsx` is rewritten in-place (Claims tab content only — no route, navigation, or other panel touched). New child components live in `src/institutions/components/claims/`:

- `ClaimsSummaryCards.tsx` — Expected / Received / Outstanding / Blocked count (red) / Carried Forward count (amber).
- `ClaimCycleCard.tsx` — collapsible per cycle with:
  - **Student table** (`StudentsTable.tsx`): name + nationality flag (emoji), program, intake, tuition, commission, status badge, block-reason tooltip, "View" + "Move to next cycle" actions.
  - **Blocked section** (`BlockedStudentsList.tsx`): red header, agreement-clause text per row.
  - **Carried-forward section** (`CarriedForwardList.tsx`): amber header, shows target cycle.
  - **Invoice section** (`CycleInvoiceCard.tsx`): linked invoice number/amount/status/due-date, buttons: *Generate Invoice* / *View Invoice* / *Mark as Paid*.
  - **Submit Claim button** (`SubmitClaimDialog.tsx`): modal listing eligible students, sets `submitted_by_agency_date`.
- `InvoicePreviewDialog.tsx` — Full Future Link Consultants invoice layout (header with agency address, Bill To, invoice meta, line-item table, subtotal/tax/total, payment instructions, *Print* button using `window.print()` with a print-only CSS scope).
- `StudentDetailDrawer.tsx` — read-only drawer with all student fields.

New hooks added to `useInstitutionData.ts` (additive only):
- `useCommissionStudents(institutionId)`
- `useCommissionInvoices(institutionId)`
- `useInvoiceLineItems(invoiceId)`

New repo entries in `repositories/index.ts`:
- `commissionStudentsRepo`, `commissionInvoicesRepo`, `invoiceLineItemsRepo` — same `fetchLiveScoped` pattern.

TypeScript types added to `src/institutions/types/upi.ts` (additive).

The existing `useClaimCycles`, `useInvoices`, `useStudents`, and `classifyForCycle` remain untouched so the old engine still compiles; the new panel simply doesn't depend on `useStudents`/`classifyForCycle` and instead reads `upi_commission_students` directly.

## 4. Out of scope (explicitly not changed)

- No edits to other tabs (Overview, Sources, Documents, Agreements, Commissions, Promotions, Campaigns, AI Suggestions).
- No edits to routing, layout, sidebar, or `InstitutionDetailPage.tsx` aside from… nothing — the Claims `<TabsContent value="claims">` already renders `<ClaimsPanel />`, which is the only component being rewritten.
- No changes to `upi_invoices`, `upi_claim_cycles` schema, or `claimEngine.ts`.
- No PDF library added — print uses native browser print of the invoice dialog.

## Order of operations

1. Run migration (3 tables + RLS + indexes).
2. After approval, run seed inserts (institutions/cycles/commissions already exist; only new rows added).
3. Add types + repos + hooks.
4. Rewrite `ClaimsPanel.tsx` and add the new child components under `components/claims/`.
5. Smoke test on `/institutions/<id>` Claims tab for each of the 6 institutions.
