-- Client course programs: shortlisted (working) → final (permanent on client file)
CREATE TABLE public.cf_client_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.cf_courses(id) ON DELETE RESTRICT,
  country_code TEXT NOT NULL REFERENCES public.cf_countries(code),
  status TEXT NOT NULL CHECK (status IN ('shortlisted', 'final')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  shortlisted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shortlisted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, course_id)
);

CREATE INDEX idx_cf_client_programs_client ON public.cf_client_programs(client_id);
CREATE INDEX idx_cf_client_programs_client_status ON public.cf_client_programs(client_id, status);
CREATE INDEX idx_cf_client_programs_country ON public.cf_client_programs(client_id, country_code);

CREATE UNIQUE INDEX cf_client_programs_one_primary_per_country
  ON public.cf_client_programs (client_id, country_code)
  WHERE status = 'final' AND is_primary = true;

CREATE TRIGGER cf_client_programs_touch
  BEFORE UPDATE ON public.cf_client_programs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.cf_client_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_client_programs select scoped"
  ON public.cf_client_programs FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "cf_client_programs insert scoped"
  ON public.cf_client_programs FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_client(auth.uid(), client_id)
    AND status = 'shortlisted'
    AND shortlisted_by = auth.uid()
  );

CREATE POLICY "cf_client_programs update scoped"
  ON public.cf_client_programs FOR UPDATE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "cf_client_programs delete shortlisted"
  ON public.cf_client_programs FOR DELETE TO authenticated
  USING (
    status = 'shortlisted'
    AND public.can_edit_client(auth.uid(), client_id)
  );

CREATE POLICY "cf_client_programs delete final admin"
  ON public.cf_client_programs FOR DELETE TO authenticated
  USING (
    status = 'final'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
