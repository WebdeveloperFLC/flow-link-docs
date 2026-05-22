## Findings
- The backend is healthy.
- Recent auth logs for the shown account show `Invalid login credentials`, not a network outage.
- `trv9.flc@gmail.com` still does not exist in auth, CRM profiles, or accounting users.
- Existing related CRM users are:
  - `trv@futurelinkconsultants.com` — virendra singh — counselor — active
  - `flc.trv1@gmail.com` — Shahbaz Pathan — documentation — active
  - `flc.trv4@gmail.com` — Nisha Gangwani — documentation — active
- The current reset-password flow still uses `supabase.functions.invoke()`, which can hide function response details and can be unreliable for auth-protected functions.

## Plan
1. Replace admin user function calls on the Users page and lifecycle dialog with one shared explicit `fetch` helper:
   - Gets the current access token first.
   - Sends `Authorization` and `apikey` headers explicitly.
   - Reads the JSON error body reliably.
   - Shows the exact backend error instead of generic messages.

2. Fix password reset validation and feedback:
   - Keep 8–72 character validation.
   - Surface breached/weak password errors clearly.
   - Confirm reset by checking the function response body before showing “Password updated”.

3. Improve the Users search so it covers:
   - Name
   - Email
   - Role labels and role keys
   - Status
   This will allow searching terms like `trv`, `counselor`, `active`, or `virendra`.

4. Add a visible “related account found” state through the search results only; no permanent creation/rename of `trv9.flc@gmail.com` unless you explicitly ask for it.

5. Verify after implementation:
   - Test the reset-password edge function directly.
   - Re-check logs if it fails.
   - Confirm the user search logic includes `trv@futurelinkconsultants.com` and does not claim `trv9.flc@gmail.com` exists.