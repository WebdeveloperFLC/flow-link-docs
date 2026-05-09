# Client Portal: Invitations, Offers, and Notifications

## 1. Client Invitation System (counselors/team → clients)

**Where:** New "Invite to Portal" button on the client detail page (visible to admin, counselor, telecaller). Also bulk action on Clients list.

**Flow:**
- Counselor clicks "Invite to Portal" → enters/confirms client email.
- Backend creates a row in new `client_portal_invites` table with a one-time token (expires in 14 days), and sends email with link `/portal/invite?token=XYZ`.
- Client clicks link → lands on `/portal/invite/:token` page → sees their name + email pre-filled → sets a password → account created with `client` role + automatically linked to the case via `client_portal_links` (no admin step needed).
- If account already exists for that email, the link just attaches the existing user to the case and signs them in.
- Token is marked `used_at` after redemption.

**Resend / revoke:** Card on the client page lists pending invites with "Resend" and "Revoke" actions.

## 2. Offers & Discounts (admin-managed, audience targeting)

**Tables:**
- `offers` — title, description, code, discount_type, discount_value, valid_from, valid_to, audience (`global` | `group` | `individual`), is_active.
- `offer_groups` — named groups (e.g. "Canada PR leads") with description.
- `offer_group_members` — group_id ↔ client_id.
- `offer_audience` — for `group`/`individual` offers: links offer to group_id or client_id.

**Admin UI:** New `/admin/offers` page (admin only) with two tabs:
- **Offers** — list, create/edit/delete; pick audience type and select groups or individual clients.
- **Groups** — create groups, add/remove client members.

**Client view:** Existing `/portal/offers` page reads offers visible to the logged-in client (global + groups they're in + individually targeted), filtered by date and `is_active`.

**RLS:** Admins manage; clients read only via a security-definer function `client_can_see_offer(client_id, offer_id)`.

## 3. Notification System

**Triggers (auto):**
- Stage/status change on a client → notify the linked portal user.
- Document status change (request/upload/approve/reject) — there's already a `fn_notify_file_status` trigger on documents; extend it to also send email.
- Payment events: insert/update on invoices/payments table → notify on created (due) and paid.
- Manual: counselor "Send notification" composer on the client page (title + body + optional link).

**Delivery:**
- Always insert into existing `client_notifications` table (powers bell + Notifications page).
- If client preference allows, also send email via `send-transactional-email`.

**Preferences:**
- New `client_notification_prefs` table: `client_id`, `email_status_updates bool`, `email_documents bool`, `email_payments bool`, `email_messages bool` (defaults true).
- Surface toggles in `/portal/settings`.

**Implementation:** A SECURITY DEFINER function `notify_client(client_id, type, title, body, link)` that:
1. Inserts into `client_notifications`.
2. Looks up the linked portal user's email + prefs.
3. If pref allows, calls `send-transactional-email` via pg_net (or marks a row that an edge function picks up).

To keep it simple and reliable, use a small dispatcher edge function `client-notification-dispatch` invoked by client code (and from the admin "send notification" composer); DB triggers will insert the in-portal notification synchronously and call the edge function via `pg_net` for email.

## 4. Email infrastructure

The project doesn't have an email domain set up yet. I'll show the email setup dialog so the user can configure a sender domain. Once that's in place, the invite email and notification emails work end-to-end. Until then, invitations still work — the invite link is shown to the counselor (copy-to-clipboard) so they can share it manually.

## Technical Details

### New tables
- `client_portal_invites(id, client_id, email, token, invited_by, expires_at, used_at, used_by)`
- `offers`, `offer_groups`, `offer_group_members`, `offer_audience`
- `client_notification_prefs`

### Edge functions
- `client-portal-invite-create` — generates token, inserts row, sends email.
- `client-portal-invite-redeem` — validates token, creates/links account, signs in.
- `client-notification-dispatch` — inserts notification + sends email per prefs.

### DB triggers added
- `clients` AFTER UPDATE on stage/status → `notify_client(...)`.
- `documents` (extend existing) → also dispatch email.
- Payment table (if/when invoices exist) — wire similarly; if no payment table yet, only the manual "send notification" composer covers payments for now.

### UI changes
- `src/components/clients/InviteClientCard.tsx` — invite button, pending invites list, copy link.
- `src/pages/admin/OffersAdmin.tsx` — admin CRUD for offers + groups.
- `src/pages/portal/PortalSettings.tsx` — notification preference toggles.
- `src/pages/portal/PortalInviteRedeem.tsx` — token redemption page.
- Update sidebar/Users page with link to "Offers & Discounts" admin.
