
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
