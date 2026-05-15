## Goal
Pass extracted OCR fields from the OCR review page into the New Journal form via URL search params, and pre-fill the form on mount with a dismissible info banner.

## Scope
Only these two files are touched:
- `src/accounting/pages/documents/AccountingOCRPage.tsx`
- `src/accounting/pages/journals/AccountingNewJournalPage.tsx`

## Changes

### 1. `AccountingOCRPage.tsx`
Replace the `Create journal entry` button handler (line 352) so it builds a merged extracted-data object (current doc's `ext` overlaid with `edits[currentDocId]`), then constructs the URL params exactly as specified:

```tsx
const merged = { ...ext, ...(edits[current.id] ?? {}) };
const params = new URLSearchParams({
  vendor: merged.vendorName ?? '',
  amount: String(merged.totalAmount ?? ''),
  date: merged.invoiceDate ?? '',
  taxCode: merged.suggestedTaxCode ?? '',
  glAccount: merged.suggestedLedger ?? '',
  currency: merged.currency ?? 'CAD',
  reference: merged.invoiceNumber ?? '',
  narration: [merged.vendorName, merged.documentType, merged.invoiceNumber]
    .filter(Boolean).join(' — '),
  sourceType: 'OCR_UPLOAD',
});
navigate(`/accounting/journals/new?${params}`);
```

No other markup or logic in this file changes.

### 2. `AccountingNewJournalPage.tsx`
- Add `useSearchParams` import from `react-router-dom`.
- Add a `useState` flag `showOcrBanner` (default `true` only when params include any OCR fields; otherwise `false`).
- On mount (single `useEffect` keyed by search string), if not editing an existing journal (`!existing`) and OCR params are present:
  - `entryDate` ← `date` param (if present)
  - `currency` ← `currency` param (if valid: CAD/USD/INR)
  - `reference` ← `reference` param
  - `narration` ← `narration` param
  - `sourceType` ← `'OCR_UPLOAD'`
  - Build one pre-filled line:
    - Resolve account: `MOCK_ACCOUNTS.find(a => a.code === glAccount)` else `MOCK_ACCOUNTS.find(a => a.name.toLowerCase().includes(glAccount.toLowerCase()))`
    - `debit` ← `amount` param
    - `taxCode` ← `taxCode` param
    - `description` ← `vendor` param
  - Replace the initial `lines` state with `[prefilledLine, emptyLine(), emptyLine()]` (keep total of three so the form still feels normal and balance check still works for the user).
- Render an info banner above the first `<Card>` inside the page container when `showOcrBanner` is true:
  ```tsx
  <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 text-blue-900 px-3 py-2 text-sm">
    <span className="flex-1">Pre-filled from OCR extraction — please review all fields before posting</span>
    <button onClick={() => setShowOcrBanner(false)} aria-label="Dismiss">
      <X className="w-4 h-4" />
    </button>
  </div>
  ```
  (`X` is already imported.)

Entity is intentionally left as default per spec.

## Out of scope
No other files, no styling-system refactors, no changes to mock data, routing, or the existing edit-journal flow.
