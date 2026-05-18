## Problem

For Georgian College the sync **discovers 152 program links** but only **21 detail pages succeed**, so only 23–27 courses get saved instead of ~150. Every other detail page is silently dropped.

```
Discovered 152 direct program links from root
Detail-crawling 120 of 152 program pages
Detail crawl yielded 27 programs from 21 pages   ← 99 pages vanished
```

## Root cause

In `supabase/functions/upi-sync-source/index.ts`, `fetchMarkdown()` does:

```ts
const r = await fetch(`https://r.jina.ai/${url}`, ...);
if (!r.ok) return null;     // silent — no log, no retry
```

`r.jina.ai` rate-limits unauthenticated traffic aggressively. With `CONCURRENCY = 5` firing 120 requests, most return 429/5xx and are dropped without trace. The only successes are the first batch (~20 pages), which matches `pages_scanned = 21`.

Same issue on the link-discovery side: when category-page fetches fail they're silently skipped.

## Fix (single file: `supabase/functions/upi-sync-source/index.ts`)

1. **Retry + backoff in `fetchMarkdown`**
   - Up to 3 attempts with exponential backoff (1s, 3s, 7s) for 429 / 5xx / network errors.
   - Honor `Retry-After` header when present.
   - Use `JINA_API_KEY` (Bearer header) if the secret is set — Jina's authenticated tier has ~10× the rate limit. If missing, fall back to anonymous.
   - Return `{ ok, md, status, error }` instead of `string | null` so callers can log.

2. **Surface failures**
   - Log per-URL failures via `logMsg(..., "warn", ...)` with status and URL (truncated to keep log volume reasonable — log first 5, then a summary count).
   - Track `failedFetches` and include it in the final summary log.

3. **Lower default concurrency, configurable**
   - Drop `CONCURRENCY` from 5 → 3 for detail crawl.
   - Add a small `await sleep(150ms)` between batches to smooth bursts.

4. **Don't drop a program when its detail page fails**
   - When detail fetch fails for a discovered link, still emit a minimal course row using `{ course_title, program_url, confidence_score: 30, source_url }` so the program appears in the list and can be retried/edited later, instead of disappearing entirely.

5. **Raise `MAX_DETAIL_FETCHES` from 120 → 200**
   - Georgian's 152 links exceeded 120 silently. New cap covers typical college catalogs.

6. **Add a Jina secret check at startup**
   - If `JINA_API_KEY` missing, log once: `"JINA_API_KEY not set — using anonymous Jina Reader (rate-limited). Add the secret for full coverage."` so the user knows why coverage is partial.

## After deploy

- Re-run "Sync now" on both Georgian College sources.
- Expected: `pages_scanned ≈ 150`, `Upserted ≈ 130–150`, with any failed pages logged explicitly and still appearing as low-confidence stubs.

## Optional follow-up (not in this fix)

Ask the user whether to add the `JINA_API_KEY` secret now — anonymous Jina will still hit rate limits on very large catalogs even with retries.

## Out of scope

No schema changes. No changes to `upi-upsert-courses`, the UI, or other modules.
