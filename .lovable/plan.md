# Plan — Admin-created accounts with password

Change the "Add new user" flow so admins create the account directly with a password they choose, and the invitee only receives an email-verification link (no password-reset rights for end users).

## 1. `src/components/users/AddUserDialog.tsx`
- Add a **Password** field (and a visibility toggle) right after the Role select.
  - Validation: min 8, max 72 chars; show inline error from zod.
- Rename the submit button from "Send invite" → **"Create account"** (busy label "Creating…").
- Update helper text below Role: "A verification email will be sent. The user will sign in with the password you set here."
- Send `password` to the `admin-users` edge function as part of the `create` action.

## 2. `supabase/functions/admin-users/index.ts` — `create` action
Replace the current `inviteUserByEmail` flow with:
- `svc.auth.admin.createUser({ email, password, email_confirm: false, user_metadata: { full_name } })` — creates the account with the admin-supplied password, unconfirmed.
- Then call `svc.auth.admin.generateLink({ type: 'signup', email, password })` — this triggers Supabase to send the standard **confirmation email** (verify-account link), not a password-reset link. The redirect target stays `${origin}/` so after verifying they land on the app and sign in normally.
- Continue to upsert the profile row and insert `user_roles` row exactly as today.
- Validation: reject if password missing or shorter than 8 / longer than 72.
- All other actions (`update`, `suspend`, `restore`, `delete`, `transfer_data`) stay unchanged.
- Keep the existing `reset_password` action available, but it will only be callable by admins (current behavior — gated by `has_role(admin)`).

## 3. Remove self-serve password reset for end users
To enforce "only admin controls passwords":
- `src/pages/Auth.tsx`: remove the **"Forgot password?"** link and the entire reset dialog/handler. Users who forget their password must ask an admin (admin uses the existing "Reset password" item in the user row's "..." menu, which sends a reset email on demand).
- `src/pages/ResetPassword.tsx`: keep the page (still used when an admin triggers a reset for someone), no changes needed.

## Technical notes
- `generateLink({ type: 'signup' })` is the supported Supabase admin path to (re)send a confirmation email for a freshly created user; the link points at `/auth/v1/verify` which redirects back to the app once clicked.
- Because `email_confirm` is false on creation, the user cannot sign in until they click the verification link — exactly the requested behavior.
- Password is transmitted only between the authenticated admin's browser and the edge function over HTTPS; it is never stored in `profiles` or logged in `activity_logs` (we'll log only `{ email, role }` as today).

## Files touched
- `src/components/users/AddUserDialog.tsx` (UI + payload)
- `src/pages/Auth.tsx` (remove forgot-password UI)
- `supabase/functions/admin-users/index.ts` (create action rewrite + password validation)
