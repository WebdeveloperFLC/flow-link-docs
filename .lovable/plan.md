## Goals

1. **"Add more" documents** on every client and on every template category — pick from a dropdown of standard document types (e.g. *Divorce Certificate*) without making them required.
2. **Auto-extract data** from each uploaded document, map it to client/CRM fields, and save it to the database.
3. **Optional Odoo CRM sync** so extracted client data flows into Odoo automatically.
4. Test the full flow before declaring done.

---

## 1. "Add more documents" — UX

**On the client page (`ClientDetail.tsx`):**
- New **"+ Add document type"** button above the checklist. Opens a small dialog with:
  - Searchable dropdown of `DOCUMENT_TYPES` (plus a few extras we'll add: *Divorce Certificate, Marriage Certificate, Police Clearance, Affidavit of Support, Sponsorship Letter, Property Documents, Employment Letter, Experience Letter, No Objection Certificate*).
  - "Required for this client" toggle (default off → "Optional").
  - Optional notes field.
- The added items are stored on the **client** (new column `extra_items jsonb` on `clients`) so they show up in the checklist alongside the template items but don't mutate the shared template.
- Each extra item supports the same upload / view / delete actions as template items, and is included in binders.

**In the template editor (`TemplateEditorDialog.tsx`):**
- The existing "Add document" picker already covers this. We'll add the new document types to the `DOCUMENT_TYPES` constant so they appear everywhere.

**Result:** counselors get one shared template per category, plus the freedom to add ad-hoc requirements per client (the divorce certificate scenario).

---

## 2. AI data extraction → CRM fields

**New table `client_profile` (1‑to‑1 with `clients`)** to hold structured CRM data extracted from documents:
```
client_id (pk, fk→clients)
date_of_birth, gender, nationality, place_of_birth
passport_number, passport_issue_date, passport_expiry, passport_country
marital_status, spouse_name
address_line1, address_city, address_state, address_country, address_postal
phone_alt, email_alt
ielts_overall, ielts_listening, ielts_reading, ielts_writing, ielts_speaking, ielts_test_date
highest_qualification, institution_name, graduation_year, gpa_or_percentage
employer_name, job_title, annual_income, currency
bank_name, account_balance, gic_amount, tuition_paid
emergency_contact_name, emergency_contact_phone
notes_extracted, last_extracted_at
```
All columns nullable. RLS: same pattern as `clients` (read by authenticated, write by counselor/admin).

**Extraction pipeline:**
- Extend the existing `classify-document` edge function (or add a sibling `extract-document-data`) so that after classification it also asks Gemini to return a structured JSON of fields relevant to the detected type. We'll use Lovable AI **tool calling** for reliable structured output (one tool schema per document category — passport, IELTS, transcripts, financials, civil status, etc.).
- Client side, after a successful upload, call `extract-document-data` with the file's first-page text (already extracted via `pdfjs-dist`). For images / scans, send the storage URL to Gemini multimodal so it can OCR.
- Merge the returned fields into `client_profile` using **field-level rules**:
  - Empty/null in DB → write extracted value.
  - Already set + matches → do nothing.
  - Already set + conflicts → don't overwrite; record the conflict in `activity_logs` and surface a **"Review extracted data"** badge on the client page so the counselor can resolve manually.
- Every extraction writes an `activity_logs` entry with the source document id and the fields touched (audit trail).

**Field mapping (examples):**
- Passport → `passport_number, passport_issue_date, passport_expiry, passport_country, date_of_birth, gender, nationality, place_of_birth, full_name (verify only)`.
- IELTS TRF → `ielts_*`.
- Academic transcript → `institution_name, highest_qualification, graduation_year, gpa_or_percentage`.
- Bank statement / GIC → `bank_name, account_balance, gic_amount, currency`.
- Marriage / divorce certificate → `marital_status, spouse_name`.

**UI:**
- New **"Profile" card** on `ClientDetail.tsx` showing all extracted fields grouped (Identity, Contact, Education, Finance, Travel). Inline-editable. Each field shows a small "auto-extracted from *Passport_Krishaa.pdf*" hint when filled by AI.
- "Re-extract from all documents" button to rerun the pipeline on the existing files.

---

## 3. Odoo CRM sync (optional, per-workspace)

**Approach:** push from our backend to Odoo's standard XML-RPC API (`/xmlrpc/2/object`, `res.partner` model). This is the universal Odoo integration path and works for both Odoo Online and self-hosted.

**Settings:** new section in `Settings.tsx` (admin only):
- Toggle "Enable Odoo sync"
- Odoo URL, database name, login, API key (stored as Supabase secrets: `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` — added via `add_secret` after the user confirms).
- "Test connection" button that calls a new `odoo-sync` edge function with action `ping`.

**Sync edge function `odoo-sync`:**
- Action `upsert_client`: takes `client_id`, reads `clients` + `client_profile`, maps to `res.partner` fields (`name`, `email`, `phone`, `street`, `city`, `country_id`, plus a few `x_studio_*` custom fields for application_id / country / status / IELTS scores). Creates or updates by external ID (`fovel_client_<uuid>`).
- Action `ping`: authenticates and returns Odoo version + user id.
- Triggered automatically (when sync is enabled) after a successful extraction merge, and exposed as a "Sync to Odoo" button per client.

**Failure behavior:** if Odoo is down or credentials invalid, log to `activity_logs` and surface an inline warning — never block the upload flow.

---

## 4. Testing strategy (done before claiming complete)

1. **Edge functions** — deploy `extract-document-data` and `odoo-sync`, then `curl_edge_functions` each:
   - `extract-document-data` with a sample passport text snippet → verify JSON shape.
   - `odoo-sync` with `action: "ping"` (using dummy creds first to verify error handling, then real ones once user provides them).
2. **DB migration** — run in test, verify RLS with `read_query`.
3. **End-to-end in preview**:
   - Add a doc type via "Add more" → confirm it appears, isn't required, accepts upload.
   - Upload a passport → confirm `client_profile` rows populate, audit log written.
   - Upload a conflicting doc (different DOB) → confirm conflict warning, no overwrite.
   - Toggle Odoo off → confirm no sync calls. Toggle on with bad creds → confirm graceful error.
4. **Read console + network logs** to make sure there are no red errors during upload, save template, or add-client (the flows that erroring last time).

---

## Files to change

**Frontend**
- `src/lib/constants.ts` — extend `DOCUMENT_TYPES`.
- `src/pages/ClientDetail.tsx` — "+ Add document type" dialog, render extra items in checklist, new Profile card, "Re-extract" button, optional "Sync to Odoo" button.
- `src/components/clients/AddDocTypeDialog.tsx` (new) — picker dialog.
- `src/components/clients/ClientProfileCard.tsx` (new) — grouped editable fields with extraction hints.
- `src/pages/Settings.tsx` — Odoo connection panel + test button.
- `src/lib/extractedFields.ts` (new) — field merge rules + conflict detection.

**Backend**
- New migration: `client_profile` table + RLS, `clients.extra_items jsonb` column.
- New edge function: `supabase/functions/extract-document-data/index.ts` (Lovable AI tool-calling, multimodal for images).
- New edge function: `supabase/functions/odoo-sync/index.ts` (XML-RPC client; actions `ping` / `upsert_client`).
- `supabase/config.toml` — register both functions (no `verify_jwt = false`; called by the app with auth).
- After confirmation, request secrets via `add_secret`: `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY`.

---

## Out of scope (call out if needed later)
- Pulling data **from** Odoo back into Fovel (one-way push for now).
- Bulk historical re-extraction across all existing clients (we add a per-client "Re-extract" button; full-tenant batch can come later).
- Per-field permissioning (everyone with counselor/admin can edit profile fields).

---

## What I need from you before building

1. Do you want me to add the **Odoo secrets** (`ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY`) immediately, or wire the UI first and prompt for secrets only when you click "Enable Odoo sync"? *(Recommendation: wire UI first, prompt on enable — so you can ship/test the rest without Odoo creds handy.)*
2. Confirm the extra document types I should pre-seed: **Divorce Certificate, Marriage Certificate, Police Clearance, Affidavit of Support, Sponsorship Letter, Property Documents, Employment Letter, Experience Letter, No Objection Certificate**. Add or remove any?
