## Goal
The "Billing Entity" dropdown in the Invoice Preview card is currently listing every row from `accounting_entities`, including branches and sub-branches (Ajwa, Anand, Bhayli, HO – Vadodara, etc.). Branches are already collected in the dedicated Branch field, so the dropdown should show only legal/billing companies.

## Change
- In `src/lib/clientRegistration.ts → fetchAccountingEntities()`, filter the query to `type = 'COMPANY'` so only billable legal entities are returned (Future Link Consultants Pvt Ltd, Future Link System Inc, etc.). Branches and sub-branches are excluded everywhere this helper is consumed (currently only `InvoicePreviewSection`).
- No UI structural changes, no schema changes, no impact to the Branch selector elsewhere on the form.

## Verification
- Open `/clients/new`, expand the Billing Entity select: only `COMPANY` rows appear; no Ajwa / Anand / Bhayli / HO entries.
- Branch field in Section 3 still lists branches as before.
