# Fix dual invoice/payment summary inconsistency on client detail

## Root cause
`ClientPaymentsCard` (`src/components/clients/ClientPaymentsCard.tsx`) renders TWO things stacked:

1. `<ClientInvoicesPanel />` — the "Client invoices & payments" card, which reads live data from `client_invoices` + `client_invoice_payments` (the real CRM invoice table). This shows the correct Outstanding ₹53,000.
2. A second `<Card>` titled "Payments & invoices" that fetches from a **different** table — `accounting_ar_invoices` — which has no rows for this client, so it reports Outstanding ₹0.00 and shows a stale-looking `INV-DRAFT-…` row sourced from accounting mirroring.

These two sources are not in sync (accounting AR is a mirror/secondary store, not the CRM invoice source of truth), which produces the mismatch the user sees.

## Fix (frontend only, no logic changes)
Remove the duplicate "Payments & invoices" card from `ClientPaymentsCard` so the client detail page has a single, canonical invoices/payments widget driven by `ClientInvoicesPanel`.

Specifically in `src/components/clients/ClientPaymentsCard.tsx`:
- Delete the `useEffect` that loads `accounting_ar_invoices`, the `rows`/`loading` state, the `STATUS_STYLES`/`fmt`/`InvoiceRow` locals, and the second `<Card>` block (the table titled "Payments & invoices").
- Keep the component as a thin wrapper that renders `<ClientInvoicesPanel clientId={clientId} />` plus the existing "Open accounts receivable" link button (moved to sit alongside the panel header area, OR kept as a small footer link below the panel) so users can still jump to `/accounting/ar`.
- Result: one widget, one source (`client_invoices` + `client_invoice_payments`), totals/paid/outstanding/invoice count all driven by `ClientInvoicesPanel`'s realtime subscription. Draft invoices remain included (panel already counts them — that's why the ₹53,000 draft is visible).

## Out of scope (explicitly unchanged)
- `ClientInvoicesPanel` aggregation, columns, snapshot drawer, collect/receipt/remind flows, and realtime channels stay exactly as today.
- No schema changes, no edits to `accounting_ar_invoices` mirroring, no edits to AR pages.
- `ClientDetail.tsx` continues to render `<ClientPaymentsCard clientId={client.id} />` — no callsite changes needed.

## Files touched
- `src/components/clients/ClientPaymentsCard.tsx` — strip out the duplicate AR-mirror table; keep wrapper + "Open accounts receivable" link.
