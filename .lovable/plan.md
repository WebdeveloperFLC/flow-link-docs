
# Calendar Module — Backend Architecture

Backend-only build. No UI. Existing CRM (`auth.users`, `profiles`, RLS helpers like `has_role`) is reused — nothing existing is modified. Delivered as a single Supabase migration plus one edge function for the public booking endpoint.

## Scope confirmation

- Adds 8 new tables in `public` schema, all prefixed `calendar_`.
- Adds 1 enum (`calendar_event_status`), several RPC helpers, triggers, indexes, RLS policies, GRANTs.
- Adds 1 edge function `calendar-public-booking` for unauthenticated visitor booking via slug + token.
- No existing table, function, trigger, policy, RPC, or edge function is altered.
- Frontend = none in this phase (per request).

## Tables

All have `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` (where listed). Every table: GRANT to `authenticated` + `service_role`; `anon` only where public booking needs read.

| Table | Purpose | Notable columns / constraints |
|---|---|---|
| `calendar_profiles` | 1:1 with CRM user | `user_id uuid unique → auth.users`, `booking_slug citext unique`, `timezone text not null`, `is_active bool default true`, photo/bio/company fields |
| `calendar_meeting_types` | Per-user meeting templates | `user_id`, `meeting_name`, `slot_duration_minutes int check >0`, `buffer_minutes int check >=0`, `color_code text`, `is_active` |
| `calendar_availability` | Recurring weekly slots | `user_id`, `day_of_week smallint check 0..6`, `start_time time`, `end_time time`, check `start_time < end_time`, `is_active` |
| `calendar_unavailable_dates` | Holidays/leave | `user_id`, `unavailable_date date`, `reason text`, unique(user_id, unavailable_date) |
| `calendar_events` | Bookings | `event_reference text unique`, `user_id`, `meeting_type_id`, `event_date date`, `start_time time`, `end_time time`, `host_timezone`, `visitor_timezone`, `status calendar_event_status default 'pending'`, `purpose`, `notes` |
| `calendar_participants` | Visitor info | `event_id`, `full_name`, `email`, `mobile_number`, optional company/designation |
| `calendar_tokens` | Visitor secure links | `event_id`, `token text unique` (random 32-byte base64url), `expires_at timestamptz`, `purpose text` (reschedule/cancel/view) |
| `calendar_notifications` | Notification log | `event_id`, `notification_type text`, `recipient_email`, `delivery_status`, `sent_at` |

Enum: `calendar_event_status` = `pending | scheduled | completed | cancelled | declined`.

## Indexes

`calendar_profiles(booking_slug)`, `(user_id)`; `calendar_meeting_types(user_id, is_active)`; `calendar_availability(user_id, day_of_week)`; `calendar_unavailable_dates(user_id, unavailable_date)`; `calendar_events(user_id, event_date)`, `(meeting_type_id)`, `(status)`, `(event_date, start_time)`; `calendar_participants(event_id, email)`; `calendar_tokens(token)`, `(event_id)`; `calendar_notifications(event_id, sent_at)`.

## Triggers

- `touch_updated_at` on all tables that have `updated_at` (reuses existing function).
- `trg_calendar_events_assign_reference` BEFORE INSERT → generates `CAL-YYYYMMDD-NNNN` via sequence `calendar_event_ref_seq` reset per day.
- `trg_calendar_events_validate` BEFORE INSERT/UPDATE → enforces: date not in past, ≤ 60 days ahead, duration matches meeting_type, slot inside availability, not on unavailable date, no overlap with another non-cancelled/non-declined event for same user.
- `trg_calendar_events_status_guard` BEFORE UPDATE → validates status transitions (pending→scheduled/declined, scheduled→completed/cancelled; terminal states immutable). Writes audit row.
- `trg_calendar_events_audit` AFTER INSERT/UPDATE → `client_timeline`-style row in new `calendar_event_audit` table (small, internal).

## RPCs (SECURITY DEFINER, search_path=public)

- `calendar_generate_slug(_base text) → text` — slugifies, checks uniqueness, appends `-1/-2/...` until free.
- `calendar_resolve_profile(_slug text) → jsonb` — public read; returns profile + active meeting types (no PII beyond profile).
- `calendar_available_slots(_slug text, _meeting_type_id uuid, _date date) → setof time` — computes free slots from availability − unavailable dates − existing events + buffer.
- `calendar_create_booking(_slug, _meeting_type_id, _date, _start_time, _visitor jsonb, _visitor_timezone, _purpose, _notes) → jsonb` — creates pending event + participant + access token. Callable by `anon` (rate-limited in edge fn).
- `calendar_event_transition(_event_id uuid, _action text) → calendar_events` — host-only; wraps confirm/decline/cancel/complete.
- `calendar_validate_token(_token text) → uuid` — returns event_id if valid + non-expired.

## RLS

- `calendar_profiles`: owner full CRUD. `anon` SELECT only via RPC `calendar_resolve_profile` (no direct table grant to anon).
- `calendar_meeting_types`, `calendar_availability`, `calendar_unavailable_dates`: owner-only CRUD (`user_id = auth.uid()`); admins read all via `has_role`.
- `calendar_events`: owner full; `anon` cannot select; visitor access only through token-validated RPC.
- `calendar_participants`, `calendar_tokens`, `calendar_notifications`: select/insert via owner or service_role; no anon grants.
- All policies use `auth.uid()` direct or existing `has_role` helper — no recursion.

## Edge function `calendar-public-booking`

`verify_jwt = false`. Endpoints (single function, action in body):
- `resolve_profile(slug)`
- `available_slots(slug, meeting_type_id, date)`
- `create_booking(...)`
- `manage_event(token, action)` for visitor reschedule/cancel

Uses anon Supabase client → calls SECURITY DEFINER RPCs. Validates input with Zod. Simple in-memory IP rate limit (best-effort) + future hook for Upstash.

Authenticated host-side operations use existing supabase-js client from the CRM frontend directly against tables / `calendar_event_transition` RPC — no second edge function needed.

## Status workflow (server-enforced)

```text
pending  ──confirm──▶ scheduled ──complete──▶ completed
   │                      │
   ├──decline─▶ declined  └──cancel─▶ cancelled
```

Enforced in `calendar_event_transition` RPC + trigger guard. Terminal states (`completed`, `cancelled`, `declined`) cannot transition further.

## Validation summary (server-side)

Date ≥ today, date ≤ today+60d, duration == meeting_type.slot_duration, slot ∈ availability for that weekday, not in unavailable_dates, no overlapping non-terminal event for host, email + mobile + timezone required on participant insert (NOT NULL + format check).

## Security

- All public access funneled through edge function or SECURITY DEFINER RPCs — direct table grants to `anon` are limited to none.
- Tokens: 32-byte random via `gen_random_bytes(32)` base64url, stored as-is (single-use class), `expires_at` = event end + 24h.
- Audit table `calendar_event_audit(event_id, from_status, to_status, actor_id, actor_kind, at)` populated by trigger.
- Rate limiting: edge function enforces per-IP burst + slug-level booking cap per hour.
- Slug input sanitized in `calendar_generate_slug` (regex `[^a-z0-9-]` stripped, collapsed hyphens).

## Migration / file layout

```text
supabase/migrations/<ts>_calendar_module.sql   -- single migration (schema + grants + RLS + RPCs + triggers + audit)
supabase/functions/calendar-public-booking/
  index.ts                                     -- Deno edge fn (Zod-validated, CORS, action router)
supabase/config.toml                           -- add [functions.calendar-public-booking] verify_jwt = false
docs/system-map/flows/calendar.md              -- new flow doc (tables, RPCs, status diagram)
```

Updates to `docs/system-map/03-backend-map.md` and `04-database-map.md` to list the new tables/edge function/cron-free design (no cron needed in this phase).

## Out of scope (deferred, but schema-ready)

Google/Outlook sync, team calendars, round-robin, group meetings, video integrations, reminder cron — all fit on top of these tables without schema changes. A future migration would add `calendar_external_accounts`, `calendar_event_external_links`, and a reminders cron job.

## Acceptance

After approval and implementation:
1. Migration applies cleanly; linter shows no new errors on new tables (all RLS enabled, all GRANTs present).
2. `calendar_generate_slug('Yashika Sheth')` returns `yashika-sheth` (and `-1`, `-2` on collision).
3. Inserting a `calendar_events` row outside availability or on an unavailable date raises.
4. `calendar_event_transition` rejects invalid transitions.
5. Edge function `calendar-public-booking` deploys and responds to `resolve_profile` for an active slug without auth.
