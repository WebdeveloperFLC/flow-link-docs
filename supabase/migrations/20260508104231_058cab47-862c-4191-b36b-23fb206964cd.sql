-- Clients: sort/filter performance
CREATE INDEX IF NOT EXISTS idx_clients_created_at_desc ON public.clients (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_updated_at_desc ON public.clients (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (lower(email));
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_application_id ON public.clients (application_id);
CREATE INDEX IF NOT EXISTS idx_clients_full_name_lower ON public.clients (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients (owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients (created_by);

-- Client documents: per-client newest-first listing (excludes trashed quickly)
CREATE INDEX IF NOT EXISTS idx_client_documents_client_uploaded
  ON public.client_documents (client_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_deleted
  ON public.client_documents (client_id, deleted_at);

-- Binders: per-client newest-first
CREATE INDEX IF NOT EXISTS idx_binders_client_generated
  ON public.binders (client_id, generated_at DESC);

-- Activity logs: scrolling/filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc
  ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON public.activity_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON public.activity_logs (user_id);

-- Document verifications: per-document history
CREATE INDEX IF NOT EXISTS idx_doc_verifications_document_created
  ON public.document_verifications (document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_verifications_client
  ON public.document_verifications (client_id);

-- Client access lookups
CREATE INDEX IF NOT EXISTS idx_client_access_client_user
  ON public.client_access (client_id, user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_access_user
  ON public.client_access (user_id) WHERE revoked_at IS NULL;