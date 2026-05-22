
## Problem

In the uploaded sample `Financial_Binder_DMS.pdf` (22 pages), only pages 18–20 render visible content; pages 1–17 and 21–22 are blank. The cover/TOC and one source statement survived, but every other appended source PDF came out empty.

Root cause: both `src/lib/combinePdfs.ts` and `src/lib/binder.ts` rely solely on `pdf-lib`'s `PDFDocument.copyPages(...)`. That call is known to silently drop page content for source PDFs that use any of: compressed object streams (XRef streams), Form XObjects with indirect resources, AcroForm fields, scanner-flattened pages, certain image-only PDFs, or LinearizedDoc layouts. Many of our source documents (bank/MF statements, government letters, scanned passports) fall in those categories — hence the blank pages.

Two secondary issues compound it:

1. We never validate the merged output. The user gets a blank-looking binder with no warning.
2. The merge runs in the browser on potentially 100+ MB of PDFs, which is slow and memory-heavy.

## Fix

Move PDF combination to a Deno edge function with a robust two-pass strategy, and have the frontend call it instead of merging client-side.

### 1. New edge function: `supabase/functions/combine-pdfs/index.ts`

Input:
```
{
  client_id: string,
  paths: string[],             // ordered storage paths in client-documents bucket
  output_path: string,         // where to upload the merged PDF
  cover?: {                    // optional cover/TOC metadata for final binder
    title: string,
    client_name: string,
    application_id?: string,
    country?: string,
    application_type?: string,
    template_name?: string,
    items?: { name: string; mandatory: boolean; notes?: string; matched: boolean }[]
  }
}
```

Algorithm per source PDF:
1. Download bytes from `client-documents` using the service-role client.
2. Try `PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })` then `copyPages`.
3. After copy, verify each appended page has a non-empty content stream and at least one resource (Font, XObject, or non-trivial Contents length > 50 bytes). If any copied page fails the check, discard the just-copied pages and fall back to step 4 for that file.
4. **Rasterization fallback**: render every page of the source PDF to a JPEG (150 DPI, quality 80) using `pdfjs-dist` running in Deno via `npm:pdfjs-dist@4`. Embed each JPEG as a full-page image in the output PDF using `pdf-lib`'s `embedJpg` + `drawImage`. This always produces a visible page even when `copyPages` can't preserve the original structure.
5. If both methods fail (corrupt file, unsupported encryption), insert a single placeholder page noting the file name and storage path so the user knows which source failed.

The function also writes a small `merge_report` row to a new `public.binder_merge_reports` table (optional, low priority — can defer) listing per-file outcome: `copied`, `rasterized`, or `failed`.

Cover/TOC: when `cover` is provided, prepend the cover + TOC pages using the same code currently in `src/lib/binder.ts` (ported to the edge function). When `cover` is omitted, just the merged pages are returned (current `combinePdfsFromStorage` behavior).

Upload the resulting PDF to `client-documents` at `output_path` with the service-role client (bucket already exists, RLS bypassed by service role). Return `{ ok: true, storage_path, size_bytes, report }`.

`verify_jwt = true` (default) so the calling user's session is checked; inside the function, verify the JWT, then re-check `can_view_client(uid, client_id)` and `can_upload_client(uid, client_id)` via the user's anon-key client before doing service-role work.

### 2. Frontend wiring

- `src/lib/combinePdfs.ts`: replace the in-browser merge with `supabase.functions.invoke('combine-pdfs', { body: { paths, output_path } })`. Return the resulting storage path (and a freshly created signed URL for download) instead of raw bytes.
- `src/lib/binder.ts`: replace the in-browser `generateBinder` with an invocation that also passes the `cover` payload. The cover page rendering logic moves into the edge function unchanged.
- `src/components/clients/FinalBinderPanel.tsx`: adapt `buildOne` — instead of building bytes locally and uploading, call the new function with a target `output_path` it already computes, then download via signed URL for the user. Keep the `binders` table insert and `logActivity` call client-side as today.
- `src/components/clients/CustomBindersPanel.tsx`: same refactor pattern.
- The legacy in-browser merge helpers stay available behind a `legacy` export for tests but are no longer used in production paths.

### 3. Test

Add `src/test/combinePdfs.test.ts` covering the invoke wrapper (mock `supabase.functions.invoke`) — pure unit, no real PDF merge needed.

After deployment, ask the user to regenerate the same Financial binder; verify all source pages render content.

## Out of scope

- No DB schema changes (the optional `binder_merge_reports` table is deferred until needed).
- No UI/UX changes to the binder panels beyond the function call swap.
- No changes to upload, splitting, or section logic.

## Files touched

- `supabase/functions/combine-pdfs/index.ts` (new)
- `src/lib/combinePdfs.ts` (rewrite to invoke)
- `src/lib/binder.ts` (rewrite to invoke, keep cover payload shape)
- `src/components/clients/FinalBinderPanel.tsx` (use new helper, fetch signed URL)
- `src/components/clients/CustomBindersPanel.tsx` (same)
- `src/test/combinePdfs.test.ts` (new)
