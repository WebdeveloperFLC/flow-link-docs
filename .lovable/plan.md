# Default & Manual Team Member Access

Let any client owner ("primary user") share access without admin involvement, in two ways:

1. **Default team members** — added once globally; automatically inherit a chosen permission on **every** client owned by the primary user (existing and future).
2. **Manual team members** — added per individual client via the existing access dialog; only see that one client.

Both flows let the primary user pick `view` / `edit` / `upload` / `full` and change it anytime.

---

## 1. Database changes (migration)

### New table `default_team_members`

```
id          uuid pk default gen_random_uuid()
owner_id    uuid not null   -- primary user granting access
member_id   uuid not null   -- team member receiving access
permission  client_permission not null default 'view'
created_at  timestamptz not null default now()
unique (owner_id, member_id)
```

RLS:
- SELECT: `owner_id = auth.uid() OR member_id = auth.uid() OR has_role(auth.uid(),'admin')`
- INSERT/UPDATE/DELETE: `owner_id = auth.uid() OR has_role(auth.uid(),'admin')`

### Update `public.user_client_permission(_uid, _cid)`

Add a branch that consults `default_team_members` for the client's owner. New precedence (highest wins):

```
admin                         → full
owner_id / created_by         → full
client_access (user)          -- explicit per-client user grant
default_team_members          -- global grant from owner
client_access (team)          -- existing team-based grant
```

When multiple sources apply, return the highest rank (`full > upload > edit > view`).

No trigger needed — permission is computed live, so existing and future clients automatically inherit. Removing/changing a default row instantly propagates.

### Downstream
All existing tables (clients, client_documents, case_people, binders, …) already gate via `can_view_client / can_edit_client / can_upload_client`, which call `user_client_permission`. No per-table policy edits required.

---

## 2. UI changes

### A. Per-client manual sharing — `src/pages/ClientDetail.tsx`
- Compute `isOwner = client.owner_id === user.id || client.created_by === user.id`.
- Show **Manage access** button when `isAdmin || isOwner` (currently admin-only).

`ClientAccessDialog` already supports per-user grants and the existing `owners manage client_access` RLS allows owners to write — no change needed inside the dialog.

### B. Global default team members — new component
`src/components/users/DefaultTeamMembersCard.tsx`:
- Lists current default members (`default_team_members` joined with `profiles`).
- Add row: searchable select of profiles + permission select + Add.
- Inline permission `Select` per row; trash icon to remove.
- Helper text: *"These users automatically get this permission on every client you own."*
- Logs activity (`team.default_added/changed/removed`) via `logActivity`.

Mounted on `src/pages/Settings.tsx` in a new "Team access" section, visible to every authenticated user (no admin gate).

---

## 3. Files

**New**
- `supabase/migrations/<ts>_default_team_members.sql` — table, RLS, updated `user_client_permission`.
- `src/components/users/DefaultTeamMembersCard.tsx`

**Edited**
- `src/pages/ClientDetail.tsx` — show Manage access button to owners.
- `src/pages/Settings.tsx` — render `DefaultTeamMembersCard`.

`src/integrations/supabase/types.ts` regenerates automatically.

---

## 4. Behavior summary

| Scenario | Result |
|---|---|
| Owner adds Bob as default `edit` | Bob can view/edit all of owner's clients. |
| Owner later grants Bob `full` on Client X via Manage access | Bob has `full` on X, `edit` elsewhere. |
| Owner changes Bob's default to `view` | Bob immediately drops to view on all clients without an explicit grant. |
| Owner removes Bob from defaults | Bob loses access except where explicit `client_access` rows exist. |
| Owner manually adds Carol to Client Y only | Carol sees only Y at the chosen permission. |
