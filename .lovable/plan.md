# Phase 5 — CRM Integration, Approval Workflow, Analytics & RBAC

Builds on existing Calendar Foundation (`calendar_events`, `calendar_meeting_types`, `calendar_profiles`, `calendar_participants`, `calendar_internal_notes`, `calendar_event_audit`, `calendar_notifications`, `calendar_tokens`). Status enum already has all six required values. CRM tables in scope today: `leads` and `teams` / `team_members`. Other CRM entities (contacts/students/companies/opportunities) are referenced as generic links for forward-compat.

---

## 1. Database (additive migrations only)

### 1a. Meeting Types extension
Add to `calendar_meeting_types`:
- `slug citext` (unique per user_id) — pattern `^[a-z0-9]+(-[a-z0-9]+)*$`
- `booking_window_days int default 30`
- `requires_approval boolean default false`
- `category text` (Consultation, Counselling, Demo, Interview, Vendor, Internal, Follow-Up, Custom)
- `reservation_ttl_minutes int default 10`
- Backfill slug from `meeting_name`.

### 1b. Booking slug history (legacy redirect)
New table `calendar_slug_history`:
- `user_id`, `old_slug citext`, `new_slug citext`, `changed_at`
- Trigger on `calendar_profiles` UPDATE captures slug changes.
- Trigger on `calendar_meeting_types` UPDATE captures meeting slug changes (with `meeting_type_id`).

### 1c. CRM linking
New table `calendar_event_crm_links`:
- `event_id`, `entity_type` (lead|contact|student|opportunity|company|employee), `entity_id uuid`, `is_primary boolean`, `linked_automatically boolean`
- Unique (event_id, entity_type, entity_id).

### 1d. Slot reservation
New table `calendar_slot_reservations`:
- `event_id` (1:1), `expires_at timestamptz`, `released boolean default false`
- Function `fn_release_expired_reservations()` invoked on each booking write + scheduled via `pg_cron` every minute, sets matching `pending` events to `declined` with reason "Reservation expired".

### 1e. Branding (company-wide)
New table `calendar_company_branding` (single row, admin-managed):
- `company_name`, `company_logo_url`, `primary_color`, `secondary_color`, `footer_text`, `terms_url`, `privacy_url`, `booking_page_intro`.
- New storage bucket `calendar-company-branding` (public).

### 1f. Round-robin scaffolding (architecture only)
Add to `calendar_meeting_types`:
- `team_id uuid references teams(id)`
- `round_robin_enabled boolean default false`
- `assignment_strategy text default 'fixed'` (fixed|round_robin)
No automation in this phase.

### 1g. Activity feed view
View `v_calendar_activity_feed` joining `calendar_event_audit` + `calendar_events` + primary participant for filterable feed.

### 1h. RLS / permissions
- All new tables: owner + admin policies via existing `has_role`.
- Manager role: new SECURITY DEFINER helper `fn_user_in_manager_team(_user uuid)` returning team ids; new policies on `calendar_events`, `calendar_meeting_types`, `calendar_profiles` allowing `SELECT` when target `user_id` belongs to a team the caller manages.
- Public visitor portal access goes through edge functions using `calendar_tokens` (no client-side reads of `calendar_events` by anon).

### 1i. Reference number
Already exists (`event_reference`, format `APT-YYYYMMDD-000000`). Confirm trigger; surface in UI everywhere.

---

## 2. Edge Functions (new)

All under `supabase/functions/`, CORS enabled, JWT-validated except public booking ones.

- `book-appointment` — public. Validates slot, creates `calendar_events` (status=`pending`), participant, slot reservation, runs CRM auto-match (email/mobile → `leads`; otherwise inserts new lead), inserts CRM link, emits notifications + audit, returns `secure_token`.
- `visitor-portal` — public. Token-authenticated read/reschedule/cancel. Path: `/appointment/{token}`.
- `approve-appointment` / `decline-appointment` — host/admin only. Transitions status, releases reservation, sends notification.
- `release-expired-reservations` — invoked by pg_cron http hook OR uses DB function only (preferred: DB function on schedule, no edge needed).
- `export-report` — generates CSV/Excel/PDF given report type + filters; admin or manager scoped.

---

## 3. Frontend modules (`src/calendar/`)

### Pages
- `MeetingTypesPage.tsx` (`/calendar/meeting-types`) — CRUD list with slug, duration, category, approval toggle, color, active toggle, per-type booking URL with copy button.
- `MeetingTypeEditor.tsx` — full settings form per type.
- `VisitorPortalPage.tsx` (`/appointment/:token`, public, no auth) — view / reschedule / cancel.
- `PublicBookingPage.tsx` (`/book/:slug` and `/book/:slug/:meetingSlug`, public) — branded landing, slot picker, booking form (with visitor notes), success screen showing reference + portal link. Handles legacy slug redirects via `calendar_slug_history`.
- `AppointmentApprovalsPage.tsx` (`/calendar/approvals`) — pending queue, bulk approve/decline.
- `AnalyticsDashboardPage.tsx` (`/calendar/analytics`) — metric cards, charts (Recharts), filters; admin sees org-wide, standard user sees self only, manager sees team scope.
- `ReportsPage.tsx` (`/calendar/reports`) — pick report type + filters, export CSV/XLSX/PDF.
- `CompanyBrandingPage.tsx` (`/calendar/branding`, admin-only) — branding form + logo upload.
- `ActivityFeedPage.tsx` (`/calendar/activity`) — searchable/filterable feed.

### Components
- `MeetingTypeCard.tsx`, `MeetingTypeBookingLinkRow.tsx`
- `SlugInput.tsx` — live validation, conflict suggestions (server RPC `fn_suggest_slug`).
- `ApprovalDialog.tsx`, `DeclineDialog.tsx`
- `CrmLinksPanel.tsx` — shown on `AppointmentDetailPage`; search/attach lead/contact, primary toggle, auto-match badge.
- `VisitorNotesSection.tsx` + reuse existing `InternalNotes`.
- `ActivityFeedItem.tsx`
- `AnalyticsMetricCard.tsx`, `BookingFunnelChart.tsx`, `MeetingTypeMixChart.tsx`, `UserPerformanceTable.tsx`
- `ReportExportDialog.tsx`
- `BrandingForm.tsx`, `BrandedBookingLayout.tsx` (used by public pages)

### Hooks (`src/calendar/hooks/`)
- `useMeetingTypes.ts` (extends existing editor; CRUD + slug check)
- `useApprovals.ts`
- `useCrmLinks.ts` (search leads, attach/detach)
- `useAnalytics.ts` (range + scope-aware queries)
- `useBranding.ts`
- `useActivityFeed.ts`
- `useVisitorPortal.ts` (token-based, calls edge function)
- `usePublicBooking.ts` (slot listing + book + slug resolve)

### Lib
- `slugUtils.ts` — client validation, suggestion fallback
- `reportingApi.ts` — wraps `export-report`
- `permissions.ts` — `useCurrentRole()` (admin / manager / user), `canManageOthers()`, etc.

### Routing
Register all new routes in `src/App.tsx`. `/book/*` and `/appointment/*` are public; everything under `/calendar/*` stays `ProtectedRoute`. Admin-only routes wrapped with an `AdminRoute` guard.

### Sidebar
Extend `AppLayout` calendar nav with: Meeting Types, Approvals, Analytics, Reports, Activity, Branding (admin), in addition to existing Dashboard and Settings.

---

## 4. Permissions matrix (enforced in RLS + UI)

- **Admin**: full CRUD across all calendar tables, branding, analytics, reports.
- **Manager**: SELECT on team members' events/meeting types/profiles; approve/decline events of team members; team-scoped analytics & reports.
- **Standard user**: only own data; approve/decline only own events.
- **Visitor (anon, token)**: view/reschedule/cancel via edge functions only.

---

## 5. Acceptance criteria

- Create multiple meeting types per user with unique per-user slug; each generates `/book/{userSlug}/{meetingSlug}` and works publicly.
- Changing a user or meeting slug keeps old URLs working via `calendar_slug_history` lookup + 301-style client redirect.
- Submitting a booking on an approval-required type: status=`pending`, slot reserved, CRM link created (matched lead or new lead), reference returned, visitor portal URL emailed.
- Pending reservation auto-released after `reservation_ttl_minutes` (default 10).
- Approval queue shows pending items scoped to role; confirm/decline updates status, audit, notifications.
- Visitor portal at `/appointment/{token}` allows view/reschedule/cancel without login.
- Appointment detail shows CRM links, visitor notes, internal notes, full timeline, reference number, activity feed entries.
- Analytics dashboard: standard user sees personal numbers only; admin sees org-wide; manager sees team scope.
- Reports export to CSV/XLSX/PDF respecting scope.
- Admin can edit company branding; branding renders on all public booking and portal pages.
- All new tables have GRANTs + RLS; visitor flows go through edge functions only.

---

## 6. Out of scope (deferred)

- Round-robin assignment logic (only schema added).
- New CRM entity tables (contacts/students/opportunities/companies) — `calendar_event_crm_links.entity_type` is open-ended so they plug in later.
- WhatsApp / email template editor changes (uses existing notifications pipeline).
- Realtime updates on analytics dashboards.

## Technical notes

- No new npm deps (Recharts already present; for XLSX use existing `xlsx` if present, else add). PDF export via `jspdf` + `jspdf-autotable` (add if not present).
- Slug suggestions: PL/pgSQL function appends `-2`, `-3`, … until free.
- Slot conflict detection reuses existing `fn_calendar_events_validate` trigger.
- Public pages use anon Supabase client + edge functions; no RLS bypass.
