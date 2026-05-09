# Telecallers Module

Adapted from `telecallers_module.docx` to this project's stack (Lovable Cloud / Supabase + RLS + Realtime + React/Vite/shadcn). The doc shows raw Express/Knex; we replace those with Supabase tables, RLS policies, and direct client SDK calls (no Express).

## Scope

1. **Roles**: add `telecaller` and `counselor` to `app_role` enum (admin and viewer already exist).
2. **Lead handoffs**: one log table covering all 4 directions (TC↔CO, TC↔TC, CO↔CO) with optional task label and free-text note.
3. **Chat — 4 channel types**:
   - `staff_internal` — per-client, hidden from client
   - `staff_client` — per-client, client-visible (future client portal)
   - `direct` — 1:1 staff DM
   - `team_group` — staff group room
4. **Unified client timeline**: append-only event log capturing calls, remarks, handoffs, chat, notes, tasks, files, recordings — surfaced on the client detail page.
5. **UI**:
   - Handoff modal on client detail (assign-to + remark + task + note)
   - Chat workspace tab on client detail (Internal + Client threads side-by-side)
   - Top-nav "Messages" page for DMs and team groups
   - Realtime updates via Supabase channels

## Out of scope (this pass)

- Client-facing portal for `staff_client` thread (we store + render staff side; client UI is later)
- File attachments inside chat (text only for v1; files already live in client docs)
- Bulk telecaller assignment UI / dialer queue rework (telephony module already exists)

## Database (single migration)

```sql
-- 1. Extend roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'telecaller';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'counselor';

-- 2. lead_handoffs
CREATE TABLE lead_handoffs (
  id uuid PK,
  client_id uuid REFERENCES clients,
  from_user uuid REFERENCES auth.users,
  to_user   uuid REFERENCES auth.users,
  from_role app_role,
  to_role   app_role,
  direction text CHECK (direction IN ('tc_to_co','co_to_tc','tc_to_tc','co_to_co')),
  note text,
  task_label text,
  created_at timestamptz DEFAULT now()
);

-- 3. chat_channels (DM + team_group rooms only)
CREATE TABLE chat_channels (
  id uuid PK, type text CHECK (type IN ('direct','team_group')),
  name text, created_by uuid, created_at timestamptz DEFAULT now()
);
CREATE TABLE chat_channel_members (
  channel_id uuid, user_id uuid, PRIMARY KEY(channel_id,user_id)
);

-- 4. chat_messages (all 4 types)
CREATE TABLE chat_messages (
  id uuid PK,
  channel_type text CHECK (channel_type IN ('staff_internal','staff_client','direct','team_group')),
  client_id uuid NULL REFERENCES clients,
  channel_id uuid NULL REFERENCES chat_channels,
  sender_id uuid REFERENCES auth.users,
  sender_type text CHECK (sender_type IN ('staff','client')) DEFAULT 'staff',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. client_timeline
CREATE TABLE client_timeline (
  id uuid PK, client_id uuid REFERENCES clients,
  event_type text,         -- 'call' | 'remark' | 'handoff' | 'chat' | 'note' | 'task' | 'file' | 'recording'
  actor_id uuid, summary text, metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

RLS:
- `lead_handoffs`, `client_timeline`: SELECT/INSERT gated by `can_view_client` / `can_edit_client`.
- `chat_messages` for `staff_internal`/`staff_client`: gated by `can_view_client`.
- `chat_messages` for `direct`/`team_group`: only members of that `channel_id` (via `chat_channel_members`).
- `chat_channels` / `chat_channel_members`: visible to members; created_by can add members.
- Add tables to `supabase_realtime` publication.

## Frontend

- `src/lib/handoffs.ts` — `pushHandoff`, `listHandoffs(clientId)`
- `src/lib/chat.ts` — `sendMessage`, `listMessages`, `createDM`, `createGroup`, `subscribe(channelKey)`
- `src/lib/timeline.ts` — `listTimeline(clientId)` + helper to append events
- `src/components/clients/HandoffDialog.tsx` — assign to user (grouped by role), remark dropdown (existing `lead_remarks` if present, else free text), task label dropdown, note
- `src/components/clients/ClientChatWorkspace.tsx` — two-column UnifiedChat (internal + client)
- `src/components/clients/ClientTimelineCard.tsx` — chronological event list
- `src/components/chat/UnifiedChat.tsx` — generic chat UI for any channelType
- `src/pages/Messages.tsx` — DM + team groups list, new route `/messages` in `App.tsx` + `AppLayout` nav link
- Wire HandoffDialog + ClientChatWorkspace + ClientTimelineCard into `ClientDetail.tsx`

## Technical notes

- The doc's Express/Knex code is illustrative — we call Supabase directly from React (no edge functions needed for v1).
- Direction is derived client-side from `from_role`+`to_role` before insert.
- Realtime: one Supabase channel per chat key (`client:<id>:internal`, `client:<id>:client`, `channel:<id>`).
- Dedupe DMs: before insert, query `chat_channels` joined twice on `chat_channel_members` for the two user_ids with `type='direct'`.
- `client_timeline` is append-only; UI never edits past events.
- Role assignment for existing users: admins assign roles via the existing `Users` page (will surface the two new role options automatically once enum is extended).

## Open questions

1. Should `staff_internal` be visible to telecallers, or restricted to counselors+admin? (Doc shows it's debatable — defaulting to *all staff with client access can read*.)
2. `lead_remarks` table — does it already exist? If not, free-text remark only for v1.

If you confirm, I'll run the migration and ship the UI in the same pass.
