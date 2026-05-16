## What's actually happening (root cause)

You uploaded the TD Canada Trust PDF on **Accounting → Documents → Upload**. The progress bar finished and you saw "uploaded successfully", but **no record appears anywhere** — not in Recent uploads, Document library, or OCR queue.

Reason: the entire upload flow is a **front-end mock**. In `src/accounting/pages/documents/AccountingUploadPage.tsx` the "Upload all" handler only animates a progress bar in local component state and never writes the file anywhere. All three Documents pages then read from the same seed array `MOCK_DOCUMENTS = []` (in `src/accounting/data/mockDocuments.ts`), so any uploaded file is forgotten the moment the toast appears.

Files involved:
- `src/accounting/data/mockDocuments.ts` — seed array is empty; no store.
- `src/accounting/pages/documents/AccountingUploadPage.tsx` — fake `setInterval` "upload"; reads `MOCK_DOCUMENTS` for Recent uploads.
- `src/accounting/pages/documents/AccountingDocumentsPage.tsx` — library reads `MOCK_DOCUMENTS`.
- `src/accounting/pages/documents/AccountingOCRPage.tsx` — review queue reads `MOCK_DOCUMENTS`.

Nothing was wrong with the PDF or the AI extractor — the file simply was never persisted.

## Fix

Make uploads actually persist (localStorage-backed) and, for PDF statements, automatically run them through the existing AI extractor (`src/accounting/lib/extractCardStatement.ts`) so the record shows up populated everywhere — Recent uploads, Library, and OCR review queue.

### Files added

1. **`src/accounting/stores/documentsStore.ts`** — new
   - Built on existing `createPersistedStore` (`_persist.ts`) — same pattern as `cardReconciliationStore`, `intercompanyStore`, etc.
   - Storage key: `accounting:documents:v1`.
   - Holds `MockDocument[]` (reusing existing type from `mockDocuments.ts`).
   - Exports: `useDocuments()`, `getDocuments()`, `addDocument(input)`, `updateDocument(id, patch)`, `deleteDocument(id)`, plus an optional `pushExtractedLines(docId, lines)` helper for handing data to card reconciliation.
   - Records file metadata only (name, size, type, mime). The raw PDF bytes are *not* stored in localStorage — too large. We keep a transient in-memory `Map<string, File>` so the OCR page can re-render / re-process the file during the same session; after page refresh the metadata + extracted JSON survive, the original blob does not (we tell the user this in a small inline note).

### Files modified (3 page files + 1 mock file)

2. **`src/accounting/data/mockDocuments.ts`**
   - Keep the type exports as-is. No structural changes.

3. **`src/accounting/pages/documents/AccountingUploadPage.tsx`**
   - Replace the fake `setInterval` "upload" with a real handler:
     - For each queued file: call `addDocument({ filename, fileType, fileSizeKB, docType: 'OTHER', ocrStatus: 'PENDING', approvalStatus: 'PENDING', entity, uploadedBy, uploadedAt: now, tags: [] })`. We still animate progress for UX, but the record is created up-front.
     - If `fileType === 'pdf'` → immediately mark `ocrStatus = 'PROCESSING'`, then call `extractCardStatement(file)` (the proven path already used by Card reconciliation). On success: set `ocrStatus = 'COMPLETE'`, populate `extracted` with `{ vendorName: cardHolderName ?? "Bank statement", invoiceDate: meta.statementFrom, dueDate: meta.statementTo, subtotal: meta.openingBalance, totalAmount: meta.closingBalance, currency: meta.currency, confidence: 0.9 }`, and stash transactions on the doc via `extracted.lineItems` (extend `ExtractedData` with an optional `lineItems?: ExtractedTransaction[]`). Also auto-set `docType: 'BANK_STATEMENT'`. On failure: `ocrStatus = 'FAILED'` + capture error.
     - For non-PDF: leave `ocrStatus = 'PENDING'`.
   - "Recent uploads" reads from `useDocuments()` merged with `MOCK_DOCUMENTS` (still empty, but kept for shape compatibility) and sorts by `uploadedAt` desc.

4. **`src/accounting/pages/documents/AccountingDocumentsPage.tsx`**
   - Replace `useState<MockDocument[]>(MOCK_DOCUMENTS)` with `const docs = useDocuments()` so the library reflects real uploads. Local mutating UI (status changes etc.) routes through `updateDocument`.

5. **`src/accounting/pages/documents/AccountingOCRPage.tsx`**
   - Same swap: read from `useDocuments()` instead of seeding state from `MOCK_DOCUMENTS`. All mutations (`reRunOCR`, approve, reject) go through `updateDocument` / `deleteDocument`.
   - For a `BANK_STATEMENT` PDF with extracted `lineItems`, add a button **"Send to Card reconciliation"** that pushes the doc + lines into the existing card-reconciliation new flow via `sessionStorage` key `pending-card-statement` and navigates to `/accounting/card-reconciliation/new`. (The card-reconciliation page already accepts `CardStatementLine[]`; a thin reader at the top of `AccountingCardReconciliationNewPage.tsx` will pick it up if present — additive only.)
   - Re-run OCR for a PDF actually re-invokes `extractCardStatement` if the original `File` blob is still in the in-memory map; otherwise shows "Original file not in session — please re-upload to re-extract."

### What you'll see after the fix

- Drop the TD Canada Trust PDF on Upload centre → progress completes → a record appears immediately in **Recent uploads**, **Document library**, and **OCR review queue**.
- For PDFs, after a few seconds the OCR badge flips from Processing → Complete and the extracted statement period + opening/closing balances + transaction count are visible on the document.
- Click **Send to Card reconciliation** on the document to pre-fill the card-reconciliation wizard with all extracted lines (same flow as uploading the PDF directly inside that wizard).

### Scope guardrails

- No CRM, Commission, or other accounting pages touched.
- No edge function changes — reuses the existing `extract-card-statement` function.
- No new npm packages.
- Existing `MockDocument` / `ExtractedData` types extended only by an optional `lineItems?` field.
- Card-reconciliation pages get one tiny additive read at mount; no rewrites.

### Out of scope (call out if you want them later)

- Persisting raw PDF bytes across sessions (would require Lovable Cloud Storage). Today metadata + extracted data persist; the original file is session-scoped.
- A real backend documents table with RLS.
