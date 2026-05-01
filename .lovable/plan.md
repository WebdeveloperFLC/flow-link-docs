# Fix scanned-PDF "Failed to load" + add preview before labeling

## Problem 1 — Scanned PDF won't open after upload

**Root cause:** `src/lib/processFile.ts` always pipes uploaded PDFs through `pdf-lib` (`PDFDocument.load` → `save({ useObjectStreams: true })`). For many scanned PDFs this is fine, but pdf-lib silently mangles a number of valid scanner outputs (XFA shells, linearized files, certain JBIG2/JPEG2000 streams, broken xref tables it "fixes"). The re-saved bytes then fail to render in pdfjs/Chrome with "Failed to load PDF document". The current rasterize fallback only triggers for *encrypted* PDFs, not for these structurally-fragile scans.

**Fix:** Trust the original bytes whenever they're already under the IRCC limit. Only re-process when we actually have to (oversize, encrypted, or image-based input).

Changes in `src/lib/processFile.ts`:

1. If the input is a PDF and `file.size <= TARGET_BYTES (3.8 MB)` → return the original `File` as-is (just renamed to `${baseName}.pdf`). No pdf-lib round-trip. This alone resolves the broken-scan case for the vast majority of uploads.
2. If oversize → try pdf-lib re-save first; if the re-saved file is still oversize OR pdf-lib throws → fall through to the existing rasterize-to-JPEG rebuild path (already encryption-safe).
3. Keep encryption detection: if `PDFDocument.load` throws, still rasterize.
4. Image and unknown-type branches stay unchanged.

This removes the "always re-save" step that's corrupting scanned PDFs while preserving size compliance and the encrypted-file safety net.

## Problem 2 — No way to view a document before labeling it

Right now `SmartUploadZone` auto-classifies and uploads in one shot; only binder *segments* land in `awaiting_review`. Single uploads never give the user a chance to look at the file before a label is written.

**Fix:** Add a "Preview" affordance on every queue item that's currently in `awaiting_review`, `needs_label`, or `owner_mismatch` state, so the user can open the local `File` (already in memory — no storage round-trip needed) before confirming the label or owner.

Changes:

1. In `SmartUploadZone.tsx`, add a small `Preview` button next to the type/owner controls for any non-uploaded queue item. Clicking it does:
   ```ts
   const url = URL.createObjectURL(item.file);
   window.open(url, "_blank");
   setTimeout(() => URL.revokeObjectURL(url), 60_000);
   ```
   No new dependency, works for PDFs and images.
2. For items that auto-classified to a known type and uploaded immediately, expose the same Preview button while they're in flight (status `processing` / `uploading`) so users can sanity-check what just got assigned.
3. Optional nicety: change the default behavior so that classification produces a *suggestion* but waits for user confirmation before uploading. **Keeping current auto-upload as default** to avoid disrupting existing workflows; preview is the additive change. If you'd prefer hard "always confirm before upload", say so and I'll flip the default.

## Files to change

- `src/lib/processFile.ts` — rewrite the PDF branch as described.
- `src/components/documents/SmartUploadZone.tsx` — add Preview button in the queue-item row renderer.

## Out of scope

- No DB migration.
- No edge function changes. Existing `client-documents` files that were already corrupted by the old re-save will still be broken; re-uploading them (or running `process-large-file`) won't help because their source bytes were lost. New uploads after this fix will render correctly.
- OCR/text-extraction quality (the stack-overflow snippet about Vision-API OCR fallback) is a separate concern from rendering and isn't needed here.
