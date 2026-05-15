## Goal

Remove fixed-list limitations on Petty Cash dropdowns, gate admin-only actions (manage categories, branches, custodians, approvers) behind admin rights, and add UI to select / add custodian and approver per branch.

## Scope

Only files inside `src/accounting/` plus reuse of the existing `useAccountingAccess` admin hook. No CRM changes, no new packages.

## What changes

### 1. Make dropdowns extensible (no fixed limit)

Convert these from hard-coded enums into store-managed lists that admins can add to from inside the dropdown:

- **Expense categories** (`PETTY_CATEGORIES`) — used in Voucher form and Dashboard filter.
- **Branches** (`PETTY_BRANCHES`) — used in Voucher form, Dashboard, Audit, Replenishment.
- **Custodians** — currently a string on each branch; becomes a selectable list with “+ Add custodian” inline.
- **Approvers (secondary + finance)** — same pattern as custodians.

Each dropdown gets an inline “+ Add new …” row at the bottom that opens a tiny dialog (name + email for people, name + code for branches, label + key for categories). On save it’s appended to the store and immediately selected.

Non-admins see the dropdowns but the “+ Add new …” row is hidden.

### 2. Admin-only rights

Use `useAccountingAccess().accountingRole === "ADMIN"` (or `isAdmin` fallback) to gate:

- “+ Add new …” rows in every dropdown.
- A new **“Manage”** button on the Petty Cash dashboard that opens a settings panel for branches / custodians / approvers / categories.
- Approve / reject voucher buttons on Detail page.
- Approve / reject / mark-paid actions on Replenishment page.
- Submit cash verification on Audit page.

Non-admins can still create vouchers (their voucher just enters the normal approval flow) and view everything read-only.

### 3. Custodian + approver selection on branches

- New **Manage Branches** dialog (admin only) reachable from dashboard header (“Settings” / cog icon) and from each branch card (“Edit”). Lets admin: rename branch, change code, pick custodian from list or add new, pick secondary approver from list or add new, set opening float.
- New **Manage People** dialog with two tabs: Custodians, Approvers. Add / rename / set email. Used as the source of both dropdowns.
- New **Manage Categories** dialog: add / rename / disable a category.

### 4. Voucher form additions

- Branch dropdown: shows current branches + “+ Add branch” (admin).
- Custodian / approver fields appear as read-only chips derived from the selected branch, with an “Edit branch” link (admin only).
- Category dropdown: shows current categories + “+ Add category” (admin).
- For employee reimbursement, the employee-name field becomes a combobox sourced from a new `pettyPeople` list with “+ Add employee” (any user, since employees are not an admin-only concept).

## Technical notes

### Files to add

- `src/accounting/stores/pettyCashStore.tsx` — extend with:
  - `categories`, `custodians`, `approvers` state, seeded from existing constants.
  - `addCategory`, `addCustodian`, `addApprover`, `updateBranch`, `addBranch` actions.
- `src/accounting/components/petty-cash/AddOptionDialog.tsx` — generic small dialog (name / email / code fields driven by props).
- `src/accounting/components/petty-cash/ManageBranchesDialog.tsx`
- `src/accounting/components/petty-cash/ManagePeopleDialog.tsx`
- `src/accounting/components/petty-cash/ManageCategoriesDialog.tsx`
- `src/accounting/components/petty-cash/ExtensibleSelect.tsx` — wraps shadcn `Select` and conditionally renders an “+ Add …” row at the bottom that calls a callback (returns the new id/value).

### Files to modify

- `src/accounting/types/pettyCash.ts` — relax `PettyCategory` to `string`; add `PettyPerson` (id, name, email, role: 'custodian' | 'approver' | 'employee'); add `disabled?: boolean` on category records.
- `src/accounting/data/mockPettyCash.ts` — export seed `PETTY_CUSTODIANS`, `PETTY_APPROVERS`, `PETTY_EMPLOYEES` derived from existing branch + employee constants.
- `src/accounting/pages/petty-cash/AccountingPettyCashDashboardPage.tsx` — add admin-only “Manage” button group (Branches / People / Categories); use `ExtensibleSelect` for filters.
- `src/accounting/pages/petty-cash/AccountingPettyCashVoucherPage.tsx` — switch branch / category / employee Selects to `ExtensibleSelect`; show custodian + approver as derived chips; admin-only “+ Add”.
- `src/accounting/pages/petty-cash/AccountingPettyCashDetailPage.tsx` — gate approve / reject buttons behind `isAdmin`.
- `src/accounting/pages/petty-cash/AccountingPettyCashReplenishmentPage.tsx` — gate approve / reject / paid buttons behind `isAdmin`.
- `src/accounting/pages/petty-cash/AccountingPettyCashAuditPage.tsx` — gate cash verification submit behind `isAdmin`.

### Behavior rules

- Admin check uses the existing `useAccountingAccess` hook (no new auth code).
- New options persist only in React Context state (mock data) — same pattern the module already uses.
- Non-admins attempting an admin action: button is hidden (no toast spam).
- All new UI uses existing shadcn components + semantic tokens; dark-mode friendly.
- No CRM, npm, schema, or backend changes.

## Out of scope

- Persisting added categories / people across reload (mock-only state, same as the rest of the module).
- Role management UI (admin status comes from existing `accounting_users.role`).
- Any change to CRM pages or shared layout other than what already exists.
