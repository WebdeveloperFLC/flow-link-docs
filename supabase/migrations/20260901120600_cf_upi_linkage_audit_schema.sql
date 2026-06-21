-- CF ↔ UPI institution linkage audit (Phase 1) — schema only, no FK writes on cf_universities

DO $$ BEGIN
  CREATE TYPE public.cf_upi_linkage_match_method AS ENUM (
    'already_linked',
    'exact',
    'normalized',
    'alias',
    'manual',
    'unmatched'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cf_upi_linkage_candidate_status AS ENUM (
    'pending_review',
    'approved',
    'applied',
    'rejected',
    'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.cf_upi_linkage_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('dry_run', 'apply')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cf_total integer NOT NULL DEFAULT 0,
  cf_linked_before integer NOT NULL DEFAULT 0,
  cf_unlinked_before integer NOT NULL DEFAULT 0,
  exact_count integer NOT NULL DEFAULT 0,
  normalized_count integer NOT NULL DEFAULT 0,
  alias_count integer NOT NULL DEFAULT 0,
  ambiguous_count integer NOT NULL DEFAULT 0,
  unmatched_count integer NOT NULL DEFAULT 0,
  already_linked_count integer NOT NULL DEFAULT 0,
  applied_count integer NOT NULL DEFAULT 0,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_cf_upi_linkage_runs_started
  ON public.cf_upi_linkage_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS public.cf_upi_name_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cf_name_pattern text NOT NULL,
  upi_institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  country_code text REFERENCES public.cf_countries(code) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cf_upi_name_aliases_active
  ON public.cf_upi_name_aliases (is_active)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.cf_upi_linkage_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.cf_upi_linkage_runs(id) ON DELETE CASCADE,
  cf_university_id uuid NOT NULL REFERENCES public.cf_universities(id) ON DELETE CASCADE,
  cf_name text NOT NULL,
  cf_country_code text NOT NULL,
  cf_course_count integer NOT NULL DEFAULT 0,
  suggested_upi_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  suggested_upi_name text,
  match_method public.cf_upi_linkage_match_method NOT NULL,
  confidence smallint NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  status public.cf_upi_linkage_candidate_status NOT NULL DEFAULT 'pending_review',
  is_ambiguous boolean NOT NULL DEFAULT false,
  ambiguous_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cf_upi_linkage_candidates_run
  ON public.cf_upi_linkage_candidates (run_id);

CREATE INDEX IF NOT EXISTS idx_cf_upi_linkage_candidates_status
  ON public.cf_upi_linkage_candidates (status);

CREATE INDEX IF NOT EXISTS idx_cf_upi_linkage_candidates_cf
  ON public.cf_upi_linkage_candidates (cf_university_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_upi_linkage_candidates_open_unique
  ON public.cf_upi_linkage_candidates (cf_university_id)
  WHERE status IN ('pending_review', 'approved');

DROP TRIGGER IF EXISTS cf_upi_name_aliases_touch ON public.cf_upi_name_aliases;
CREATE TRIGGER cf_upi_name_aliases_touch
  BEFORE UPDATE ON public.cf_upi_name_aliases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.cf_upi_linkage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_upi_linkage_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_upi_name_aliases ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_can_edit(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(p_uid, 'admin'::public.app_role)
    OR public.has_role(p_uid, 'administrator'::public.app_role)
    OR public.user_has_module(p_uid, 'institutions', 'edit')
$$;

DROP POLICY IF EXISTS cf_upi_linkage_runs_select ON public.cf_upi_linkage_runs;
CREATE POLICY cf_upi_linkage_runs_select ON public.cf_upi_linkage_runs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.user_has_module(auth.uid(), 'institutions', 'view')
    OR public.user_has_module(auth.uid(), 'institutions', 'edit')
  );

DROP POLICY IF EXISTS cf_upi_linkage_candidates_select ON public.cf_upi_linkage_candidates;
CREATE POLICY cf_upi_linkage_candidates_select ON public.cf_upi_linkage_candidates
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.user_has_module(auth.uid(), 'institutions', 'view')
    OR public.user_has_module(auth.uid(), 'institutions', 'edit')
  );

DROP POLICY IF EXISTS cf_upi_name_aliases_select ON public.cf_upi_name_aliases;
CREATE POLICY cf_upi_name_aliases_select ON public.cf_upi_name_aliases
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.user_has_module(auth.uid(), 'institutions', 'view')
    OR public.user_has_module(auth.uid(), 'institutions', 'edit')
  );

GRANT SELECT ON public.cf_upi_linkage_runs TO authenticated;
GRANT SELECT ON public.cf_upi_linkage_candidates TO authenticated;
GRANT SELECT ON public.cf_upi_name_aliases TO authenticated;

COMMENT ON TABLE public.cf_upi_linkage_runs IS
  'Audit log for CF↔UPI linkage dry-run and apply batches.';
COMMENT ON TABLE public.cf_upi_linkage_candidates IS
  'Review queue: proposed cf_universities → upi_institutions mappings (no auto-apply).';
COMMENT ON TABLE public.cf_upi_name_aliases IS
  'Configurable CF name → UPI institution alias rules (e.g. Seneca rebrand pairs).';
