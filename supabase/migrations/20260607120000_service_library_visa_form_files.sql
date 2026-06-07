-- Official visa / immigration application forms linked to Service Library services.
CREATE TABLE IF NOT EXISTS public.service_library_visa_form_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  country text,
  form_code text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sort_order integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sl_vforms_library ON public.service_library_visa_form_files(library_id);
CREATE INDEX IF NOT EXISTS idx_sl_vforms_current ON public.service_library_visa_form_files(library_id, is_current);
CREATE INDEX IF NOT EXISTS idx_sl_vforms_sort ON public.service_library_visa_form_files(library_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_visa_form_files TO authenticated;
GRANT ALL ON public.service_library_visa_form_files TO service_role;
ALTER TABLE public.service_library_visa_form_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_vforms view auth" ON public.service_library_visa_form_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_vforms insert manage" ON public.service_library_visa_form_files
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_vforms update manage" ON public.service_library_visa_form_files
  FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_vforms delete manage" ON public.service_library_visa_form_files
  FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));

CREATE TRIGGER trg_sl_vforms_updated
  BEFORE UPDATE ON public.service_library_visa_form_files
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
