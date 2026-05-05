# Auth, Users, Teams & Access Control

Single coordinated change across DB, edge functions, and UI. Reuses the existing `activity_logs` table — no new logging system.

## 1. Login screen (`src/pages/Auth.tsx`)

- Remove the "Create account" tab and signup code. Login is the only panel.
- Add "Forgot password?" link → dialog calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`.
- New public route `/reset-password` (`src/pages/ResetPassword.tsx`):
  - Detects Supabase recovery session, shows New Password + Confirm Password.
  - Strong-password zod (min 8, upper+lower+digit+symbol).
  - `supabase.auth.updateUser({ password })`, then `signOut({ scope: 'others' })` to invalidate other sessions.
- Disable Supabase signups (`disable_signup: true`), enable HIBP leaked-password check, set recovery token lifetime to 900s (15 min).
- Update `handle_new_user` trigger so new accounts default to `viewer` only (no auto-admin promotion).

## 2. Database migrations

```sql
-- profiles: contact + lifecycle
alter table profiles add column first_name text;
alter table profiles add column last_name text;
alter table profiles add column phone text;
alter table profiles add column status text not null default 'active'; -- active|suspended|revoked|deleted
alter table profiles add column suspended_at timestamptz;
alter table profiles add column deleted_at timestamptz;

-- clients: ownership
alter table clients add column owner_id uuid references auth.users(id);
update clients set owner_id = created_by;
create index on clients(owner_id);

-- teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);
create table team_members (
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (team_id, user_id)
);

-- access grants (user OR team, with permission level)
create type client_permission as enum ('view','edit','upload','full');
create table client_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  permission client_permission not null default 'view',
  granted_by uuid references auth.users(id),
  granted_at timestamptz default now(),
  check ((user_id is not null) <> (team_id is not null))
);
```

Security-definer helpers (avoid recursive RLS):

```sql
create or replace function user_client_permission(_uid uuid, _cid uuid)
returns client_permission language sql stable security definer set search_path=public as $$
  select case
    when has_role(_uid,'admin') then 'full'::client_permission
    when exists(select 1 from clients where id=_cid and (owner_id=_uid or created_by=_uid)) then 'full'
    else (
      select max(permission)::text::client_permission from (
        select permission::text from client_access where client_id=_cid and user_id=_uid
        union all
        select ca.permission::text from client_access ca
          join team_members tm on tm.team_id=ca.team_id
         where ca.client_id=_cid and tm.user_id=_uid
      ) p
    )
  end
$$;

create or replace function can_view_client(_uid uuid,_cid uuid) returns boolean
  language sql stable security definer set search_path=public
  as $$ select user_client_permission(_uid,_cid) is not null $$;
create or replace function can_edit_client(_uid uuid,_cid uuid) returns boolean
  language sql stable security definer set search_path=public
  as $$ select user_client_permission(_uid,_cid) in ('edit','upload','full') $$;
create or replace function can_upload_client(_uid uuid,_cid uuid) returns boolean
  language sql stable security definer set search_path=public
  as $$ select user_client_permission(_uid,_cid) in ('upload','full') $$;
```

RLS rewrite — drop the open `using (true)` policies, replace with scoped ones:

- `clients`: SELECT/UPDATE → `can_view_client` / `can_edit_client`. INSERT requires admin/edit role + `owner_id = auth.uid()`. DELETE admin only.
- `client_documents`, `case_people`, `client_profile`, `client_education`, `client_section_settings`, `binders`, `filled_forms`, `questionnaire_instances`, `document_verifications`, `document_fingerprints`, `call_events`: SELECT/UPDATE keyed off `can_view_client` / `can_edit_client(client_id)`; uploads use `can_upload_client`.
- `share_links` (where target is a client): SELECT scoped to `can_view_client(target_id)`.
- `teams`: members + admin can SELECT; admin or `created_by` can manage.
- `team_members`: members of the team can SELECT; admin/team creator can manage.
- `client_access`: SELECT visible to admin, client owner, the granted user, or members of the granted team; INSERT/UPDATE/DELETE limited to admin or client owner.
- `activity_logs`: SELECT scoped to admin OR own logs OR logs whose `entity_id` is a viewable client.
- `profiles`: SELECT remains broad (needed for assignment pickers); admin can UPDATE any profile (lifecycle status); users update their own.

## 3. Edge function — `supabase/functions/admin-users/index.ts`

POST `{ action, ... }`. Verifies caller is admin via JWT + `has_role`. Uses service-role client.

- `create` — validates first/last/email/phone/role; `auth.admin.inviteUserByEmail` (Supabase sends invite/setup link). Upserts `profiles` (name+phone), sets a single `user_roles` row.
- `reset_password` — `auth.admin.generateLink('recovery', email)`.
- `suspend` / `restore` — sets `profiles.status` and `auth.admin.updateUserById({ ban_duration })` to invalidate sessions.
- `revoke` — same as suspend, `status='revoked'`.
- `delete` — soft delete: requires `transfer_to` (uuid) OR `keep=true`. If transfer: reassigns `clients.owner_id`, `clients.created_by`, `binders.generated_by`, `client_documents.uploaded_by`, `client_access.user_id`, `letter_templates.created_by`, removes from teams. Sets `profiles.status='deleted'`, `deleted_at=now()`, then `auth.admin.deleteUser`.
- `transfer_data` — standalone reassignment.
- `update` — edit first/last/phone/role.

Guards: cannot demote/delete the last admin; email uniqueness via `auth.admin.listUsers`.

Each action inserts an `activity_logs` row (`action`, `entity_type='user'`, `entity_id`, `details`) — no new tables.

## 4. Frontend

### `src/pages/Users.tsx` (Team & roles overhaul)
- "+ Add New User" → `AddUserDialog` (First Name, Last Name, Email, Phone, Role).
- Status badge column (Active green / Suspended orange / Revoked red).
- Per-row actions DropdownMenu: Edit · Reset Password · Suspend/Restore · Revoke · Delete · Transfer Data.
- Delete/Suspend/Revoke open `HandleUserDataDialog`: Transfer-to-user OR Keep-with-same-user.

### New `src/pages/Teams.tsx` + sidebar entry
- List teams; "+ New Team" dialog. Detail: members list + add/remove (multi-select from profiles). Admin-managed; team creators can manage their teams.

### Client visibility
- RLS now restricts everything; `Clients.tsx`, `Dashboard.tsx`, search and reports automatically scope down. Audit those pages to remove "all clients" assumptions in counts.
- `NewClientDialog`: set `owner_id = auth.uid()` on insert.
- `ClientDetail.tsx`: new "Access" button (admin or owner) → `ClientAccessDialog` to grant users/teams a permission level (View/Edit/Upload/Full) — writes `client_access`.
- New `useClientPermission(clientId)` hook (RPC `user_client_permission`) to gate edit/upload UI.

### `src/contexts/AuthContext.tsx`
- Pull `status` from `profiles`; if `suspended`/`revoked`/`deleted`, force sign-out with toast.

### `src/App.tsx`
- Public route `/reset-password`. Protected route `/teams`.

### `src/components/layout/AppLayout.tsx`
- Add "Teams" link in sidebar.

## 5. Validations & security

- Zod on every form (email, phone required, role required).
- Last-admin guard server-side and client-side.
- Strong-password regex on reset; `signOut({ scope: 'others' })` after change.

## 6. Files

Add: `ResetPassword.tsx`, `Teams.tsx`, `users/AddUserDialog.tsx`, `users/UserActionsMenu.tsx`, `users/HandleUserDataDialog.tsx`, `clients/ClientAccessDialog.tsx`, `hooks/useClientPermission.ts`, `supabase/functions/admin-users/index.ts`.

Edit: `Auth.tsx`, `Users.tsx`, `ClientDetail.tsx`, `NewClientDialog.tsx`, `AuthContext.tsx`, `App.tsx`, `AppLayout.tsx`.

## 7. Out of scope / assumptions

- Reuses `activity_logs` — no new logging tables.
- Existing role enum (`admin`, `counselor`, `documentation`, `viewer`) preserved; "Editor" maps to `counselor`/`documentation`.
- Email delivery uses Supabase's built-in auth mail (invite + recovery). Custom-branded templates can be scaffolded later.
- Ownership transfer is admin-driven; no auto rules.
