## What's actually happening

Looking at `upi_sync_jobs` + `upi_sync_logs`:

- Latest job logged `Discovered 154 direct program links` and `Detail-crawling 154 of 154 program pages` — then **nothing for 10+ minutes**.
- 3 jobs are stuck in `status = running` (one started 22:51, one 22:53, one 23:00).
- All prior completed jobs only ever scanned 21 pages — because the function dies after that and the job is never marked completed.
- UI shows "21/21 pages, running, 68% confidence" — that's stale data from the last *completed* job; the current one never updates `pages_scanned` until it finishes (which it never does).

### Root cause

`upi-sync-source` does **all 154 detail fetches inline** inside one `EdgeRuntime.waitUntil(...)` call:
- 154 Jina fetches + 154 Gemini AI calls, in batches of 3.
- Even at ~3s per batch that's 150s+ of wall time, and each AI call also uses CPU time.
- Supabase Edge Functions kill background work after the wall/CPU budget — silently — so the job never reaches the "Upserted X" step and `status` is never updated.

`JINA_API_KEY` and retries don't help because the killer is the function lifetime, not the per-request failures.

## Fix — Queue + batch worker

Split discovery from extraction so each invocation does a small, bounded amount of work.

### 1. New table: `upi_sync_queue`

```
id              uuid pk
job_id          uuid (fk upi_sync_jobs)
source_id       uuid
institution_id  uuid
program_url     text
course_title    text
status          text  -- 'pending' | 'processing' | 'done' | 'failed'
attempts        int   default 0
last_error      text
created_at      timestamptz
updated_at      timestamptz
unique (job_id, program_url)
index (job_id, status)
```

RLS: service-role only (matches other `upi_*` tables).

### 2. Rewrite `upi-sync-source` (discovery only)

- Fetch root + (if needed) category pages — unchanged.
- Discover program links (still capped at `MAX_DETAIL_FETCHES`).
- **Insert all links into `upi_sync_queue` with status `pending`** instead of fetching them inline.
- Update `upi_sync_jobs.pages_discovered = links.length`, leave `status = running`.
- Invoke `upi-sync-process-batch` once (fire-and-forget) and return 202.
- Fallback single-page extraction path (when <3 links) stays inline — it's small.

### 3. New function: `upi-sync-process-batch`

Takes `{ job_id }`. On each invocation:

1. Claim up to `BATCH_SIZE = 8` pending rows for this job (update status → `processing`).
2. For each: Jina fetch + Gemini extract (same logic as today's detail-crawl loop), with the existing retry/stub behaviour.
3. Call `upi-upsert-courses` with the batch's extracted courses.
4. Mark rows `done` (or `failed` with `last_error`); increment `upi_sync_jobs.pages_scanned` and `records_upserted`.
5. Check remaining pending rows for this job:
   - **>0** → invoke itself again (fire-and-forget via `EdgeRuntime.waitUntil(fetch(...))`) and return.
   - **0** → finalize: set `upi_sync_jobs.status = completed` (or `completed_with_errors`), set `completed_at`, update `upi_institution_sources.crawl_status = completed`, `last_synced_at`, `extracted_records_count`, `confidence_score`.

Each invocation now does ≤8 Jina + 8 AI calls (~15–25s wall) — well inside the budget. 154 programs → ~20 chained invocations, fully observable via `upi_sync_logs` and the queue table.

`BATCH_SIZE`, `CONCURRENCY=3`, `BATCH_PAUSE_MS`, and `FETCH_RETRIES` stay configurable at the top of the file.

### 4. Cleanup migration

- Mark the 3 currently stuck jobs (`7071a1c4…`, `2659902c…`, `d88e4c7a…`) as `failed` with `error_summary = 'Killed by runtime — superseded by queued sync'`.
- Reset both Georgian `upi_institution_sources` rows to `crawl_status = idle` so the user can re-trigger.

### 5. Frontend

No UI changes needed — the existing Sources panel already polls `upi_sync_jobs` / source status. `pages_scanned` will now update incrementally as batches complete (better UX than the current "stuck at 21" feel).

### Out of scope

- No changes to `upi-upsert-courses`, `upi-publish-courses`, or `upi-extract-programs-from-doc`.
- No schema changes to `upi_courses_staging`, `cf_courses`, `upi_institutions`.
- No auth/UI changes.

## After deploy

- User clicks **Sync now** on Georgian.
- Within ~5s: queue populated with ~150 rows, job stays `running`.
- Over the next 1–3 minutes: `pages_scanned` ticks up in batches of 8; programs appear in the staging list as they're extracted.
- Job ends in `completed` with ~130–150 records upserted (low-confidence stubs for any Jina failures, same as today).
