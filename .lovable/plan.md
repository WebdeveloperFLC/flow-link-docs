I found why this is still failing for scanned PDFs dropped into the general upload zone.

Root problem:
- Scanned PDFs have no text layer, so `extractFirstPageText()` returns empty text.
- The current browser flow sends only rendered page images to the backend classifier and trusts the AI response.
- If the AI returns `Other`, the general upload flow immediately uploads it as `Other` into the Other section.
- The database confirms this happened: the latest failed uploads are saved as `Other_Applicant_ChintanRajnikantPatel.pdf` in the `Other` section, with activity logs showing `auto_classified: manual` and no confidence/type evidence. That means the app did not preserve a reliable classification result before upload.

Plan to fix it properly:

1. Strengthen scanned-PDF classification in the backend function
   - Update `classify-document` so scanned PDFs are handled as a first-class case, not as empty-text documents.
   - Use the provided page images as the primary input when text is empty.
   - Tighten the prompt so the model must choose the best matching allowed document type when visible evidence exists, and use `Other` only when the document truly does not match any known type.
   - Return a structured `reason`/evidence field for type decisions so the frontend can tell whether `Other` is a real classification or a failure.

2. Add deterministic visual/text safeguards before accepting `Other`
   - In `classifyDocument`, detect “scanned PDF with rendered images but no text”.
   - If backend returns `Other` with low confidence for a scanned PDF, do not treat that as final.
   - Use filename hints only as a last type fallback when the AI fails, but do not use filenames for owner matching.
   - Normalize alias labels from master document types, e.g. `Statement of Purpose` vs `SOP`, `English Language Proficiency Test` vs `IELTS / Language Test`, `Updated Resume` vs `Resume`, so valid types do not get rejected and converted to `Other`.

3. Stop auto-uploading unclassified scanned PDFs as `Other`
   - In `SmartUploadZone`, if a scanned PDF is still classified as `Other` without a meaningful custom type/evidence, keep it in the upload queue instead of uploading it to the Other section.
   - Show a required document-type dropdown and a clear message such as: “Could not confidently identify this scanned PDF. Please choose the document type.”
   - Only upload after the user chooses a real document type.
   - This prevents future files from silently landing in Other.

4. Fix the override/manual upload bug
   - The current override path can still upload `Other` with no custom type or stale item data.
   - Update override/confirm flows so selecting a type immediately uploads with that selected type, clears stale `customType` when not Other, and records `auto_classified` correctly.

5. Add debug logging for the next failure, without exposing private document data
   - Log classification source, confidence, whether text was empty, number of page images sent, chosen type, and backend reason.
   - Do not log full OCR text, page images, or sensitive document contents.
   - This gives hard evidence if another scanned PDF fails, instead of guessing.

6. Add regression tests
   - Add tests for:
     - scanned PDF / empty text + AI returns a valid known type → uploads to the correct type/section
     - scanned PDF / empty text + AI returns low-confidence `Other` → requires manual type selection, does not auto-upload to Other
     - alias normalization does not downgrade valid labels to `Other`
     - filename fallback can classify type, but never owner

Expected result:
- A scanned single PDF dropped in the general upload zone should either:
  1. be classified into the correct document type and section, or
  2. stop and ask you to choose the type.
- It should no longer silently upload to the Other section when classification fails.