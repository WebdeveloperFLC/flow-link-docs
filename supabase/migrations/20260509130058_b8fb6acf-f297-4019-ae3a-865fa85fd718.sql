ALTER TABLE public.call_queue_items
  ADD CONSTRAINT call_queue_items_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
NOTIFY pgrst, 'reload schema';