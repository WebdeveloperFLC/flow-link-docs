## Plan: Bank Reconciliation module

Build a complete bank reconciliation workflow inside the Accounting module. Replace the existing reconciliation stub with a 3-view page (Landing → Active session → Complete summary) backed by a new mock dataset and a client-side matching engine. No new packages, no CRM changes.

### Files

**Create (2):**
1. `src/accounting/data/mockReconciliation.ts` — fully replace existing file with the new schema (`BankStatementLine`, `ReconciliationMatch`, `ReconciliationSession`), `MOCK_STATEMENT_LINES` (20 RBC CAD October 2024 lines per spec), and `MOCK_PAST_SESSIONS` (3 entries: RBC Sep COMPLETED, HDFC Oct COMPLETED, Chase Oct IN_PROGRESS). Note: the current `mockReconciliation.ts` is only consumed by the stub page being replaced, so swapping the schema is safe.
2. `src/accounting/lib/reconciliationEngine.ts` — exports `parseCSVStatement`, `matchStatementToJournals`, `calculateReconciliationSummary` per the scoring rules (amount 50/30/15, date 25/15/8, description word-overlap ×25, reference 10/5; thresholds 85/60/40).

**Replace (1):**
3. `src/accounting/pages/reconciliation/AccountingReconciliationPage.tsx` — full 3-view page.

**Verify (no edit needed):**
- `src/App.tsx` already maps `/accounting/reconciliation` → `AccountingReconciliationPage`. No change required.

### Page structure

**View A — Landing**
- `AccountingPageHeader` (title "Bank reconciliation").
- "Previous reconciliations" Card with table over `MOCK_PAST_SESSIONS` (Resume / View actions; both just `toast.info`).
- "Start new reconciliation" Card with 4 steps: bank account `Select` (filtered by `reconciliationEnabled`), date range (defaults to previous month), opening balance number input, drag-drop CSV zone with sample-CSV download button (native Blob). After parsing show count + first 3 rows preview. "Start reconciliation" button runs `matchStatementToJournals(parsed, MOCK_JOURNALS)` then transitions to View B.

**View B — Active session**
- Sticky progress bar with confirmed/total + progress bar + auto/review/unmatched pills + Abandon (AlertDialog) + Complete (disabled until unmatched=0 OR all unmatched are exceptions).
- Filter tabs: All / Auto-matched / Needs review (default) / Unmatched / Confirmed.
- Card-per-line list (not a table). Each card shows: bank line top row (date, description, reference, amount with debit red / credit green, status badge), then a match section that varies by status:
  - AUTO_MATCHED / NEEDS_REVIEW: matched journal entry block, confidence bar (green/amber/red by score), reasons text, action buttons (Confirm, Unmatch / Find different match, Mark exception).
  - UNMATCHED: red-tinted block, "Create journal entry" (navigates `/accounting/journals/new` + toast), "Find match manually" (Sheet with searchable journal list → MANUAL match at confidence 100, status NEEDS_REVIEW), "Mark exception" (AlertDialog with required Textarea).
  - CONFIRMED: green block with Undo.
- Keyboard handler on `document` for `c`/`u`/`e` applied to the focused-card index (state). Tip text rendered below progress bar.

**View C — Complete summary**
- Centered success state, 4 KPI summary cards via `AccountingKPICard`, balance reconciliation card (opening + credits − debits = calculated vs statement closing, diff badge), exceptions list if any, and three actions (Download report = native Blob CSV, Start new = back to View A, View journal entries = navigate).

### Technical details

- Local React state only: `view`, `selectedAccount`, `dateRange`, `openingBalance`, `parsedLines`, `matches`, `activeTab`, `focusedIdx`, `sessionMeta`. No Context provider needed (single page); will use `useState`/`useMemo` and one `useEffect` for the keydown listener and one for the 400ms initial skeleton.
- Matching engine is pure and synchronous; show a 300ms "Matching N transactions…" loader before flipping to View B.
- CSV parsing: `FileReader.readAsText` → split on newlines → split on commas; tolerate `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`; empty debit/credit → 0; generate `crypto.randomUUID()` ids.
- Sample CSV + report CSV: `new Blob([...], {type:'text/csv'})` + anchor download.
- Reuses: `AccountingPageHeader`, `AccountingEmptyState`, `AccountingKPICard`, `AccountingStatusBadge`, `formatCurrency`, `formatCompact`, `MOCK_JOURNALS`, `SEED_BANK_ACCOUNTS` from `mockBankAccounts.ts`.
- shadcn primitives: `Card`, `Button`, `Input`, `Select`, `Tabs`, `Progress`, `Badge`, `AlertDialog`, `Sheet`, `Textarea`, `Table`. Sonner `toast` for feedback. Icons from `lucide-react`.
- HSL semantic tokens only (`bg-muted`, `text-destructive`, `text-green-600` allowed since used elsewhere in module). Fully responsive — cards stack on mobile, table wrapped in `overflow-x-auto`.
- No new npm packages; no CRM files touched; no edits to other accounting files.

### Deliverable on completion

List of files: 2 created, 1 replaced, App.tsx verified (no edit).
