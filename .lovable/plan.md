# Fix: team members can't be granted access to Institutions

## Root cause

Two places hard-gate Institutions to `isAdmin`, ignoring the per-user permission system that already exists for the `institutions` module:

1. `src/institutions/components/InstitutionsProtectedRoute.tsx` — renders "Access restricted" unless `isAdmin`.
2. `src/components/layout/AppLayout.tsx` (~line 193) — the entire Institutions sidebar group is wrapped in `{isAdmin && …}`, so non-admins never even see the nav links.

The plumbing for per-user access is already in place:
- `CRM_MODULES` in `src/lib/modulePermissions.ts` already includes `{ key: "institutions", label: "Institutions" }`.
- `user_module_permissions` table + `fetchUserPermissions` / `saveUserPermissions` already support view / edit / delete for it.
- `UserPermissionsDialog` (opened from **Users**) already renders Institutions as a togglable row.
- Role defaults already grant `counselor` and `documentation` view-level on institutions.

So the admin **already can** grant access from Users → Permissions; the two guards above just refuse to honor it.

## Fix

### 1. New hook — `src/hooks/useModulePermission.ts`

Thin wrapper around `fetchUserPermissions` keyed to the current `auth.uid()`:

```ts
useModulePermission("institutions") → { canView, canEdit, canDelete, loading }
```

- Admins short-circuit to `{ true, true, true }`.
- Result is cached per (userId, module) for the session and re-fetched on `onAuthStateChange`.

### 2. `InstitutionsProtectedRoute` — honor permissions

Add an optional prop `requireEdit?: boolean` (default false → view). Replace the `isAdmin`-only gate with:

```
allowed = isAdmin || (requireEdit ? canEdit : canView)
```

Show the same "Access restricted" card otherwise, but with copy that points the user to "ask an admin to grant Institutions access in Users → Permissions".

### 3. `App.tsx` route guards

Keep all 4 institutions routes wrapped in `InstitutionsProtectedRoute`. No prop change needed for now — view-level is enough to load the pages; create/edit/delete buttons inside the pages enforce edit/delete separately (step 5).

### 4. `AppLayout` sidebar — show Institutions group for any permitted user

Replace `{isAdmin && …}` around the Institutions block with a `canViewInstitutions` check from the new hook. Admins keep full visibility; team members with at least view access see the group with the same three links.

### 5. Edit/delete gating inside the Institutions pages

Use the same hook to hide / disable mutating affordances when `!canEdit`:

- `src/institutions/pages/InstitutionsListPage.tsx` — "Add institution", bulk actions, row edit buttons.
- `src/institutions/pages/InstitutionDetailPage.tsx` — save / add-program / add-campus / add-promotion / delete buttons in `OverviewPanel`, `PromotionsPanel`, `CampaignsPanel`, `AgreementsPanel`.
- `src/institutions/pages/CourseReviewPage.tsx` and `AiSuggestionsPage.tsx` — accept/reject suggestion actions require `canEdit`.

Read-only viewers still see the full data; only write affordances are hidden.

### 6. Users page copy tweak

`src/pages/Users.tsx` line 237: the "Administrator manages …" paragraph implies Institutions is admin-only. Reword to "Institutions access is granted per user from the Permissions dialog (View / Edit / Delete)" so admins know how to delegate.

## Out of scope

- No DB / RLS changes — `user_module_permissions` already covers `institutions`.
- Commissions module access (separate `commission_admin` role + its own protected route) — untouched.
- No new role; we use the existing per-module grants.

## Result

After this change an admin opens **Users → ⋯ → Permissions** on any team member, toggles **Institutions → View / Edit**, saves, and that member immediately:

- Sees the Institutions group in the left nav.
- Can open Institutions, Course Review, AI Suggestions, and institution detail pages.
- Can add institutions, programs, campuses, agreements, promotions, etc. when granted **Edit**; delete when granted **Delete**.
