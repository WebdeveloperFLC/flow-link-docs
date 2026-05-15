## Goal

Restrict the Accounting module so only:
1. CRM **admins** (role `admin` in `user_roles`), AND
2. Users who have an **ACTIVE** row in `accounting_users` (any accounting role)

…can see the Accounting nav section and open any `/accounting/*` route. Everyone else gets redirected away.

Bootstrap stays intact: while `accounting_users` is empty, any signed-in user can still reach `/accounting/settings/users` to seed the first Super Admin (matches existing `is_accounting_admin()` logic).

## Approach

Add a single client-side gate that wraps every accounting route + hides the sidebar section. No DB changes (RLS for `accounting_users` is already correct; the rest of accounting is mock data today, so route-level + UI-level gating is the right layer).

### 1. New hook `src/accounting/hooks/useAccountingAccess.ts`

- Inputs: `useAuth()` (for `user`, `isAdmin`, `loading`).
- Queries `accounting_users` once per session for the current `auth_user_id`:
  - `select id, role, status` where `auth_user_id = user.id`.
- Also checks bootstrap: `select id` from `accounting_users` limit 1 — if zero rows, bootstrap mode is active.
- Returns `{ loading, hasAccess, isBootstrap, accountingRole }`.
- `hasAccess = isAdmin || (row.status === 'ACTIVE') || isBootstrap`.

### 2. New wrapper `src/accounting/components/AccountingProtectedRoute.tsx`

- Uses `ProtectedRoute` semantics first (must be signed in).
- Then `useAccountingAccess()`:
  - `loading` → spinner.
  - `!hasAccess` → `<Navigate to="/" replace />` with a `toast.error("You don't have access to Accounting")`.
  - Otherwise render children.

### 3. `src/App.tsx`

- Import `AccountingProtectedRoute`.
- Replace `<ProtectedRoute>` with `<AccountingProtectedRoute>` on every `/accounting/*` route only. CRM routes untouched.

### 4. `src/components/layout/AppLayout.tsx`

- Call `useAccountingAccess()` inside `AppLayout`.
- Render the "Accounting" sidebar header + `accountingNav` block only when `hasAccess` is true. While loading, hide it (avoid flash). CRM nav unchanged.

### 5. No CRM file edits, no new packages, no migrations, no edits to existing accounting files except adding the two new files and the AppLayout/App.tsx wiring. The shared `AppLayout` is in `src/components/layout/` (not under `src/accounting/`), so editing it does not touch any "existing accounting file".

## Files

**Created**
- `src/accounting/hooks/useAccountingAccess.ts`
- `src/accounting/components/AccountingProtectedRoute.tsx`

**Edited**
- `src/App.tsx` — swap `ProtectedRoute` → `AccountingProtectedRoute` on `/accounting/*` routes.
- `src/components/layout/AppLayout.tsx` — conditionally render the Accounting nav section.

## Behavior summary

| User | Sees Accounting in sidebar? | Can open `/accounting/*`? |
|---|---|---|
| Not signed in | No | Redirect to `/auth` |
| Signed in, CRM admin | Yes | Yes |
| Signed in, ACTIVE in `accounting_users` | Yes | Yes |
| Signed in, SUSPENDED / no row, table not empty | No | Redirect to `/` |
| Signed in, table empty (bootstrap) | Yes | Yes — so first Super Admin can be seeded |

Confirm and I'll implement.