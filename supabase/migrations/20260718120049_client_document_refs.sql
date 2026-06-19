-- Bi-directional index: profile record ref_key + slot ↔ client_documents
-- Unlink removes association only; file deletion stays in Documents module.

CREATE TABLE IF NOT EXISTS public.client_document_refs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,
  ref_key TEXT NOT NULL,
  slot TEXT NOT NULL,
  label TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_document_refs_unique_link
    UNIQUE (client_id, document_id, ref_key, slot)
);

CREATE INDEX IF NOT EXISTS idx_client_document_refs_client
  ON public.client_document_refs (client_id);

CREATE INDEX IF NOT EXISTS idx_client_document_refs_ref_key
  ON public.client_document_refs (client_id, ref_key);

CREATE INDEX IF NOT EXISTS idx_client_document_refs_document
  ON public.client_document_refs (document_id);

ALTER TABLE public.client_document_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_document_refs view scoped" ON public.client_document_refs;
CREATE POLICY "client_document_refs view scoped"
  ON public.client_document_refs FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_document_refs insert scoped" ON public.client_document_refs;
CREATE POLICY "client_document_refs insert scoped"
  ON public.client_document_refs FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_document_refs update scoped" ON public.client_document_refs;
CREATE POLICY "client_document_refs update scoped"
  ON public.client_document_refs FOR UPDATE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_document_refs delete scoped" ON public.client_document_refs;
CREATE POLICY "client_document_refs delete scoped"
  ON public.client_document_refs FOR DELETE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id));

DROP TRIGGER IF EXISTS trg_client_document_refs_updated_at ON public.client_document_refs;
CREATE TRIGGER trg_client_document_refs_updated_at
  BEFORE UPDATE ON public.client_document_refs
  FOR EACH ROW EXECUTE FUNCTION public.touch_master_items_updated_at();

COMMENT ON TABLE public.client_document_refs IS
  'Profile ↔ document associations by stable ref_key (education:edu_*, tests:ielts, etc.).';
