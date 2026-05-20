# Fix failing program sync

## What's actually broken

Looking at `upi_sync_jobs`, every recent failure traces back to the **Jina Reader fetch** inside `supabase/functions/upi-sync-source/index.ts` (the same fetcher is used by `upi-sync-process-batch`). Two distinct root causes — neither has anything to do with the role/permission change:

1. **HTTP 400** — for the URL in your screenshot:
   `https://www.canadorecollege.ca/programs/search?search=&page=0&filter%5BProgramType%5D%5B0%5D=Full-Time`
   The code does `fetch(\`https://r.jina.ai/${url}\`)`, jamming an already URL‑encoded query string into the path. Jina's GET endpoint rejects it. The plain `…/programs` URL doesn't hit this.

2. **HTTP 402** — Jina's anonymous tier is exhausted (`JINA_API_KEY` isn't configured), so every fetch from your IP/project is being rate‑limit‑billed. That's what kills `https://www.canadorecollege.ca/programs`, `brocku.ca/programs/`, `bowvalleycollege.ca/...`, etc.

## Fix

### 1. Use Jina's POST endpoint (fixes HTTP 400)

In `supabase/functions/upi-sync-source/index.ts` and `supabase/functions/upi-sync-process-batch/index.ts`, change `fetchMarkdown` from:

```ts
fetch(`https://r.jina.ai/${url}`, { headers })
```

to:

```ts
fetch("https://r.jina.ai/", {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ url }),
})
```

This passes the URL as a JSON field instead of concatenating it into the path, so complex query strings (`?filter[ProgramType][0]=…`) stop breaking.

### 2. Add a `JINA_API_KEY` secret (fixes HTTP 402)

The anonymous Jina tier is unusable for production crawling. Add the secret so the existing `Authorization: Bearer …` header in `fetchMarkdown` actually works. I'll prompt for it via `add_secret`.

### 3. Cleaner failure surface

Treat HTTP 402 specifically and surface a friendlier message in `upi_sync_jobs.error_summary` ("Jina credits exhausted — add or top up JINA_API_KEY") and in the Sources panel toast, so future failures point at the real cause instead of looking like a code bug.

### 4. Validate URLs before queuing a sync

In `InstitutionDetailPage.tsx` "Add source" handler, run `new URL(value)` and reject obviously broken inputs (the second row in your screenshot, `https://www.canadorecollege.ca/programs`, is fine — but the search URL with `?search=&page=0&filter…` should also be fine after fix #1).

## Out of scope

- No DB migration.
- No change to the Team & Roles / Institutions permissions work from earlier turns — the failure isn't permission related; the failed rows belong to two valid sources that simply can't be fetched.
- Not switching to Firecrawl in this pass (would need you to link the Firecrawl connector first; happy to do that as a follow‑up if Jina keeps misbehaving).

## Files to edit

- `supabase/functions/upi-sync-source/index.ts` — `fetchMarkdown` rewrite + 402 message.
- `supabase/functions/upi-sync-process-batch/index.ts` — same `fetchMarkdown` change.
- `src/institutions/pages/InstitutionDetailPage.tsx` — URL validation on add + clearer toast on sync failure.
- New secret: `JINA_API_KEY` (asked via secrets prompt).
