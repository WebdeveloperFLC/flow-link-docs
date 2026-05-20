Do I know what the issue is? Yes.

The current failures are not caused by Team & Roles permissions. The latest sync jobs for Brock and Canadore all fail with:

```text
Jina Reader credits exhausted — add or top up JINA_API_KEY
```

The secret name exists, but Jina is still returning HTTP 402. That means the scraper is currently too dependent on Jina, and the UI also misleads users by saying “Sync complete — 0 courses” while the backend job is still running/failing in the background.

Plan to fix it:

1. Fix the scraper so Canadore and similar public program pages do not depend only on Jina
   - Add a direct website fetch fallback after Jina fails.
   - Use browser-like request headers for public HTML pages.
   - Convert fetched HTML to clean text locally for AI extraction.
   - Extract program links from `<a href>` tags deterministically before asking AI, so listing pages like Canadore can queue program detail pages even if Jina is unavailable.

2. Keep Jina as an optional premium fallback, not a single point of failure
   - Try Jina first for difficult pages and complex rendering.
   - If Jina returns 402, log the exact friendly message but continue with direct fetch where possible.
   - For protected/Cloudflare pages like Brock that block direct fetch, show the real blocker instead of a generic failed state.

3. Fix the “Sync now” frontend behavior
   - Change the toast from fake “Sync complete — 0 courses” to “Sync started”.
   - Poll the created sync job until it reaches completed, completed_with_errors, or failed.
   - Show the actual `error_summary` in the toast if the job fails.
   - Refresh the source row after completion so status, pages, and records update accurately.

4. Add clearer source-row diagnostics
   - Display the latest job error under failed sources, e.g. “Jina credits exhausted” or “Site blocks automated fetch”.
   - Keep the current status badges, but make failures actionable.

5. Deploy and verify
   - Deploy `upi-sync-source` and `upi-sync-process-batch`.
   - Run a controlled sync on the Canadore Full-Time URL and confirm records are queued/staged.
   - Confirm Brock no longer fails silently; if blocked by Cloudflare and Jina credits are unavailable, the UI will say that clearly.

Files to change:

```text
supabase/functions/upi-sync-source/index.ts
supabase/functions/upi-sync-process-batch/index.ts
src/institutions/pages/InstitutionDetailPage.tsx
```

I will not roll back the roles work unless you explicitly choose that. Rolling back roles is unnecessary for this sync failure and would remove the access controls you asked for earlier.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
  <presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>