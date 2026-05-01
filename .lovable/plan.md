I found the current failure path: when the binder splitter returns fewer than 2 segments, the app still falls back to uploading the original multi-page PDF as a single document. Because “Applicant Binder” is not a real document type, the classifier labels the whole file as `Other`, so it lands in the Other/Additional section instead of being split.

Plan:

1. Prevent whole-binder fallback
   - Update both upload paths:
     - `SmartUploadZone` main smart upload
     - `SectionBuilderCard` section drop/upload
   - For multi-page PDFs, if the AI splitter returns only one segment or an `Other`/low-confidence segment, do not upload the original PDF as one file.
   - Instead, automatically create page-range segments for review/upload so the binder can never be saved whole as `Other` after splitter uncertainty.

2. Broaden binder detection
   - Replace the current filename-only `shouldFallbackToPageRanges(...)` behavior with a more robust “needs manual split fallback” rule.
   - Trigger fallback for:
     - filenames containing binder/bundle/combined/package/compiled/applicant documents
     - AI output with one segment covering all pages
     - AI output where the only segment is `Other`
     - AI output with incomplete/invalid boundaries
     - splitter errors on multi-page PDFs
   - Keep normal 1–2 page uploads unchanged.

3. Improve segment type detection before routing
   - Add a deterministic text-based classifier for each page/segment using existing document rules: passport, IELTS, transcript, offer letter, bank statement, GIC, tuition receipt, SOP, resume, IMM forms, employment, sponsor/affidavit, birth/marriage/police clearance, etc.
   - Use that deterministic classification before accepting `Other` from AI.
   - Preserve AI classifications when confident and valid.

4. Stop section uploads from silently misrouting binders
   - In `SectionBuilderCard`, when a binder split is uncertain, split page-by-page rather than inserting the original file into the current/Other section.
   - If a segment remains `Other`, use the segment label/page range as custom type, but never save the full source binder as the `Other` document.

5. Make Smart Upload review clearer
   - Ensure uncertain binders always appear in the “Binder split review” panel.
   - Default owner to the applicant, but keep the manual reassignment dropdown for applicant/co-applicant/sponsor/co-sponsor.
   - The user can merge adjacent page ranges and change the type/person before clicking Upload all.

6. Optional cleanup for the already-bad upload
   - The latest document for this client is currently stored as one `Other_Applicant_...pdf` in the legacy `Other` section.
   - After implementing the fix, I can either leave it for manual deletion or remove/reprocess it if you want. I will not delete it automatically unless you ask.

Technical notes:
- Files to update: `src/lib/binderSplit.ts`, `src/components/documents/SmartUploadZone.tsx`, and `src/components/clients/SectionBuilderCard.tsx`.
- No database schema changes are needed.
- I will not edit the generated backend client/types files.