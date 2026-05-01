ALTER TABLE public.visa_forms
  ADD COLUMN IF NOT EXISTS source_pdf_path text,
  ADD COLUMN IF NOT EXISTS published_pdf_path text,
  ADD COLUMN IF NOT EXISTS published_schema_id uuid,
  ADD COLUMN IF NOT EXISTS builder_state jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill source_pdf_path from existing file_path so the builder can show the original.
UPDATE public.visa_forms
   SET source_pdf_path = file_path
 WHERE source_pdf_path IS NULL;