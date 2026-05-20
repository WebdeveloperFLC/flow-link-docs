## Goal

Add a visible **Institutions access** card on the Team & Roles page (`/users`) — mirroring how Commissions is surfaced — so admins can see at a glance who has Institutions access and grant / revoke it in one click, without opening the full Module access dialog.

Also add a matching **Commissions access** card for symmetry, since the user expects the two to live side-by-side.

## What the user will see

On `/users`, above the existing team table, two new cards in a 2-column grid:

```text
┌────────────────────────────┐  ┌────────────────────────────┐
│ Institutions access        │  │ Commissions access         │
│ Who can view / manage      │  │ Who can view / manage      │
│ institutions, programs.    │  │ commissions and claims.    │
│                            │  │                            │
│ • Alice  [View ▼] Revoke   │  │ • Alice  [Edit ▼] Revoke   │
│ • Bob    [Edit ▼] Revoke   │  │ • Carol  [View ▼] Revoke   │
│ + Grant access to user…    │  │ + Grant access to user…    │
└────────────────────────────┘  └────────────────────────────┘
```

Each card:
- Lists every active user who currently has `view` or higher on that module (admins shown as locked "Full access" chip).
- Per row: a small **View / Edit / Delete** dropdown to change the level, and **Revoke** to clear that module's permissions.
- A **Grant access** button that opens a popover with a searchable user picker and a level select.
- Empty state: "No one has access yet. Click Grant access to add a teammate."

This is purely a shortcut over the existing `user_module_permissions` table — no new schema.

## Files to change / add

1. **New** `src/components/users/ModuleAccessCard.tsx`
   - Props: `module: "institutions" | "commissions"`, `title`, `description`, `profiles`, `roles`, `onChanged`.
   - Loads all rows from `user_module_permissions` where `module = props.module` on mount; subscribes to a refresh callback after writes.
   - Renders the list described above using `Card`, `Badge`, `DropdownMenu`, `Popover`, `Command` (search).
   - Write helpers wrap `saveUserPermissions` from `@/lib/modulePermissions` (only touching the one module's row via a focused upsert on `user_module_permissions`), with `logActivity("user.module_access_changed", ...)`.

2. **Edit** `src/pages/Users.tsx`
   - Import `ModuleAccessCard`.
   - Render two cards in a `grid md:grid-cols-2 gap-4 mb-4` block between the "Add new user" button row and the team `Card` table.
   - Pass `profiles` and a `refresh` callback (reuses existing `load()`).

3. **Edit** `src/lib/modulePermissions.ts`
   - Export a small helper `saveSingleModulePermission(userId, module, level)` that upserts one row only (so the card doesn't need to fetch+rewrite the full permission map). Implements view/edit/delete implication rules already used in the dialog.

No other files change. No DB migration, no edge-function change, no routing change.

## Out of scope

- No new role (`institution_admin` is not added).
- No changes to the existing Module access dialog, Add user dialog, or sidebar gating.
- No changes to Accounting users page.
