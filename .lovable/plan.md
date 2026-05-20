## Goal

1. Match ChatGPT-level accuracy (~150–170 programs) and speed (~15–25s) when extracting programs from an institution PDF/Excel brochure.
2. Make the workflow honest: surface page coverage and incomplete runs, not a fake "95% confidence".
3. Unify Sources + Documents so a brochure is uploaded once and reused — no duplicate uploads, no URL-only limitation.

---

## Part A — Extraction quality & speed

### A1. PDF chunking + parallel pages
Edit `supabase/functions/_shared/extractFileText.ts`:
- Add `extractPdfPageRange(blob, from, to)` and `renderPdfPageAsImage(blob, pageNumber)` using `unpdf`.
- Return per-page text plus metadata (`pageCount`, `pagesWithText[]`, `pagesNeedingOcr[]`).
- Keep current `extractFileText` for callers that just want flat text.

### A2. Two-pass extraction
Rewrite `supabase/functions/upi-extract-programs-from-doc/index.ts`:
- **Pass 1 (enumeration)** — Split the document into ~3-page chunks. For each chunk, call `google/gemini-3-flash-preview` in parallel with a small tool schema: `{ programs: [{ title, level, campus, page_number }] }`. Merge and de-duplicate the skeleton list.
- **Pass 2 (enrichment)** — Group the skeleton by source page(s) and run a second parallel batch (still `gemini-3-flash-preview`, fall back to `gemini-2.5-pro` for chunks where pass 1 returned >15 programs) to fill `tuition_fee`, `currency`, `duration_value/unit`, `intake_months`, IELTS/PTE/TOEFL, `is_coop`, `is_pgwp_eligible`, `campus_name`, `city`, `course_description`, `program_url`.
- Concurrency cap: 6 parallel calls. Retry once on 429 with backoff. Surface 402 (credits) to the UI.
- Use vision input (`image_url`) for pages where `unpdf` returned <50 chars of text (scanned/graphical brochure pages).

### A3. Honest status & confidence
In the same function, replace the fixed `confidence_score = 95` fallback:
- Track `pagesAttempted`, `pagesSucceeded`, `pagesPartial` (model returned, but flagged low-confidence), `pagesFailed`.
- `confidence_score` = average of model-reported per-program confidences, weighted by page coverage. If `pagesSucceeded / pageCount < 0.8` → cap at 70 and set `review_status: 'needs_review'`.
- Persist a new `extraction_meta` JSON on `upi_uploaded_documents` (already a `jsonb` column or add via migration if missing) with `{ pageCount, pagesSucceeded, programsFound, programsUpserted, runMs, modelMix }`.

### A4. Dedup fix in `upi-upsert-courses`
`dedup_hash` currently collapses same-title programs across campuses/levels. Change the hash input to:
```
institution_id || lower(course_title) || lower(coalesce(program_level,'')) || lower(coalesce(campus_name,'')) || coalesce(source_url,'')
```
Plus a guard: if existing row has same hash but different `source_document_id`, merge fields (prefer non-null new values) instead of overwriting.

### A5. Review panel — page coverage & re-run controls
Update `src/institutions/components/AiReviewPanel.tsx`:
- Show a compact strip: `Pages 22/24 · Programs 162 · Confidence 84% · 18s`.
- Red badge "Incomplete extraction — 2 pages failed" with a "Re-run failed pages only" button when applicable.
- Keep existing "Programs found" table (already added) and the editable JSON.

---

## Part B — Unified Sources + Documents workflow

### B1. New source type: `uploaded_document`
In `InstitutionDetailPage.tsx` Sources tab, replace the single URL input with a small composer:
- Source type dropdown stays; when type is `pdf_brochure`, `excel_sheet`, `csv_feed`, or `uploaded_document`, the URL field is replaced by a **document picker**:
  - "Choose from Documents…" (lists `upi_uploaded_documents` for this institution, with file name + uploaded date + status)
  - "Upload new document" (reuses the existing Documents-tab uploader, then auto-selects it)
- When user picks a doc, we insert into `upi_institution_sources` with `file_path = doc.file_path`, `source_type` as chosen, and a new column `document_id uuid references upi_uploaded_documents(id)`.
- For URL-based types (`website_url`, `listing_page`, etc.), the current URL input stays.

### B2. Sync uses the linked document
Update `supabase/functions/upi-sync-source/index.ts` (and the orchestrator):
- If `source.document_id` is set → skip download, route directly to `upi-document-orchestrator` with that document.
- If only `url` is set → existing crawl behavior.
- Either way, write back `pages_scanned`, `pages_found`, `confidence_score`, `crawl_status` on the source row so the Sources tab badge stays accurate.

### B3. Documents tab — show "Used by N sources"
On each document row, render a small chip with the count of linked sources and a "Use as source" button that pre-fills the Sources composer.

### B4. Migration
New migration:
- `alter table upi_institution_sources add column document_id uuid references upi_uploaded_documents(id) on delete set null;`
- Index on `document_id`.
- Backfill: where `file_path` matches an `upi_uploaded_documents.file_path`, populate `document_id`.

---

## Out of scope
- No change to upload/storage buckets, auth, or the iframe preview (already working).
- No new AI provider — everything keeps using Lovable AI Gateway (Gemini 3 Flash Preview + Gemini 2.5 Pro fallback).
- Excel parsing changes are deferred (already works via `extractFileText` text path; only the brochure-extraction logic is being upgraded now).

---

## Technical notes

**Files touched**
- `supabase/functions/_shared/extractFileText.ts` — page-range + image render helpers
- `supabase/functions/upi-extract-programs-from-doc/index.ts` — full rewrite (two-pass, parallel, honest status)
- `supabase/functions/upi-upsert-courses/index.ts` — dedup hash includes level + campus, merge-on-conflict
- `supabase/functions/upi-sync-source/index.ts` — accept `document_id`, skip crawl
- `supabase/functions/upi-document-orchestrator/index.ts` — return `extraction_meta` upstream
- `src/institutions/components/AiReviewPanel.tsx` — page-coverage strip, "re-run failed pages"
- `src/institutions/pages/InstitutionDetailPage.tsx` — Sources composer with document picker
- New migration: `upi_institution_sources.document_id` + index + backfill

**Realistic numbers for the 24-page Lethbridge viewbook**
- Speed: ~15–25 s end-to-end (8 chunks × ~3 s parallel + enrichment).
- Programs found: 150–170 (vs current 78).
- Will not be 100% deterministic — same as ChatGPT.

**Failure modes handled**
- 429 rate-limit → 1 retry with backoff, then surface to UI.
- 402 credits exhausted → toast in Review panel.
- Vision fallback when `unpdf` text < 50 chars/page.
- Per-page failures recorded; user can re-run only those pages.