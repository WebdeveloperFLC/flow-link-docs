# Client Questionnaire + Visa Forms + Section Binders — Implementation Plan

## Goal

End-to-end visa-prep workflow:
1. **Forms Library** — admin uploads/replaces visa form PDFs per Country + Category. Forms can be added or retired anytime.
2. **Auto-questionnaire** — each uploaded form is parsed into a structured questionnaire schema. Questionnaires can be filled by team or sent to client via secure link (auto or manual). Saved progress, partial save, team can edit.
3. **Reusable structured data** — answers feed `client_profile`, visa form auto-fill, and letters. Single source of truth.
4. **Multi-doc sections** — sections like Academics, Experience, Finance accept many documents each. Per section: arrange order **Auto** (by date/type rule) or **Manual** (drag-and-drop) → produces a **section binder** PDF.
5. **Final binder(s)** — pick all sections or any subset to compile one or more **final binders** for submission.
6. **Form preview + confirm + validate** — filled IRCC/visa forms can be previewed, confirmed, and validated (IRCC validation button equivalent where the form supports it).

---

## How it will work (plain English)

### A. Forms Library (admin)
- New page `/forms-library`. Tree: Country → Category → list of forms.
- Each form has: name, code (e.g. IMM5645), version, file (PDF), `is_active`, `requires_validation`, `auto_questionnaire` (on/off), `email_template_id`, `send_mode` (auto|manual).
- Replace a form → bumps version, old version archived (kept for audit, hidden by default).
- Removing = soft-archive. History preserved.

### B. Auto-questionnaire from each form
- On upload, edge function `parse-form-fields` reads the PDF AcroForm fields (real PDF form fields) + uses Lovable AI vision pass for fields without metadata.
- Produces a `questionnaire_schema` row mapped to that form: section grouping (Personal / Travel / Education / Employment / Financial / Family / Form-specific), field types, dropdown options, mapping_key (which `client_profile` column it feeds).
- Admin can review & edit the schema before activating.

### C. Filling questionnaires
- In a client case, "Questionnaires" tab shows one questionnaire per attached form.
- Team can fill inline, or click **Send to client** → secure tokenized link emailed via Lovable Emails. Per-form setting decides Auto-send (sent automatically when form is attached to the case) or Manual.
- Client opens link (no login) → section-by-section UI → **Save & continue later** anytime → submit when done.
- Team can edit any submitted answer; activity log records changes.
- Field types: text, textarea, date, number, dropdown (master_items-backed), yes/no, multi-entry (repeatable group).

### D. Form preview / confirm / validate
- After answers are captured, click **Generate filled form** → edge function fills the AcroForm fields in the original PDF using `pdf-lib`.
- **Preview** the filled PDF inline.
- **Confirm** → status `confirmed`, locks edits.
- **Validate** → if the form is an IRCC form with a validation button, we surface guidance + (where possible) trigger PDF JS validation by flattening field values then running a server-side check that mimics the IRCC validate rules we encode (we cannot click Adobe's button programmatically, but we can run the same arithmetic + required-field rules and produce a validation report). For non-IRCC forms, we run a generic "all required fields filled" + format checks.

### E. Multi-document sections + Section Binders
- New concept `case_sections` (Academics, Experience, Finance, Identity, Family, Other). Pre-seeded; admin can add more.
- Each section accepts many documents (existing `client_documents` gets a `section_id` + `section_order`).
- Section panel: shows each uploaded doc as its own card, **Order mode**: Auto (rules: type priority + date desc) or Manual (drag-and-drop).
- Button **Build section binder** → PDF combining all docs in that section in the chosen order, with cover page + TOC. Saved into `binders` table tagged with `scope='section'` and the section id. Reuses existing `generateBinder` logic.

### F. Final binder(s)
- "Final binder" panel: checklist of sections + individual loose documents + filled forms.
- User selects what to include; can create **multiple** named final binders (e.g. "Submission package — IRCC SDS", "Backup — University").
- Order of items inside the final binder: Auto (forms → identity → academics → experience → finance → family → other) or Manual drag-and-drop.
- Output saved to `binders` with `scope='final'`, downloadable + shareable via existing share-link flow.

---

## Information architecture

```text
visa_forms                  Country, Category, name, code, version, file_path,
                            is_active, requires_validation, auto_questionnaire,
                            email_template_id, send_mode

questionnaire_schemas       form_id (nullable for generic), sections (jsonb),
                            mappings (jsonb), version, is_active

questionnaire_instances     client_id, schema_id, form_id, answers (jsonb),
                            status, share_token, last_saved_at, submitted_at

filled_forms                client_id, form_id, instance_id, file_path,
                            status (draft|confirmed|validated|invalid),
                            validation_report (jsonb)

case_sections               key, label, sort_order, is_default
client_documents (existing) + section_id, section_order, order_mode
binders (existing)          + scope (section|final), section_id (nullable),
                              included_items (jsonb)

questionnaire_email_templates  name, subject, body_html, is_default
```

RLS:
- All tables: read = authenticated; write = admin/counselor/documentation; delete = admin.
- Public `questionnaire_instances` access only via edge function using `share_token` + service role (no anon RLS exposure).

---

## Edge functions

| Function | Purpose |
|---|---|
| `parse-form-fields` | Reads uploaded visa form PDF, extracts AcroForm fields + AI vision pass, generates draft questionnaire schema |
| `questionnaire-resolve` | Public token → returns schema + saved answers |
| `questionnaire-save` | Public token → partial save |
| `questionnaire-submit` | Public token → finalize, push answers into `client_profile` via mappings, log activity |
| `send-questionnaire-email` | Sends client link via Lovable Emails; triggered manually or auto on form attach |
| `fill-form` | Fills AcroForm fields in original PDF using answers, returns filled PDF stored in `filled_forms` |
| `validate-form` | Runs required-field + format + IRCC-rule checks on filled form, returns validation report |
| `build-section-binder` | Compiles ordered docs in a section into a single PDF |
| `build-final-binder` | Compiles selected sections / loose docs / filled forms into a final binder |

---

## Frontend changes

- **New pages**
  - `/forms-library` — admin: tree view, upload/replace/archive forms, edit schema, toggle auto-send, pick email template.
  - `/email-templates` (extends existing letter-templates concept) — manage questionnaire email templates.
  - `/questionnaire/:token` — public client-facing filler with section nav + save-and-resume.
- **ClientDetail.tsx — new tabs**
  - **Forms & Questionnaires** — per attached form: status, fill / send link / preview / confirm / validate.
  - **Sections** — Academics / Experience / Finance / Identity / Family / Other, each with multi-upload, per-doc cards, Auto/Manual ordering, "Build section binder" button.
  - **Final binder** — selection UI + create multiple binders.
- **Existing components reused**: `UploadZone`, `generateBinder` (extended for section + final scopes), `ShareLinkDialog`, `ClientProfileCard`.
- New components: `FormCard`, `QuestionnaireFiller`, `SectionPanel`, `DocumentOrderList` (drag-and-drop), `FinalBinderBuilder`, `FormPreviewDialog`, `ValidationReport`.

---

## Key technical notes

- **PDF form filling**: `pdf-lib` in edge functions can fill AcroForm fields and flatten or keep editable. Works for most IRCC forms (which are AcroForm). Some IRCC forms are XFA and require LiveCycle — for those we'll fill the visible field positions via overlay (less ideal but workable) and clearly mark them.
- **IRCC validate button**: cannot be clicked programmatically (it's Adobe-JS embedded in the PDF). We replicate the rules we encode per form in `validate-form`. The user can still open the filled PDF in Adobe Reader and click the real button — our validation is a strong pre-check.
- **Drag-and-drop**: use `@dnd-kit/core` (already common in the stack; will add if missing).
- **Storage**: new bucket `visa-forms` (private). Filled forms go to existing `client-documents` bucket under `filled-forms/`.
- **Email sending**: requires Lovable Emails domain setup (one-time). The send-link button stays disabled with a clear hint until the domain is configured.

---

## Build phases (so it's reviewable)

**Phase 1 — Forms Library + AI questionnaire generation**
DB tables, `/forms-library` page, upload/replace/archive, `parse-form-fields` edge function, schema editor.

**Phase 2 — Questionnaire fill + client share link**
Internal filler in client detail, public `/questionnaire/:token` page, save/resume, submit, mapping into `client_profile`. Email template editor + send button (auto/manual).

**Phase 3 — Form fill / preview / confirm / validate**
`fill-form`, preview dialog, confirm action, `validate-form`, validation report UI.

**Phase 4 — Sections, multi-upload, section binders**
`case_sections` table, section panels, multi-upload, drag-and-drop ordering with Auto/Manual toggle, `build-section-binder`.

**Phase 5 — Final binder(s) with selection**
Final binder builder UI, support multiple named binders per case, share/download.

---

## Out of scope (for now)

- Real-time collaborative editing of a questionnaire by team + client simultaneously
- True IRCC server-side validation (only IRCC's portal can do that — we replicate rules we know)
- Government-issuer verification calls (separate paid integrations — out of scope here)
- XFA-form perfect filling (we'll overlay where needed and flag)
- Translation of questionnaires to other languages

---

## Confirm before I build

1. **Email domain** — do you already have a sender domain (e.g. `notify.yourfirm.com`) or should I run domain setup as part of Phase 2? Without it the "send to client" button won't send real emails.
2. **Default section list** — confirm the seed sections: **Identity, Academics, Experience, Finance, Family, Other**. Add/remove?
3. **Auto-send default** — when a new form is attached to a case, default to **Manual** (team clicks Send) — confirm or switch to Auto.
4. **Phase order** — OK to ship in the 5 phases above, each merged when working? Or do you need everything in one shot?
