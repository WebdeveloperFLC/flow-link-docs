-- 1. Role enum
DO $$ BEGIN
  CREATE TYPE public.person_role AS ENUM ('applicant', 'co_applicant', 'dependant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. case_people table
CREATE TABLE IF NOT EXISTS public.case_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role public.person_role NOT NULL,
  full_name text NOT NULL,
  relationship text,
  date_of_birth date,
  passport_number text,
  gender text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_applicant_per_case
  ON public.case_people (client_id)
  WHERE role = 'applicant' AND NOT is_archived;

CREATE INDEX IF NOT EXISTS case_people_client_idx
  ON public.case_people (client_id);

ALTER TABLE public.case_people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_people readable by authenticated" ON public.case_people;
CREATE POLICY "case_people readable by authenticated"
  ON public.case_people FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "team inserts case_people" ON public.case_people;
CREATE POLICY "team inserts case_people"
  ON public.case_people FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
  );

DROP POLICY IF EXISTS "team updates case_people" ON public.case_people;
CREATE POLICY "team updates case_people"
  ON public.case_people FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
  );

DROP POLICY IF EXISTS "admins delete case_people" ON public.case_people;
CREATE POLICY "admins delete case_people"
  ON public.case_people FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger (reuse existing function)
DROP TRIGGER IF EXISTS touch_case_people_updated_at ON public.case_people;
CREATE TRIGGER touch_case_people_updated_at
  BEFORE UPDATE ON public.case_people
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_profile_updated_at();

-- 3. Per-person columns on documents & profile
ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.case_people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS client_documents_person_idx
  ON public.client_documents (person_id);

ALTER TABLE public.client_profile
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.case_people(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS client_profile_person_uniq
  ON public.client_profile (person_id) WHERE person_id IS NOT NULL;

-- 4. Backfill: create applicant person for every existing client
INSERT INTO public.case_people (client_id, role, full_name)
  SELECT c.id, 'applicant', c.full_name
    FROM public.clients c
   WHERE NOT EXISTS (
     SELECT 1 FROM public.case_people p
      WHERE p.client_id = c.id AND p.role = 'applicant' AND NOT p.is_archived
   );

-- 5. Repoint existing documents at the applicant person
UPDATE public.client_documents d
   SET person_id = p.id
  FROM public.case_people p
 WHERE p.client_id = d.client_id
   AND p.role = 'applicant'
   AND NOT p.is_archived
   AND d.person_id IS NULL;

-- 6. Repoint existing profile rows at the applicant person
UPDATE public.client_profile cp
   SET person_id = p.id
  FROM public.case_people p
 WHERE p.client_id = cp.client_id
   AND p.role = 'applicant'
   AND NOT p.is_archived
   AND cp.person_id IS NULL;
