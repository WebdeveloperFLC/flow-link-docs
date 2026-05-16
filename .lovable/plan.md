## Goal
Add a per-section View / Edit / Delete permissions matrix to both the main Users page and the Accounting Users page. Admins (and Super Admins) always have full rights and the matrix is locked for them. Permissions are saved to the database and enforced via RLS-friendly helper functions, not only the UI.

## What the user will see

**Main app `/users` page (existing CRM)**
- Each user row gets a new "Permissions" button → opens a "Module access" drawer.
- Drawer shows a matrix with sections down the left and 3 toggles per row: View, Edit, Delete.
- Sections (CRM modules):
  - Clients, Documents, Tasks, Telephony / Calls, Institutions, Commissions & Claims,
    Assessments, Accounting (top-level entry), Reports & Analytics, Letter templates, Settings.
- Admin → all rows shown checked + locked, with a banner "Admins have full access to every section."
- "Save" persists; "Reset to role defaults" restores the role's default matrix.

**Accounting `/accounting/settings/users` page**
- New "Module access" column on the grid + button per row opens an accounting-scoped matrix.
- Sections (accounting sub-modules):
  - Dashboard, Chart of Accounts, Journals, AP / Bills, AR / Invoices, Vendors, Clients link,
    Bank accounts & Reconciliation, Petty cash, Approvals, Tax & Compliance, Documents / OCR,
    Reports, Fraud, AI, Owners, Entities, Users & roles.
- SUPER_ADMIN / FINANCE_ADMIN → locked-full like Admin above.

UI styling matches the existing card/section pattern from each module (PageHeader + Card grid on the CRM side, AccountingPageHeader + Card on the accounting side).

## Data model

Two new tables — one per surface, so RLS can stay simple and per-row updates are cheap.

```text
public.user_module_permissions          -- main CRM
  user_id  uuid  -> auth.users
  module   text  -- e.g. 'clients', 'documents', 'accounting'…
  can_view bool default false
  can_edit bool default false
  can_delete bool default false
  updated_at timestamptz
  PK (user_id, module)

public.accounting_user_module_permissions
  accounting_user_id uuid -> accounting_users.id
  module   text          -- e.g. 'coa','journals','ap'…
  can_view / can_edit / can_delete bool
  PK (accounting_user_id, module)
```

Helper SECURITY DEFINER functions used by RLS and the client:
```text
public.user_has_module(_uid uuid, _module text, _level text)  -- 'view'|'edit'|'delete'
  returns true if has_role(_uid,'admin') OR matching row exists.

public.acct_user_has_module(_uid uuid, _module text, _level text)
  returns true if user is SUPER_ADMIN/FINANCE_ADMIN OR matching row exists.
```

RLS:
- Both new tables: admins can do everything; users can SELECT their own row.
- `INSERT/UPDATE/DELETE` only by admins (CRM) or SUPER_ADMIN / FINANCE_ADMIN (accounting).

## DB enforcement (incremental, additive — no existing policy is removed)

Add module-level guard policies alongside existing ones for the highest-risk tables:
- CRM side: `clients`, `client_documents`, `client_timeline` writes gated by `user_has_module(auth.uid(),'clients','edit'|'delete')` in addition to the current ownership/access logic.
- Accounting side: `accounting_journals`, `accounting_bills`, `accounting_invoices`, `accounting_coa_accounts` writes gated by `acct_user_has_module(auth.uid(), <module>, 'edit'|'delete')`.

For sections without dedicated tables (e.g. "Reports"), enforcement is UI-only — that is documented next to those toggles.

If a section needs more policies later, they can be added without changing the matrix UI.

## Code changes

**New**
- `src/lib/modulePermissions.ts` — module list, role defaults, `useMyModulePermissions()` + `useUserModulePermissions(userId)` hooks, `<RequireModule module level>` guard.
- `src/components/users/UserPermissionsDialog.tsx` — matrix dialog for `/users`.
- `src/accounting/lib/accountingModulePermissions.ts` — same pattern for accounting.
- `src/accounting/components/settings/AccountingUserPermissionsDialog.tsx` — matrix dialog for accounting.

**Edited**
- `src/pages/Users.tsx` — add "Permissions" button per row, wire dialog.
- `src/accounting/pages/settings/AccountingUsersPage.tsx` — add "Module access" action + column, wire dialog.
- `src/contexts/AuthContext.tsx` — expose `modulePermissions` map and `canModule(module, level)` helper.
- A small `<RequireModule>` wrapper applied around existing route elements in `src/App.tsx` for the gated CRM sections (admins always pass).

**Migration**
- Create both tables + helper functions + RLS + the additive policies described above.

## Out of scope
- No change to existing roles, route layout, or any unrelated UI.
- No bulk-import of permissions; each user is edited individually (matches accounting's existing UX).
- Reports/Analytics gating stays UI-only for now (no dedicated tables to guard).

## Open assumption
Default matrix per existing role uses sensible mappings (e.g. `counselor` → view+edit on Clients/Documents/Tasks; `viewer` → view only across CRM; `telecaller` → view+edit on Telephony, view on Clients; `ACCOUNTANT` → view+edit on Journals/AP/AR/COA/Reconciliation, view on Reports). Admins are always full. I'll seed these defaults on first open of the dialog so existing users aren't suddenly locked out.