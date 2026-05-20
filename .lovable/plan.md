Do I know what the issue is? Yes.

The failing row in the screenshot is not failing because of Team & Roles. It is failing because Brock blocks direct automated fetching with Cloudflare HTTP 403, and the external reader fallback is returning HTTP 402 credits exhausted. The current code correctly reports both blockers:

```text
Jina Reader credits exhausted; Site blocks automated fetch (HTTP 403)
```

I also checked Brock’s program page, sitemap, WordPress JSON endpoints, and calendar URLs directly; they all return the same Cloudflare “Just a moment…” page to server-side fetches. Canadore worked because it exposes an Algolia index; Brock does not expose an equivalent unblocked source on that URL.

Plan to recover this properly:

1. Keep roles in place
   - Do not reset Team & Roles unless you explicitly choose a full rollback in History.
   - The backend sync functions use server-side credentials and are not blocked by the role changes.

2. Fix blocked-source handling for Brock
   - Update the sync function so a Cloudflare-blocked page with exhausted reader credits does not stay as a generic failed source.
   - Mark the source as `blocked`/failed with a clearer actionable message: “Brock blocks server fetch; add reader credits or use an alternate accessible source.”
   - Avoid repeatedly retrying the same blocked URL in `Sync all` unless the user manually clicks `Sync now`.

3. Add alternate-source recovery for Brock
   - Add support for accessible official/near-official directories when the main university page blocks fetch.
   - For Brock undergraduate programs, use the reachable OUInfo program listing as a fallback.
   - For Brock graduate programs, keep the Brock source blocked unless a reachable graduate directory/source is provided or reader credits are restored, because Brock and OUAC graduate pages are both Cloudflare-blocked from backend fetch.

4. Improve the UI so this is obvious
   - Show a visible blocked-source note under the row with the exact recovery options.
   - Change the red failure text from a long technical message into a short actionable message.
   - Keep “View programs” available so successful sources like Canadore can still be reviewed.

5. Verification after implementation
   - Deploy the sync functions.
   - Re-test the Brock row and confirm it no longer pretends the roles broke sync.
   - Confirm Canadore/listing sources still discover and stage programs.
   - Confirm `Sync all` does not get stuck on Brock’s blocked URL.

If you want the old version instead, use History to restore the version before Team & Roles; but that will remove the access-control work and will not fix Brock’s Cloudflare/Jina-credit blocker.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
  <presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>