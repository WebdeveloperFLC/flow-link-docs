I understand the repeated issue now: the system is trying to be “smart” by reading the owner name before upload. In this resume PDF, the name is clearly visible, but the in-app classifier did not detect it, so it shows the warning. Also the local preview button is using a browser blob/open-new-tab path that can fail in the preview environment.

I recommend simplifying the flow instead of continuing to depend on perfect name detection.

Plan:

1. Make Smart Upload a simple safe review queue
   - Keep auto-detecting document type, because it correctly detected `Resume`.
   - Stop treating “No name detected” as an error for normal uploads.
   - For single-person cases, show a clear confirmation card:
     - File name
     - Detected type
     - Assigned person: the applicant
     - Buttons: `View / Preview`, `Confirm upload`, `Skip`
   - The system will not auto-save anything until `Confirm upload` is clicked.
   - This keeps the safety benefit without blocking correct documents when OCR/name detection is imperfect.

2. Keep strict protection for real cross-case mismatches
   - If the AI clearly reads a different name from the document, keep the hard block.
   - Example: if it reads `Manav Yogesh Patel` while the case is `patel chintan rajnikant`, it will still show mismatch actions instead of uploading silently.
   - If the AI reads no name, it becomes “manual confirm required”, not an error.

3. Fix the Preview/View button permanently
   - Replace the current direct `window.open(blobUrl)` preview with a more reliable in-app PDF/image preview dialog.
   - For local files waiting in Smart Upload, clicking `View / Preview` will open a modal inside the app instead of relying on a browser popup/new tab.
   - For already-uploaded documents, reuse the same preview helper where possible and keep download fallback.
   - This avoids popup blockers and blob-tab failures.

4. Improve the UI layout shown in the screenshot
   - The current card is horizontally overflowing, hiding part of the `Confirm & upload` button.
   - I will make the review controls wrap/stack cleanly on the right panel width.
   - Rename the warning text from scary “No name detected” to something clearer like:
     `Name could not be auto-read. Please preview and confirm this belongs to this case.`

5. Remove confusing/unused general upload paths
   - Ensure the page consistently directs new uploads through the simplified Smart Upload review queue.
   - Avoid having multiple upload behaviours that can bypass the same checks.

Technical details:

- Update `src/components/documents/SmartUploadZone.tsx`:
  - introduce a safer `awaiting_review`/confirm flow for normal single-file uploads;
  - let `owner_not_readable` proceed only from the explicit confirm button;
  - keep `name_mismatch` guarded and blocked unless user chooses override/reassign;
  - fix the button layout in the amber review card.
- Update `src/lib/documentPreview.ts`:
  - add an in-app preview URL strategy for local and stored documents instead of only `window.open`.
- Add/reuse a lightweight preview dialog component in the upload UI for PDFs/images.
- Leave the auto-generated backend client/types files untouched.

Expected result:

- Chintan’s resume can be previewed and manually confirmed even if the AI misses the visible name.
- Documents are still not auto-uploaded into the wrong case.
- The View/Preview action works more reliably because it opens inside the app.
- The process becomes simpler: review first, confirm, then save.