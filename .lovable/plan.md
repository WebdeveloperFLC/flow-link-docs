I’m sorry this has taken so many attempts. I can’t reverse or refund Lovable credits from inside the project; billing/credit reversals must be handled by Lovable support. What I can do here is stop the repeated guessing and apply a more deterministic fix to the actual failure shown in your screenshot.

Issue as shown in the screenshot
- The binder review panel is appearing, so the file is being recognized as a binder.
- But it is producing only one segment: pages 1–23 of 23, with type Passport.
- Uploading that one segment means the complete binder is still uploaded as one document instead of split into separate documents.
- The remaining routing problem is downstream: when a segment is still unresolved/Other/custom, it gets routed to Additional/Other.

Plan to fix

1. Make “Applicant Binder” always split into page-level review items when AI returns only one segment
- Update `src/lib/binderSplit.ts` so any PDF whose filename looks like a binder/package/bundle and has 3+ pages must never remain as a single 1–N segment.
- Treat a single full-document segment as a failed split even if the AI labels it as Passport with high confidence.
- Expand binder-name detection to include variations like `applicant binder`, `student binder`, `sanjana binder`, `complete binder`, `all documents`, `full file`, `visa file`, and similar names.

2. Fix `SmartUploadZone` fallback behavior shown in the screenshot
- In `src/components/documents/SmartUploadZone.tsx`, change the single-segment review fallback from “show one 1–23 segment” to “create one segment per page” for likely binders.
- Keep the manual review panel, but it should show pages 1, 2, 3, etc. as separate rows when AI cannot find true document boundaries.
- Add a clear warning inside the review card when the AI split was uncertain: “AI could not find boundaries; pages were split individually for review.”
- Keep manual merge available so you can merge page 1–2 into Passport, page 3–4 into another document, etc.

3. Prevent full binders from being uploaded as a single Additional/Other document
- Add a hard guard before `uploadBinder()` uploads: if a likely binder still has exactly one segment covering all pages, block upload and automatically convert it to page-level segments.
- This ensures clicking “Upload all (1)” can no longer upload the whole binder as one document.

4. Improve routing to Applicant / Co-applicant / Sponsor ownership
- Preserve the selected `ownerId` for every reviewed segment and store `person_id` correctly when uploading.
- Ensure the owner selector defaults to Applicant only as a suggestion, but remains editable per segment.
- Keep shared documents available through the Shared option.

5. Improve document-type classification for scanned/no-text pages
- Keep text-based rules where PDF text exists.
- For low-confidence page-level fallback segments, avoid trusting the binder filename as the document type.
- If a page can’t be confidently typed, label it as a review-needed custom segment instead of letting it silently become a whole “Other” binder.

6. Align section upload behavior
- In `src/components/clients/SectionBuilderCard.tsx`, apply the same hard rule: likely binder + one full-document segment = forced page-level split.
- Keep final section routing based on each segment’s type, not the original binder name.

7. Add diagnostics for future verification
- Add concise console logging around binder split decisions: page count, filename matched as binder or not, AI segment count, fallback reason, final segment count.
- If the issue persists, these logs will show exactly whether failure is from page-count reading, AI split response, PDF page extraction, or upload/routing.

What will change in the UI
- The screenshot should no longer show `Pages 1–23 of 23` as the only segment for an Applicant Binder.
- It should show individual page rows when the AI is unsure, so you can merge ranges manually before uploading.
- Uploading cannot proceed as one full binder if the system only has one full-range segment.

Credit reversal
- I can’t reverse credits from here. Please contact Lovable support for credit/billing review and include that this issue has required repeated failed attempts.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>