## Problem

The screenshot shows **CA-5200 Rent Expense** exists in CoA but its `typeCode` is **`OPERATING_EXP`** — a user-added type, not one of the seeded codes (`RENT`, `UTILITIES`, …). Our current mapping in `coaCategoryMap.ts` only matches by a fixed list of typeCodes, so the AP "Rent & utilities" dropdown comes up empty even though the right account clearly exists. Same brittleness affects AR: any user-created revenue account with a non-seeded typeCode (e.g. `OPERATING_REV`) is invisible.

Root cause: there is no real link between an AP **expense category** / AR **service type** and a CoA account. The static typeCode map is a guess that breaks the moment the user creates their own type.

## Fix (single coherent change)

Make the link **explicit on the CoA account**, with a smart name-based fallback so existing accounts keep working without manual mapping.

### 1. `src/accounting/types/coa.ts`

Add two optional fields to `CoaAccount` and `CoaAccountInput`:

- `expenseCategories?: string[]` — AP `ExpenseCategory` codes this account serves (e.g. `["RENT_UTILITIES"]`).
- `revenueCategories?: string[]` — AR free-text service labels this account serves (e.g. `["Institution commission"]`).

Both default to empty arrays. No DB change — these live in the existing localStorage-backed `coaStore`.

### 2. `src/accounting/stores/coaStore.ts`

- Persist the two new fields through `createAccount` / `updateAccount`.
- One-time migration on load: leave existing accounts untouched (fallback below covers them).

### 3. `src/accounting/pages/coa/AccountingCOAPage.tsx` (edit/create dialog)

- Add a **"Categories"** section in the account editor with two multi-select chips:
  - **Expense categories** — visible only when `groupCode === "EXPENSE"` (or `ASSET` for prepaids). Options come from `EXPENSE_CATEGORY_LABELS` in `mockAP.ts`.
  - **Revenue categories** — visible only when `groupCode === "REVENUE"`. Options come from `useMaster("client_categories")` (same source the AR form uses).
- Helper copy: "Controls which categories see this account in AP/AR dropdowns. Leave blank to fall back to auto-matching by name."

### 4. `src/accounting/lib/coaCategoryMap.ts` (extend, don't replace)

Add **name-keyword fallback tables** (no DB needed) so legacy accounts without explicit categories still resolve:

```ts
const EXPENSE_CATEGORY_NAME_RX: Record<ExpenseCategory, RegExp> = {
  RENT_UTILITIES: /\b(rent|utilit|electric|water|gas)\b/i,
  SALARIES_PAYROLL: /\b(salar|payroll|wage|bonus|gratuity)\b/i,
  TECHNOLOGY_SOFTWARE: /\b(software|saas|subscription|hosting|cloud|it)\b/i,
  MARKETING_ADVERTISING: /\b(marketing|advert|campaign|seo|ads)\b/i,
  PROFESSIONAL_FEES: /\b(professional|legal|consult|audit|accounting)\b/i,
  BANK_CHARGES: /\b(bank|wire|transfer|charge|fee)\b/i,
  TRAVEL_TRANSPORT: /\b(travel|taxi|uber|flight|transport|fuel)\b/i,
  OFFICE_SUPPLIES: /\b(office|stationery|supplies|printing)\b/i,
  TELECOMS: /\b(telecom|phone|mobile|internet|broadband)\b/i,
  COACHING_MATERIALS: /\b(coaching|material|book|study)\b/i,
  EXAM_FEES: /\b(exam|test|ielts|toefl|pte)\b/i,
  VISA_FILING_COSTS: /\b(visa|embassy|biometric|application)\b/i,
  UNIVERSITY_LIAISON_FEES: /\b(university|tuition|liaison|institution)\b/i,
  GOVERNMENT_FEES: /\b(government|govt|tax|stamp|notar)\b/i,
  INSURANCE: /\b(insurance|policy|premium)\b/i,
  MAINTENANCE: /\b(maintenance|repair|cleaning|janitor)\b/i,
  OTHER: /.^/, // never matches — OTHER must be mapped explicitly
};
```

Add a single resolver used by both AP and AR pages:

```ts
matchesExpenseCategory(account, category): boolean
  = account.expenseCategories?.includes(category)
 || EXPENSE_CATEGORY_TYPES[category]?.includes(account.typeCode)
 || EXPENSE_CATEGORY_NAME_RX[category]?.test(account.name);
```

Mirror for revenue: `matchesRevenueCategory(account, label)` — explicit `revenueCategories` first, then exact-label/substring rules already in `REVENUE_EXACT` + heuristics, then a final name-regex check against the label keywords.

### 5. `src/accounting/pages/ap/AccountingNewBillPage.tsx`

Replace the `mappedExpenseTypes.includes(a.typeCode)` filter with `matchesExpenseCategory(a, category)`. Drop the `useEffect` that recomputes `mappedExpenseTypes`. Update empty-state copy:

> "No COA account assigned to this category. Open Chart of Accounts → edit an expense account → add this category."

### 6. `src/accounting/pages/ar/AccountingNewInvoicePage.tsx`

Replace `mappedRevenueTypes.includes(a.typeCode)` with `matchesRevenueCategory(a, serviceType)`. Same updated empty-state copy.

## Why this fixes the user's screenshot

CA-5200 has `typeCode = OPERATING_EXP` (no match), no `expenseCategories` yet, but `name = "Rent Expense"`. The new name-regex fallback `/\b(rent|utilit|…)\b/i` matches "Rent Expense" → account appears in the **Rent & utilities** dropdown. As soon as the accountant edits the account and ticks **Rent & utilities** in the new Categories field, that explicit link takes over and the regex is no longer needed.

## Out of scope

- No DB migration, no Supabase changes.
- AP/AR control accounts, journal posting, payload shape — untouched.
- No new system types added to `coaMasterStore` (user keeps full freedom to use `OPERATING_EXP` or any other label).