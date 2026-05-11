## Root causes found

**1. Invitation email never sent**
The `client-portal-invite-create` edge function tries to call a function named `send-transactional-email` — but that function does not exist in this project (only `email-send` exists, which is wired to per-client email threads, not generic transactional sends). The call silently fails inside a try/catch, so the UI shows "link copied" but no email ever leaves the system.

Additionally, the email domain `notify.dms.futurelinkconsultants.com` is still in **Pending** DNS state, so even once we wire a sender, mail won't actually deliver until DNS is verified.

**2. Offers not visible to clients**
- The current RLS policy on `offers` is `auth.uid() IS NOT NULL` for SELECT — meaning *any* authenticated user sees *all* active offers, including staff-only or other-client offers. Conversely, the `PortalOffers` page does no audience filtering, so once a client logs in, group/individual targeting is meaningless.
- More importantly: **zero clients have ever logged into the portal** (the `client_portal_links` table is empty). So nobody is actually seeing the portal at all yet — which ties back to issue #1 (no invite emails delivered → no client signups → no one to view offers).
- The one existing offer ("Summer Bonus Dhamaka 2026") has `valid_from = 2026-05-21` (10 days from now). The portal page does not filter by date, so it would show up — but a properly fixed system should respect the date window.

---

## Fix plan

### Step 1 — Scaffold the built-in transactional email function
Use Lovable's built-in transactional email infra (`scaffold_transactional_email`). This creates a real `send-transactional-email` edge function backed by the existing `notify.dms.futurelinkconsultants.com` domain and the email queue we already deployed. No third-party API key needed.

### Step 2 — Add a "portal-invite" template + wire it in
Add a small HTML template inside the scaffolded transactional sender for the `portal-invite` template (subject: "You've been invited to your client portal", body with the activation link + expiry). Then redeploy `client-portal-invite-create` — it already calls `send-transactional-email` with `templateName: "portal-invite"`, so once the function exists it will start sending.

Until DNS verifies, the function will accept the request and queue it; the UI will still show "link copied" as a fallback so counselors can paste manually. After DNS verifies (handled in Cloud → Emails), real email delivery starts automatically — no further code change needed.

### Step 3 — Tighten offer RLS so audience targeting actually works
Replace the `offers_select` policy with one that uses the existing `user_can_see_offer(auth.uid(), id)` SECURITY DEFINER function. That function already enforces:
- `is_active = true`
- date window (`valid_from`/`valid_to`)
- audience match (global OR individual-target OR group-member)

Staff (admin/counselor/telecaller) keep full visibility via a separate policy so they can still manage offers from the admin page.

### Step 4 — Filter `PortalOffers` query for safety
Even with RLS, simplify the page to read all rows it can see (RLS does the work) and drop the client-side `is_active` re-filter (which would mask any future date-gated logic).

---

## Files to change

- **NEW** `supabase/functions/send-transactional-email/index.ts` — scaffolded transactional sender with a `portal-invite` template
- **MIGRATION** — drop `offers_select`, add new policies:
  - `offers_select_client` USING `user_can_see_offer(auth.uid(), id)`
  - `offers_select_staff` USING `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'counselor') OR has_role(auth.uid(),'telecaller')`
- **EDIT** `src/pages/portal/PortalOffers.tsx` — remove `.eq("is_active", true)` (RLS already filters)
- No change needed to `client-portal-invite-create` — it's already calling the right function name

---

## What the user must do (one-time)
Finish DNS verification for `notify.dms.futurelinkconsultants.com` in **Cloud → Emails**. Until that completes, invites can be sent by **copy-pasting the link** (already working in the UI). After verification, the email goes out automatically.

## What will work after this plan ships
- Counselor clicks **Invite** → email is queued and (once DNS verified) delivered to the client; link is also copied to clipboard as a fallback.
- Client redeems the link → account is created and linked → on login, they see only the offers their counselor has targeted to them (global / their group / them individually), within the active date window.
- Admin can still manage and preview every offer from the admin offers page.
