## Goal
Add Firecrawl as a third-tier fallback in the sync pipeline so Cloudflare-protected pages (like Brock's graduate programs) succeed even when Jina credits are exhausted and direct fetch returns 403.

## Fetch order (after change)
1. **Jina Reader** (current primary) — fast, cheap, LLM-ready markdown
2. **Direct fetch** with browser-like User-Agent (current secondary) — handles simple sites
3. **Firecrawl** (new tertiary) — handles Cloudflare/JS-challenge sites

If all three fail, mark source as `failed` with a clear actionable message.

## Setup steps
1. Connect Firecrawl via Connectors (one-click managed connection — comes with free credits, no API key entry required).
2. Confirm `FIRECRAWL_API_KEY` is available in edge functions.

## Code changes
- **`supabase/functions/upi-sync-source/index.ts`**
  - Add `fetchViaFirecrawl(url, maxChars)` helper that calls `POST https://api.firecrawl.dev/v2/scrape` with `formats: ['markdown']` and `onlyMainContent: true`.
  - In the fetch chain, after Jina fails AND direct fetch returns 403 / Cloudflare HTML, call Firecrawl.
  - On success, return `{ md, via: 'firecrawl' }`.
  - On Firecrawl 402 (out of credits), surface: "Firecrawl credits exhausted — top up at firecrawl.dev or reconnect a paid plan."
  - Only attempt Firecrawl if `FIRECRAWL_API_KEY` is set; otherwise keep current behavior.

- **`supabase/functions/upi-sync-process-batch/index.ts`**
  - Same three-tier fetch chain for per-program page scraping.

- **No frontend changes required.** The existing `sourceErrors` UI already displays the `error_summary`, which will now reflect the deeper fallback chain.

## Out of scope
- No DB migration.
- No changes to roles/permissions/auth.
- No changes to Canadore/Algolia path (still works as-is).
- No removal of Jina or direct fetch — Firecrawl is only used when both fail.

## Verification
1. Deploy both edge functions.
2. Trigger `Sync now` on Brock graduate URL — expect Firecrawl path to succeed and programs to be discovered.
3. Trigger `Sync now` on Canadore URL — expect existing Algolia path still works (no regression).
4. Check `upi_sync_jobs` logs for `via: 'firecrawl'` marker on Brock.
