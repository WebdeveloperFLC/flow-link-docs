# Telecaller Workspace — fill the gaps

The current pass added roles, handoffs, chat and timeline plumbing, but a telecaller logging in today still has nowhere to **see their leads**, **dial them**, **log a remark**, or **import a list**. This plan adds the actual day-to-day workspace on top of the tables that already exist (`call_queue_items`, `call_campaigns`, `call_sessions`, `lead_handoffs`, `client_timeline`, `chat_messages`).

No new tables — we reuse what's there. One new column only.

## 1. New page: `/telecaller` (Telecaller workspace)

Tabs:

1. **My Queue** — leads assigned to me, ready to dial
2. **Today's Calls** — `call_sessions` I made today + remarks
3. **Inbox** — handoffs received from counselors / other telecallers (badge count)
4. **Lists** — campaigns I'm assigned to + bulk import

Sidebar entry "Telecaller" visible only to users with `telecaller` or `admin` role.

### My Queue (primary view)

```text
┌─────────────────────────────────────────────────────────┐
│ Next up: Rahul Sharma  •  +91 98xxx  •  Campaign: NZ-Aug │
│ Last remark: "Asked to call after exams" (2 days ago)    │
│ [ Call ]  [ Skip ]  [ Reschedule ]  [ Hand off ]         │
├─────────────────────────────────────────────────────────┤
│ Up next (12)                                             │
│  • Priya M. — never contacted — priority High            │
│  • Arjun K. — callback due today 3pm                     │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

Behavior:
- Pulls `call_queue_items` where `assigned_agent_id = me` and `status in ('queued','retry')`, ordered by `priority desc, next_call_at asc`.
- "Call" → opens a **CallDrawer** (right-side sheet) with the client mini-profile and the existing `CallClientButton` flow (browser SDK). Same drawer hosts the remark form so the rep never leaves the queue.
- "Skip" → bumps `next_call_at` +1h, status `queued`.
- "Reschedule" → date/time picker, sets `next_call_at`, status `scheduled`.
- "Hand off" → opens existing `HandoffDialog`.

### CallDrawer (the in-call panel)

While dialing or after hangup the rep fills:

- **Disposition** (single-select dropdown, seeded list, editable in Masters): `connected`, `no_answer`, `busy`, `wrong_number`, `not_interested`, `callback`, `converted_to_lead`.
- **Remark** (free text, required if disposition = connected / callback).
- **Next action** dropdown (reuses `TASK_LABELS` from `handoffs.ts`).
- **Callback at** (only when disposition = callback).
- **Hand off to counselor** checkbox → opens HandoffDialog pre-filled.

On Save:
- writes `call_sessions` row (already supported)
- writes `client_timeline` events: `call` (with disposition + duration) and `remark` (with the note)
- updates `call_queue_items`: status → `done` / `callback` / `retry`, sets `last_called_at`, `next_call_at`, increments `retry_count`
- if "Hand off" was ticked → `lead_handoffs` row + timeline event (already wired in `pushHandoff`)

### Inbox tab

Lists `lead_handoffs where to_user = me` with task label + note + originating user. Click → opens client. Marks "seen" by writing a tiny `client_timeline` event `handoff_acknowledged` (no schema change needed — timeline is free-form).

### Today's Calls tab

Simple table from `call_sessions` joined to `clients` for today, with disposition and the latest remark from `client_timeline`. Lets the rep edit a remark if they fat-fingered it.

## 2. Lists tab — bulk lead upload

This is the missing "upload data" piece.

UI:
- "Import leads" button → CSV drop zone.
- Required columns: `full_name, phone, country`. Optional: `email, notes, campaign, priority, assigned_to_email`.
- Preview table with row-level errors (missing phone, duplicate phone).
- "Import N rows" button.

Implementation:
- Parse CSV client-side with `papaparse`.
- For each valid row, in a single batched call:
  - upsert `clients` (match by `phone` to avoid dupes; create if new — reuses existing `clients insert scoped` policy)
  - insert `call_queue_items` with `assigned_agent_id` (resolved from email) and `campaign_id` (resolved/created)
  - grant `client_access` to the assigned telecaller so RLS lets them see the client (this is the key glue)
- Show progress + per-row result.
- Visible to admins and any user holding `is_telephony_admin` (already a function). Telecallers see only campaigns where they're assigned.

Campaigns:
- Reuse `call_campaigns` table. Add a tiny "New campaign" inline form (name + assigned_team).
- Bulk reassign: select rows in the queue table → "Reassign to…" dropdown.

## 3. Comments / remarks / team sharing — one consistent surface

Today the pieces exist but aren't surfaced together. We'll standardize on the **client_timeline** as the single source of truth for "what happened on this lead", and the **chat workspace** as the discussion surface:

| Need | Where it lives | Surfaced on |
|---|---|---|
| Per-call remark | `client_timeline` (`event_type='remark'`) + `call_sessions.notes` | CallDrawer + ClientDetail timeline |
| Internal team chat about a lead | `chat_messages` (`channel_type='staff_internal'`) | ClientDetail "Chat" tab (already built) |
| Quick @mention to a teammate | `chat_messages` + a notification row | HandoffBell popover |
| Push lead to counselor | `lead_handoffs` via HandoffDialog (already built) | "Hand off" button on queue + ClientDetail |
| Receive lead from counselor | `lead_handoffs where to_user = me` | Inbox tab + HandoffBell |

Add a **"Add remark" quick action** to ClientDetail that writes a timeline `remark` event without requiring a call session — useful when a rep talks to a lead over WhatsApp etc.

## 4. One DB change only

```sql
ALTER TABLE call_queue_items
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS source text;          -- 'manual' | 'csv' | 'odoo' | 'campaign'
```

Everything else fits existing tables. Realtime is already enabled for `lead_handoffs`, `chat_messages`, `client_timeline`. We'll add `call_queue_items` to the realtime publication so the queue updates live as admins reassign.

## Files to add / edit

New:
- `src/pages/Telecaller.tsx` (tabs container)
- `src/components/telecaller/MyQueueTab.tsx`
- `src/components/telecaller/CallDrawer.tsx` (call + remark + disposition)
- `src/components/telecaller/InboxTab.tsx`
- `src/components/telecaller/TodayCallsTab.tsx`
- `src/components/telecaller/ListsTab.tsx`
- `src/components/telecaller/ImportLeadsDialog.tsx` (CSV)
- `src/components/clients/AddRemarkDialog.tsx`
- `src/lib/telecallerQueue.ts` (queue helpers)
- `src/lib/leadImport.ts` (CSV → upsert client + queue + access grant)

Edit:
- `src/App.tsx` — add `/telecaller` route, gated by `telecaller` or `admin` role
- `src/components/layout/AppLayout.tsx` — sidebar link
- `src/pages/ClientDetail.tsx` — "Add remark" button next to Hand off

Migration: the small `ALTER TABLE` above + add `call_queue_items` to `supabase_realtime`.

## Out of scope for this pass

- Auto-dialer (sequential auto-call) — manual click-to-call is enough for v1
- WhatsApp / SMS templates from the queue
- KPI dashboard for telecallers (calls/day, conversion) — easy follow-up once timeline data exists
- Counselor-side mirror page (their inbox is already the HandoffBell + ClientDetail; we can add a `/counselor` page later if they ask)

If this matches what you had in mind, approve and I'll ship it as one migration + the files above.
