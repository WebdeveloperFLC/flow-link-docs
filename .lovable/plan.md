# Fix client-form ↔ visa PDF field mapping

## Root cause

After investigating the pipeline, the "filled PDF" step **does not exist in the codebase**:

- `parse-form-fields` extracts AcroForm/XFA fields and builds a questionnaire schema. ✓
- `questionnaire-resolve` / `questionnaire-save` show the questionnaire and store answers as JSON. ✓
- **There is no edge function or client code that opens the original PDF and writes the answers into its form fields.** The `filled_forms` table is defined but nothing inserts into it.

Whatever "filled PDF" the user is seeing is therefore either empty, stale, or produced by some unrelated flow — which fully explains "wrong fields, shifted, truncated, doesn't match IRCC structure."

Two additional latent bugs that will cause mis-mapping even after a fill step is added:

1. **Wrong key used for mapping.** In `parse-form-fields`, each field is stored with a sanitized `id` (e.g. dots/spaces stripped, duplicates suffixed `_2`) while the original PDF field name is kept in `pdf_field`. The questionnaire UI currently keys answers by `id`. Filling by `id` against the PDF will silently miss or collide. **We must always look up by `pdf_field` when writing back.**
2. **XFA forms aren't handled.** Most IRCC IMM PDFs (IMM 5257, 5645, 0008, etc.) are dynamic XFA. `pdf-lib`'s `getForm().getTextField(name).setText(...)` only works for AcroForm. For XFA we have to inject values into the XFA `<datasets>` stream so Adobe/Foxit/Chrome render them in the right place, then optionally flatten.

## What we'll build

### 1. New edge function: `fill-form`

Input: `{ instance_id }` (or `{ client_id, form_id, answers }` for ad-hoc).

Steps:
1. Load the `questionnaire_instance` → answers, schema, form.
2. Download the original PDF from `visa-forms` storage.
3. Detect form type:
   - **AcroForm** path: `pdf-lib` → for each schema field with a `pdf_field`, find the matching widget by name and `setText` / `check` / `select` based on `type`. Apply formatting (date `YYYY-MM-DD` → form's expected mask, uppercase where required, `maxLength` truncation).
   - **XFA** path: re-extract the XFA package, parse `<datasets>` XML, set each `<field-name>value</field-name>` node by SOM expression (`$.form1.page1.fieldName`), re-encode and write back the stream. Keep AcroForm widgets in sync where they exist (hybrid PDFs) so non-Adobe viewers still display values.
4. Optionally flatten (configurable per form via `visa_forms.requires_validation`).
5. Upload to `client-documents` storage and insert a `filled_forms` row (`status='draft'|'submitted'`, link to `instance_id` and `form_id`).
6. Log `activity_logs` event `form.filled`.

### 2. Mapping correctness fixes

- Use `pdf_field` (not `id`) as the canonical PDF target everywhere downstream of `parse-form-fields`. Update `Questionnaire.tsx` `answerKeyFor` to **prefer `pdf_field`** so saved answers are already keyed by the exact PDF name. Fall back to `id` only when `pdf_field` is absent.
- Add a server-side reconciliation pass in `fill-form`: build a name-set from the actual PDF and warn/log any answer key that has no matching field. Surface this in the response so the UI can show a "Mapping report".
- Preserve order, formatting hints (`type: date|number|yes_no|dropdown`), and `maxLength` (read from XFA `<value><text maxChars="...">` or AcroForm `MaxLen`) when writing.

### 3. UI: "Generate filled PDF" action

In `ClientFormsCard.tsx` add a button per submitted questionnaire:
- Calls `fill-form` edge function.
- Shows the mapping report (filled / skipped / unmatched fields).
- Adds the resulting PDF to the client's documents (auto-sectioned to "Visa Forms") and to `filled_forms`.

### 4. Re-parser improvement (small but important)

In `parse-form-fields`:
- Stop sanitizing `id` away from the original name when no collision exists — keep `id === pdf_field` whenever safe. Reduces drift between schema id and PDF name.
- Capture `max_length` and `format` (date mask, numeric, uppercase) from XFA/AcroForm and store on the field, so the filler can format correctly.

## Files to add / edit

- **New:** `supabase/functions/fill-form/index.ts` — AcroForm + XFA filler
- **Edit:** `supabase/functions/parse-form-fields/index.ts` — keep names verbatim, capture maxLength/format
- **Edit:** `src/pages/Questionnaire.tsx` — key answers by `pdf_field` first
- **Edit:** `src/components/clients/ClientFormsCard.tsx` — "Generate filled PDF" + mapping report dialog
- **No DB migration needed** — `filled_forms` already exists with the right columns.

## Out of scope (call out)

- Signature/photo widgets — left blank, flagged in the mapping report.
- Re-flowing IRCC barcodes (the 2D barcode at the end of XFA forms) — these regenerate inside Adobe Reader when the user opens the file, not on our server. We document this in the report.

## Acceptance test

Upload IMM 5257 → generate questionnaire → fill a few personal/passport/employment fields → click "Generate filled PDF" → open the PDF in Adobe Reader: every value lands in the correct labeled box, dates use the form's mask, no shifted/truncated content, and the mapping report lists 0 unmatched fields for those entered.
