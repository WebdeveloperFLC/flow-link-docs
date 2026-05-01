# Questionnaire email templates — make the setting visible and usable

## Where things stand today

The email-template feature is partially built but mostly hidden:

- The DB table `questionnaire_email_templates` exists, and `visa_forms.email_template_id` already stores a per-form selection.
- A selector "Email template (used when sharing the questionnaire)" exists, but only inside **Form Builder → Step 3 "Settings"** (`/forms-library/:id/build`). If you stay on Step 2 ("Build") you never see it. There is also a per-form selector in `FormsLibrary.tsx` row settings.
- There is **no UI to create/edit/delete** entries in `questionnaire_email_templates`, so the dropdown only ever shows "Default".
- On the client page, "Share questionnaire" only **copies a link** to the clipboard — it never actually sends an email, so the chosen template is never used.

That's why it feels like the setting is missing — it's there, but buried, empty, and not wired to any send action.

## What we'll build

### 1. Make the per-form email-template setting easier to find
- In `FormBuilder.tsx`, lift the email-template selector out of Step 3 into a small, always-visible header strip on every step (next to country/category), so users see and can change it without clicking through to "Settings".
- Add a "Manage templates" link next to the dropdown that opens the new manager (see step 2).

### 2. New "Questionnaire email templates" manager
- Add a Settings tab/page (under existing `Settings.tsx`, or a new route `/settings/questionnaire-emails`) that lists rows from `questionnaire_email_templates` with create / edit / delete / set-default actions.
- Editor fields: `name`, `subject`, `body_html` (rich-text textarea with merge-tag hints like `{{client_name}}`, `{{questionnaire_link}}`, `{{form_name}}`, `{{firm_name}}`).
- Mark exactly one row as `is_default`. Used when a form has `email_template_id = null`.
- Admin-only (matches existing RLS `admins manage qet`).

### 3. "Send questionnaire via email" action on the client page
- In `ClientFormsCard.tsx`, keep "Copy link" and add a new "Send via email" button next to it.
- New edge function `questionnaire-send-email`:
  - Resolves or creates the `questionnaire_instances` row (same logic as the existing copy-link flow).
  - Picks the email template: `visa_forms.email_template_id` → fallback to `is_default = true` → fallback to a built-in default.
  - Renders subject/body with merge tags filled in (client name, link `${origin}/questionnaire/${token}`, form name, firm name from `firm_profile`).
  - Sends through Lovable's built-in transactional email infrastructure (scaffold via the email-domain tooling — recipient is the client's email; trigger is the counselor's explicit click, so this is transactional, one-recipient, expected by the user).
  - Logs `questionnaire.email_sent` to `activity_logs`.
- Toast on success; surface the rendered subject so the counselor knows what was sent.

### 4. Small polish
- In `FormsLibrary.tsx` row settings, label the existing dropdown more clearly: "Email template for sharing" + a "Manage" link.
- When no templates exist yet, show a hint under the dropdown: "No custom templates yet — set up reusable copy in Settings → Questionnaire emails."

## Files touched

- `src/pages/FormBuilder.tsx` — move/duplicate email-template selector to a persistent header.
- `src/pages/FormsLibrary.tsx` — relabel existing dropdown, add "Manage" link.
- `src/pages/Settings.tsx` (or new `src/pages/QuestionnaireEmailTemplates.tsx` + route in `App.tsx`) — CRUD UI.
- `src/components/clients/ClientFormsCard.tsx` — new "Send via email" button.
- `supabase/functions/questionnaire-send-email/index.ts` — new edge function.
- Email infra: run `email_domain--setup_email_infra` + `email_domain--scaffold_transactional_email` if not already set up; add a `questionnaire-invite` template under `_shared/transactional-email-templates/` whose body comes from the chosen DB row at send time (template renders the HTML passed in via `templateData.bodyHtml` inside a branded shell, with subject from `templateData.subject`).

## Out of scope

- Bulk sending to multiple clients (would be marketing-style and is intentionally avoided).
- Tracking opens/clicks beyond the existing share-link view counter.

After you approve, I'll implement steps 1–4 in one pass and deploy the new edge function automatically.
