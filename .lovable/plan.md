## Why the brochure shows "extracted" but nothing is extracted

Every UPI extractor (`upi-process-document`, `upi-extract-programs-from-doc`, `upi-detect-promotions`) reads the uploaded file with:

```ts
rawText = await file.text();   // PDF → binary garbage
```

For the ULeth brochure (a real PDF), `file.text()` returns binary bytes, the model sees nothing usable, and the orchestrator still marks the row `pipeline_status: 'extracted'`, `review_status: 'approved'`, `confidence_score: 95` (because the code defaults confidence to 95 when zero items come back). That is why the row looks green but the JSON in the Review modal is just `{ "ok": true, "found": 1 }`.

Second issue: brochures are routed **only** to `upi-detect-promotions`. They never run through the program extractor, so even with text in hand, no course rows would be created from a brochure. That is why "program details in course review" are missing.

## Plan

### 1. Add a real PDF-to-text helper

New file `supabase/functions/_shared/extractFileText.ts`:
- Download from storage (or accept a `Blob`).
- If `mime === application/pdf` or filename ends in `.pdf`: use `unpdf` (Deno-native, no native deps) — `import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1"` — to pull text from up to N pages (cap at ~40 pages / 120k chars to stay under model context).
- If `mime` is `text/*`, `csv`, `json`, `xml`: `await blob.text()`.
- If `mime` starts with `image/`: return `{ text: "", imageBase64, mime }` so callers can send it as a multimodal `image_url` part.
- Otherwise: best-effort `blob.text()` + flag `binary: true`.

### 2. Wire the helper into all three extractors

In `upi-extract-programs-from-doc`, `upi-process-document`, `upi-detect-promotions`:
- Replace the `await file.text()` block with `extractFileText(...)`.
- Build the Gemini `messages[].content` as multimodal parts:
  - Always include the text snippet.
  - For images, append `{ type: "image_url", image_url: { url: "data:<mime>;base64,<b64>" } }`.
- If extracted text is still empty after PDF parsing (scanned PDF), fall back to sending the first page rendered as an image via `unpdf`'s `renderPageAsImage` (optional, behind a try/catch) so Gemini can still OCR it.

### 3. Stop pretending empty extractions are "approved"

In `upi-document-orchestrator` and the three extractors:
- When zero courses / extractions / promotions are returned, set `review_status: 'needs_review'` and `confidence_score` to the model-reported confidence (or 0), **not** 95.
- Keep `pipeline_status: 'extracted'` only when at least one row was written; otherwise `pipeline_status: 'needs_review'`.

### 4. Run the program extractor on brochures too

`ROUTE.brochure` currently → `upi-detect-promotions` only. Change the orchestrator so `brochure` runs **both**:
1. `upi-extract-programs-from-doc` (so courses get upserted and appear in the courses list / Course Review page).
2. `upi-detect-promotions` (existing sweep).

Aggregate `found` counts from both into `extracted_payload` so the Review modal shows real numbers (e.g. `{ programs_found: 12, promotions_found: 2 }`).

### 5. Surface the result in the AI Review panel

`AiReviewPanel.tsx`:
- After re-fetching the row, also query `upi_courses` filtered by `institution_id` + `source_document_id = doc.id` and render a compact table (title, level, duration, tuition, intake) above the JSON editor when the doc kind is `brochure` or `program_sheet`.
- Add a small "Re-run extraction" button that re-invokes `upi-document-orchestrator` with the current `doc_kind` — useful for the already-uploaded ULeth brochure so the user doesn't have to re-upload.

### Files touched

- `supabase/functions/_shared/extractFileText.ts` (new)
- `supabase/functions/upi-extract-programs-from-doc/index.ts`
- `supabase/functions/upi-process-document/index.ts`
- `supabase/functions/upi-detect-promotions/index.ts`
- `supabase/functions/upi-document-orchestrator/index.ts`
- `src/institutions/components/AiReviewPanel.tsx`

### Out of scope

- No DB schema changes (assumes `upi_courses.source_document_id` already exists — will verify before coding; if missing, add a tiny migration adding that nullable column + index).
- No changes to upload sanitization, storage paths, or the preview iframe (already fixed).
- No new AI provider — keeps using Lovable AI gateway with `google/gemini-2.5-flash` / `gemini-2.5-pro`.
