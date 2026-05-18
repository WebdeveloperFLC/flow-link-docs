CREATE TABLE public.owner_profile_directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_profile_id uuid NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  individual_profile_id uuid NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Director',
  ownership_percent numeric(6,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_profile_id, individual_profile_id, role)
);

CREATE INDEX idx_owner_profile_directors_company ON public.owner_profile_directors(company_profile_id);
CREATE INDEX idx_owner_profile_directors_individual ON public.owner_profile_directors(individual_profile_id);

ALTER TABLE public.owner_profile_directors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounting users can view directors"
ON public.owner_profile_directors FOR SELECT
USING (public.is_accounting_user(auth.uid()));

CREATE POLICY "Accounting admins can insert directors"
ON public.owner_profile_directors FOR INSERT
WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE POLICY "Accounting admins can update directors"
ON public.owner_profile_directors FOR UPDATE
USING (public.is_accounting_admin(auth.uid()));

CREATE POLICY "Accounting admins can delete directors"
ON public.owner_profile_directors FOR DELETE
USING (public.is_accounting_admin(auth.uid()));