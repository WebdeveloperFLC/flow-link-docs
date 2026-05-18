# Bank account labeling + Owner/Branch clarification

Scope is limited to the bank-account UIs. No changes to commission, CRM, institution modules. No changes to existing RLS on other tables.

## Fix 1 — Personal bank section labeling (Owner profile page)

File: `src/accounting/components/owners/sections/` (the `SectionBlock` for bank accounts inside `AccountingOwnerDetailPage.tsx`).

- Section title: `Bank accounts` → **`Personal bank accounts`**
- Section helper line (new, one-liner under title): **"Tracked privately for net-worth. Not posted to company books."**
- Section button: `+ Add account` → **`+ Add personal account`**

This visually separates the personal wealth tracker from `/accounting/bank-accounts` (company books).

## Fix 2 — Company bank account form (`BankAccountFormDialog.tsx`)

Clarify the confusing fields on the New bank account dialog at `/accounting/bank-accounts`.

### 2a. Rename "Branch / sub-branch (optional)"
- Label → **"Sub-entity / division (optional)"**
- Helper text under field: **"Internal org branch (e.g. regional office). Leave blank if the company has no sub-entities."**
- (The actual bank branch is captured below in "Bank branch name / code / address" — that stays as is.)

### 2b. Remove the "Owner" dropdown from the company bank form
Rationale: on the company books, the **Entity/company** field already identifies the owner. The current Owner dropdown pulls from `owner_profiles` (personal wealth module) and is conceptually wrong for operational company accounts.

- Remove the `Owner` Select and the `ownerProfileId` requirement from validation.
- Keep `owner_profile_id` column in DB nullable (already nullable). No migration needed; just stop writing it from this form.

### 2c. Add "Authorised signatories" (multi-select, optional)
- New field below "Account holder name": **"Authorised signatories (optional)"** — multi-select Combobox sourced from `owner_profiles` where `category = 'PERSONAL'` (the individuals already used as directors).
- Helper: **"Individuals with signing authority on this account (e.g. directors with joint signing)."**
- Storage: new column `authorised_signatory_ids uuid[]` on `accounting_bank_accounts` (default `'{}'`). Migration adds the column only; RLS unchanged.

### 2d. Add field-level helper text
- **Account holder name** helper: **"Legal name as printed on the bank's records (usually the company's legal name)."**
- **Entity/company** helper: **"The company that owns this account on the books."**

## Files to touch

- `supabase/migrations/<new>.sql` — add `authorised_signatory_ids uuid[] default '{}'` to `accounting_bank_accounts`.
- `src/accounting/components/bank-accounts/BankAccountFormDialog.tsx` — remove Owner field, rename Branch label, add Authorised signatories multi-select, add helper texts.
- `src/accounting/types/bankAccounts.ts` (or equivalent) — add `authorisedSignatoryIds?: string[]`.
- `src/accounting/stores/bankAccountsStore.ts` — map new column in/out.
- `src/accounting/components/owners/...` (SectionBlock usage for bank in `AccountingOwnerDetailPage.tsx`) — rename title/button, add helper line.
- `src/integrations/supabase/types.ts` — auto-regenerated.

## Out of scope
- No backfill of `authorised_signatory_ids`.
- No changes to bank account list page columns (can do in a follow-up if you want a "Signatories" column).
- No removal of existing `owner_profile_id` column (kept nullable for backward compat).

## Open question (one)
Confirm: **OK to remove the "Owner" dropdown from the company bank form entirely?** If you'd rather keep it as an optional "Primary contact" field instead of removing it, say so and I'll keep it but make it optional and relabel it.
