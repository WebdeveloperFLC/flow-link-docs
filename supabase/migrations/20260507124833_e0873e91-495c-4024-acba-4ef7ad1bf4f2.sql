ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_client_documents_deleted_at
  ON public.client_documents(client_id, deleted_at);