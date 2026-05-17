## Add headerless TD Canada Trust auto-detection

Only modify:
- `src/accounting/lib/extractCardStatement.ts`
- `src/accounting/pages/card-reconciliation/AccountingCardReconciliationNewPage.tsx`

### Problem
Current `parseStatementCsv` assumes line 1 is a header row. TD Canada Trust exports have no headers and 5 columns: `Date(MM/DD/YYYY), Description, Debit, Credit, Balance`. They currently fall through as UNKNOWN and trigger the manual mapper.

### Changes

**1. `extractCardStatement.ts`**

Add a headerless TD detector used before header-based detection:

```ts
const MDY = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function isTdHeaderless(firstRow: string[]): boolean {
  if (firstRow.length !== 5) return false;
  const d = firstRow[0]?.trim() ?? "";
  if (!MDY.test(d) && !ISO.test(d)) return false;
  // cols 3,4 must be numeric-ish or empty; col 5 numeric (balance)
  const numOrEmpty = (s: string) => {
    const v = (s ?? "").replace(/[$,\s()]/g, "");
    return v === "" || /^-?\d+(\.\d+)?$/.test(v);
  };
  return numOrEmpty(firstRow[2]) && numOrEmpty(firstRow[3]) && numOrEmpty(firstRow[4]) && firstRow[4].trim() !== "";
}
```

In `parseStatementCsv`, before treating line 1 as a header:
- Split all lines into `string[][]`.
- If `isTdHeaderless(allRows[0])`, return:
  - `format: "TD"`,
  - `formatLabel: "TD Canada Trust format (no headers)"`,
  - `headers: ["Date","Description","Debit","Credit","Balance"]` (synthetic),
  - `rows: allRows` (treat every row as data),
  - `mapping: { dateCol: 0, descCol: 1, debitCol: 2, creditCol: 3, balanceCol: 4 }`,
  - `parsed: applyCsvMapping(allRows, mapping)`.

Also extend `normaliseDate`: when a `MM/DD/YYYY` slash format is detected and the headerless TD path is taken, interpret as MM/DD/YYYY. Keep current behavior for the ambiguous header path. Implementation: add an optional `preferMDY` boolean param to `normaliseDate`, threaded through `applyCsvMapping` via an options arg. The TD-headerless branch calls `applyCsvMapping(rows, mapping, { preferMDY: true })`. Default behavior unchanged.

Export an additional flag `headerless: boolean` on `CsvParseResult` so the UI can render the auto-detect banner and skip the manual mapper.

**2. `AccountingCardReconciliationNewPage.tsx`**

Where the parsed CSV result is consumed (mapping confirmation Step 1 UI):
- If `result.format === "TD" && result.headerless`, render a green banner:
  > Detected: TD Canada Trust format (no headers) — mapped automatically
- Skip the manual column re-mapper UI for this case (still show the 5-row preview).
- Continue straight to the transactions table using `result.parsed`.

No other logic changes; downstream signed-amount handling already supports debit/credit columns.

### Out of scope
CRM, Commission, other files, no new packages.

### Acceptance
- A 5-column TD CSV with no header and `MM/DD/YYYY` first column auto-detects, banner shows, mapper is skipped, debits become negative, credits positive, balance ignored.
- CSVs with header rows continue to use the existing detection path unchanged.
