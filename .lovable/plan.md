## What's wrong

Sync logs show every run reaching **"Extracted N candidate course(s)"** then failing with **"Upsert failed: Edge Function returned a non-2xx status code"**. The downstream `upi-upsert-courses` function is crashing on every invocation, so:

- 0 rows land in `upi_courses_staging` → no programs visible anywhere
- Average confidence stays at 0%
- Source status flips to `completed` only because the sync wrapper still finalizes the job, but nothing was actually saved

Root cause: `upi-upsert-courses/index.ts` imports `createHash` from `https://deno.land/std@0.168.0/hash/mod.ts`. That module was removed from the std library; the import throws on cold-start, so the function returns 5xx before any row is processed (which is also why there are no edge-function logs for it).

Two unrelated UX gaps the user also asked about:
- **No delete button** on source rows
- **No obvious link** from a source to the extracted programs (which live on `/institutions/review`)

## Fix

1. **Rewrite `supabase/functions/upi-upsert-courses/index.ts`**
   - Replace `createHash`/`std/hash` with Web Crypto SHA-256 (`crypto.subtle.digest`) — same dedup purpose, supported in edge runtime. Update the `dedup_hash` value to the hex SHA-256 of the same input string (column is text, so length change is fine).
   - Keep the rest of the logic identical (KNOWN allowlist, metadata sidecar, `pending_review` vs `needs_update`, per-row try/catch, job counters).
   - Add `Access-Control-Allow-Methods` to CORS for parity with the sync function.
   - Deploy explicitly via the deploy tool.

2. **Re-run sync verification**
   - Call `upi-sync-source` against the existing Seneca homepage source via curl_edge_functions and confirm `upserted > 0`. Confirm rows exist in `upi_courses_staging` for `institution_id = d7c75201-…`.

3. **Add a Delete button to each source row** (`src/institutions/pages/InstitutionDetailPage.tsx`, Sources tab only)
   - Small ghost/destructive icon button (Trash2) next to the existing Sync now button.
   - Confirms via `window.confirm("Delete this source? Extracted programs will remain in review.")`.
   - Deletes the row from `upi_institution_sources` and refreshes the list. Toast on success/error.

4. **Add a "View programs" link** on the Sources tab header and on each source row
   - Header link → `/institutions/review?institutionId=<id>`
   - Per-row link → `/institutions/review?institutionId=<id>&sourceId=<id>` (uses existing query-param filtering on the review page if present; if not, just pass `institutionId`).
   - Update `CourseReviewPage` only if it doesn't already honor an `institutionId` query param — minimal change: read it from `useSearchParams` and pre-fill the existing institution filter.

5. **Surface upsert errors clearly going forward**
   - In `upi-sync-source`, when `upi-upsert-courses` returns non-2xx, capture and log the response body (not just the SDK's generic "non-2xx" message) into `upi_sync_logs.detail`. One-line change in the existing catch.

## Files

- `supabase/functions/upi-upsert-courses/index.ts` — replace md5 import with Web Crypto SHA-256, deploy
- `supabase/functions/upi-sync-source/index.ts` — log upstream upsert error body
- `src/institutions/pages/InstitutionDetailPage.tsx` — Delete button + "View programs" links per row and tab header
- `src/institutions/pages/CourseReviewPage.tsx` — honor `?institutionId=` query param (only if not already)

No DB migrations needed.

## Acceptance

- Clicking Sync now on any Seneca source results in `upserted > 0`, "X programs" appearing in `upi_courses_staging`, and a non-zero confidence badge.
- A Trash icon appears on each source row and removes the source after confirmation.
- A "View programs" link from the Sources tab opens `/institutions/review` pre-filtered to this institution and lists the newly-extracted Seneca courses.
