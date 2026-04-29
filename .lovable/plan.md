## Plan to stop wrong-candidate uploads

I found why the wrong IELTS still went through: the current classifier receives the filename together with extracted PDF text. In the latest network request, the uploaded file was named `jayesh yogi.pdf`, while the extracted document text did not reliably contain the candidate name. The AI then treated the filename as evidence and returned `owner_name: Jayesh Yogi`. That means it was not truly verifying the applicant from the document content.

### What I will change

1. **Never trust the filename for applicant identity**
   - Keep using filename as a hint for document type only, e.g. IELTS / Passport / Transcript.
   - For applicant/candidate ownership, the AI must ignore the filename completely.
   - The classifier must return a candidate name only if it can read it from the document text or the visual page image.

2. **Read document content before any auto-confirm/upload**
   - Update `classifyDocument` so it does not stop at filename heuristics.
   - For every upload, it will inspect document content before deciding owner:
     - PDFs: extract text and also send a rendered first-page image for visual/OCR reading.
     - Images: send a compressed preview image for visual/OCR reading.
   - This handles scanned IELTS score sheets where normal PDF text extraction is incomplete or garbled.

3. **Require proof from the document**
   - Update the `classify-document` backend function to return extra fields:
     - `owner_name`
     - `owner_confidence`
     - `owner_evidence` — the visible text/field that proves the name came from the document, not the filename.
     - `owner_source` — content/image only, never filename.
   - If the candidate name is not readable from the document, the function returns `owner_name: null` instead of guessing.

4. **Block uploads when the candidate cannot be verified**
   - In `SmartUploadZone`, auto-upload will happen only when:
     - a candidate name was read from document content,
     - the confidence is high enough,
     - the name matches a person on the current case roster.
   - If the document content says `Manav` but the case roster is `jayesh yogi, Anjali Sharma`, upload will stop and show a warning.
   - If the document content does not show any readable candidate name, upload will also stop with a warning like:
     - “Could not verify candidate from document content. Filename is not used for candidate matching.”

5. **Remove silent applicant fallback**
   - Current behavior can still fall back to the applicant in some cases.
   - I will remove that for verification failures.
   - No document will be auto-assigned to Jayesh just because Jayesh is the applicant or because the filename says Jayesh.

6. **Keep explicit override, but make it deliberate**
   - The user can still choose “Upload anyway” only from the warning state.
   - That override will be logged as an override, not a normal upload.
   - Normal “Confirm & upload” will be reserved for documents where the owner is actually verified or deliberately selected after a non-mismatch ambiguity.

7. **Fix filename sanitizing and candidate-based rename**
   - Ensure final filenames are based on the confirmed/verified person, for example:
     - `IELTSLanguageTest_Applicant_jayeshyogi.pdf`
     - `Passport_CoApplicant_anjalisharma.pdf`
   - Also sanitize document types so slashes like `IELTS / Language Test` do not create messy filenames or storage paths.

### Files to update

- `src/lib/classifyDocument.ts`
  - Always classify owner from content, not filename-only heuristics.
  - Send extracted text plus a first-page/image preview to the backend function.
  - Return owner evidence/source fields.

- `src/lib/extractFirstPageText.ts`
  - Add a helper to render only the first PDF page as a compact JPEG preview for visual reading.

- `supabase/functions/classify-document/index.ts`
  - Update the AI prompt and response schema.
  - Use multimodal input when a page image is provided.
  - Forbid using filename as candidate-name evidence.

- `src/components/documents/SmartUploadZone.tsx`
  - Require verified content-based owner evidence before auto-upload.
  - Stop uploads when content owner is missing or mismatched.
  - Improve warning messages so it is clear whether the issue is “wrong candidate” or “candidate not readable.”

- `src/lib/constants.ts`
  - Sanitize document type in generated filenames.

### Expected result

After this change, uploading Manav’s IELTS under Jayesh will not be accepted just because the filename says Jayesh. The system will read the document content/image first. If it reads Manav, it will block the upload on Jayesh’s case. If it cannot read any candidate name from the IELTS sheet, it will stop and ask for manual action instead of silently assigning it to Jayesh.