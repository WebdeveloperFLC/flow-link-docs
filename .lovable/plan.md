## What's wrong now

1. **Branding** — the assessment header shows a generic leaf icon + "Future Link Consultants" text. The real FLC logo (blue globe + plane) is not used.
2. **"Progress saved" but no record visible** — when a counselor starts a session via *Start new assessment* and clicks **Save**, the row is written to `assessment_sessions` with `client_id` set (not `lead_id`). The admin **Submissions** tab only joins `assessment_leads`, so:
   - the Client / Email columns show blank for manually-started sessions
   - there's no link to **resume** the in-progress session
   - the user can't tell where the saved data went

## Plan

### 1. Use the real FLC logo

- Copy `user-uploads://FLC_logo_1_-01-4.png` into `src/assets/flc-logo.png`.
- Update `src/components/assessment/AssessmentHeader.tsx`:
  - Replace the inline `Leaf` SVG block with `<img src={logo} alt="Future Link Consultants" />`, sized ~`h-10 w-auto`, no background tile.
  - Keep the same header layout (logo left, Client/Counselor pill right). Drop the redundant "Future Link Consultants" text label since the logo already contains the wordmark; keep the small "Canada Immigration Assessment" subtitle underneath.
- No other pages need changes — the header component is shared across Landing, Goal, and Run screens.

### 2. Make saved sessions findable & resumable

Update `src/pages/admin/AssessmentAdmin.tsx` → `SessionsTab`:

- **Query both relations**: change the select to also join `client:clients(first_name, last_name, email, phone)` alongside the existing `lead:assessment_leads(...)`. Display whichever is present (`r.client ?? r.lead`).
- **Show goal**: add a "Goal" column reading `r.goal` (mapped through `GOAL_LABELS`).
- **Resume action**: for rows in `draft` / `in_progress`, add a **"Open / Resume"** button that navigates to `/assessment/run/{id}` so the counselor can continue the questionnaire. Keep Download PDF / Resend for submitted rows.
- **Empty-state copy**: when no rows, say "No assessments yet. Click **Start new assessment** above to begin one." (Currently the empty state is misleading.)
- **Default tab**: switch the default Tabs value from `submissions` to `submissions` (already is) but ensure newly-created sessions land here — after `StartAssessmentDialog` succeeds it already navigates to `/assessment/run/{id}`, so on returning to `/assessment-admin` the row will now be visible with name + Resume button.

### 3. Small confirmation toast tweak

In `AssessmentRun.tsx` `save()`, change the toast from `"Progress saved"` to `"Progress saved — find it under Submissions in the admin console"` so the user knows where to look. (Optional polish.)

## Technical notes

- No schema changes. `assessment_sessions` already has `client_id`, `lead_id`, `goal`, `answers`, `status`.
- RLS already allows authenticated staff to select sessions joined with `clients` (existing policies cover both tables).
- No edge function changes.

## Files touched

- `src/assets/flc-logo.png` (new — copied from upload)
- `src/components/assessment/AssessmentHeader.tsx` (swap icon → img)
- `src/pages/admin/AssessmentAdmin.tsx` (SessionsTab: join clients, add Goal column + Resume button, empty-state copy)
- `src/pages/assessment/AssessmentRun.tsx` (toast copy — optional)

## Out of scope (unchanged)

- Invite/email/verify/register flows
- CRS calculator, question bank, PDF generation
- Theme tokens, fonts, other pages
