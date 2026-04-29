CREATE TABLE public.client_education (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  level TEXT,
  institution TEXT,
  city TEXT,
  country TEXT,
  start_year INTEGER,
  end_year INTEGER,
  gpa_or_percentage TEXT,
  source_document_id UUID,
  source_file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_education_client_id ON public.client_education(client_id);

ALTER TABLE public.client_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_education readable by authenticated"
  ON public.client_education FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "team inserts client_education"
  ON public.client_education FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'counselor'::app_role)
    OR has_role(auth.uid(), 'documentation'::app_role)
  );

CREATE POLICY "team updates client_education"
  ON public.client_education FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'counselor'::app_role)
    OR has_role(auth.uid(), 'documentation'::app_role)
  );

CREATE POLICY "admins delete client_education"
  ON public.client_education FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_client_education_updated_at
  BEFORE UPDATE ON public.client_education
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_client_profile_updated_at();