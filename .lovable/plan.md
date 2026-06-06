## Diagnosis

The runtime error is `{"error":"conversation_id and text required"}` from `supabase/functions/whatsapp-send/index.ts`. That exact string does **not** exist in the current source — the local function now returns `"text or media required"` and fully supports media via `media_storage_path`. The client (`src/lib/whatsapp/api.ts`) even has a guard for this exact message: *"whatsapp-send needs redeploy — media attachments require the latest edge function"*.

Translation: the deployed edge function on Lovable Cloud is the **old** version (text-only). The earlier "redeploy" round refreshed the others but this build is stale — likely because the boot timestamps in logs predate the recent media changes. The storage RLS migration was the right fix for the upload step, but the send step still hits an outdated function that rejects media-only payloads.

## Fix

Single action, no code changes:

1. Redeploy `whatsapp-send` so the current source (which accepts `media_storage_path` + `mime_type` and downloads from the `whatsapp-media` bucket) goes live.

## Verification

After redeploy:

1. From counselor view, send an image attachment with no caption → should deliver (`meta_sent: true`).
2. Send a PDF with a caption → should deliver as document with caption.
3. Send a plain text reply → should still work (no regression).
4. Tail `whatsapp-send` logs to confirm no 400s and the `[Image]` / `[Document: filename]` rows appear in the thread.

No frontend, DB, or secrets changes are needed.
