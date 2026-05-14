# Phase 3 — Journal Entries Module

Build a complete Journal Entries module under `/accounting/journals` using only mock data. Strictly additive: only the 3 existing journal stub files and `mockJournals.ts` are replaced. No CRM files, no other accounting files, no router/sidebar changes (routes already wired in Phase 2).

## Files Touched (4 total, all replacements of existing stubs)

1. `src/accounting/data/mockJournals.ts` — replace stub with `MOCK_ACCOUNTS` (20) + `MOCK_JOURNALS` (20, balanced)
2. `src/accounting/pages/journals/AccountingJournalsPage.tsx` — list view
3. `src/accounting/pages/journals/AccountingNewJournalPage.tsx` — create/edit form
4. `src/accounting/pages/journals/AccountingJournalDetailPage.tsx` — detail view

No new packages. Reuses existing: `decimal.js`, shadcn `Button/Input/Select/DropdownMenu/Card/Badge/AlertDialog/Popover/Command/Textarea`, `sonner`, `lucide-react`, `react-hook-form` + `zod`, `react-router-dom`.

Reuses Phase 2 helpers: `AccountingPageHeader`, `AccountingEmptyState`, `AccountingStatusBadge`, `formatCurrency`, `addDecimals`, `AppLayout`.

## Mock Data (`mockJournals.ts`)

- `MOCK_ACCOUNTS`: exact 20-row array per spec.
- `MOCK_JOURNALS`: 20 entries with status mix 10 POSTED / 4 DRAFT / 3 PENDING_REVIEW / 2 VOIDED + 1 of the 20 has `sourceType:'OCR_UPLOAD'`. Each entry's lines satisfy `sum(debits)=sum(credits)` exactly. Realistic Canadian content (rent, payroll, invoices, vendor bills, travel, software, HST/GST). Entry numbers `JE-2024-0001..0020`. Exported TypeScript interfaces `Journal`, `JournalLine`, `Account`.

## Page 1 — List (`AccountingJournalsPage.tsx`)

- `AppLayout` wrapper + `AccountingPageHeader` with "+ New journal entry" action button.
- Filter bar: search input (narration/reference, case-insensitive), Status `DropdownMenu` checkbox multi-select with `Status (N)` label, Entity `Select`, Export CSV ghost button (Blob download of filtered rows).
- Result count line.
- Plain HTML table per spec (10 columns, widths, badge colors for source, `AccountingStatusBadge` for status, monospace tabular debit/credit totals computed via `addDecimals`).
- Row click → detail page (except actions cell).
- Actions `DropdownMenu`: View always; Edit if DRAFT → `/accounting/journals/{id}/edit`; Void if POSTED → shadcn `AlertDialog`, on confirm flips status in local React state.
- Pagination: 15/page, Prev/Next outline buttons, "Page X of Y".

## Page 2 — New / Edit (`AccountingNewJournalPage.tsx`)

- Detects `:id` from route (used by `/journals/:id/edit`); pre-fills from `MOCK_JOURNALS` if present.
- React Hook Form + Zod schema for header fields; lines managed via `useFieldArray`.
- Sticky top bar: breadcrumb (left), live balance indicator (`Balanced ✓` green / `Out of balance` destructive computed with Decimal), Discard / Save draft / Post entry (Post disabled when unbalanced).
- Card 1 Entry Details: Entity, Entry date (default today), Currency, FX rate (only when currency≠CAD), Source type, Reference; full-width Narration textarea.
- Card 2 Journal Lines: HTML table with Combobox account picker (shadcn `Popover` + `Command`, results grouped by account type, searches code or name), Branch select, Tax code select, Description input, Debit/Credit inputs (typing in one clears the other for that row), remove × (hidden when ≤2 lines). Starts with 3 empty lines. Totals row (Decimal.js) + Add line button.
- Card 3 Attachments: drag-drop zone + hidden file input; files held in local state with name/size/× remove.
- Validation: draft (entity, date, narration ≥5) and post (draft + ≥2 lines + every line has account + totals equal). Errors via `toast.error`; success via `toast.success` then navigate to list. No API calls.

## Page 3 — Detail (`AccountingJournalDetailPage.tsx`)

- Read `:id` from `useParams`; lookup in `MOCK_JOURNALS`. If missing → `AccountingEmptyState` "Journal not found" + Back button.
- Sticky bar: breadcrumb, status badge, Back, Edit (DRAFT only), Void (POSTED only) with `AlertDialog`. Void mutates local state.
- Card 1 Entry summary: 3-col grid of label/value fields (Entity, Date, Source, Reference, Currency, FX rate when applicable, Created by, Posted at, Voided at + reason when voided); narration in muted box.
- Card 2 Journal lines: read-only table; account name color by `accountType` (asset/liability/equity/revenue/expense palette per spec); alternating row bg; totals row with `Balanced ✓`.
- Card 3 Audit trail: vertical timeline with colored circle icons (Plus/Send/Check/X from lucide-react); 3 events for POSTED, +1 for VOIDED; uses `entryDate`, `postedAt`, `voidedAt`, `voidReason`, `createdBy` from the entry. Mock IPs/times per spec.

## Styling Note

Spec lists raw Tailwind colors (`text-blue-600`, `bg-purple-100`, etc.) for source badges, account-type colors, and timeline dots. Per the previous Phase 2 decision (semantic tokens) but to honor the spec literally as instructed for this phase, I'll use the spec colors directly inside these journal pages only — they are scoped to this module and match the verbatim color callouts in the brief. `AccountingStatusBadge` (already built) is reused unchanged.

## Verification After Build

1. List loads at `/accounting/journals` showing 15 of 20 with working filters, search, CSV export, pagination, void dialog.
2. `/accounting/journals/new` form: balance indicator updates live, Post disabled until balanced, Save draft/Post toasts fire.
3. Click entry → detail renders summary, lines (color-coded), audit timeline; Void on POSTED works.
4. No changes to any non-journal file confirmed via diff.
