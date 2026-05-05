## Goals

1. Fix the misalignment on the **Team & roles** table (screenshot): the "Access level" select wraps to two lines on long descriptions, pushes the "(you)" tag onto a new line, and visually breaks row alignment.
2. Implement the missing **per-client multi-user access** feature: each assigned user gets independent permissions (view / edit / upload / full), and an individual user grant **overrides** any team-based grant for the same client.

---

## Part A — Fix Users page alignment

File: `src/pages/Users.tsx`

- Restructure the row grid from `grid-cols-12` to a stable layout that prevents wrapping:
  - Make the Access level cell render only the **role label** in the `SelectTrigger` (not the long help description). Move the description into the dropdown items only (already there).
  - Use `truncate` on the trigger text and a fixed-height row (`h-9` trigger inside `items-center` row).
  - Move the "(you)" badge to the **User** column (next to the name) so it never collides with the select.
  - Right-align Actions column with consistent width (`w-12`).
- Result: every row is single-line, columns align cleanly with the header.

## Part B — Per-client multi-user access (individual overrides team)

### B1. Backend / DB

Migration:
- Replace `public.user_client_permission(_uid, _cid)` so that:
  1. Admin → `full`.
  2. Owner / created_by → `full`.
  3. If a row exists in `client_access` for `(client_id, user_id=_uid)` → return that permission **directly** (overrides team, even if lower).
  4. Otherwise, return the **max** permission from team grants where the user is a team member.
  5. Else `null`.
- Keep the existing enum ordering trick (cast via text) but replace the union with the precedence above.

No table changes needed — `client_access` already supports per-user and per-team rows with unique partial indexes.

### B2. Frontend

New file: `src/components/clients/ClientAccessDialog.tsx`
- Triggered from `ClientDetail` page header (visible to admin or client owner only — gated by `useClientPermission().isFull`).
- Lists current per-user grants and per-team grants for the client (joined with `profiles` / `teams`).
- Add user grant: searchable Select of active profiles + permission Select (view / edit / upload / full). Insert into `client_access` (upsert on conflict `(client_id, user_id)`).
- Add team grant: Select of teams the caller can see + permission Select. Upsert on `(client_id, team_id)`.
- Edit permission inline (Select per row) and Remove (delete row).
- Each mutation calls `logActivity("client.access_granted" | "client.access_revoked" | "client.access_changed", "client", clientId, {...})` — reuses existing activity log; no duplication.
- UI clearly indicates: "Individual user permissions override team permissions for this client."

Edit `src/pages/ClientDetail.tsx`
- Import dialog, add `<Button>` "Manage access" with `ShieldCheck` icon in the header `actions` slot, gated by `isAdmin || ownerPerm.isFull`.
- Wire `ClientAccessDialog` open state.

### B3. Validation
- Last-owner protection: cannot remove the only `full` grant if there is no owner — UI disables the action and shows tooltip.
- Self-grant guard: caller cannot lower their own access if it would lock them out (admin bypass).

---

## Files

**New**
- `src/components/clients/ClientAccessDialog.tsx`

**Edited**
- `src/pages/Users.tsx` — fix row layout / alignment.
- `src/pages/ClientDetail.tsx` — add "Manage access" button + dialog mount.
- New migration replacing `user_client_permission` so individual grants override team grants.

No changes to `admin-users` edge function. Activity logging reuses `src/lib/activity.ts`.
