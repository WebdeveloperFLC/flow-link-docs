ALTER TABLE public.upi_institution_sources
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.upi_uploaded_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_upi_sources_document ON public.upi_institution_sources(document_id);

-- Backfill: link sources whose file_path matches a document
UPDATE public.upi_institution_sources s
SET document_id = d.id
FROM public.upi_uploaded_documents d
WHERE s.document_id IS NULL
  AND s.file_path IS NOT NULL
  AND s.file_path = d.file_path
  AND s.institution_id = d.institution_id;