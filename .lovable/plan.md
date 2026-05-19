
## Goal

Eliminate manual journal entry for standard AP bills. Journals post automatically when a bill is approved and when it is marked paid. Manual journal entry remains for adjustments.

## Behavior

1. **On approval** (`PENDING_REVIEW`/`DRAFT` → `APPROVED`):
   - Create POSTED journal, `sourceType: "AP"`, `reference: bill.billNumber`, narration `"AP bill <billNumber> — <vendor>"`.
   - Line 1 Dr: account resolved from `bill.linkedCOACode` (expense/asset), amount = `bill.totalAmount`.
   - Line 2 Cr: Accounts Payable (COA code `2000`), amount = `bill.totalAmount`.
   - Save journal id to `bill.linkedJournalId`.

2. **On payment** (`APPROVED`/`OVERDUE` → `PAID`):
   - Create POSTED journal, sourceType `AP`, reference `"PAY-<billNumber>"`, narration `"Payment for <billNumber>"`.
   - Line 1 Dr: AP `2000`, amount = `totalAmount`.
   - Line 2 Cr: bank/cash, resolved from `bill.linkedBankAccountId.linkedCoaAccountId` (fallback: first bank in entity currency, or cash account for CASH/PETTY_CASH).
   - Save journal id to new `bill.linkedPaymentJournalId` field.

3. **Idempotency**: skip if the relevant journal id is already present.

4. **Feedback (new)**:
   - **Success**: after each auto-post resolves, show `toast.success("Journal <JE-2026-####> posted")` (uses the DB-generated number returned via the journals store patch — fallback to local id while pending). The bill-detail page re-reads from the store so the new "View journal entry" button appears immediately (already happens via `useApBills` subscription).
   - **Accrual failure** (missing AP/expense account, network error): leave the bill at `APPROVED` and show `toast.error("Could not auto-post accrual journal — open it manually")`. The detail page shows the existing "Create journal entry" empty-state button so the user can retry.
   - **Payment failure**: leave the bill at `PAID` (do NOT roll back status), and:
     - Show `toast.error("Could not auto-post payment journal — payment journal pending")`.
     - Render a yellow "Payment journal pending" pill in the Accounting links card with a "Create payment journal" button that opens the journal form prefilled for the payment leg (`?fromBill=<id>&leg=payment`).

## UI changes

**`AccountingBillDetailPage.tsx`**
- Header action area:
  - If `bill.linkedJournalId` → `View accrual journal` button → `/accounting/journals/<id>`.
  - Else → `Create journal entry` → `/accounting/journals/new?fromBill=<billId>&leg=accrual`.
  - If `bill.status === "PAID"` and `bill.linkedPaymentJournalId` → `View payment journal`.
  - If `bill.status === "PAID"` and no payment journal → `Create payment journal` (amber) → `/accounting/journals/new?fromBill=<billId>&leg=payment`.
- Accounting-links card: keep existing chips. Add an amber `Payment journal pending` chip when paid-but-missing-payment-journal.

**`AccountingAPPage.tsx`**
- Row "Create journal entry" → route to detail when journal exists, else to prefilled new-journal form.

**`AccountingNewJournalPage.tsx`**
- Handle `?fromBill=<id>&leg=accrual|payment` (parallel to OCR prefill): look up bill, set entity, currency, reference, narration, sourceType `AP`, prefill two lines per leg.

## Code changes

- `src/accounting/data/mockAP.ts` — add optional `linkedPaymentJournalId?: string`.
- `src/accounting/stores/apBillsStore.ts`
  - Add internal helpers `autoPostAccrual(bill)` and `autoPostPayment(bill)` using `addJournal` from `journalsStore` and `getAccounts()` from `coaStore`.
  - In `updateApBill`, after the local optimistic patch, detect status transitions:
    - `prev.status !== "APPROVED" && next.status === "APPROVED" && !next.linkedJournalId` → run accrual; on success, patch local + DB via direct internal mutation (bypassing recursion); show success toast; on failure show error toast.
    - `prev.status !== "PAID" && next.status === "PAID" && !next.linkedPaymentJournalId` → run payment; same pattern, but on failure leave status as PAID.
- `src/accounting/pages/ap/AccountingBillDetailPage.tsx` — buttons, pending pill.
- `src/accounting/pages/ap/AccountingAPPage.tsx` — dropdown row action.
- `src/accounting/pages/journals/AccountingNewJournalPage.tsx` — `fromBill` + `leg` prefill.

## Out of scope

- No DB schema changes; `linkedPaymentJournalId` is local-only and survives via `mergeFromDb` (local-preserved). Accrual id already persists via `accounting_ap_bills.journal_id`.
- No RLS, journals DB trigger, or AR changes.
- No retro-backfill for existing bills.
- No separate input-tax debit line.

## Verification

1. New bill → submit → approve. Toast `Journal JE-2026-#### posted`. Detail page shows "View accrual journal". DB has POSTED journal Dr expense / Cr AP.
2. Mark paid → toast for payment journal. Detail page shows "View payment journal". DB has second journal Dr AP / Cr bank.
3. Force payment failure (e.g. bill with no `linkedBankAccountId` and no default bank): bill stays PAID, amber `Payment journal pending` chip + `Create payment journal` button appears, clicking opens prefilled form.
4. Manual `/accounting/journals/new` flow still works unchanged.
