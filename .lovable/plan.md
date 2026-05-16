
## Goal

Make the sync pipeline always drill into individual program detail pages (e.g. `…/programs/fulltime/AIG.html`) instead of stopping at a listing page (`…/programs/list.html`). This applies to every institution and country, so Seneca-style data — tuition, IELTS/PTE/TOEFL, application fee, intakes, duration, co-op, PGWP, processing time, scholarships — is reliably extracted.

## Problem today

`supabase/functions/upi-sync-source/index.ts` only switches to two‑pass detail crawling when pass‑1 returns **more than 40 thin courses with <1.5 filled fields**. Listing pages with fewer rows, or pages where the AI hallucinates a few fields, never trigger detail crawling. Result: Seneca and similar sources land in staging with mostly empty fees/IELTS/duration and 0–low confidence.

## Solution

Make detail‑page crawling the **default behavior** for any source whose URL looks like a program list, and broaden the trigger so it fires whenever data quality is weak — not only on huge pages.

### 1. Always discover program links first

For any `source_type` in `(website, program_list, sitemap, list_page)` or URL containing `/programs`, `/courses`, `/list`, `/study`, `/academics`:

1. Fetch the page via Jina Reader (existing).
2. Run the existing `LINK_TOOL` AI call **first** to extract `{ course_title, program_url }[]`.
3. Normalize URLs (resolve relative paths against the source origin, dedupe, strip query/hash, drop obvious non-program links: `/news`, `/blog`, `/events`, `/about`, `/admissions` unless `/admissions/programs`).
4. If ≥ 3 distinct detail links are discovered → enter detail-crawl mode. Otherwise fall back to single‑page extraction.

### 2. Detail-crawl mode (mandatory per-program fetch)

- Raise `MAX_DETAIL_FETCHES` from 25 → **120** (configurable per source via new `upi_institution_sources.max_pages` column if it exists; otherwise constant).
- Keep concurrency at 5, add small jitter to avoid Jina rate spikes.
- For each detail URL: fetch via Jina, call `COURSE_TOOL` with a stricter prompt instructing the AI: "This is a single program's detail page — emit exactly one course row unless the page lists multiple delivery options/campuses, in which case one row per campus."
- Always set `program_url` and `source_url` to the detail URL.

### 3. Multi-step discovery for institution roots

If the source URL is the institution homepage or a high-level `/programs` hub (heuristic: link extractor returns >50 URLs but most look like categories — paths end in `/area-of-study/*`, `/faculties/*`, `/schools/*`), do a **two-level expansion**:

1. From homepage → discover category/listing URLs.
2. From each category → discover program detail URLs.
3. Cap total fetches at `MAX_DETAIL_FETCHES`.

This handles Seneca's hierarchy: `/programs` → `/international/programs/list.html` → individual `…/fulltime/<CODE>.html` pages.

### 4. Stronger extraction schema

Extend `COURSE_TOOL` properties (additive — existing fields stay) so the AI is explicitly prompted for the fields the user listed:

- `application_fee` (exists) — keep
- `processing_time_weeks` (new, number)
- `is_coop` (exists) — keep
- `coop_duration_months` (new, number)
- `is_pgwp_eligible` (exists)
- `intake_months`, `intake_year` (exist)
- `tuition_fee` + `tuition_fee_per` + `currency` (exist)
- `ielts_overall`, `pte_overall`, `toefl_overall`, `duolingo_overall` (exist)
- `seats_available` (new, number, optional)
- `program_code` (new, string — e.g. "AIG")

Update `upi-upsert-courses` `KNOWN` list to include the three new fields and add columns to `upi_courses_staging` via a migration if missing.

### 5. Confidence aggregation fix

Already partially fixed (default 70). Add: if a detail page returned 0 numeric fields filled, downgrade that row's `confidence_score` to 40 so reviewers see it needs attention. Source‑level confidence remains average of row scores.

### 6. Logging

Add `pages_discovered` / `pages_scanned` to job logs at each phase: `discovered N category links`, `discovered N program links`, `fetched N/M detail pages`, `extracted N courses with avg X fields filled`.

## Files touched

- `supabase/functions/upi-sync-source/index.ts` — make detail crawl mandatory, two-level expansion, new prompts, new schema fields, URL normalization helper.
- `supabase/functions/upi-upsert-courses/index.ts` — extend `KNOWN` with `processing_time_weeks`, `coop_duration_months`, `program_code`, `seats_available`.
- New migration — add `processing_time_weeks int`, `coop_duration_months int`, `program_code text`, `seats_available int` to `upi_courses_staging` and `upi_courses`.
- `src/institutions/pages/CourseReviewPage.tsx` — show the new columns in the table (optional, can defer).

## Open questions

1. Cap per-source detail fetches at **120** (≈ 8–10 min wall clock with concurrency 5) — OK, or higher/lower?
2. Should we also persist `program_code` as a unique key per institution to avoid duplicate inserts when the same program appears under multiple list pages?
3. Add the new columns now (migration) or stash everything in `metadata` JSON first and migrate later?
