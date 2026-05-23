# Fix two reported issues

## Issue 1 — Settle Abroad submissions show "—" for Client/Email, no direct email to client

**Root cause.** `SessionsTab` (in `src/pages/admin/AssessmentAdmin.tsx`) loads sessions with embedded joins:
```
select(..., lead:assessment_leads(...), client:clients(...))
```
The `clients` table has per-row RLS (`can_view_client`) that only allows the owner, an admin, or someone with explicit access. Most assessment-sessions are tied to clients created by other users / by the public portal, so the embedded `client` comes back `null` and the row renders `—`.

**Fix.**
1. Add a `SECURITY DEFINER` RPC `list_assessment_sessions_admin()` that returns the columns SessionsTab needs (session id/status/goal/country/answers/output/pdf_path/submitted_at/created_at + denormalised `client_name`, `client_email`, `client_phone`, `lead_name`, `lead_email`, `lead_phone`), restricted to authenticated users who can already access the page (`has_role(auth.uid(),'admin') OR has_role(auth.uid(),'counselor') OR has_role(auth.uid(),'telecaller') OR has_role(auth.uid(),'documentation')`).
2. Rewrite `SessionsTab.load()` to call the RPC instead of selecting from `assessment_sessions` with embedded joins.
3. Add a "Send email to client" action in the row's action group: a mailto link prefilled with the client/lead email and a subject like `Your Settle Abroad assessment`. Shown only when an email exists.

## Issue 2 — "Save failed" on Counselor notes after converting lead → client

**Diagnosis steps.** The current `autosave` swallows the underlying error and shows the generic "Save failed". First step is to surface the real Postgres error in the toast (already `console.error`'d, but we will also include `error.message` / `error.details` in the toast). Then fix the most likely cause: when the form is loaded via `?lead_id=…` on a lead that was already converted, `upsertClientRegistration` tries to INSERT a brand-new client, but the `clients_source_lead_id` unique relationship / accounting-sync trigger fires and rejects the duplicate. Even when the row is found, the page is in "new" mode so every blur tries to INSERT.

**Fix.**
1. In `src/pages/clients/ClientNew.tsx` `useEffect` for `leadIdParam`:
   - After fetching the lead, check `leads.converted_to_client_id`. If set, set `clientId`/`editId` to that id and call `fetchClient` instead of treating it as a brand-new insert. This re-enters edit mode and prevents duplicate-insert attempts.
2. Make `autosave` show the actual error: `toast.error(e?.message ?? e?.details ?? "Save failed")` so the next failure is diagnosable.
3. Serialise autosaves (guard with the existing `saving` flag) so the rapid "unlock → autosave → blur → autosave" sequence cannot race two INSERTs.
4. Verify the update path: clients RLS update policy uses `can_edit_client`, which requires `owner_id = auth.uid()` (set by `set_client_owner_defaults` trigger). If the converted client was created by a different user, current user (non-admin) would still be unable to update. We handle that by surfacing the real error so the user sees "Permission denied" instead of "Save failed", and by linking the client list to use the admin route when applicable. No RLS change unless the surfaced error confirms a permission gap.

## Issue 3 — Background errors flooding logs: `permission denied for function has_role`

Recent migration only granted `EXECUTE` on `public.has_role(uuid, app_role)` to `authenticated`. Any anonymous request (public assessment page, portal pre-login, etc.) that touches a table whose policy calls `has_role` now errors out before evaluating. Grant `EXECUTE` to `anon` as well — the function still only returns `true` if the row exists in `user_roles`, so this is safe.

## Files changed

- New migration: RPC `list_assessment_sessions_admin`, `GRANT EXECUTE ... TO anon, authenticated` on `has_role`.
- `src/pages/admin/AssessmentAdmin.tsx` — replace `SessionsTab.load()` query, add Email action.
- `src/pages/clients/ClientNew.tsx` — short-circuit to edit mode when lead already converted; better error toast; race guard.

## Out of scope

- Visual redesign of SessionsTab table.
- Changes to RLS on `clients` (only surfaced; not relaxed).
- Reworking lead-conversion flow itself.
