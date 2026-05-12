# Fix View button + make assessments visible in client's portal

## Problem
1. In the admin **Submissions** tab, the **View** button on submitted rows navigates to `/assessment/run/{id}`, which (for already-submitted sessions) just renders the "Assessment submitted" success screen. There is no actual review/PDF view.
2. Assessments started manually by counselors are linked to a `client_id` on `assessment_sessions`, but the client portal page only loads sessions via `lead_id` (the email-invite flow). So clients who log into the portal don't see assessments started for them manually.

## Changes

### 1. View button → open the PDF inline (admin)
In `src/pages/admin/AssessmentAdmin.tsx` `SessionsTab`:
- Replace the **View** button's `nav(/assessment/run/{id})` with a handler that opens the assessment PDF in a new browser tab for viewing (not download).
- Strategy: reuse the existing client-side `downloadAssessmentPdf` logic but add a sibling helper `openAssessmentPdf` in `src/lib/assessmentPdf.ts` that builds the same jsPDF document and calls `pdf.output("bloburl")` → `window.open(url, "_blank")` instead of `pdf.save(...)`. This guarantees the counselor sees the branded report (logo + answers + CRS), not the submission confirmation page.
- Keep the existing **Download** (saves file) and **Re-email** buttons as-is.
- For in-progress/draft rows, **Resume** still navigates into the questionnaire (unchanged).

### 2. Surface manually-started assessments in the client portal
In `src/pages/portal/PortalAssessment.tsx`:
- Resolve the logged-in user's `client_id` via `getMyPortalClientId(user.id)` (already exists in `src/lib/portal.ts`).
- Fetch sessions where `lead_id IN (user's leads)` **OR** `client_id = portalClientId`, merge + de-dupe by `id`, sort by created_at desc.
- Add a **View report** button on submitted rows that opens the same PDF (via the new `openAssessmentPdf` helper) so the client can read it in-portal without waiting on email.
- Leave the "Email me a copy" button for those who want it mailed.

No DB migration is needed — `client_id` is already populated by `assessment-session-create` and `assessment_sessions` already has an RLS policy permitting clients to read their own rows (verify; if missing we'll add a `SELECT` policy `using (client_id in (select client_id from client_portal_links where user_id = auth.uid()))` in a new migration).

## Out of scope
- Changing the submission confirmation screen, theme, question bank, CRS math, or email infra.
- Counselor-side review/comment UI on submitted answers (only the PDF view is added).

## Files touched
- `src/lib/assessmentPdf.ts` — add `openAssessmentPdf` (shares the existing builder).
- `src/pages/admin/AssessmentAdmin.tsx` — wire View button to `openAssessmentPdf`.
- `src/pages/portal/PortalAssessment.tsx` — include `client_id`-linked sessions and add View button.
- (Conditional) one new migration to add a portal SELECT policy on `assessment_sessions` if one doesn't already cover client_id access.
