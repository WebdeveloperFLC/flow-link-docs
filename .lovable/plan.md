## Problem

A merged PDF (any number of pages, any combination of document types) is being saved as a single document because:

1. `expandBinders` skips splitting when `pageCount < 3`, so 2-page merges (e.g. PTE + PAL) bypass the splitter entirely.
2. When the AI splitter returns 1 segment for a binder-named PDF, the "force page-by-page" fallback only triggers on a narrow condition; otherwise the whole file goes through as one document and the page-1 letterhead wins the classification.
3. There's no manual "split this PDF" action once the file is in the review queue, so the user has no escape hatch when auto-detection misses.

Result in your screenshot: `ilovepdf_merged (1).pdf` containing PTE Result + PAL Letter is classified as a single Provincial Attestation Letter and saved that way; the PTE half is lost.

## Fix — generic, works for any number/mix of documents

### 1. Always split multi-page binders, regardless of page count

**`src/components/documents/SmartUploadZone.tsx`** (`expandBinders`)
- Replace the `pageCount < 3` guard with `pageCount < 2`. Any PDF with ≥ 2 pages whose filename matches `looksLikeBinderName` OR whose page snippets show ≥ 2 document families gets sent to the splitter.
- After the splitter returns: if the result is `< 2` segments for a likely binder, always fall through to per-page review segments (`buildPageReviewSegments`). Drop the narrower `isOneFullDocumentSegment` check.

**`src/lib/binderSplit.ts`** (`shouldFallbackToPageRanges`)
- Lower its `pageCount < 3` guard to `pageCount < 2` so the fallback also catches 2-page binders.

### 2. Per-segment retype using deterministic content rules

After the AI returns segments, run `inferTypeFromPageText` on each segment's joined snippets and override the type when the AI said "Other" / low confidence. The brand detection already covers PTE / IELTS / TOEFL / CELPIP / Duolingo → "English Language Proficiency Test", and PAL → "Provincial Attestation Letter". This already exists; we just keep it on every fallback path (page-by-page, manual split, AI-ambiguous) — not only the AI-success path.

### 3. Manual "Split into pages" action on the review card

A guaranteed escape hatch on the upload card: visible when the queue item is a multi-page PDF in any review state (`needs_owner`, `name_mismatch`, `awaiting_review`, `queued`).

Click → for each page of the source PDF:
- Slice with `extractPagesAsPdfFile` into a one-page segment.
- Run `inferTypeFromPageText` on that page's text to pre-fill the type / suggested label (PTE Result, PAL Letter, Passport, Transcript, …).
- Push as an `awaiting_review` segment under a new `binderId`.

The existing binder review group then takes over: each segment shows a type dropdown (rename), a trash icon (delete), Merge with next (combine consecutive pages that belong to the same logical doc), and "Upload all" saves them as separate `client_documents` rows, each with its own type, owner, file name, section, and checklist sync.

### 4. Stronger splitter prompt

**`supabase/functions/split-binder/index.ts`**
- Add explicit canonical-type examples to the system prompt: `English Language Proficiency Test` (PTE / IELTS / TOEFL / CELPIP / Duolingo) and `Provincial Attestation Letter`.
- Add: "If consecutive pages have different letterheads, brand marks, or document formats, return them as separate segments — even a 2-page PDF can be two distinct documents."
- Same examples added to `supabase/functions/classify-document/index.ts` so single-page scans get the right type too.

### 5. Re-classify each segment after split

`SmartUploadZone` already runs the regular `classifyDocument` flow on segments at upload time (owner verification, etc.). We keep that, but we seed the predicted type from `inferTypeFromPageText` so the user sees the right label immediately in the review group rather than "Other".

## Files

- `src/components/documents/SmartUploadZone.tsx` — gate lowered to ≥ 2 pages; new "Split into pages" button on the queue card; per-segment seed type via `inferTypeFromPageText`
- `src/lib/binderSplit.ts` — `shouldFallbackToPageRanges` allows 2-page binders; export a small `splitFileIntoPageSegments(file, allowedTypes)` helper for the manual action
- `supabase/functions/split-binder/index.ts` — sharper prompt with canonical examples and the "different letterheads → separate segments" rule
- `supabase/functions/classify-document/index.ts` — same canonical examples for single-page scans

## Result

For any merged PDF (PTE + PAL, passport + transcript + IELTS, marriage cert + birth cert + photos, etc.):
- It enters the **Binder split** review group, not the single-doc queue.
- One card per detected document, each with its own pre-filled type, owner, suggested filename.
- You can rename, delete, merge consecutive pages, and click **Upload all**. Each piece saves as a separate `client_documents` row in the correct section, and the matching checklist rows flip to ready.
- If auto-split misses, the **Split into pages** button on the original queue card explodes the PDF page-by-page so you keep full manual control.