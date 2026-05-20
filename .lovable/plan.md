# Fix the brochure preview ("not working")

## What's actually happening

The repaired storage object is fine — `file_path` is sanitized and the signed URL is valid. The failure is in the **iframe**:

- Chrome shows "This page has been blocked by Chrome" then a broken-image icon.
- Cause: Chrome's PDF viewer is increasingly refusing to render cross-origin signed URLs from Supabase Storage inside an `<iframe>` (especially large files, or when COOP/embedder headers don't match). The signed URL itself works — opening in a new tab is fine.
- Secondary cosmetic issue: the dialog still shows the original `ULeth%20InternationalViewbook%202026%20Screen.pdf` (literal `%20`s in `file_name`) because we only sanitized `file_path`, not the display name.
- Separate concern (out of scope here): extraction returned `{ ok: true, found: 1 }` — the brochure pipeline produces almost no fields. Flagging only; will tackle in a follow-up.

## Changes (frontend only, `src/institutions/components/AiReviewPanel.tsx`)

1. **Load the PDF as a blob, render the blob URL in the iframe.**
   - Replace the `createSignedUrl` → `setPreviewUrl` flow with: `supabase.storage.from("institution-documents").download(file_path)` → `URL.createObjectURL(new Blob([buf], { type: "application/pdf" }))`.
   - Keep a separate `downloadUrl` (the signed URL) for the "Open in new tab" / "Download" links so users still have a working escape hatch even if the blob is huge.
   - Revoke the object URL on unmount / when the doc changes.
   - Fallback panel: keep the 5s timeout + `onError` behavior, but the fallback links now use `downloadUrl` (signed URL) and a clean filename.

2. **Show a clean filename in the dialog title and download link.**
   - Add a small helper `prettyName(name)` that `decodeURIComponent`s and replaces `%20`/`+` with spaces so the title reads `ULeth InternationalViewbook 2026 Screen.pdf`. Used in `<DialogTitle>` and the Download `download={...}` attribute. (Pure display — DB row is untouched.)

3. **Loading state.**
   - While the blob downloads, keep the existing "Loading preview…" placeholder; flip `previewFailed` only after the 5s timeout once the blob URL is set.

## Out of scope

- No DB migration, no edge function changes, no changes to upload/sanitization (already done last turn).
- Brochure extractor quality (`{ ok: true, found: 1 }`) — tracked separately.
- No changes to other preview surfaces (`documentPreview.ts` already uses the blob approach for client docs).

## Files touched

- `src/institutions/components/AiReviewPanel.tsx`
