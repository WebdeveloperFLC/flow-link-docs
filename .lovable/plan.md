# Appointment Approval & Confirmation Workflow

End-to-end workflow so both the meeting owner (host) and the requester (visitor) confirm every step, with branded emails, action links, and a complete audit trail.

## 1. Statuses (DB enum expansion)

Extend `calendar_event_status` enum with new values mapped to your spec:

| Spec status | DB value |
|---|---|
| Pending Approval | `pending` (existing) |
| Approved – Awaiting Requester Confirmation | `awaiting_requester` (new) |
| Confirmed by Requester | `confirmed` (new) |
| Declined by Meeting Owner | `declined` (existing, reused) |
| Declined by Requester | `declined_by_requester` (new) |
| Reschedule Requested | `reschedule_requested` (new) |
| Rescheduled – Awaiting Requester Confirmation | `rescheduled_awaiting` (new) |
| Completed | `completed` (existing) |
| Cancelled | `cancelled` (existing) |

`scheduled` is kept as an alias for legacy rows; new flow uses `awaiting_requester` → `confirmed`.

## 2. Schema additions (migration)

`calendar_events` — add columns:
- `meeting_link text` (required when host approves)
- `host_remarks text` (optional decline/approval note)
- `requester_response_at timestamptz`
- `reschedule_proposed_date date`, `reschedule_proposed_start time`, `reschedule_proposed_end time`
- `reschedule_reason text`

`calendar_event_audit` — extend `actor_kind` to allow `host | requester | system`, and add `note text` column for human-readable detail (e.g. "Reschedule requested: prefer afternoons").

`calendar_tokens` — reuse existing table; add new `purpose` values: `confirm`, `reschedule`, `decline`. Tokens are per-event, single-use (add `used_at timestamptz`).

## 3. Edge functions

New (all public, no JWT — token-authenticated):
- `calendar-event-approve` (host, authenticated) — sets meeting link, transitions `pending → awaiting_requester`, issues 3 visitor tokens, queues approval email.
- `calendar-event-decline` (host, authenticated) — `pending → declined` with remarks, queues decline email.
- `calendar-event-reschedule-approve` (host, authenticated) — sets new slot, transitions to `rescheduled_awaiting`, regenerates tokens, queues reschedule-approval email.
- `calendar-visitor-action` (public, token-auth) — single endpoint handling `confirm | decline | reschedule` from email links. Validates token, marks `used_at`, updates status, writes audit, and queues host notification email.

All functions:
- Write `calendar_event_audit` rows with `actor_kind` and `note`.
- Insert `calendar_notifications` rows for in-app host notifications.
- Invoke `send-transactional-email` with appropriate template.

## 4. Email templates (React Email, in `_shared/transactional-email-templates/`)

1. `appointment-approved.tsx` — to requester: title, date/time, duration, host name, meeting link, three buttons (Confirm / Reschedule / Decline) pointing to `/a/<token>?action=…`.
2. `appointment-declined.tsx` — to requester: decline reason.
3. `appointment-reschedule-proposed.tsx` — to requester: new slot + same 3 buttons.
4. `appointment-host-notification.tsx` — to host: requester action summary (confirmed / declined / reschedule requested with reason).

Templates registered in `registry.ts`. Prerequisite: ensure `email_domain--setup_email_infra` has run (will check; run if missing).

## 5. UI changes

**`AppointmentApprovalsPage.tsx`**
- Replace inline Confirm button with an **Approve dialog** requiring a Meeting Link field (URL validation) + optional remarks.
- Decline dialog already exists; pass remarks through.
- Show all non-terminal statuses (not just `pending`): a status filter chip row for `Pending`, `Awaiting Requester`, `Reschedule Requested`.
- For `reschedule_requested`, expose an **Approve new time** dialog (date + start time + end time inputs, sourced from availability).

**Host dashboard / UpcomingMeetingsTable**
- New status badges & colors for the 9 statuses.
- Show meeting link when present.

**Public visitor landing page** (`/a/:token`)
- New lightweight route that hits `calendar-visitor-action` and shows a confirmation screen ("Attendance confirmed", "Meeting declined", "Reschedule request received"). Required so email button clicks land on a branded page rather than a raw function URL.

**Activity log** — extend `AppointmentDetailPage` (or add an Audit tab) to render `calendar_event_audit` rows chronologically with actor + note.

## 6. Internal notifications

Reuse existing `calendar_notifications` table. Each transition inserts a row for the host (or requester if applicable) so the in-app bell + Activity feed surface every action.

## 7. Out of scope

- No calendar provider sync (Google/Outlook event creation).
- No SMS/WhatsApp; email + in-app only.
- No auto-reminder cron beyond what already exists.

## Files touched

**New**
- `supabase/migrations/<ts>_appointment_workflow.sql` (enum + columns + tokens + audit)
- `supabase/functions/calendar-event-approve/index.ts`
- `supabase/functions/calendar-event-decline/index.ts`
- `supabase/functions/calendar-event-reschedule-approve/index.ts`
- `supabase/functions/calendar-visitor-action/index.ts`
- 4 templates under `supabase/functions/_shared/transactional-email-templates/`
- `src/calendar/pages/VisitorActionPage.tsx` (public `/a/:token`)

**Edited**
- `src/calendar/pages/AppointmentApprovalsPage.tsx` (approve dialog with meeting link, reschedule approval dialog, status filter)
- `src/calendar/hooks/useApprovals.ts` (new mutations calling new edge functions)
- `src/calendar/components/UpcomingMeetingsTable.tsx` (new status badges)
- `src/calendar/pages/AppointmentDetailPage.tsx` (audit timeline tab)
- `supabase/functions/_shared/transactional-email-templates/registry.ts`
- `src/App.tsx` route registration for `/a/:token`
