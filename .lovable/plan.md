# Plan: Multi-role users + separate Institutions / Commissions access

## Goals
1. **Commissions access** should be a per-user toggle (like Institutions), independent of the `commission_admin` role.
2. **Institutions access** stays a per-user toggle (already wired) — make it more discoverable on the Users page.
3. A user can hold **multiple roles at once** (e.g. Counselor + Documentation + Telecaller), not just one.

## Changes

### 1. Add "Commissions" as a permissioned module
`src/lib/modulePermissions.ts`
- Add `{ key: "commissions", label: "Commissions & Claims", description: "Partner commissions, claims, agreements, invoicing." }` to `CRM_MODULES`.
- `ROLE_DEFAULTS`: grant `admin` and `commission_admin` full access; everyone else `NONE`.

`src/institutions/components/CommissionsProtectedRoute.tsx`
- Use `useModulePermission("commissions")`. Allow when `isAdmin || isCommissionAdmin || canView` (and `canEdit` when `requireEdit`). Update copy to mention "Team & roles → Permissions → Commissions".

`src/components/layout/AppLayout.tsx`
- Gate the Commissions sidebar entry on `isAdmin || isCommissionAdmin || canViewCommissions` using the hook.

### 2. Multi-role selection on the Users page
`src/pages/Users.tsx`
- Replace the single-select Role dropdown with a **multi-select popover** (checkbox list of `ALL_ROLES`), showing all assigned roles as small chips in the Role column.
- Rewrite `setRole` → `setRoles(uid, nextRoles[])`:
  - Diff against existing roles, insert missing rows, delete removed rows in `user_roles`.
  - Preserve last-admin guard: prevent removing `admin` from the only remaining admin.
  - Log `user.roles_changed` activity.
- `UserPermissionsDialog` already accepts a single `role` for defaults — pass the **highest-privilege** role from the user's set (priority: admin > commission_admin > counselor > documentation > telecaller > viewer) so "Reset to role defaults" stays useful.
- Update footer help text: clarify that roles are additive and that Institutions/Commissions access is granted per-user via **Module access**.

### 3. Add-user dialog
`src/components/users/AddUserDialog.tsx` + edge function `admin-users` (action `create`)
- Replace single role select with a multi-select (checkbox list); send `roles: AppRole[]`.
- In the edge function `create` handler, accept either `role` (back-compat) or `roles[]` and insert one `user_roles` row per role.

### 4. Minor copy
`src/pages/Users.tsx` footer paragraph — mention both Institutions and Commissions per-user toggles.

## Out of scope
- No DB schema change (user_roles already supports multiple rows per user — `unique(user_id, role)`).
- No RLS change.
- No changes to accounting module access.

## Technical notes
- `useAuth().isCommissionAdmin` stays as-is (role-based) so commission_admin role still implicitly grants access; the new module toggle is an additive grant for non-commission_admin users.
- `useModulePermission` cache is keyed by user id; no invalidation needed for this change since admins editing other users don't read their own perms.
