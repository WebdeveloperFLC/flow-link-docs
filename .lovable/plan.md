I found this is not fully fixed because there are still multiple upload/view paths behaving differently:

- The main Smart Upload path now has a preview button, but it still auto-uploads some files before the user can confirm the label.
- The “general/section upload” inside each document section does not show a pre-upload preview/review queue at all.
- Section upload stores the original file name and bytes directly, while Smart Upload renames/converts through `processToPdf`. That explains inconsistent naming and some view failures.
- Some PDF operations still re-save scanned PDFs through `pdf-lib` when splitting/merging/optimizing, which can break scanner-style PDFs. The first fix only covered one upload path.
- “View” currently relies on opening an object URL in a browser tab. This works for many PDFs but is unreliable for some scanned PDFs, pop-up handling, and files whose metadata/name is off.

Plan to fix it permanently across the documents module:

1. Unify document processing and naming
   - Create one shared upload helper used by Smart Upload and section/general upload.
   - All uploaded documents will go through the same safe pipeline:
     - Preserve already-valid under-limit PDFs without re-saving.
     - Convert images to PDF.
     - Use the same date/type/person/version naming convention.
     - Set consistent `mime_type = application/pdf` and `file_name`.
   - This removes the mismatch where section uploads currently keep names like the original scanned file while Smart Upload creates structured names.

2. Add pre-upload review/preview everywhere
   - For Smart Upload, change the behavior so classification becomes a suggestion and waits for confirmation before final upload.
   - For general/section upload, add a small review queue after selecting files:
     - Preview button for every file before saving.
     - Detected/suggested label shown.
     - Dropdown to correct the label.
     - Upload/confirm action.
   - This addresses “view option not available when uploaded in general upload section.”

3. Make PDF viewing more robust
   - Replace duplicated `onView` logic with a shared document preview helper.
   - It will:
     - Download the file.
     - Force PDF MIME type when appropriate.
     - Open in a controlled preview tab/window with a download fallback.
     - Show a clear error if the file bytes are already corrupted rather than silently failing.
   - Use this same helper in:
     - Client detail flat list.
     - Section cards.
     - Any queue preview buttons.

4. Stop scanner-PDF corruption in remaining paths
   - Update binder/page splitting so it does not use `pdf-lib` for PDFs that do not need splitting.
   - For actual page extraction/merging where re-saving is unavoidable, add a rasterized fallback when `pdf-lib` cannot safely copy/render pages.
   - Disable or harden the “re-optimize” path so it does not rewrite scanned PDFs in a way that breaks viewing.

5. Improve classification for the labels currently becoming `Other`
   - Extend aliases/heuristics for project-specific labels like:
     - `10th Marksheet`
     - `12th Marksheet`
     - `Academic Marksheets`
     - `English Language Proficiency Test`
     - `Statement of Purpose`
     - `Updated Resume`
     - `Digital Photo`
   - Ensure `Other` uses a meaningful custom label when unavoidable, instead of saving multiple files as `Other_Applicant_...pdf`.
   - Prevent duplicate version calculation races when multiple files are uploaded together so names do not repeat incorrectly.

6. Keep existing broken files understandable
   - New uploads should be fixed after the change.
   - Files already corrupted by previous processing may still need re-upload from the original scan because the original bytes may no longer exist in storage.
   - For existing non-corrupted files that are only mislabeled/named, I can add a safe rename/metadata repair pass separately if you want it.

Expected result:
- Every upload surface has preview before final save.
- Naming is consistent everywhere.
- Scanned PDFs are no longer unnecessarily rewritten.
- View uses one reliable preview path.
- This should not keep coming back for new uploads because the root causes are being removed, not patched in one component only.