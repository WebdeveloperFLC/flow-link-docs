## Goal

Make the **Sync Now** button on an institution's Program Source actually fetch the page, extract course data with AI, and populate the Course Review queue — using only free services (no Anthropic, no Firecrawl, no new API keys).

## Stack (all free)

- **Scraper**: [Jina Reader](https://r.jina.ai) — prepend `https://r.jina.ai/` to any URL, returns clean markdown. No key, no signup, generous free tier.
- **Extractor**: Lovable AI Gateway with `google/gemini-2.5-flash` (free until Nov 6, 2026). Already wired via `LOVABLE_API_KEY`.
- **Storage**: existing `upi_sync_jobs`, `upi_sync_logs`, `upi_courses_staging` tables.

If a site is JS-heavy and Jina returns thin content, we log a warning and the user can later switch that one source to Firecrawl (optional add-on).

## What to build

### 1. New edge function: `upi-sync-source`

`supabase/functions/upi-sync-source/index.ts` (verify_jwt = true)

Input: `{ source_id: string }`

Flow:
1. Load the `upi_institution_sources` row + parent institution.
2. Create/update an `upi_sync_jobs` row → `status = 'running'`, `started_at = now()`.
3. Append `upi_sync_logs` entries at each step (`info` / `warning` / `error`) so the UI streams progress via the existing Realtime subscription.
4. Fetch the page via Jina: `GET https://r.jina.ai/<source.url>` with header `Accept: text/markdown`. Truncate to ~80k chars to stay inside Gemini's context.
5. For `listing_page` / `tuition_page` / `scholarship_page` / `international_page` / `website_url`: call Gemini Flash with **tool-calling** (structured output) to extract an array of courses. Schema mirrors the columns already in `upi_courses_staging`: `course_title`, `program_level`, `field_of_study`, `duration_months`, `tuition_fee`, `currency`, `intake_months[]`, `ielts_overall`, `ielts_reading/listening/writing/speaking`, `has_scholarship`, `is_pr_pathway`, `source_url`, `confidence` (0–100), `metadata` (jsonb catch-all).
6. For each extracted course, compute `dedup_hash = md5(institution_id + '||' + lower(title) + '||' + source.url)` and **upsert** into `upi_courses_staging` with `review_status = 'pending_review'`. Reuse the existing `upi-upsert-courses` helper.
7. Update the job: `status = 'completed'`, `pages_scanned`, `items_extracted`, `finished_at`. Update the source's `last_synced_at`, `crawl_status`, `confidence_score`.
8. On any failure: `status = 'failed'`, write an `error` log line, surface the message in the UI toast.

Error handling: catch Gemini 402 / 429 and write a clear log line ("AI credits exhausted" / "Rate limited, retry shortly") instead of a generic 500.

### 2. Wire the UI button

In `src/institutions/pages/InstitutionDetailPage.tsx`, replace the `syncNow` handler so it:
- Inserts the job row (as today) **and** invokes `supabase.functions.invoke('upi-sync-source', { body: { source_id } })`.
- Toast on completion; the Sources list already re-renders from the realtime logs/jobs subscription.

No other UI changes — the existing status badges (`queued` / `running` / `completed` / `failed`) and Course Review page will pick up the new rows automatically.

### 3. config.toml

Add `[functions.upi-sync-source]` with `verify_jwt = true` (default; included for clarity).

## Out of scope (saving for later)

- Firecrawl fallback for JS-only sites — add only when a real site fails.
- Scheduled cron sync — on-demand only for now (matches your earlier choice).
- Document/PDF processing — already covered by `upi-process-document`, untouched.
- Anthropic — not needed.

## Cost

$0 to start. Jina is free, Gemini Flash is free on Lovable AI through Nov 6, 2026. After that, Flash is roughly $0.075 per 1M input tokens — a typical program-listing sync is well under 1¢.

## Acceptance test

1. Add Conestoga → add source `https://www.conestogac.on.ca/en/programs-and-courses.html` → click **Sync Now**.
2. Status badge moves `queued → running → completed`.
3. Sync logs show "Fetched N chars from Jina", "Extracted N courses", "Upserted N rows".
4. `/institutions/review` shows the new courses with `pending_review` status and confidence badges.