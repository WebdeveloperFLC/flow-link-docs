# Flow: Client Portal Access

## Invite
1. Staff opens `ClientDetail → Portal` tab → triggers `client-portal-invite-create` edge fn.
2. Row in `client_portal_invites` with token + expiry.
3. Email sent (via `smtp-send` or `email-send`).

## Redeem
1. Client clicks link → `/portal/invite/:token` (`PortalInviteRedeem.tsx`).
2. `client-portal-invite-redeem` validates token, creates auth user with `signup_role=client` (so `handle_new_user` assigns `client` role only), links via `client_portal_links(user_id, client_id)`.
3. Redirect to `/portal/auth` → sign in.

## Routing & guards
- `PortalProtectedRoute` (in `src/components/portal/`) — allows `client` or `admin` roles.
- `PortalLayout` derives `clientId` via `getMyPortalClientId(user.id)` (reads `client_portal_links`).
- Unread badge: realtime count from `client_notifications` filtered by `client_id`.

## What clients can see
- Their own `clients` row (RLS: `can_view_client` allows owner OR portal link).
- Their `client_documents`, `client_invoices`, `client_invoice_payments`, `client_invoice_receipts`, `client_appointments`, `client_offers`, `client_notifications`, chat channels they're a member of.
- They cannot see staff-only timeline events (filtered client-side; consider RLS hardening if exposing).

## Failure modes
- Token expired → redeem returns error, user sees friendly message.
- Same email already has staff role → conflict; admin must manually add `client` role.