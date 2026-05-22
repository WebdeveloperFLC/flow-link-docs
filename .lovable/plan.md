# Fix: "Object not found" on Saved Hub

## What's happening

`SavedHubPanel.refresh()` (in `src/digital-success/ai/SavedHubPanel.tsx`) does:

```ts
const entries = await Promise.all(
  data.filter(r => r.storage_path)
      .map(async r => [r.id, await studio.getSignedUrl(r.storage_path)]),
);
```

`getSignedUrl` calls `supabase.storage.from("dsh-media").createSignedUrl(path, 3600)`. If **any** row's file has been deleted from the `dsh-media` bucket (orphan `dsh_media` row), that call throws `Object not found`. Because everything is inside one `Promise.all`, the whole batch rejects → no thumbnails get URLs (all cards render as grey placeholders) and the catch block shows the `Object not found` toast.

This is a data-state issue, not a code regression — it appeared because at least one saved Hub asset's underlying file is gone (manually removed, bucket cleanup, or a failed save).

## Fix

Only touch `src/digital-success/ai/SavedHubPanel.tsx` (frontend only):

1. Replace `Promise.all` with `Promise.allSettled` so one missing file can't poison the batch.
2. Per row, store either a signed URL or a `missing: true` flag in state.
3. Render missing rows with a clear "File no longer available" placeholder (warning icon + message) instead of a blank grey box. Disable Open / Download for those cards; keep the **Delete** button enabled so the user can prune the orphan row from the Hub.
4. Remove the noisy `toast.error("Failed to load saved assets")` for this specific case — only toast on genuine list-query failures.

No backend, schema, or other component changes. After the fix, broken entries are visible and removable, and the rest of the gallery loads normally.
