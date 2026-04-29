## Letter Generation (Cover Letter, RCIC Letter, Statutory Declaration)

Generate editable .docx letters per client by merging the existing CRM/extracted data into uploaded sample templates. Includes a Templates manager, FutureLink branding for RCIC letters, and `[MISSING: field]` markers for unresolved placeholders.

### 1. Sample upload + Templates manager

- New page `src/pages/LetterTemplates.tsx` (linked in sidebar under Templates).
- Three template slots: **Client Cover Letter**, **RCIC Letter**, **Statutory Declaration**. Each supports:
  - Upload `.docx` sample
  - Preview detected placeholders
  - Mark active version (history kept)
  - Replace anytime
- Storage bucket `letter-templates` (private). New table `letter_templates` (id, kind, version, file_path, placeholders jsonb, is_active, created_by, created_at).
- On upload: parse the .docx server-side (edge function) and auto-detect placeholders. Supports two styles so your samples work as-is:
  - Curly tokens like `{{client_name}}`, `{{passport_number}}`
  - Bracketed prompts like `[CLIENT NAME]`, `[PASSPORT NO.]` — auto-mapped to CRM fields via a synonyms table.
- After upload, user sees a mapping screen to confirm/override which CRM field each placeholder maps to. Mapping is saved on the template.

### 2. Branding & RCIC profile (Settings)

- New section in `src/pages/Settings.tsx` → "Firm & RCIC profile":
  - Firm name, address, phone, email, website
  - Logo upload (FutureLink logo) → `branding` bucket
  - RCIC name, RCIC number, signature image upload, jurisdiction
- Stored in new `firm_profile` table (singleton row, admin-only RLS).
- RCIC letter template auto-receives header (logo) and footer (signature block) injected at generate time, regardless of what's in the sample.

### 3. Generation flow

On client detail page, new card **"Letters"** with three buttons: Generate Cover Letter / RCIC Letter / Statutory Declaration.

Click → edge function `generate-letter`:
1. Loads active template + mapping + firm profile.
2. Loads `client_profile` + `clients` row + relevant document metadata for that client.
3. Builds a value map for every placeholder. For any unresolved placeholder → inserts a yellow-highlighted `[MISSING: field_name]` run.
4. Performs in-place .docx token replacement (run-merge aware, preserves formatting). For RCIC letter: injects header image + signature.
5. Saves the resulting .docx to `client-documents/<client_id>/letters/<kind>_<clientName>_<timestamp>.docx` and inserts a row in `documents` table (category = "Letters").
6. Returns signed URL → browser auto-downloads.

A "Re-generate" action overwrites with a new versioned filename. All generations are logged in `activity_logs`.

### 4. Missing-field handling

- Template parser stores required vs optional placeholders.
- Before generation, the UI shows a quick checklist of missing required fields with two options:
  - "Fill now" → inline form to update CRM, then generate
  - "Generate anyway" → produces .docx with `[MISSING: ...]` highlighted yellow
- Missing-field events written to `activity_logs` so you can audit.

### 5. Technical details

- **Edge functions**:
  - `parse-letter-template` — unzips .docx, scans `word/document.xml` for both placeholder styles, returns deduped list + suggested CRM-field mapping (uses Lovable AI Gemini for fuzzy mapping when no synonym match).
  - `generate-letter` — fetches template, performs run-aware token replacement using `docxtemplater` (works well for `{{token}}`) plus a custom regex pass for `[BRACKETED]` placeholders. Handles image injection for logo/signature via `docxtemplater-image-module-free`.
- **Libraries**: `docxtemplater`, `pizzip`, `docxtemplater-image-module-free` (all run inside Deno via npm: specifiers).
- **DB migrations**:
  - `letter_templates` table + RLS (admin write, authenticated read)
  - `firm_profile` table + RLS (admin write, authenticated read)
  - `branding` and `letter-templates` storage buckets + policies
- **CRM field resolver** (`src/lib/letterFields.ts`): central function that takes a placeholder name and returns the value from `client_profile` / `clients` / `firm_profile`, with synonym fallback (e.g. `dob` → `date_of_birth`).
- **UI components**:
  - `src/components/letters/LetterCard.tsx` (on ClientDetail)
  - `src/components/letters/MissingFieldsDialog.tsx`
  - `src/pages/LetterTemplates.tsx`
  - Settings additions in existing `Settings.tsx`

### 6. Testing before release

- Unit tests for `letterFields.ts` resolver (synonym matching, missing → marker).
- Edge function smoke test that takes a fixture .docx with mixed `{{token}}` + `[BRACKETED]` placeholders and verifies all known fields fill, unknown ones become `[MISSING: ...]`.
- Manual QA: after deploy I'll generate one letter for the active client (Krishaa), download the .docx, and confirm structure before reporting back.

### Files to create / modify

- New: `supabase/functions/parse-letter-template/index.ts`, `supabase/functions/generate-letter/index.ts`, `src/pages/LetterTemplates.tsx`, `src/components/letters/LetterCard.tsx`, `src/components/letters/MissingFieldsDialog.tsx`, `src/lib/letterFields.ts`, migration for `letter_templates` + `firm_profile` + buckets.
- Modified: `src/pages/ClientDetail.tsx` (add LetterCard), `src/pages/Settings.tsx` (firm profile section), `src/App.tsx` (route), sidebar nav.

### Next step after approval

Once you approve, I'll switch to build mode and ask you to drop the three sample .docx files (Cover Letter, RCIC Letter, Statutory Declaration) plus the FutureLink logo and your signature image — then wire everything end-to-end and verify by generating one of each for the current client.