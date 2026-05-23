# Security Fixes — Plan

Address the 9 findings shown in the Security view. Two are critical (token exposure), the rest are scoping/hardening.

## Critical — token exposure (errors)

1. **`client_portal_invites.token` readable by staff**
   - Add column-level hardening: drop `token` from any SELECT exposed to staff. Replace `invite_view` SELECT policy with one that returns rows but block the `token` column via a view OR simpler: revoke SELECT on the table and create `client_portal_invites_safe` view (no `token`) for staff reads; update `InviteClientCard.tsx` to read from the view; keep token only accessible to service role (edge functions).
   - Store a SHA-256 hash alongside (`token_hash`), keep plaintext only long enough for the create flow to return it once. Update `client-portal-invite-create` to return the plaintext link to caller (already does), persist `token_hash`, drop `token` column after backfill. Update `client-portal-invite-redeem` and `PortalInviteRedeem.tsx` lookup to compare by hash.

2. **`assessment_invitations.token` readable by staff** — same pattern:
   - Add `token_hash`, drop plaintext `token` from staff-visible SELECT (view `assessment_invitations_safe`), store only hash. Update `assessment-invite-create` (returns link once) and `AssessmentInvite.tsx` redemption to hash-compare.

## Warnings — RLS scoping

3. **`assessment_email_verifications`** — add explicit `TO anon` deny policy alongside the existing authenticated deny.

4. **`dsh_media` self-insert bypass** — drop `dsh_media insert self` policy; rely on the `dsh_can('edit')` INSERT policy.

5. **Leads over-read by counselors** — replace SELECT policy so `counselor` can only see leads where `assigned_counselor_id = auth.uid()` OR `created_by = auth.uid()` OR assigned to their team (if team_leader). Admin/manager keep full read.

6. **`profiles` broad staff read** — restrict SELECT to: self, admin, manager. Other staff lose directory read. (Confirm nothing in UI requires it; if needed for assignment dropdowns, expose a SECURITY DEFINER function `list_assignable_staff()` returning only id + display_name + role.)

## Warnings — confirm-only (no code change needed)

7. **`telephony_provider_settings`** — already admin-only; mark fixed with note.
8. **`email_send_log`** — already service-role-only; mark fixed.
9. **`suppressed_emails`** — already service-role-only; mark fixed.

## Files touched

- New migration: hash columns, view replacements, policy rewrites for `leads`, `profiles`, `dsh_media`, `assessment_email_verifications`.
- `supabase/functions/client-portal-invite-create/index.ts` — write `token_hash`, stop persisting plaintext after issuing link.
- `supabase/functions/client-portal-invite-redeem/index.ts` — look up by hash.
- `supabase/functions/assessment-invite-create/index.ts` — same.
- `supabase/functions/assessment-register/index.ts` — already does not leak link (good); update token verification path to hash.
- `src/pages/portal/PortalInviteRedeem.tsx` — remove direct staff-side `select("email,...")` by token (anon can't read anyway); rely on edge fn.
- `src/pages/assessment/AssessmentVerify.tsx` — unchanged (already uses edge fn).
- `src/components/clients/InviteClientCard.tsx` — read from `client_portal_invites_safe` view instead of base table.

## Verification

- Re-run security scan; confirm all 9 cleared or marked fixed/ignored with rationale in security memory.
- Manual: create + redeem one portal invite and one assessment invite end-to-end.
- Manual: as counselor, confirm `leads` list only shows assigned leads.

## Questions before I build

- OK to drop the staff-visible `token` columns entirely (after issuing the link, plaintext is gone — invites become "rotate/re-issue" rather than "view existing link")? This is the secure default. If you need staff to be able to re-copy a pending invite link, I'll keep a per-row "re-issue" action that generates a fresh token instead.
- For `profiles`: do counselors/telecallers need to see other staff names anywhere in the UI (e.g., assignment dropdowns, handoff target picker)? If yes, I'll add the `list_assignable_staff()` RPC; if no, I'll just lock SELECT to self+admin+manager.
