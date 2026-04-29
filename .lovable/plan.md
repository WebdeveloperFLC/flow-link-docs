## Why phone & education aren't being captured

I traced the extraction path used after every upload (`SmartUploadZone` → `extract-document-data`) and inspected your CRM data for jayesh. Four real problems:

1. **No image OCR for field extraction.** `extract-document-data` only receives the PDF text layer (`extractFirstPageText`). Scanned IELTS sheets, passports and many transcripts have no usable text layer, so the AI sees garbage and returns nothing for phone, GPA, graduation year, etc. (The classifier was already upgraded to multimodal — this function was missed.)
2. **Only the first 1–2 pages are scanned.** Resumes/transcripts list education and contact details further down. `extractFirstPageText` caps at 2 pages.
3. **"Complete education" can't fit the schema.** `client_profile` has only one `highest_qualification` / `institution_name` / `graduation_year` / `gpa_or_percentage`. A resume with Bachelor + Master + diplomas collapses into one row, and details like field-of-study, start year and degree level are dropped entirely.
4. **Primary phone is on `clients.phone`, not on the profile.** Your record actually has `phone = 9428694317` on the `clients` row, but the CRM "Contact & address" card only shows `phone_alt`, which is null. So even when a phone is present, it looks "missing." There is also no code path that writes back to `clients.phone` from extracted data.

## What I'll change

### 1. Multimodal + multi-page extraction (fixes phone, GPA, dates, scanned docs)
- Update `supabase/functions/extract-document-data/index.ts` to accept either `snippet` (text) or `image_data_urls` (page JPEGs), and switch the model to `google/gemini-3-flash-preview` for vision.
- Update `src/lib/extractFirstPageText.ts` to add a small `renderPdfPagesToJpegDataUrls(file, maxPages = 3)` helper.
- In `SmartUploadZone.tsx` and `ClientDetail.tsx` (re-extract), always send:
  - text snippet from up to **3 pages** (raise from 6000 to ~12000 chars), AND
  - rendered JPEGs of the first 3 pages so the AI can OCR scanned/image-based docs.
- Loosen the prompt: "Extract every field clearly visible in the document, including those that appear in headers, footers, signature blocks, contact sections, or as labelled fields. Do not skip phone numbers found anywhere on the page."

### 2. Capture complete education history
- Extend the schema in `extract-document-data` to also return:
  - `education_history`: array of `{ degree, field_of_study, institution, city, country, start_year, end_year, gpa_or_percentage, level }`
  - Keep `highest_qualification` etc. as derived "best" values for backwards compatibility.
- Add a new table `public.client_education` (one row per qualification) with `client_id`, the fields above, `source_document_id`, `source_file_name`, `created_at`. RLS mirrors `client_profile` (read for authenticated; write for admin/counselor/documentation).
- Update `src/lib/extractedFields.ts`:
  - Keep current single-field merge behaviour.
  - When `education_history` is returned, upsert rows into `client_education` (dedupe by lowercase `degree + institution + end_year`).
  - When `highest_qualification` is null but `education_history` has entries, derive the highest by level/end_year and write it.
- Update `ClientProfileCard.tsx` "Education & language" section to show a list of all qualifications below the current single-row fields, with edit/remove buttons (admin/counselor/documentation only). Each row: degree, institution, years, GPA, source doc chip.

### 3. Phone numbers — capture both, sync primary, show both
- Extend the schema with `phone_primary` in addition to `phone_alt` (kept for explicit secondary numbers).
- After merge: if `clients.phone` is empty and we extracted `phone_primary`, write it back to `clients.phone` (logged as `client.phone_extracted`). If `clients.phone` already has a value and the extracted value differs, log a `profile.fields_conflict` and don't overwrite.
- Update `ClientProfileCard.tsx` "Contact & address" group to also display the primary `phone` (read from `clients.phone`) as the first field, alongside `phone_alt`. Editing the primary phone updates `clients.phone`.

### 4. Re-extract uses the same upgraded path
- `onReExtract` in `ClientDetail.tsx` already loops every PDF; switch it to the new multimodal call so users can fix existing records (like jayesh) in one click without re-uploading.

### 5. Sanity guards
- If both text snippet and images fail, surface a toast `Could not read content of <file>` instead of silently doing nothing.
- Log `profile.extraction_empty` activity so admins can see which docs produced nothing.

## Files to touch

- `supabase/functions/extract-document-data/index.ts` — multimodal input, expanded schema (`phone_primary`, `education_history[]`), looser prompt.
- `src/lib/extractFirstPageText.ts` — add `renderPdfPagesToJpegDataUrls`, raise text page cap to 3.
- `src/components/documents/SmartUploadZone.tsx` — send text + images, handle new fields.
- `src/pages/ClientDetail.tsx` — same upgrade in `onReExtract`; show new education list.
- `src/lib/extractedFields.ts` — write `education_history` to `client_education`, sync `phone_primary` → `clients.phone`.
- `src/components/clients/ClientProfileCard.tsx` — show primary phone, show full education list with edit.
- New migration: `client_education` table + RLS policies.

## Expected outcome

- Uploading jayesh's resume/IELTS again (or clicking **Re-extract**) will read scanned content, capture **9428694317** (already present) plus any alt phone, and persist **every** degree on the resume — Bachelor, Master, diplomas — visible in a list under Education on the CRM card. GPA, graduation year, field of study and institution will populate per-degree even when the source is a scanned PDF.
