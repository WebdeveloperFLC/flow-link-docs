# Fix: AR invoices missing a real "COA category" field

## Root cause

AP bills have a first-class **Expense category** dropdown (`EXPENSE_CATEGORY_LABELS`: Rent & utilities, Salaries, etc.) that drives the linked-COA filter. AR invoices were wired to **`client_categories`** master, but that list is actually *client segments* (Student / Professional / Family / Corporate / Partner) — not revenue/service categories. So:

- The AR form's "Service type" dropdown shows client segments, none of which map to any revenue COA.
- The "Revenue account (Cr)" select stays disabled or empty ("No COA account mapped for this category").
- The COA account editor's "Revenue categories" chips list the same wrong values, so accountants can't tag a revenue account properly.

Net effect from the user's POV: **no COA category field on AR invoices** that actually does anything.

## Fix (single coherent change, mirrors the AP pattern)

### 1. New enum + labels — `src/accounting/data/mockAR.ts`

Add alongside the existing `ServiceType`:

```ts
export type RevenueCategory =
  | "COACHING_TRAINING"
  | "LANGUAGE_COURSES"
  | "VISA_IMMIGRATION"
  | "UNIVERSITY_ADMISSIONS"
  | "INSTITUTION_COMMISSION"
  | "DOCUMENTATION_SERVICES"
  | "TEST_PREP"
  | "STUDY_ABROAD_PACKAGE"
  | "TRANSLATION_ATTESTATION"
  | "CONSULTING_FEES"
  | "OTHER";

export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = { ... };
```

Add `revenueCategory?: RevenueCategory` to `CustomerInvoice`.

### 2. `src/accounting/lib/coaCategoryMap.ts`

- Replace the free-text `REVENUE_EXACT` map with a typed `REVENUE_CATEGORY_TYPES: Record<RevenueCategory, string[]>` (same shape as `EXPENSE_CATEGORY_TYPES`).
- Add `REVENUE_CATEGORY_NAME_RX: Record<RevenueCategory, RegExp | null>` for name fallback (commission, coaching, ielts/toefl, visa, tuition, etc.).
- Rewrite `matchesRevenueCategory(account, category)` to take a `RevenueCategory` code and use the 3-step precedence already used for expenses (explicit per-account link → typeCode map → name regex).

### 3. `src/accounting/components/coa/AccountFormDialog.tsx`

Swap the revenue-category source: instead of `useMaster("client_categories")`, render chips from `REVENUE_CATEGORY_LABELS` (exact mirror of the existing expense-category chip block). Keep storage in `coaCategoriesStore` keyed by account `code`.

### 4. `src/accounting/pages/ar/AccountingNewInvoicePage.tsx`

- Add a new **"Revenue category *"** field (the COA-driver) using a plain `Select` over `REVENUE_CATEGORY_LABELS`. Keep the existing **Service type** field (free-text descriptor from `client_categories` — used only as a label on the invoice, not for COA filtering).
- Change `eligibleRevenueAccounts` filter to use the new `revenueCategory` state.
- Disable the "Revenue account (Cr)" select on `!revenueCategory` (instead of `!serviceType`), and update the placeholder/empty-state copy to "No COA account mapped for this category — add one in Chart of Accounts."
- Persist `revenueCategory` on the saved invoice.

### 5. `src/accounting/stores/arInvoicesStore.ts` (and any list/detail views)

Pass through the new `revenueCategory` field. No other behavior change.

## Why this fixes it

- AR invoices get a real, AP-symmetric "Revenue category" field driving the linked COA dropdown.
- The COA account editor exposes the same set of revenue categories accountants can tag, so explicit links actually work.
- "Service type" remains as a free-text descriptor for client-facing wording, decoupled from COA filtering.
- Existing accounts without explicit links still resolve via the typeCode + name-regex fallback.

## Out of scope

- No DB / Supabase migration. New fields live in localStorage stores.
- AR control account, journal posting, tax logic — untouched.
- `client_categories` master is left as-is (still useful for client segmentation).
