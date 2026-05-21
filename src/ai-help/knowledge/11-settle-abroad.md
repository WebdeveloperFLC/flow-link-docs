# Settle Abroad (Assessment)

Eligibility / pathway assessment tool for prospects.

- Public entry: `/settle-abroad` or `/assessment` — landing page.
- Pick country (`/assessment/country`) and goal (`/assessment/goal`) → invite link generated.
- Invite a prospect: `/assessment/invite/:token` → OTP verify (`/assessment/verify/:token`) → run assessment (`/assessment/run/:sessionId`).
- Admin: `/assessment-admin` — manage questions; `/germany-rules`, `/noc-admin` — country-specific rule editors.

Results compute eligibility scores and recommended pathways (Canada Express Entry, Germany Chancenkarte, etc.). PDF-exportable, pushable to client portal.
