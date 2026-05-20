## Goal

Restrict the **Expense / asset account (Dr)** dropdown on the New Bill page and the **Revenue account (Cr)** dropdown on the New Invoice page so they only show COA accounts that are mapped to the currently selected category — never the full eligible list. AP/AR control accounts and the existing entity + currency + active + postable filters stay unchanged.

## Problem

Today both dropdowns filter only by `entity + currency + group (EXPENSE/ASSET or REVENUE) + ACTIVE + isPostable`. The selected expense category (AP) and service / revenue category (AR) are ignored, so a "Rent & Utilities" bill still sees every expense account for the entity.

The COA itself has no `category` column — but every seeded account already carries a `typeCode` (RENT, UTILITIES, PROFESSIONAL_FEES, COMMISSION_REV, VISA_REV, COACHING_REV, etc.) and some carry `automationTags` (institution_commission, coaching_revenue, …). We will treat **typeCode (+ automationTag where useful) as the source-of-truth category link** and add a single mapping module on top of it. No DB / schema change.

## Files

1. **New** `src/accounting/lib/coaCategoryMap.ts`
   - `EXPENSE_CATEGORY_TYPES: Record<ExpenseCategory, string[]>` — each AP `ExpenseCategory` → array of allowed COA `typeCode`s. Examples:
     - `RENT_UTILITIES` → `["RENT", "UTILITIES"]`
     - `SALARIES_PAYROLL` → `["SALARIES", "PAYROLL_LIAB"]`
     - `TECHNOLOGY_SOFTWARE` → `["SOFTWARE"]`
     - `MARKETING_ADVERTISING` → `["MARKETING"]`
     - `PROFESSIONAL_FEES`, `UNIVERSITY_LIAISON_FEES`, `VISA_FILING_COSTS`, `GOVERNMENT_FEES` → `["PROFESSIONAL_FEES"]`
     - `BANK_CHARGES` → `["BANK_CHARGES"]`
     - `TRAVEL_TRANSPORT` → `["TRAVEL"]`
     - `OFFICE_SUPPLIES` → `["OFFICE_SUPPLIES"]`
     - `TELECOMS`, `COACHING_MATERIALS`, `EXAM_FEES`, `INSURANCE`, `MAINTENANCE`, `OTHER` → `[]` (no narrow type yet — falls through to "no mapping" state, accountant can map a new type in CoA)
   - `REVENUE_CATEGORY_TYPES: Record<string, string[]>` keyed by the labels emitted by `useMaster("client_categories")` / the AR `serviceType` selection. Examples:
     - `"IELTS coaching" | "PTE coaching" | "TOEFL coaching" | "Language coaching" | "Mock test package"` → `["COACHING_REV", "LANGUAGE_REV"]`
     - any `* student visa` / `* work permit` / `* PR` / `Tourist visa *` / `Schengen visa` → `["VISA_REV", "IMMIGRATION_REV"]`
     - `"University admissions" | "Study abroad package" | "Scholarship guidance"` → `["TUITION_REV", "COMMISSION_REV"]`
     - `"Institution commission" / commission-shaped labels` → `["COMMISSION_REV"]`
     - fallthrough (`"Other services"`, custom free-text) → `[]`
   - Helpers `expenseTypesFor(category)` and `revenueTypesFor(label)` that normalise the lookup (case-insensitive, handles unknown values → `[]`).
   - Pure data + functions — no React, no store.

2. **Edit** `src/accounting/pages/ap/AccountingNewBillPage.tsx`
   - Track the selected expense category as a controlled value (already `category` state) and resolve `mappedTypes = expenseTypesFor(category)`.
   - Replace `eligibleExpenseAccounts` filter with: existing entity / currency / ACTIVE / isPostable / group ∈ {EXPENSE, ASSET} **AND** `mappedTypes.includes(a.typeCode)`. When `category === ""`, keep dropdown disabled with placeholder "Select an expense category first".
   - Empty-state items inside the Select:
     - no category yet → "Select an expense category first"
     - category chosen but `mappedTypes.length === 0` OR no matching accounts → **"No COA account mapped for this category — add one in Chart of Accounts."**
   - Existing `useEffect` that clears `expenseCoaId` when ineligible already covers category changes (the eligibility list shrinks).
   - AP control account dropdown, bank dropdown, validation, payload — unchanged.

3. **Edit** `src/accounting/pages/ar/AccountingNewInvoicePage.tsx`
   - Resolve `mappedRevenueTypes = revenueTypesFor(serviceType)`.
   - Tighten `eligibleRevenueAccounts` the same way: entity / currency / ACTIVE / isPostable / `groupCode === "REVENUE"` **AND** `mappedRevenueTypes.includes(a.typeCode)`.
   - Disable until service type chosen; identical empty-state copy: **"No COA account mapped for this category — add one in Chart of Accounts."**
   - AR control account (Dr) stays auto-prefilled and untouched.

## Out of scope

- No DB / Supabase migration, no `coaStore` change, no journal-posting changes.
- AP control / AR control accounts remain system-managed exactly as today.
- No new field on `CoaAccount` — the mapping table is the only new artifact.
- No changes to the Chart of Accounts page (accountants already pick `typeCode` when creating accounts, which is what feeds the filter).

## Worked examples

- AP, entity = Canada HQ, currency = CAD, category = **Rent & utilities** → dropdown lists only CAD expense accounts whose `typeCode ∈ {RENT, UTILITIES}` (e.g. `CA-5200 Rent expense`, `CA-5210 Utilities`). Hides `6700 Management Fee Expense`, `5101 Embassy Fees Paid`, etc.
- AR, entity = Canada HQ, currency = CAD, service type = **Institution commission** → only `4301 Canada Institution Commission` (and any other COMMISSION_REV / CAD accounts the user added). Hides visa-revenue accounts.
- AP, category = **Insurance** (no mapping yet) → dropdown shows the empty-state message, prompting the user to add an "Insurance" type / account in CoA.