## Fix TD Canada Trust CSV parser + rename to Statement reconciliation

### Files to modify
1. `src/accounting/pages/card-reconciliation/AccountingCardReconciliationNewPage.tsx`
2. `src/accounting/lib/extractCardStatement.ts` (add shared CSV parser helper + sign-aware mapping)
3. `src/components/layout/AppLayout.tsx` (sidebar label only — single string change)

Routes in `App.tsx` stay unchanged.

---

### 1. Smart CSV parser (in `extractCardStatement.ts`)

Add a new exported helper `parseStatementCsv(text)` returning:

```ts
{
  format: "TD" | "GENERIC_AMOUNT" | "CREDIT_CARD" | "UNKNOWN";
  formatLabel: string; // e.g. "TD Canada Trust format"
  mapping: { dateCol, descCol, debitCol?, creditCol?, amountCol?, balanceCol? };
  headers: string[];
  rows: string[][]; // raw cells
  parsed: { date: string; description: string; amount: number }[]; // signed
}
```

Logic:

- Tokenize header row case-insensitively.
- **TD detection** — headers contain `debit` AND `credit` AND `balance` → format `"TD"`.
  - Resolve columns by keyword match:
    - date: `date`
    - description: `description` / `desc` / `narration` (combine `Description 1` + `Description 2` if both exist)
    - debit: `debit` / `withdrawals` / `money out`
    - credit: `credit` / `deposits` / `money in`
    - balance: `balance` → **skipped**
  - For each row: `debit = parseFloat(cells[debitCol])||0`, `credit = parseFloat(cells[creditCol])||0`.
    - if `debit > 0`: `amount = -debit`
    - else if `credit > 0`: `amount = +credit`
    - else skip the row.
- **Generic** — single column matching `amount`/`amt` → format `"GENERIC_AMOUNT"`. Sign preserved if present, otherwise positive.
- **Credit card** — `amount` column with no separate debit/credit and header contains `card` or `transaction` → `"CREDIT_CARD"`. Sign preserved.
- **Unknown** — fall back to best-guess (current behaviour) with `format: "UNKNOWN"` and `formatLabel: "Unknown format — please map fields"`.

**Date normaliser** (shared util inside helper):
- `YYYY-MM-DD` → as-is.
- `DD/MM/YYYY` (first part > 12) → swap.
- `MM/DD/YYYY` (second part > 12) → swap.
- Ambiguous → assume `DD/MM/YYYY` (TD Canadian default).

Numbers: strip `$ , ()` and treat `(123.45)` as negative.

Remove the locally defined `parseCSV` in the page and import this new helper.

### 2. CSV import flow in `AccountingCardReconciliationNewPage.tsx`

Replace the immediate jump-to-Step-2 inside `handleFile` with a **field-mapping confirmation panel** rendered inside the existing Step 1 view (CSV tab) once a file is parsed:

State additions:
```ts
const [csvPreview, setCsvPreview] = useState<ParseResult | null>(null);
const [manualMap, setManualMap] = useState(false);
```

When CSV is dropped:
- Run `parseStatementCsv(text)`, set `csvPreview`. Do **not** advance step.

Mapping panel renders below the drop zone:
- Banner: detected `formatLabel` (e.g. `Detected: TD Canada Trust format`). Green if known, amber if `UNKNOWN`.
- Preview table — first 5 rows showing `Date | Description | Amount` (signed, red if negative, green if positive). A muted note: `Balance column ignored`.
- Primary button: **Confirm and categorise** → maps `csvPreview.parsed` to `CardStatementLine[]` (signed amounts kept as `amount`; new `direction: "DEBIT" | "CREDIT"` derived from sign), advances to Step 2.
- Secondary link: **Re-map columns manually** → toggles a manual mapper (small grid of `Select`s — one per role: Date, Description, Debit, Credit, Amount, Balance, each listing the detected header strings). On apply, re-runs the row→signed-amount pipeline using user-chosen columns.

### 3. Step 2 / 3 — sign-aware categorisation

In `CardStatementLine` (kept in `extractCardStatement.ts` mapper output) include the signed `amount` (positive = credit/income, negative = debit/expense).

Add a third category button in Step 2 alongside Business/Personal:
- `[Business expense]  [Personal]  [Income / receipt]`
- New value `"INCOME"` added to local category union (page-local only — does not change the persisted type file).
- "Income/receipt" auto-suggests a Revenue account (first account where `groupCode === "REVENUE"`); fallback to AR account (`groupCode === "ASSET"` whose name matches `/receivable/i`).
- For income lines: in `generateJournal`, instead of debiting an expense and crediting the card, **credit** the chosen income/AR account and **debit** the card account by `|amount|`.

Amount column rendering:
- Negative → red text + small label `Debit (money out)`.
- Positive → green text + small label `Credit (money in)`.
- All totals continue using `|amount|` so business/personal sums stay positive; income totals tracked separately and shown in the totals strip and journal preview.

Default categoriser:
- Negative amounts default to `UNCATEGORISED` business candidate (current behaviour).
- Positive amounts default to `INCOME`.

### 4. Copy / labels (page)

- `AccountingPageHeader` title: `Import bank / card statement`.
- `STEPS[1]`: `Import statement` (already named that — keep).
- CSV drop zone text: `Drop your bank or credit card statement CSV here`.
- PDF drop zone text unchanged.

### 5. Sidebar rename (`AppLayout.tsx`)

Single change on line 45: label `"Card reconciliation"` → `"Statement reconciliation"`. Route unchanged.

---

### Out of scope
- CRM, Commission, all other accounting pages.
- Edge function code.
- No new npm packages.
- No URL/route changes.

### Acceptance
- A TD CSV with headers `Date, Description, Debit, Credit, Balance` is auto-detected; balance column ignored; debits become negative, credits positive.
- Generic CSVs with a single `Amount` column still import.
- Unknown CSVs surface a manual mapper instead of silently mis-parsing.
- Step 2 shows three category buttons and colour-coded amounts.
- Sidebar reads "Statement reconciliation".