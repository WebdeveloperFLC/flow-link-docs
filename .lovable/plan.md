## Receipt Generation System for AR Invoices

Add branded, printable receipts to the AR module. PDF via `window.print()`; email/WhatsApp are toast/`wa.me` placeholders. No new npm packages.

### New files (3)

1. **`src/accounting/lib/receiptHelpers.ts`**
   - `ReceiptData` interface (per spec).
   - `generateReceiptNumber(invoiceNumber, paymentIndex=1)` → `RCP-{stripped}-{N}`.
   - `getEntityAddress(entity, branch)` with the 4 base entity addresses + India branch overrides (Delhi → 07-GSTIN, Mumbai → 27-GSTIN, Bangalore → 29-GSTIN), each with their own address.
   - `buildReceiptData(invoice, amountPaid, paymentDate, paymentMethod, paymentReference?, instalmentNumber?)` — pulls from `CustomerInvoice` (mockAR), maps service via internal `getServiceLabel` (covers all `ServiceType` values, falls back to raw key).
   - `currencySymbol(code)` helper: CAD→CA$, USD→US$, INR→₹, AED→AED, GBP→£, AUD→A$, EUR→€.
   - `maskPassport(p?)`: returns `••••••` + last 4 if present.

2. **`src/accounting/components/receipts/AccountingReceiptTemplate.tsx`**
   - Pure presentational component, props `{ receipt: ReceiptData }`.
   - Wrapper `<div id="accounting-receipt-print">` with **inline styles only** (no Tailwind).
   - Sections: Header (logo placeholder + company block left, big "RECEIPT" + meta right) · Billed-to / Receipt-details two-column · Service details · Payment breakdown (subtotal, tax, total, bold amount received, outstanding green/red, instalment line if `isInstalment`) · Footer (computer-generated note, thank-you, website, branch address).
   - Currency rendered via `currencySymbol()`; passport masked.
   - Inline `<style>` block with `@media print { @page { size: A4; margin: 20mm } body * { visibility: hidden } #accounting-receipt-print, #accounting-receipt-print * { visibility: visible } #accounting-receipt-print { position: absolute; left: 0; top: 0; width: 100% } }`.

3. **`src/accounting/components/receipts/AccountingReceiptModal.tsx`**
   - shadcn `Dialog`, `max-w-3xl` desktop / fullscreen mobile.
   - Header: "Payment receipt" + receipt number subtitle.
   - Action bar (border-b, `bg-muted/30`): **Download PDF** (primary, `Download` icon, calls `window.print()` with code comment about replacing with html2pdf/Puppeteer); **Print** (outline, `Printer`); **Email to client** (outline, `Mail`, `toast.info("Email delivery coming soon. Will send to "+receipt.clientEmail)` with comment about Resend/SES edge function); **WhatsApp** (outline, green tint, `MessageCircle`, opens `https://wa.me/?text=` with the prescribed message body).
   - Body: `overflow-y-auto max-h-[60vh] p-4 bg-white` rendering `<AccountingReceiptTemplate receipt={receipt} />`.
   - Footer: ghost Close.

### Modified files (additive only, 2)

4. **`src/accounting/pages/ar/AccountingARPage.tsx`**
   - Add state: `selectedReceipt: ReceiptData | null`, `receiptModalOpen: boolean`.
   - In row `DropdownMenu`, after "Record payment", add `Generate receipt` item rendered only when `i.status === "PAID" || i.status === "PARTIALLY_PAID"`. Calls `buildReceiptData(i, i.receivedAmount, i.paidDate ?? today, i.paymentMethod ?? "Other", i.paymentReference)`, sets state, opens modal.
   - Render `<AccountingReceiptModal>` at end of JSX when `selectedReceipt` is set.

5. **`src/accounting/pages/ar/AccountingInvoiceDetailPage.tsx`**
   - Add same two state hooks.
   - In sticky header actions, add `Download receipt` button (with `Receipt` icon) gated on `inv.status === "PAID" || inv.status === "PARTIALLY_PAID"`.
   - Render `<AccountingReceiptModal>` at end of JSX.

### Constraints respected
- No CRM files touched; only the 2 listed accounting files modified, all changes additive.
- No new npm packages — uses existing `lucide-react`, `sonner`, shadcn `Dialog`, `Button`.
- Receipt template uses inline styles only.
- Passport numbers masked; currency symbols mapped per spec.
- Print-only PDF via browser; email and WhatsApp clearly stubbed with code comments for future edge-function wiring.

### Final deliverable
List of all files created (3) and modified (2).
