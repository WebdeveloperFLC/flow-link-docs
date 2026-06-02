# Fix: payment proof and payment date not visible after reload

## Root cause

In `AccountingBillDetailPage.confirmPayment` (src/accounting/pages/ap/AccountingBillDetailPage.tsx) the flow is:

1. Upload proof → write `payment_proof_path` to DB with a direct `supabase.update`.
2. Call `updateApBill(bill.id, { status: "PAID", paymentDate, paymentMethod, paymentReference, linkedBankAccountId, notes })` — **without** `paymentProofPath`.

`updateApBill` then runs `mapToDb(next)` and `UPDATE accounting_ap_bills SET ...`. Because `next.paymentProofPath` is undefined, `mapToDb` writes `payment_proof_path: null`, **overwriting the path we just saved**. The local bill object also never gets `paymentProofPath`, so the page shows "Not uploaded".

Separately, `payment_date` is not a column on `accounting_ap_bills` at all. `mapToDb` doesn't send it and `mergeFromDb` keeps `paymentDate: local?.paymentDate`. The "older" bill still shows the date only because it sits in `localStorage`; the new bill rendered after hydration loses it and shows "Paid on undefined". The "Bank used" UUID instead of nickname is the same symptom (bankAccounts store hadn't hydrated yet when rendered — but once paymentDate persists, a refresh will resolve it).

## Changes

### 1. `src/accounting/pages/ap/AccountingBillDetailPage.tsx`
- In `confirmPayment`, include `paymentProofPath: proofPath` in the `updateApBill` patch.
- Remove the now-redundant direct `supabase.from("accounting_ap_bills").update({ payment_proof_path })` call — the store handles it via `mapToDb`.

### 2. New migration: add `payment_date` column
```sql
ALTER TABLE public.accounting_ap_bills
  ADD COLUMN IF NOT EXISTS payment_date date;
```
(No new grants/policies needed — table already has them.)

### 3. `src/accounting/stores/apBillsStore.ts`
- `mapToDb`: add `payment_date: b.paymentDate || null`.
- `mergeFromDb`: prefer `row.payment_date` over `local?.paymentDate`.

## Out of scope

- The "Bank used shows UUID" display is a transient hydration race; it resolves on its own once bankAccounts load. No change unless it persists after the above fixes.
- Existing bills already saved with `payment_proof_path = null` from the broken flow cannot be recovered; user will need to re-mark them as paid (or we can leave their proofs as-is — the original upload likely still sits in storage under `payment-proofs/<user>/<bill-id>-*`, but reconnecting it is a manual step we won't automate here).
