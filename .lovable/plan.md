## Problem

Clicking **Sync now** triggers `POST /functions/v1/upi-sync-source` which fails with **"Failed to fetch"** in the browser. That error means the request never got a response — almost always either (a) the edge function isn't deployed yet, or (b) the CORS preflight failed. The function file exists in the repo but no logs exist for it on the server, confirming it hasn't been deployed since it was created.

A secondary issue: the CORS headers in the function are missing `Access-Control-Allow-Methods`, which some browsers reject during preflight.

## Fix

1. **Add `Access-Control-Allow-Methods: POST, OPTIONS`** to the `corsHeaders` in `supabase/functions/upi-sync-source/index.ts` so the preflight cannot fail.
2. **Deploy `upi-sync-source`** explicitly via the deploy tool so it's live immediately (instead of waiting on the next full deploy).
3. **Verify** by calling the function with `curl_edge_functions` against one of the existing source IDs (e.g. `19d1f37a-9242-4296-ad32-d258a44152ca`) and confirming a 200 / job row appears.
4. If the test call returns 402 (AI credits) or any other server error, surface that to the user instead of leaving the source stuck on "queued" — already handled in the function's catch block which sets `crawl_status = failed`.

No DB migrations, no UI changes. The existing Sync now button + handler are correct.

## Files

- `supabase/functions/upi-sync-source/index.ts` — add one CORS header line, then deploy.
