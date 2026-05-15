## Goal
Mitigate the xlsx (^0.18.5) Prototype Pollution + ReDoS vulnerability in the live CRM lead import feature without touching any accounting module or other CRM functionality.

## Files to modify (2)

1. **`src/components/telecaller/ImportLeadsDialog.tsx`** — add pre-parse upload validation
2. **`package.json`** — bump `xlsx` from `^0.18.5` to `^0.20.3`

No other files change. Accounting module and other CRM features are untouched.

## Step 1 — Upload validation (defense in depth)

In `ImportLeadsDialog.tsx`, the file enters via the `onFile` handler (line 49) called from the hidden `<Input type="file">` (line 95). Add validation as the first lines of `onFile`, before `parseCsv(file)` runs.

The dialog accepts both CSV and Excel today (`accept=".csv,.xlsx,.xls,..."`). The user's spec only allows `.xlsx`. To preserve existing CSV import behavior (live users rely on it), the validation will:

- Always enforce the 5MB size limit
- Only enforce the xlsx MIME/extension check when the file is **not** a CSV (CSV path is not affected by the xlsx vulnerability)

Logic:

```ts
const onFile = async (file: File) => {
  if (file.size > 5 * 1024 * 1024) {
    toast.error("File too large. Maximum 5MB allowed.");
    return;
  }
  const isCsv =
    file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
  if (!isCsv) {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Invalid file type. Please upload an .xlsx file only.");
      return;
    }
  }
  setBusy(true); setResult(null);
  // ...existing parseCsv flow unchanged
};
```

If you'd rather strictly reject CSV per the literal spec, say so and I'll drop the CSV bypass — but that's a behavior change for live users.

## Step 2 — Upgrade xlsx

Edit `package.json` dependency: `"xlsx": "^0.20.3"`.

API compatibility check (verified in current code):
- `src/lib/leadImport.ts` uses `XLSX.read(buf, { type: "array" })` and `XLSX.utils.sheet_to_json(...)` — both unchanged in 0.20.x.
- `ImportLeadsDialog.tsx` uses `XLSX.utils.aoa_to_sheet`, `XLSX.utils.book_new`, `XLSX.utils.book_append_sheet`, `XLSX.writeFile` — all unchanged in 0.20.x.

No call-site changes required.

## Step 3 — Confirm

After changes, I'll report:
- The 2 modified files
- Confirm via build/typecheck and re-reading the call sites that the xlsx API surface used is unchanged, so lead import (CSV + Excel) continues to work.

## Out of scope
- No accounting files modified
- No other CRM logic, UI, or routes modified
- `leadImport.ts` itself is not modified (its xlsx API calls are already compatible with 0.20.x)
