# Fix: counselor image/PDF send fails with "Upload blocked"

## Root cause

When a counselor attaches an image or PDF, the client first uploads the file to the `whatsapp-media` Storage bucket at `{conversation_id}/outbound-...`, then calls the `whatsapp-send` edge function with `media_storage_path`.

The bucket currently has only two RLS policies on `storage.objects`:

- `whatsapp_media_staff_read` (SELECT)
- `whatsapp_media_admin_delete` (DELETE)

There is **no INSERT policy**, so the upload is rejected by RLS. The client catches the "policy" error and shows the toast "Upload blocked — run whatsapp_outbound_media_upload migration and redeploy" (see `src/lib/whatsapp/api.ts:140`). Inbound media works because it is written by the edge function with the service role, which bypasses RLS.

## Fix

One migration that adds an INSERT (and a matching UPDATE, since the client uses `upsert: false` but we want safe re-tries) policy on `storage.objects` for the `whatsapp-media` bucket, scoped to staff who can edit the conversation in the first folder segment.

```sql
create policy "whatsapp_media_staff_outbound_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'whatsapp-media'
  and public.whatsapp_can_edit_conversation(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
);

create policy "whatsapp_media_staff_outbound_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'whatsapp-media'
  and public.whatsapp_can_edit_conversation(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
)
with check (
  bucket_id = 'whatsapp-media'
  and public.whatsapp_can_edit_conversation(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
);
```

No frontend or edge function code changes are required. `whatsapp-send` already downloads from the path, forwards to Meta, and persists the message row.

## Verification

1. Run the migration (auto-applies once approved).
2. As a counselor, open a WhatsApp thread, attach an image, send. Toast should switch from "Upload blocked…" to a successful send and the image should appear in the thread.
3. Repeat with a PDF.
4. Confirm the client receives both in WhatsApp.

No redeploy of edge functions is needed (they were already redeployed earlier today and read from the bucket via service role).
