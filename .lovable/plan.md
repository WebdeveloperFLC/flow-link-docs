
# Canada Immigration Assessment — Phase 1 (Standalone Foundation)

The full spec is huge. This plan delivers the **foundation + PR branch + access/delivery rules you specified**. Later phases will layer on Work/Study/Visit/Family/Business branches, CRS engine, OCR, AI matching, payments, audit logs, multi-country.

## Scope of Phase 1

**In:** Access gating, lead registration with email verification, admin-editable questions, PR branch questionnaire, advisory report, branded PDF wrapper, email delivery, counselor view & download.

**Out (later phases):** CRS scoring engine, AI matching, OCR auto-fill, Work/Study/Visit/Family/Business branches, payments, spouse-adjusted scoring, audit logs, multi-country.

---

## 1. Access Rules (your hard requirements)

Three entry paths to `/assessment`:

| Path | Who | Gate |
|---|---|---|
| **Invitation link** | Counselor invites a new lead or existing client by email | Signed token in email link, expires in 14 days |
| **Referral code** | Anyone with a valid referral code from an existing client/partner | Code lookup at landing page |
| **Existing client** | Already-registered portal client | Direct link in their email, auto-recognized when logged in |

**No one** can reach the assessment without one of these. Public landing page asks: "Do you have an invitation email?" → if no → "Enter referral code".

**Registration step (every new entrant):** First name, middle name, last name, email, phone → "Register" → verification email sent → click link to start assessment. Existing clients skip registration.

## 2. Delivery Rules

- On submit, report is emailed to client automatically using the branded PDF wrapper.
- **Client portal: no download button.** Only "Email me a copy" button (re-sends the same email).
- **Counselor / staff view:** full download button + "Resend to client" + "Open in browser".
- PDF wrapper is admin-editable: cover page, company header/footer, optional extra pages (company brochure, services, testimonials, etc.) uploaded once and auto-bundled to every report.

## 3. PR Branch (only branch in Phase 1)

Admin-editable question bank, grouped into sections:
- Account & Access (captured at registration)
- Personal (age, marital status, dependents)
- Education + ECA
- Language (English IELTS/CELPIP/PTE, French TEF/TCF)
- Work experience + NOC/TEER
- Canadian connections (relatives, prior CA stay)
- Funds / settlement
- Province preference
- Compliance (criminal, medical, refusals)
- Document availability checklist

**Output (Phase 1 = advisory only, no numeric CRS):** list of likely program names (Express Entry, PNP, Atlantic, Rural, Francophone, Quebec, Caregiver), risk flags, missing-info list, suggested next steps, "book a consultation" CTA. Rule matching is admin-editable JSON — when CRS engine ships in Phase 2 it replaces this.

## 4. Admin Panel additions

New routes under existing admin area:
- `/admin/assessment/questions` — edit question text, type, options, order, which section, conditional show/hide
- `/admin/assessment/programs` — edit program list + match rules (JSON)
- `/admin/assessment/pdf-wrapper` — upload cover, header logo, footer, extra brochure PDFs, configure ordering
- `/admin/assessment/invitations` — list, resend, revoke invites
- `/admin/assessment/sessions` — list all assessments, filter by status, view/download any

## 5. Counselor / Staff UI

- New "Assessment" tab on `ClientDetail` → shows all sessions for that client, status, "Run assessment for client", "Send invitation", download PDF
- New top-level `/assessment` page in staff app showing all incoming assessments (queue), filter by counselor, hot/warm/cold tag (manual in Phase 1)
- New "Send Assessment Invite" button on `Clients` list and `Telecaller` inbox

## 6. Client Portal

- New `/portal/assessment` route — resume in-progress, view completed, **"Email me my report"** button (no download)
- Notification when staff sends an invite or when assessment is reviewed by counselor

---

## Technical section

### New DB tables (RLS on all)

- `assessment_invitations` — token, email, phone, first/middle/last name, expires_at, status (pending/registered/expired/revoked), invited_by, client_id (nullable, for existing clients)
- `assessment_leads` — pre-client lead created from registration: first/middle/last name, email, phone, email_verified_at, referral_code_used, source (invite/referral/existing_client), linked client_id (nullable)
- `assessment_sessions` — lead_id, client_id (nullable), country='Canada', goal='PR', status (draft/in_progress/submitted/counselor_reviewed), answers (JSONB), output (JSONB), submitted_at, last_emailed_at
- `assessment_questions` — admin-managed: code, section, type, label, options (JSONB), required, conditional_on (JSONB), order_index, is_active
- `assessment_programs` — code, label, match_rules (JSONB), is_active
- `assessment_pdf_wrapper` — single-row config table: header_url, footer_url, cover_pdf_path, extra_pdfs (JSONB array of paths), updated_by
- Storage bucket `assessment-pdf-assets` (private; staff write, signed-url read for emails)

### RLS summary (plain English)

- **Invitations:** staff (admin/counselor/telecaller) can create and view. Public can validate a token via edge function only.
- **Leads:** staff can view all. A registered lead can view their own row when logged in with the matching email.
- **Sessions:** staff can view/edit all. Lead/client can view and edit only their own session. Submitted sessions become read-only for the lead/client.
- **Questions / Programs / PDF wrapper:** admin write; everyone authenticated read (needed to render the questionnaire).

### Edge functions (new)

- `assessment-invite-create` — counselor calls; stores invite, emails via `send-transactional-email` with new `assessment-invite` template
- `assessment-register` — public; validates invite token OR referral code, creates lead, sends verification email (`assessment-verify-email` template) with magic-link token
- `assessment-verify-email` — public; consumes verification token, marks lead verified, returns signed start link
- `assessment-submit` — authenticated lead/client; finalizes session, runs rule match (read-only over `assessment_programs.match_rules`), generates PDF (HTML → PDF via puppeteer-less approach: server-side render with @react-pdf/renderer), uploads to storage, emails to client via `assessment-report` template
- `assessment-resend-report` — re-emails the latest PDF for a given session (client-callable for their own session, staff-callable for any)
- `assessment-pdf-download` — staff-only; returns signed URL valid for 5 minutes

### Email templates (new transactional)

- `assessment-invite` — "You've been invited to take your Canada immigration assessment" + activation link
- `assessment-verify-email` — "Verify your email to start your assessment"
- `assessment-report` — "Your Canada immigration assessment report" + the PDF as a download link (Lovable email infra doesn't support attachments, so the email contains a signed Storage URL valid 7 days; the PDF itself is delivered via that link). Client portal's "Email me my report" reuses this template.

### PDF generation

Server-side in `assessment-submit` using `@react-pdf/renderer` (Deno-compatible) or fallback to `pdf-lib` + html-to-pdf:
1. Render cover (from `assessment_pdf_wrapper.cover_pdf_path` if set, else generated from header config)
2. Render assessment results pages (programs matched, risks, next steps)
3. Append each PDF in `extra_pdfs[]` in configured order
4. Upload merged PDF to `assessment-pdf-assets/{session_id}/report.pdf`

### Routes added

```
Public:
/assessment/invite/:token       → validate + register
/assessment/start?code=XYZ      → referral code landing
/assessment/verify/:token       → email verification landing
/assessment/run/:sessionId      → questionnaire (auth required)
/assessment/done/:sessionId     → "report on its way" page

Portal:
/portal/assessment              → list + resume + email-me button

Staff:
/assessment                     → queue
/clients/:id (new tab)          → per-client assessments
/admin/assessment/questions
/admin/assessment/programs
/admin/assessment/pdf-wrapper
/admin/assessment/invitations
/admin/assessment/sessions
```

### Files to create (high level)

- 1 migration (tables + RLS + seed of PR questions + default programs)
- 6 edge functions
- 3 email templates + registry update
- ~15 React pages/components (admin pages, public pages, portal page, staff queue, client-detail tab, PDF preview)
- `src/lib/assessment.ts` — rule matcher + types

---

## What you must do (one-time, before email starts flowing)

- DNS for `notify.dms.futurelinkconsultants.com` must be verified in **Cloud → Emails** (already pending from earlier work). Until verified, invites and reports queue but don't deliver — copy-paste fallback link will appear in staff UI.

## After approval I will

1. Confirm scope and call `email_domain--scaffold_transactional_email` if not yet done for the new templates.
2. Run the migration (tables, RLS, seed).
3. Build edge functions + email templates.
4. Build admin pages, public flow, portal page, staff queue, and ClientDetail tab.
5. Add a smoke-test path: staff sends invite → register → verify → fill PR questionnaire → submit → PDF in inbox.

Phases 2+ (CRS engine, other branches, OCR, payments, audit, multi-country) ship in follow-up requests so we don't ship one giant unreviewable change.
