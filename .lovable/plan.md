## Root cause

The uploaded grade-12 marksheet is a **scanned, AES-encrypted PDF** (Producer: iOS Quartz PDFContext). I confirmed this with `pdfinfo`:

```
Pages: 1
Encrypted: yes (algorithm: AES)
```

In the browser:

- `pdf.js` (`extractFirstPageText`, `renderPdfPagesToJpegDataUrls`) throws on encrypted PDFs and the wrappers swallow the error, returning empty text and an empty image array.
- Without text or images, `classify-document` only sees the filename, falls back to "Other" (or low-confidence), and `owner_name` comes back null.
- The upload zone then forces the queue item into `needs_owner` ("owner not readable"), so the file never gets renamed or stored — exactly the symptom: "couldn't identify the document by reading the content".

I verified the classifier itself works perfectly when given a page image of the same document — it returned `Academic Marksheets`, owner "PATEL CHINTAN RAJNIKANT", confidence 1.0. So the only weak link is the browser-side rendering of encrypted/scanned PDFs.

## Fix plan

1. **Add a server-side PDF fallback to `classify-document`**
   - Accept an optional `pdf_data_url` (base64 PDF) in the request body.
   - When present, attach it to the Gemini request as an `image_url` data URL with `mime_type: application/pdf`, the same pattern already used by `extract-document-data` and `parse-form-fields`.
   - Gemini reads encrypted/scanned PDFs natively, so we get reliable type + owner_name even when pdf.js fails.
   - Keep all existing inputs (`snippet`, `page_image_data_urls`) intact — pdf_data_url is additive.

2. **Send the PDF bytes from the browser when text + images are empty**
   - In `src/lib/classifyDocument.ts` (and the upload-time call sites), if the PDF yielded zero usable text AND zero rendered page images, read the file as base64 and pass it as `pdf_data_url` to `classify-document`.
   - Cap size at ~12 MB to stay under the AI gateway payload limit.
   - For non-PDF / image uploads the existing path is unchanged.

3. **Make the upload owner-gate fall back gracefully for scanned PDFs**
   - In `SmartUploadZone.tsx`, when the case has a single applicant and the PDF is scanned/encrypted (browser saw zero text and zero rendered pages, so the OCR effectively had nothing to read), still allow the upload to proceed for review.
   - The user already sees a confirm step (`needs_owner`) — keep that, but pre-select the applicant with a clear note "Couldn't read this PDF in the browser (scanned/encrypted) — server is re-checking".
   - Once the server-side classify returns a valid owner that matches the roster, auto-fill the type/owner so the user just clicks confirm.

4. **Strengthen filename heuristics for marksheets**
   - Add `12th|grade\s*12|hsc|class\s*12|higher\s*secondary|gseb` aliases to the filename heuristic so even a no-OCR fallback names the file `Academic Marksheets`.
   - This makes the renamer produce a sensible name even if the AI step is unavailable (rate-limited / no credits).

5. **Apply the same encrypted-PDF fallback in `processToPdf`**
   - The current code already detects encryption and rasterizes. Verify it still works with this specific AES-encrypted PDF; if `pdf.js` refuses to render pages, fall back to keeping the original bytes (which is already the behavior under the IRCC size limit) and rely on the server for OCR.

6. **Deploy and verify**
   - Deploy `classify-document` with the new `pdf_data_url` path.
   - Test re-uploading the same marksheet PDF: expect type `Academic Marksheets`, owner `PATEL CHINTAN RAJNIKANT`, and a final filename like `2026-05-02_AcademicMarksheets_Applicant_PatelChintanRajnikant.pdf`.
   - Confirm the same fix doesn't regress the passport flow (which already works via `extract-document-data`).

## Files to change

- `supabase/functions/classify-document/index.ts` — accept and forward `pdf_data_url`.
- `src/lib/classifyDocument.ts` — read PDF bytes and send `pdf_data_url` when text + images are empty.
- `src/components/documents/SmartUploadZone.tsx` — soften the owner-gate when the browser couldn't read the PDF.
- `src/lib/classifyDocument.ts` (filename heuristics) — add 12th / HSC / GSEB / class-12 aliases.

No database changes required.