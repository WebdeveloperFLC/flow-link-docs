## Safety Sweep Results — Accounting Module

I searched all 9 specified files for unsafe array `[0]` accesses and unguarded `.find()` results.

### Findings

**Already safe — no changes needed (8 files):**

| File | Notes |
|---|---|
| `components/vendors/AddVendorDialog.tsx` | No mock indexing; defaults are string literals. |
| `components/bank-accounts/BankAccountFormDialog.tsx` | Line 111 `ledgers.find(...)` result is guarded by `if (ledger && ...)` on line 112. |
| `components/receipts/AccountingReceiptTemplate.tsx` | No `[0]` or unguarded `.find()`. |
| `lib/receiptHelpers.ts` | Only object lookups via `addresses[entity] ?? {...}` — already safe. |
| `pages/ap/AccountingNewBillPage.tsx` | All `.find()` chained with `?.name ?? ""`; `errors[0]?.message ?? ...`; `files?.[0]?.name ?? ""`. |
| `pages/ar/AccountingNewInvoicePage.tsx` | Same pattern — all `?.` + `??` defaults. |
| `pages/bank-accounts/AccountingBankAccountsPage.tsx` | `MOCK_OWNERS.filter(...)` and `.map(...)` — empty-array-safe. |
| `pages/owners/AccountingOwnersPage.tsx` | `prev.find(...)` result used only in `if (exists)` branch. |

**One unsafe spot (1 file, 1 line):**

`src/accounting/pages/journals/AccountingNewJournalPage.tsx` line 173:
```ts
const a = MOCK_ACCOUNTS.find(x => x.id === l.accountId)!;
```
The `!` non-null assertion would crash if `MOCK_ACCOUNTS` is empty and an `accountId` somehow survives the filter on line 172. In practice the user can't select an account when `MOCK_ACCOUNTS` is empty, but it's still an unguarded access.

### Planned change

**File:** `src/accounting/pages/journals/AccountingNewJournalPage.tsx`

Replace lines 172–179 (`.map` body) with a guarded version that skips lines whose account cannot be resolved:

```ts
const lineModels = lines.filter(l => l.accountId).flatMap(l => {
  const a = MOCK_ACCOUNTS.find(x => x.id === l.accountId);
  if (!a) return [];
  return [{
    id: l.id, accountId: l.accountId, accountCode: a.code, accountName: a.name, accountType: a.type,
    debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
    description: l.description, taxCode: l.taxCode,
  }];
});
```

No UI changes, no logic changes beyond the null guard, no store/mock edits.

### Summary

- **Files to modify:** 1 (`AccountingNewJournalPage.tsx`)
- **Lines fixed:** 1 unguarded `!` non-null assertion → `?.` + skip
- **Files inspected and confirmed already safe:** 8