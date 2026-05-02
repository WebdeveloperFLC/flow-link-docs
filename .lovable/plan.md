## Root cause found

The uploaded passport is a scanned/image-based PDF. The app currently tries to render PDF pages to JPEG in the browser before calling the extraction backend. In this case, the re-extract flow is reaching the document but producing no usable input, so the backend is not receiving text/images to extract from and the UI reports:

```text
Re-extracted 0/1 · 0 new fields
```

I confirmed the attached passport is readable visually/OCR and contains these fields:

```text
Passport No: W9166345
Name: CHINTAN RAJNIKANT PATEL
DOB: 2004-12-20
Sex: M
Place of Birth: VADODARA, GUJARAT
Issue Date: 2023-01-06
Expiry: 2033-01-05
Nationality/Country: IND
Address: PATEL FALIYU NAVI JAMBUVAI NEAR NIMETA, AJWA ROD, VADODARA, GUJARAT, INDIA, PIN 390019
File No: AH3067379579623 (must not be used as passport number)
Spouse: blank (must stay empty)
```

The current extractor works if it is given OCR/text, but the client-side PDF rendering/text extraction path is the weak link.

## Fix plan

1. **Move re-extraction to a backend-driven path**
   - Update `extract-document-data` so it can accept a `document_id`.
   - The backend function will download the stored PDF directly from private storage using secure server credentials.
   - This avoids relying on browser-side PDF rendering for scanned documents.

2. **Add robust scanned-PDF OCR fallback**
   - If the browser provides no text/images, the backend will send the original PDF bytes to Lovable AI as a PDF data URL.
   - This follows the already-working pattern used elsewhere in the project for AI PDF reading.
   - The function will still support the existing `snippet` + `image_data_urls` path, so uploads and other callers keep working.

3. **Strengthen passport-specific deterministic parsing**
   - Keep the existing MRZ check-digit validation.
   - Add a fallback parser for visible passport labels when MRZ OCR is incomplete or unavailable.
   - Ensure `File No.` and `Old Passport No.` are never written as `passport_number`.
   - Ensure blank spouse fields do not populate `spouse_name` or `marital_status`.

4. **Update the Re-extract button flow**
   - Pass `document_id` to `extract-document-data` during re-extraction.
   - Do not skip a document just because browser text/image extraction is empty.
   - Surface clearer errors, e.g. `no_input`, `ai_error`, or `no_credits`, instead of silently counting it as 0.

5. **Apply the same fallback to upload-time extraction**
   - Section uploads and smart uploads will also pass the inserted `document_id` to the extractor.
   - If browser OCR fails during the background extraction after upload, the backend can still read the stored file.

6. **Verification after implementation**
   - Re-run the extraction against the current client/document.
   - Confirm `client_profile` is populated for the new client with the passport fields above.
   - Confirm the toast changes from `Re-extracted 0/1 · 0 new fields` to a successful field count.

## Files to change

- `supabase/functions/extract-document-data/index.ts`
- `src/pages/ClientDetail.tsx`
- `src/components/clients/SectionBuilderCard.tsx`
- `src/components/documents/SmartUploadZone.tsx`

No database schema changes are needed.