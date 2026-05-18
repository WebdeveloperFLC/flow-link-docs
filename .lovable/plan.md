## Goal

Build an admin-controlled, per-section View/Edit access system for the entire Accounting module. Frontend-only enforcement in this phase; existing RLS (`is_accounting_user`) stays untouched. Admins always have full access; new users start with none.

## What already exists (reuse, do not rebuild)

- `accounting_users` table + roles (SUPER_ADMIN, FINANCE_ADMIN, ACCOUNTANT, …)
- `accounting_user_module_permissions` table with `(accounting_user_id, module, can_view, can_edit, can_delete)`
- `is_accounting_admin(uid)` and `acct_user_has_module(uid, module, level)` DB functions
- `AccountingUserPermissionsDialog` (per-user dialog) + `accountingModulePermissions.ts` (fetch/save helpers)
- Route guard `AccountingProtectedRoute`

This plan **extends** that foundation rather than replacing it. Existing data (Santosh SUPER_ADMIN, Balveer ACCOUNTANT) keeps working because admins bypass checks and Balveer's existing rows are preserved.

## 1. Section catalog (single source of truth)

Replace the current `ACCT_MODULES` list in `src/accounting/lib/accountingModulePermissions.ts` with the full section list the user requested, keyed by stable slugs:

```
dashboard, coa, journals, ap, ar, bank, card_recon, petty_cash,
reimbursements, intercompany, entities, masters, documents,
reports_reconciliation, reports_consolidated, reports_financials,
onboarding, access_admin
```

`access_admin` is admin-only (locked, not assignable in the matrix UI).

Add a `dependencies: string[]` field per section encoding the auto-grant rules:
- journals → coa
- ap → coa
- ar → coa
- bank, card_recon → journals, coa
- reimbursements → coa
- intercompany → entities, coa
- petty_cash → coa
- reports_reconciliation → bank, journals
- reports_consolidated → journals, entities
- reports_financials → journals, coa

Granting Edit auto-grants View on same section; granting View on a section auto-grants View on all dependencies (recursive). Unchecking View clears Edit on that section. Inline note in UI: "Auto-granted because Journals requires Chart of Accounts View".

## 2. Database migration

One migration adding only **new** objects (no changes to existing RLS):

- Backfill: ensure `accounting_user_module_permissions` rows exist for the new section keys (no-op if already present).
- New table `public.accounting_access_audit`:
  - `actor_auth_user_id uuid`, `target_accounting_user_id uuid`, `module text`, `before jsonb`, `after jsonb`, `created_at timestamptz default now()`
  - RLS: SELECT/INSERT only when `is_accounting_admin(auth.uid())`.
- Trigger on `accounting_user_module_permissions` (AFTER INSERT/UPDATE/DELETE) writing diffs to audit, with `auth.uid()` as actor.
- Helper view `acct_user_effective_permissions` (optional, for the admin matrix) — defaults admins to all-true.

No changes to any other table's RLS. No changes to `is_accounting_user` or `acct_user_has_module`.

## 3. `usePermission` hook

New `src/accounting/hooks/usePermission.ts`:

```ts
usePermission(section, level: 'view' | 'edit') → { allowed, loading }
usePermissions() → full map + helpers can(section, level)
```

- Loads the current user's `accounting_users` row + their permission rows once, caches in a small Zustand store (`accountingPermissionsStore`).
- Admin (`SUPER_ADMIN` / `FINANCE_ADMIN`) → always `allowed: true`.
- Otherwise checks `can_view` / `can_edit`. Edit implies View.
- Subscribes to a `permissions:updated` event so the admin matrix can refresh other open tabs via Supabase realtime on the permissions table.

## 4. Admin matrix page `/accounting/access`

New `AccountingAccessAdminPage`:
- Visible only when `is_accounting_admin` (route guard + nav hide).
- Table: rows = accounting users, columns = sections × {View, Edit}.
- Click cell → optimistic toggle, runs dependency resolver, persists via existing `saveAcctPermissions` (extended to accept the full map for a user).
- Admin rows render checkboxes as locked-on with a shield icon.
- Row actions: "Reset to role defaults", "Revoke all", "View audit".
- Audit drawer: paginated list from `accounting_access_audit` for the selected user, showing actor, section, before→after, timestamp.

The existing per-user dialog (`AccountingUserPermissionsDialog`) remains and is updated to use the new section list + dependency rules, so the existing "Manage" button on `AccountingUsersPage` keeps working.

## 5. Frontend enforcement

- **Route guards**: small wrapper `AccountingSectionRoute({ section, level='view' })` that wraps each accounting route in `App.tsx`. On deny → redirect to a new `/accounting/no-access` page that explains the missing permission and links back.
- **Nav**: in `AppLayout.tsx`, filter accounting nav items through `can(section, 'view')`. `access_admin` link only renders for admins.
- **Buttons/forms**: introduce `<RequireEdit section="...">` wrapper and a `useCan(section, level)` helper. Apply to primary action buttons on each page (New Journal, Save, Approve, Delete, etc.) — disabled with tooltip when no Edit.

Mapping of routes → section keys is centralized in `src/accounting/lib/accessMap.ts` so adding a section later is one-file change.

## 6. Defaults, seeding, safety

- Migration does **not** insert deny rows; absence of a row = no access (matches existing helper).
- Admins always pass via `is_accounting_admin` short-circuit in both hook and DB function → Santosh stays full-access.
- Balveer (ACCOUNTANT) already has rows in `accounting_user_module_permissions` from the previous build; a small data step inside the migration upserts the new section keys for any ACCOUNTANT user using current `ACCT_ROLE_DEFAULTS` so he doesn't suddenly lose UI access. This is a one-time backfill, idempotent.

## 7. Scope guardrails (explicit non-goals)

- No changes to commissions, CRM, institutions, or BRIDGE_ENABLED.
- No changes to existing RLS policies on accounting data tables. Phase 2 will wire `acct_user_has_module` into table-level RLS.
- No changes to `src/integrations/supabase/client.ts` or `types.ts`.
- No new auth flows, no new edge functions.

## Deliverables

1. Migration: `accounting_access_audit` + trigger + backfill upserts.
2. Updated `accountingModulePermissions.ts` with new sections + dependency graph + resolver.
3. New `usePermission` hook + Zustand cache + realtime refresh.
4. New `AccountingAccessAdminPage` + audit drawer + route at `/accounting/access`.
5. `AccountingSectionRoute` wrapper applied to every accounting route in `App.tsx`.
6. `/accounting/no-access` page.
7. Nav filtering in `AppLayout.tsx`.
8. `RequireEdit` wrapper + `useCan` applied to primary action buttons across accounting pages (journals, AP, AR, bank, card recon, petty cash, reimbursements, intercompany, entities, masters, documents, reports, onboarding).
9. Updated existing per-user dialog to use the new catalog so `AccountingUsersPage` "Manage" still works.

## Out of scope (Phase 2, not built now)

- Backend RLS enforcement of section permissions on data tables.
- Entity-scoped permissions (already exists as `entity_scope`, not touched).
- Delete-level granularity beyond what `accounting_user_module_permissions.can_delete` already supports (kept as-is, not surfaced in this matrix).

Awaiting approval to implement.