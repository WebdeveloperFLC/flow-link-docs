# Fix login & reset errors + add user search

## Findings (from database + edge function logs)

1. **`trv9.flc@gmail.com` does not exist anywhere** — not in `auth.users`, not in `profiles`, not in `accounting_users`. That is why login with "correct password" fails. The existing related accounts are:
   - `trv@futurelinkconsultants.com` → virendra singh (counselor, active)
   - `flc.trv1@gmail.com` → Shahbaz Pathan (documentation, active)
   - `flc.trv4@gmail.com` → Nisha Gangwani (documentation, active)
   - No accounting user with `trv` / `virendra` in email.

   **You must tell me which is correct:** create a brand-new `trv9.flc@gmail.com` user, or rename/use one of the existing accounts. I will not silently create it.

2. **Password reset shows "Edge Function returned non-2xx"** — the function returned `400`. Cause is the underlying Supabase Auth call rejecting the password (most commonly HIBP leaked-password check, or a too-short password). The current toast just shows a generic message and hides the real reason.

3. **Login "Failed to fetch" toast in the screenshot** — that toast is from a network failure, not wrong credentials. If the password were wrong, Supabase returns "Invalid login credentials". `Failed to fetch` means the browser could not reach the auth endpoint at all (transient network / blocked extension / VPN). Will surface that more clearly in the error message.

## Changes

### 1. `src/pages/Users.tsx` — add search/filter bar
- Add a search input above the table with one combined query string + filter chips:
  - **Search** by name or email (case-insensitive contains).
  - **Role** filter (multi-select: admin, commission_admin, counselor, documentation, telecaller, viewer).
  - **Status** filter (active / suspended / revoked).
- Filtering is purely client-side over already-loaded `profiles` + `roles`.
- Show result count, with a "Clear filters" button when any filter is active.

### 2. `src/components/users/HandleUserDataDialog.tsx` + Users reset dialog — surface real error
- In `Users.tsx` reset-password submit, read the JSON body returned by `admin-users` and toast the real `error` message (including HIBP / weakness wording already produced by the edge function for `create`).
- Extend `admin-users` `reset_password` branch to map common Supabase errors to friendly text (same pattern as `create`): "Password has appeared in a known data breach — use a longer, unique password."

### 3. `src/pages/Auth.tsx` — clearer login error
- Distinguish `TypeError: Failed to fetch` (network) from `Invalid login credentials` (wrong email/password) and from `Email not confirmed`. Show actionable messages instead of the raw fetch error.

### 4. `trv9.flc@gmail.com` account
- **Blocked pending your decision.** Options:
  - (a) Create a new CRM user `trv9.flc@gmail.com` with a chosen role + initial password (via Add new user dialog or one-time admin script).
  - (b) Create a new **accounting** user with this email and a role from {SUPER_ADMIN, FINANCE_ADMIN, ACCOUNTANT, AUDITOR, …}.
  - (c) Update an existing account's email to `trv9.flc@gmail.com`.

## Technical notes
- No DB schema changes. No migrations.
- Edge function `admin-users` gets a small change in the `reset_password` branch only (friendlier error mapping). Auto-deploys.
- Search/filter state lives in component-local `useState`; no URL params for now (can add later).
