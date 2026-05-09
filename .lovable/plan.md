## Client Portal — Full Build (10 Modules)

A separate `/portal/*` shell inside this app for end-clients (the people whose cases the staff manage). Auth uses the existing Supabase auth with a new `client` role; staff CRM remains untouched. Points & payments are tracked internally (no gateway yet).

### 1. Database (one migration)

New enum: `app_role` gets `'client'` added.

New tables (all with RLS, all FK to `public.clients`):

| Table | Purpose / key fields |
|---|---|
| `client_portal_links` | Links an `auth.users.id` to a `clients.id` (one client record may have multiple portal users — applicant, parent). Fields: `user_id`, `client_id`, `relation` ('self' / 'parent' / 'guardian'), `is_primary`. |
| `client_files` | Document checklist row per client. Fields: `document_type`, `file_name`, `file_path` (storage), `status` ('verified'/'pending'/'action_required'/'rejected'/'not_uploaded'), `remarks`, `version`, `uploaded_by`, `verified_by`, `verified_at`. |
| `offers` | Master offers. Fields: `title`, `description`, `discount_type` ('percentage'/'flat'), `discount_value`, `max_discount_amount`, `promo_code`, `valid_from`, `valid_to`, `applicable_services` (text[]), `terms_conditions`, `is_active`. |
| `client_offers` | Offers visible to a specific client. Fields: `client_id`, `offer_id`, `status` ('active'/'used'/'expired'), `used_at`. |
| `referrals` | Fields: `referrer_client_id`, `friend_name`, `friend_email`, `friend_phone`, `status` ('joined'/'pending'/'invalid'), `points_earned`, `joined_client_id`. |
| `credit_wallet` | One row per client. Fields: `client_id` (unique), `total_points`, `available_points`, `points_value_rate` (1.0 normal, 1.5 during offers), `last_updated`. |
| `point_transactions` | Ledger. Fields: `client_id`, `type` ('earned'/'redeemed'/'expired'/'adjusted'), `points`, `points_value_rate`, `description`, `reference_id`, `expires_at`. |
| `point_redemptions` | Fields: `client_id`, `points_redeemed`, `usd_value`, `service_id`, `status` ('pending'/'approved'/'rejected'), `approved_by`, `approved_at`. |
| `client_appointments` | Fields: `client_id`, `title`, `scheduled_at`, `duration_min`, `mode` ('in_person'/'video'/'phone'), `status`, `with_user_id`, `notes`. |
| `client_invoices` | Fields: `client_id`, `invoice_number`, `amount`, `currency`, `status` ('draft'/'sent'/'paid'/'overdue'), `due_date`, `paid_at`, `points_redeemed`, `line_items` (jsonb). |
| `client_notifications` | Fields: `client_id`, `type`, `title`, `body`, `link`, `is_read`, `created_at`. |

Reused existing tables: `client_timeline`, `chat_messages` (`staff_client` channel), `clients`, `client_documents`, `profiles`.

Storage: reuse `client-documents` bucket with new RLS policy allowing the linked portal user to read/write their own folder.

RLS pattern (no recursion):
- Helper: `is_portal_user_for(_uid, _cid)` security-definer function checks `client_portal_links`.
- Clients can `SELECT/INSERT/UPDATE` their own rows; staff (admin/counselor/telecaller) keep full visibility through existing helpers.
- Redemption rules enforced in a `validate_redemption()` trigger: min 50 pts, max 50% of invoice amount, points must not be expired.

Auto-create wallet trigger: on first insert into `client_portal_links`, create `credit_wallet` row.

Point expiry: a SQL function `expire_old_points()` callable from a daily cron (12-month rule).

### 2. Auth & access

- Add `'client'` to `app_role` enum.
- New `/portal/auth` page (sign up + login + Google + forgot password). Signup creates `auth.users` → trigger assigns `client` role (not admin/viewer).
- Staff invites client from `ClientDetail` → "Invite to Portal" button → creates a magic invite that on accept inserts into `client_portal_links` and sets the `client` role.
- Add `/reset-password` route (already required).
- New `<PortalProtectedRoute>` wrapper: requires `client` role, otherwise redirects to `/portal/auth`. Existing `<ProtectedRoute>` should reject `client` role from staff routes.
- New `PortalLayout` with sidebar matching the screenshot's 10 modules.

### 3. Routes & pages (`/portal/*`)

```
/portal/auth                 Login / Signup
/portal                      Dashboard (KPIs + progress + activity + offers + actions)
/portal/application          Application progress & timeline
/portal/files                File Status (checklist, upload, version history)
/portal/chat                 UnifiedChat reused (staff_client channel)
/portal/offers               Active offers + promo codes
/portal/refer                Referral link, friend status, points earned
/portal/payments             Invoices, history, dues
/portal/appointments         Book / view appointments
/portal/notifications        Alerts list
/portal/settings             Profile, password, prefs
```

### 4. Component breakdown (frontend)

- **Layout**: `PortalLayout`, `PortalSidebar`, `PortalHeader` (avatar + bell with unread count from `client_notifications`).
- **Dashboard**: `PortalKpiTile`, `ApplicationProgressStepper`, `FileStatusDonut` (recharts), `RecentActivityList`, `ActiveOffersStrip`, `CreditPointsCard`, `QuickActionsBar`.
- **Files**: `FileChecklistTable`, `UploadFileDialog`, `FileVersionHistoryDialog`. Drives `client_files`.
- **Offers**: `OfferCard`, `RedeemPromoDialog`.
- **Refer & Earn**: `ReferralLinkCard`, `InviteFriendDialog`, `FriendsList`, `EarningRulesPanel`.
- **Payments**: `InvoicesTable`, `InvoiceDetailDialog`, `RedeemPointsAtCheckoutDialog`. Staff marks paid manually from a new `Admin > Invoices` tab on `ClientDetail`.
- **Appointments**: `BookAppointmentDialog`, `UpcomingAppointmentsList`.
- **Notifications**: `NotificationsList`. Realtime via `postgres_changes` on `client_notifications`.
- **Settings**: profile edit, password change, language/timezone.

### 5. Staff-side additions (small, additive)

A new "Client Portal" section on `ClientDetail` (admin/counselor):
- "Invite to Portal" button (creates portal link + invite email).
- Verify document buttons on `client_files` rows (sets status verified/rejected with remark).
- Invoice tab: create/edit/mark paid.
- Offers admin page (`/admin/offers`) for creating offers and assigning to clients.
- Points admin: approve `point_redemptions`, manual adjustments.

### 6. Communication flow

Reuse existing `UnifiedChat` with `channelType="staff_client"` on `/portal/chat`. Internal staff-only notes already use `staff_internal` and stay hidden — no changes needed. Every new file upload, invoice issued, offer assigned, etc., writes to `client_timeline` so the existing case timeline stays the source of truth.

### 7. Deliverable order (single build pass)

```text
1  Migration: enum + 11 tables + RLS + helper fn + triggers
2  Portal auth (/portal/auth, PortalProtectedRoute, role gate)
3  PortalLayout + sidebar + dashboard shell
4  File Status module
5  Chat module (route wrapper around UnifiedChat)
6  Offers module
7  Refer & Earn module
8  Payments + Invoices
9  Appointments
10 Notifications + bell
11 Settings
12 Staff-side: Invite to Portal, verify docs, manage offers, approve redemptions
```

### Open assumptions (will proceed unless you flag)

- Sender domain for invite emails is already configured; if not, staff can copy-share the invite link.
- "Application Progress %" is computed from existing `clients.lead_stage` mapped to the 6 stages in the diagram (Enquiry → Decision).
- Credit Points conversion uses USD as in the screenshot; can switch to INR by changing `points_value_rate` defaults.
- Realtime is enabled for `client_notifications` and chat (chat already enabled).
