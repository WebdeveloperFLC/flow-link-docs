I checked the actual client on screen and found the root cause:

- The selected service is saved correctly on the client: `COACH-IELTS-AC-CC`.
- The service catalogue has the correct fee: ₹15,000.
- A draft invoice was created with the correct total in `accounting_ar_invoices`: ₹17,700 including GST.
- But the client detail page reads invoices only from `client_invoices`, and that table has no invoice for this client. That is why the “Client invoices & payments” card shows blank / outstanding ₹0.

So this is not the service fee calculation failing; it is a split invoice storage bug. The new-client invoice button writes to one invoice table, while the client payment panel reads a different invoice table.

Plan to resolve once for all:

1. Change `createDraftInvoice` in `src/lib/clientRegistration.ts` so it creates the invoice in `client_invoices`, the same table used by the Client invoices & payments panel, portal payments, payment collection, receipts, and outstanding calculations.
2. Preserve the current line-item mapping: service code, service name, person type, family member, quantity, unit price, discount, GST, complimentary flag, and total.
3. Set invoice `amount` to the computed grand total and `due_date` to today when payment terms are `DUE_ON_RECEIPT`, so outstanding immediately reflects the payable amount.
4. Add an idempotency guard before creating a new invoice: if the client already has an active invoice for the same selected service/person lines, return the existing invoice instead of creating duplicates. This prevents repeated credit usage and repeated invoice creation for the same issue.
5. Optionally backfill the already-created invoice for this current client from `accounting_ar_invoices` into `client_invoices`, so the existing ₹17,700 invoice appears immediately in the current Client invoices & payments card.
6. Verify with a read query that this client has a row in `client_invoices` with amount ₹17,700 and that the payment panel will calculate outstanding from that row.

Technical detail:
- I will not rename fields or introduce new client-stage fields.
- The fix is to align the write path with the existing read path, not to redesign the invoice/payment module.
- No extra user-visible workflow section will be added back.