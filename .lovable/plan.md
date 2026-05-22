## What I found

- The documents are not deleted: this client still has 7 active documents and 0 trashed documents.
- The “vanished” effect is caused by the new UI only rendering documents where `document.section_id === currentSection.id`.
- Some section matching is inconsistent: the template uses section keys like `academics`, `work_experience`, and `other_documents`, while the fallback mapper still prefers older keys like `academic`, `experience`, and `other`.
- The unified UI is also missing the previous “default document / required checklist” clarity because uploaded documents and default checklist rows are not displayed as one complete row per requirement.

## Plan

1. **Fix section mapping so documents reappear reliably**
   - Update the section inference helper to understand all active section keys:
     - `academic` and `academics`
     - `experience` and `work_experience`
     - `financial` and `finance`
     - `institutional`, `institution_docs`, `supporting`
     - `other`, `additional`, `other_documents`
   - In `ClientDetail`, render documents in a section by either:
     - their saved `section_id`, or
     - inferred section from their document type/custom title when saved section is missing, stale, archived, or mismatched.
   - Keep existing uploaded files; do not delete or recreate them.

2. **Restore the workflow as section-wise default checklist rows**
   - For each workflow/template section, show every default required/optional document row from the assigned template.
   - If an uploaded file matches that default row, show it inside the same row as `Ready`/`Verified` instead of separating it into a different uploaded-only list.
   - If no upload exists, keep the row visible as `Pending`/`Optional` with the default marker.
   - Show non-template uploaded files under a small “Additional uploaded documents” area inside the correct section, not as repeated top/middle/bottom sections.

3. **Make the UI cleaner and less confusing**
   - Rename the visual flow inside each card to:
     - section title + ready/total count
     - checklist/default rows
     - additional uploads
     - one upload button
     - one combine/binder button
   - Add a clear `Default` badge for template-required rows and an `Added` badge only for manually-added requirements.
   - Remove confusing empty drop-zone messaging when a section already has pending default rows; keep upload affordance compact.

4. **Restore documents that are effectively hidden**
   - Add a safe client-side recovery pass for active documents whose `section_id` points to archived/legacy sections or a wrong bucket.
   - Reassign them to the best active section based on document type/custom title.
   - This will restore visibility without touching storage files.

5. **Validate after implementation**
   - Confirm this client still shows all 7 active documents.
   - Confirm Canada PGWP shows all 17 default checklist documents section-wise.
   - Confirm uploaded documents appear against the correct default rows where possible.
   - Confirm remaining missing items stay visible as pending, not vanished.