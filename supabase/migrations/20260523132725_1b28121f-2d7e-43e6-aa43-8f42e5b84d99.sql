
CREATE TABLE IF NOT EXISTS public.client_document_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL UNIQUE REFERENCES public.client_documents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.case_people(id) ON DELETE SET NULL,
  doc_type_detected TEXT,
  classify_confidence INTEGER NOT NULL DEFAULT 0,
  ocr_text TEXT,
  ocr_lang TEXT,
  ocr_pages INTEGER,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_confidence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cde_client ON public.client_document_extractions(client_id);
CREATE INDEX IF NOT EXISTS idx_cde_person ON public.client_document_extractions(person_id);
CREATE INDEX IF NOT EXISTS idx_cde_status ON public.client_document_extractions(status);

ALTER TABLE public.client_document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cde view scoped" ON public.client_document_extractions
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "cde insert scoped" ON public.client_document_extractions
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "cde update scoped" ON public.client_document_extractions
  FOR UPDATE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "cde delete admin" ON public.client_document_extractions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cde_updated_at
  BEFORE UPDATE ON public.client_document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.touch_master_items_updated_at();

CREATE TABLE IF NOT EXISTS public.client_document_extraction_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 2,
  attempts INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'queued',
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdeq_pull ON public.client_document_extraction_queue(state, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cdeq_document ON public.client_document_extraction_queue(document_id);

ALTER TABLE public.client_document_extraction_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cdeq view scoped" ON public.client_document_extraction_queue
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "cdeq insert scoped" ON public.client_document_extraction_queue
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "cdeq update scoped" ON public.client_document_extraction_queue
  FOR UPDATE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "cdeq delete admin" ON public.client_document_extraction_queue
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cdeq_updated_at
  BEFORE UPDATE ON public.client_document_extraction_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_master_items_updated_at();
