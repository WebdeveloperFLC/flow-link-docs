## Fix duplicate receipts + show entity logo on receipts

### 1. Prevent duplicate receipts per payment
- **Migration**: add partial unique index on `client_invoice_receipts (payment_id) WHERE archived_at IS NULL` as a backend guard.
- **`ClientInvoicesPanel.tsx`**: in `load()`, fetch existing receipts grouped by invoice. Compute `allVerifiedReceipted` = (count of verified payments) === (count of receipted verified payments). Disable the **Receipt** button (next to Remind / $ Collect) when true, with tooltip "All verified payments already have receipts".
- **`GenerateReceiptDialog`**: filter out payments that already have a receipt from the selectable list; catch unique-violation errors with a friendly toast.

### 2. Show entity/firm logo on receipts
- **`GenerateReceiptDialog.save()`**: fetch `logo_path` from `firm_profile` for the selected entity, build a signed URL from the `branding` bucket, store it in the receipt snapshot under `firm.logo_url`.
- **`receiptHelpers.ts → snapshotToReceiptData()`**: populate new `companyLogo` from `snapshot.firm?.logo_url`.
- **`AccountingReceiptTemplate.tsx`**: render `r.companyLogo ?? flcLogo` so uploaded entity logo wins, with the bundled FLC asset as fallback.

### Out of scope
- Per-branch logos (only `firm_profile` carries a logo today).
- No `firm_profile` schema or upload UI changes — those already exist.

### Files touched
- `supabase/migrations/<new>.sql` (unique index)
- `src/components/clients/ClientInvoicesPanel.tsx`
- `src/accounting/components/receipts/GenerateReceiptDialog.tsx` (filter + logo fetch)
- `src/accounting/lib/receiptHelpers.ts`
- `src/accounting/components/receipts/AccountingReceiptTemplate.tsx`
