## Goal

Make the Canada Immigration Assessment usable **right now without email**, and rebuild the UI to match the premium Future Link Consultants look in your screenshots. Keep all existing invite/email/verify code intact for later.

## What changes

### 1. Counselor-driven start (no email needed)

On `/assessment-admin`, replace the current "Send Invite is the only option" feel with a clear primary action:

- **"Start new assessment"** button (primary, top of page) opens a dialog with two tabs:
  - **Existing client** — searchable list of clients from the `clients` table; pick one → creates an `assessment_sessions` row tied to that client and opens `/assessment/run/:sessionId` in a new tab for the counselor (or copies a shareable link).
  - **New client** — minimal form (full name, email optional, phone optional, country) → inserts into `clients`, then creates the session and opens the run page.
- The existing "Send invite", "Invitations", "Submissions", "Questions", "Programs" tabs all stay exactly as they are — just demoted below the new primary action. Nothing gets deleted.
- Add a small "Public link" copy button (referral entry) but it's no longer the main path.

Backend: one new edge function `assessment-session-create` that accepts `{ clientId }` or `{ newClient: {...} }`, upserts the client, creates an `assessment_sessions` row in `draft` status, and returns `{ sessionId }`. No email is sent. Existing invite/verify/register functions stay untouched.

### 2. Premium theme — match the screenshots

Screenshots show: ivory/cream page background, near-black "Future Link Consultants" header card with leaf logo, **large bold serif display headlines**, soft rounded white cards with subtle borders, **coral/red primary CTA**, dark pill toggle for Client/Counselor, clean numbered section rail, and a right-side CRS card with a thin red progress bar.

Update `src/index.css` + `tailwind.config.ts` design tokens (HSL semantic tokens only — no hardcoded colors in components):

- `--background`: warm ivory (`hsl(36 33% 97%)`)
- `--foreground`: near-black (`hsl(220 15% 10%)`)
- `--primary`: deep coral/red (`hsl(8 75% 60%)`) for CTAs and accents
- `--secondary` / dark surface: `hsl(220 20% 12%)` for the header card and pill
- `--card`, `--border`, `--muted` tuned to match the soft, airy look
- Add display font (e.g. **Fraunces** or **Instrument Serif** from Google Fonts) for H1/H2; keep Inter for body. Wire via `index.html` + `tailwind.config.ts` `fontFamily.display`.
- Add token `--shadow-card` for the subtle card lift.

Since this is a **token-level** change, **the entire app** (dashboard, clients, portal, etc.) instantly inherits the premium feel — no per-page rewrites.

### 3. Rebuild the three assessment screens to match the screenshots

- **`AssessmentLanding.tsx`** — left: "Client self-assessment" chip, huge serif H1 "Find your most likely path to Canada.", supporting copy "…Built by Future Link Consultants.", two info rows with leaf/info icons, advisory callout, consent checkbox, red "Start assessment →" button. Right: promo/referral code card with Apply button, stats row (7 goal paths · 20+ programs · <5 min), bullet list of features. Top header strip with leaf logo + Client/Counselor pill.

- **New `AssessmentGoal.tsx`** at `/assessment/goal` — "Step 1 of 3 · What's your primary goal?" with **7 goal cards** in a responsive grid (Permanent Residence, Work Permit, Study Permit, Visitor Visa, Family Sponsorship, Business / Investment, Unsure / Need Guidance). Each card has icon + title + one-line description. Selecting a goal stores it on the session and routes to `/assessment/questions`.

- **`AssessmentRun.tsx`** (rename route to `/assessment/questions`) — three-column layout:
  - Left rail: "Step 2 of 3 · Permanent Residence" + numbered section list (Personal, Education, Language, Work experience, Family & location, Compliance) with active/completed states.
  - Center: white card with current section title, helper line, the questions for just that section, Back / Next buttons at the bottom.
  - Right: "Estimated CRS — Advisory" card showing the big number, thin red progress bar, and per-factor lines (Age, Education, First language, Second language, Canadian experience, Spouse, Transferability, Additional). Drives off the existing `assessment-crs` edge function — no scoring logic changes.

Submit on the last section keeps the existing `assessment-submit` flow and the existing "Submitted" success card.

### 4. What is **not** touched

- `assessment-invite-create`, `assessment-verify-email`, `assessment-register`, `assessment-resend-report`, `assessment-pdf-download`, all email templates, `client_portal_*` tables, the CRS calculator, the questions/programs seed data — all stay as-is for when email is configured later.

## Technical notes

- New file: `supabase/functions/assessment-session-create/index.ts` (+ `deno.json`, `config.toml` entry with `verify_jwt = true` since counselor-only).
- New file: `src/pages/assessment/AssessmentGoal.tsx`; route added in `src/App.tsx`.
- Rewrites: `AssessmentLanding.tsx`, `AssessmentRun.tsx`, `AssessmentAdmin.tsx` (add "Start assessment" dialog at top; keep all existing tabs).
- New component: `src/components/assessment/AssessmentHeader.tsx` (logo + Client/Counselor pill, reused on all three screens).
- New component: `src/components/assessment/StartAssessmentDialog.tsx` (existing-client search + new-client form).
- Theme: edit `src/index.css` tokens + `tailwind.config.ts` (add `fontFamily.display`, `boxShadow.card`). Add Fraunces/Instrument Serif link in `index.html`.
- Migration: tiny — add `goal text` column to `assessment_sessions` so the goal picker has somewhere to store its choice. No data loss.

## Out of scope (call out)

- Sending emails to clients — explicitly deferred per your instructions. The "Send invite" tab keeps working but you don't need to use it.
- Refunding credits / reverting history — those are handled from the Lovable Project history panel, not by me in code.

## Open question

Approve and I'll build it. One small choice you can answer in the next message if you want: **display font** — Fraunces (slightly warmer, modern editorial) or Instrument Serif (sharper, closer to the screenshots). I'll default to **Instrument Serif** to match the screenshots unless you say otherwise.