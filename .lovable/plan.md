## Goal

Stop auto-running OCR (which fails for all docs) and instead let users either route documents to the right module (Card Reconciliation, AP Bill, Journal Entry) or manually trigger OCR per row.

## Files to modify

1. `src/accounting/data/mockDocuments.ts`
2. `src/accounting/pages/documents/AccountingUploadPage.tsx`
3. `src/accounting/pages/documents/AccountingDocumentsPage.tsx`

No CRM, Commission, OCR-call, or edge-function code touched. No new packages.

## Changes

### 1. `mockDocuments.ts`
- Extend `OCRStatus` union: add `'MANUAL'` → `'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'MANUAL'`.

### 2. `AccountingUploadPage.tsx`
- Remove the `extractCardStatement` import and the entire auto-extraction block (lines ~128-161).
- Always create new documents with `ocrStatus: 'PENDING'` regardless of file type. Keep default `docType` heuristic (PDF → `BANK_STATEMENT`, else `OTHER`).
- Extend the local `OCR_BADGE` map with `MANUAL: { cls: 'bg-muted text-muted-foreground', label: 'Manual entry' }`.
- Below the drop-zone card, add a blue info `Card` with `Info` icon and two lines:
  - "Bank statements: Upload here to store a record, then use 'Send to Card Reconciliation' to extract transactions automatically with AI."
  - "Invoices & receipts: Upload here and use 'Pre-fill AP Bill' or 'Pre-fill Journal Entry' to auto-populate forms."

### 3. `AccountingDocumentsPage.tsx`
- Extend `OCR_BADGE` map with `MANUAL: { cls: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300', label: 'Manual entry' }`.
- In the row `DropdownMenu`, insert type-aware actions above the existing "View / Download / Link to journal" items:
  - If `d.docType === 'BANK_STATEMENT'`: **Send to Card Reconciliation →** → `updateDocument(d.id, { ocrStatus: 'MANUAL' })` then `navigate('/accounting/card-reconciliation/new', { state: { prefillFile: d.filename, prefillName: d.filename } })`.
  - If `d.docType === 'INVOICE' || 'BILL'`: **Pre-fill AP Bill →** → mark `MANUAL`, then `navigate('/accounting/ap/new', { state: { fromDoc: d.id } })`.
  - If `d.docType === 'RECEIPT'`: **Pre-fill Journal Entry →** → mark `MANUAL`, then `navigate('/accounting/journals/new', { state: { fromDoc: d.id } })`.
- Add **Reset OCR status** item → `updateDocument(d.id, { ocrStatus: 'PENDING', ocrError: undefined })` + toast.
- Existing **Delete** item with AlertDialog confirmation already exists — keep as is.

## Out of scope
- Edge function code, `extractCardStatement.ts`, OCR page, Card Reconciliation page internals, CRM files, Commission files.
