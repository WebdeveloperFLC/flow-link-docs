## Goal

You uploaded the 3 sample letters (Applicant cover, RCIC, Statutory Declaration) and the FutureLink logo. Wire them into the system that's already built, refine the generator using the patterns visible in your samples, and verify with a real generation before declaring done.

## What I observed in your samples

- **Applicant letter**: numbered sections (Purpose / Ties / Finances / Sponsor / Compliance / Conclusion), addressed to "The Visa Officer, IRCC", signed by both applicants.
- **RCIC letter**: From block with RCIC name + R-number, dated, "Summary of Refusal Concerns" section, signed by RCIC.
- **Statutory Declaration**: Canadian legal format with `CANADA / Province / City` brace block, numbered solemn declarations (1–11), "DECLARED BEFORE ME" + Commissioner of Oaths block.

These are richer than the current prompts assume — the generator needs sample-aware structure, not just a "style reference".

## Plan

### 1. Seed branding + templates automatically (no manual setup needed)

- Copy `FLC_logo_1_-01-2.png` → `src/assets/flc-logo.png` and upload to `branding` bucket as `firm-logo.png`.
- Upload the 3 .docx samples to `letter-templates` bucket under `samples/cover.docx`, `samples/rcic.docx`, `samples/statdec.docx`.
- Insert/upsert a `firm_profile` row pre-filled with: firm name "FutureLink Consultants", tagline "A way to career abroad", RCIC name "Santosh D. Ramrakhiani", RCIC # "R506940", logo URL pointing at the uploaded file. (You can edit any of this later in Settings.)
- Insert `letter_templates` rows for each of the 3 kinds, with the parsed text body as the `style_reference` (skip the parse edge function call — we already have the parsed content).

### 2. Tighten the `generate-letter` edge function

- Pass the **full sample text** (not just an extracted style summary) to Gemini as a few-shot example, with instructions to mirror structure/headings/tone but substitute the new client's facts.
- Add kind-specific scaffolding hints:
  - `cover` → numbered sections, "Yours sincerely" + applicant name(s).
  - `rcic` → From/To/Date/Subject block, signed by RCIC from `firm_profile`.
  - `statdec` → Canadian legal brace header (CANADA / Province / City), numbered "DO SOLEMNLY DECLARE THAT" clauses, "DECLARED BEFORE ME" footer.
- Pull all available client data from `clients` + `client_profile` + extracted document fields and feed it as structured JSON to the model.
- Keep `[MISSING: field]` yellow-highlight markers for any unresolved facts.
- Inject the firm logo (PNG bytes from the `branding` bucket) into the DOCX header for `rcic` letters; signature image as footer if uploaded.

### 3. Test before handing back (mandatory, in build mode)

- Pick the current client (`afa47723-…`) and call `generate-letter` for each of the 3 kinds via `supabase--curl_edge_functions`.
- Download each generated `.docx`, convert to PDF via LibreOffice, render page 1 as JPG, and visually inspect for:
  - Logo present (RCIC letter)
  - Correct salutation / signature block
  - Statutory declaration legal header intact
  - No template leakage (e.g. literal "{{token}}" strings)
  - `[MISSING:]` markers only where data genuinely isn't in the CRM
- Fix any issues found, re-test, and only then report back with the QA summary.

### 4. UI polish

- On `LetterTemplates.tsx`, show a "Seeded from FutureLink samples ✓" badge when the seeded rows exist so you know the defaults are loaded.
- On the `LetterCard` in ClientDetail, surface the list of `[MISSING]` fields after generation as a clickable list that jumps to the relevant CRM field.

## Files to touch

- **New**: none (all infra exists).
- **Edit**: `supabase/functions/generate-letter/index.ts` (sample-aware prompt + logo injection), `src/components/letters/LetterCard.tsx` (missing-fields surfacing), `src/pages/LetterTemplates.tsx` (seeded badge).
- **Migrations**: one to upsert `firm_profile` defaults + 3 `letter_templates` rows.
- **Assets**: `src/assets/flc-logo.png`, plus storage uploads to `branding/` and `letter-templates/samples/`.

## What you don't need to do

- No manual upload in Settings or Letter Templates — I'll seed all of it from the files you just provided.
- No need to re-upload the logo or samples.

Approve and I'll switch to build mode, seed everything, deploy the updated function, and run the 3-letter test before declaring done.