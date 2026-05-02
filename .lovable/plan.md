I found the uploaded IELTS row in the database. It was saved correctly as:

- `document_type`: `IELTS / Language Test`
- `custom_type`: `English Language Proficiency Test`
- checklist item name: `English Language Proficiency Test`

So the issue is not the upload or extraction. The likely failure is in the checklist matching/render path after the new workflow-template section changes, especially for legacy templates with no `groups` and for aliases/custom titles.

Plan:

1. Make checklist matching more reliable
   - Replace the current exact/alias-only `docByType` logic with a normalized matcher that checks:
     - `document_type`
     - `custom_type`
     - `file_name`
     - known aliases like `IELTS / Language Test`, `IELTS Result`, `English Proficiency Test`, and `English Language Proficiency Test`
   - Ensure `IELTS / Language Test` always counts as ready for `English Language Proficiency Test` and vice versa.

2. Fix sectioned checklist rendering for legacy templates
   - If a template has no `groups`, render all `template.items` in the checklist as before.
   - This is important for the affected client because their assigned template currently has `groups = null`.

3. Re-run checklist linking after section uploads
   - In `SectionBuilderCard`, after inserting a document and after extraction starts, ensure the uploaded document row is linked to the exact checklist item name.
   - Pass the best display label into `markChecklistItemReady` so uploads classified as `IELTS / Language Test` are linked to `English Language Proficiency Test`.

4. Improve manual rename/type changes
   - When a section document is renamed or retyped, re-run the same checklist linking logic so status updates immediately without requiring another upload.

5. Add a safety repair on client load
   - When opening a client, detect already-uploaded documents that match checklist aliases but have not been linked cleanly.
   - Update their `custom_type` to the exact checklist item name in the background, then refresh the checklist.
   - This should fix the existing IELTS upload without requiring the user to delete/reupload it.

Files to update:
- `src/lib/checklist.ts`
- `src/pages/ClientDetail.tsx`
- `src/components/clients/SectionBuilderCard.tsx`
- possibly `src/components/documents/SmartUploadZone.tsx` if the advanced split/upload path needs the same stronger label passing

No database schema change is needed.