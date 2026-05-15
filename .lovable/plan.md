## Problem

When the user clicks **Download PDF** / **Print** on the receipt modal, the generated PDF is mostly blank (only header chrome shows). Cause:

1. The receipt template lives inside the shadcn `Dialog`, which Radix renders in a portal with `position: fixed`, an overlay backdrop, and a `max-h-[60vh] overflow-y-auto` scroll container.
2. The current `@media print` rule does `body * { visibility: hidden }` then re-shows `#accounting-receipt-print` with `position: absolute; top:0; left:0`. But because the receipt's ancestors are `position: fixed` + scroll-clipped, the absolute positioning is relative to the dialog, not the page — so the printed page captures only the small clipped viewport, producing the blank/broken PDF.
3. The print also includes the modal's overlay/buttons region in some browsers (Chromium Skia, per the PDF metadata).

## Fix (UI-only, no new packages)

Render a **dedicated print container at `document.body` level** at print time, instead of relying on the dialog's DOM subtree.

### Files modified (2, additive only)

**`src/accounting/components/receipts/AccountingReceiptModal.tsx`**
- On `handleDownload` / `handlePrint`:
  1. Create a `<div id="accounting-receipt-print-root">` appended directly to `document.body`.
  2. Use `ReactDOM.createRoot` (already in the project via React 18) to render `<AccountingReceiptTemplate receipt={receipt} />` into it.
  3. Wait one animation frame (`requestAnimationFrame`) for layout, call `window.print()`.
  4. On `window.onafterprint` (with a `setTimeout` fallback), unmount and remove the node.
- Keep the in-modal preview untouched so the user still sees the receipt onscreen.

**`src/accounting/components/receipts/AccountingReceiptTemplate.tsx`**
- Replace the current `@media print` block with a stronger, portal-aware version:
  ```css
  @media print {
    @page { size: A4; margin: 15mm; }
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    body > *:not(#accounting-receipt-print-root) { display: none !important; }
    #accounting-receipt-print-root { display: block !important; position: static !important; }
    #accounting-receipt-print {
      position: static !important;
      box-shadow: none !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  }
  ```
- This guarantees: only the body-level print root prints, it flows naturally (no clipping by fixed/overflow ancestors), and pagination works for tall receipts.

### Why not html2canvas/jsPDF
The user's stack constraint is **no new npm packages**. `window.print()` produces a real vector PDF (better text quality than canvas rasterization) once the DOM/CSS issue above is fixed.

### Out of scope
- Email and WhatsApp actions remain stubbed as-is.
- No changes to `receiptHelpers.ts`, AR pages, or any other file.

### Expected result
Printing or "Download PDF" produces a full, properly paginated A4 receipt with header, billed-to/receipt-details, service details, payment breakdown, instalment block (when applicable), and footer — matching what the user sees in the modal preview.
