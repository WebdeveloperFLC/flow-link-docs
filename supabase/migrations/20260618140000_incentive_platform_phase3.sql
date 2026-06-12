-- Phase 3: branch contests, campaign overlays, dimension leaderboards

-- ── Campaign overlays (additive bonuses on base plan) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period_key text NOT NULL,
  period_start date,
  period_end date,
  scope_preset text,
  scope_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  bonus_type text NOT NULL DEFAULT 'flat_per_event'
    CHECK (bonus_type IN ('flat_per_event', 'percent_revenue', 'pool_fixed')),
  bonus_value numeric NOT NULL DEFAULT 0,
  pool_amount numeric,
  settlement_currency text NOT NULL DEFAULT 'INR',
  country_code text,
  institution_id uuid,
  intake text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_campaigns_period ON public.incentive_campaigns (period_key, is_active);

-- ── Branch vs branch contests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_branch_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period_key text NOT NULL,
  metric text NOT NULL DEFAULT 'net_revenue'
    CHECK (metric IN ('net_revenue', 'enrolment_count', 'gross_revenue')),
  pool_amount numeric NOT NULL DEFAULT 0,
  settlement_currency text NOT NULL DEFAULT 'INR',
  min_branch_total numeric NOT NULL DEFAULT 0,
  winner_mode text NOT NULL DEFAULT 'top_branch'
    CHECK (winner_mode IN ('top_branch', 'proportional_all')),
  split_mode text NOT NULL DEFAULT 'by_contribution'
    CHECK (split_mode IN ('by_contribution', 'equal_among_counselors')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incentive_contest_branches (
  contest_id uuid NOT NULL REFERENCES public.incentive_branch_contests(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  PRIMARY KEY (contest_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_incentive_contests_period ON public.incentive_branch_contests (period_key, is_active);

-- ── Counselor revenue breakdown (allied vs core) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_incentive_counselor_revenue_breakdown(
  _counselor_id uuid,
  _period_key text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_build_object(
    'core_revenue', coalesce(sum(CASE
      WHEN coalesce(qe.dimensions->>'master_key', '') IN (
        'coaching_services', 'visa_immigration', 'admission_services'
      ) THEN qe.amount ELSE 0 END), 0),
    'allied_revenue', coalesce(sum(CASE
      WHEN qe.dimensions->>'master_key' = 'allied_services' THEN qe.amount ELSE 0 END), 0),
    'travel_revenue', coalesce(sum(CASE
      WHEN qe.dimensions->>'master_key' = 'travel_financial' THEN qe.amount ELSE 0 END), 0),
    'event_count', count(*),
    'currency', coalesce(max(qe.currency), 'INR')
  ), '{}'::jsonb)
  FROM public.incentive_qualifying_events qe
  WHERE qe.counselor_id = _counselor_id
    AND qe.period_key = _period_key;
$$;

GRANT EXECUTE ON FUNCTION public.fn_incentive_counselor_revenue_breakdown(uuid, text) TO authenticated;

-- ── Dimension leaderboards (country, institution, service, branch, counselor) ─
CREATE OR REPLACE FUNCTION public.fn_incentive_dimension_leaderboard(
  _period_key text,
  _group_by text DEFAULT 'counselor',
  _limit int DEFAULT 10
)
RETURNS TABLE (
  rank bigint,
  group_key text,
  group_label text,
  total_amount numeric,
  event_count bigint,
  currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _group_by = 'counselor' THEN
    RETURN QUERY
    SELECT
      row_number() OVER (ORDER BY sum(qe.amount) DESC) AS rank,
      qe.counselor_id::text AS group_key,
      coalesce(p.full_name, qe.counselor_id::text) AS group_label,
      sum(qe.amount) AS total_amount,
      count(*)::bigint AS event_count,
      coalesce(max(qe.currency), 'INR') AS currency
    FROM public.incentive_qualifying_events qe
    LEFT JOIN public.profiles p ON p.id = qe.counselor_id
    WHERE qe.period_key = _period_key
    GROUP BY qe.counselor_id, p.full_name
    ORDER BY sum(qe.amount) DESC
    LIMIT greatest(_limit, 1);

  ELSIF _group_by = 'branch' THEN
    RETURN QUERY
    SELECT
      row_number() OVER (ORDER BY sum(qe.amount) DESC) AS rank,
      qe.branch_id::text AS group_key,
      coalesce(b.name, qe.branch_id::text) AS group_label,
      sum(qe.amount) AS total_amount,
      count(*)::bigint AS event_count,
      coalesce(max(qe.currency), 'INR') AS currency
    FROM public.incentive_qualifying_events qe
    LEFT JOIN public.branches b ON b.id = qe.branch_id
    WHERE qe.period_key = _period_key AND qe.branch_id IS NOT NULL
    GROUP BY qe.branch_id, b.name
    ORDER BY sum(qe.amount) DESC
    LIMIT greatest(_limit, 1);

  ELSIF _group_by = 'country' THEN
    RETURN QUERY
    SELECT
      row_number() OVER (ORDER BY sum(qe.amount) DESC) AS rank,
      coalesce(qe.dimensions->>'country_code', 'unknown') AS group_key,
      coalesce(qe.dimensions->>'country_code', 'Unknown') AS group_label,
      sum(qe.amount) AS total_amount,
      count(*)::bigint AS event_count,
      coalesce(max(qe.currency), 'INR') AS currency
    FROM public.incentive_qualifying_events qe
    WHERE qe.period_key = _period_key
      AND coalesce(qe.dimensions->>'country_code', '') <> ''
    GROUP BY qe.dimensions->>'country_code'
    ORDER BY sum(qe.amount) DESC
    LIMIT greatest(_limit, 1);

  ELSIF _group_by = 'institution' THEN
    RETURN QUERY
    SELECT
      row_number() OVER (ORDER BY sum(qe.amount) DESC) AS rank,
      coalesce(qe.dimensions->>'institution_id', 'unknown') AS group_key,
      coalesce(i.name, qe.dimensions->>'institution_id', 'Unknown') AS group_label,
      sum(qe.amount) AS total_amount,
      count(*)::bigint AS event_count,
      coalesce(max(qe.currency), 'INR') AS currency
    FROM public.incentive_qualifying_events qe
    LEFT JOIN public.upi_institutions i ON i.id::text = qe.dimensions->>'institution_id'
    WHERE qe.period_key = _period_key
      AND coalesce(qe.dimensions->>'institution_id', '') <> ''
    GROUP BY qe.dimensions->>'institution_id', i.name
    ORDER BY sum(qe.amount) DESC
    LIMIT greatest(_limit, 1);

  ELSIF _group_by = 'service' THEN
    RETURN QUERY
    SELECT
      row_number() OVER (ORDER BY sum(qe.amount) DESC) AS rank,
      coalesce(qe.dimensions->>'master_key', 'unknown') AS group_key,
      replace(coalesce(qe.dimensions->>'master_key', 'unknown'), '_', ' ') AS group_label,
      sum(qe.amount) AS total_amount,
      count(*)::bigint AS event_count,
      coalesce(max(qe.currency), 'INR') AS currency
    FROM public.incentive_qualifying_events qe
    WHERE qe.period_key = _period_key
      AND coalesce(qe.dimensions->>'master_key', '') <> ''
    GROUP BY qe.dimensions->>'master_key'
    ORDER BY sum(qe.amount) DESC
    LIMIT greatest(_limit, 1);

  ELSE
    RAISE EXCEPTION 'Unsupported group_by: %', _group_by;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_incentive_dimension_leaderboard(text, text, int) TO authenticated;

-- ── Branch contest standings (for admin UI) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_incentive_branch_contest_standings(
  _contest_id uuid
)
RETURNS TABLE (
  branch_id uuid,
  branch_name text,
  total_amount numeric,
  event_count bigint,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH contest AS (
    SELECT c.period_key, c.metric FROM public.incentive_branch_contests c WHERE c.id = _contest_id
  ),
  branch_events AS (
    SELECT
      cb.branch_id,
      b.name AS branch_name,
      CASE WHEN (SELECT metric FROM contest) = 'enrolment_count'
        THEN count(*)::numeric ELSE sum(qe.amount) END AS total_amount,
      count(*)::bigint AS event_count
    FROM public.incentive_contest_branches cb
    JOIN contest ON true
    JOIN public.branches b ON b.id = cb.branch_id
    LEFT JOIN public.incentive_qualifying_events qe
      ON qe.branch_id = cb.branch_id AND qe.period_key = (SELECT period_key FROM contest)
    GROUP BY cb.branch_id, b.name
  )
  SELECT
    branch_id,
    branch_name,
    coalesce(total_amount, 0),
    coalesce(event_count, 0),
    row_number() OVER (ORDER BY coalesce(total_amount, 0) DESC) AS rank
  FROM branch_events
  ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION public.fn_incentive_branch_contest_standings(uuid) TO authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.incentive_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_branch_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_contest_branches ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_campaigns_admin' AND tablename = 'incentive_campaigns') THEN
    CREATE POLICY incentive_campaigns_admin ON public.incentive_campaigns FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_campaigns_view' AND tablename = 'incentive_campaigns') THEN
    CREATE POLICY incentive_campaigns_view ON public.incentive_campaigns FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_contests_admin' AND tablename = 'incentive_branch_contests') THEN
    CREATE POLICY incentive_contests_admin ON public.incentive_branch_contests FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_contests_view' AND tablename = 'incentive_branch_contests') THEN
    CREATE POLICY incentive_contests_view ON public.incentive_branch_contests FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_contest_branches_admin' AND tablename = 'incentive_contest_branches') THEN
    CREATE POLICY incentive_contest_branches_admin ON public.incentive_contest_branches FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_contest_branches_view' AND tablename = 'incentive_contest_branches') THEN
    CREATE POLICY incentive_contest_branches_view ON public.incentive_contest_branches FOR SELECT TO authenticated USING (true);
  END IF;
END
$pol$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incentive_campaigns_touch') THEN
    CREATE TRIGGER trg_incentive_campaigns_touch BEFORE UPDATE ON public.incentive_campaigns
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incentive_contests_touch') THEN
    CREATE TRIGGER trg_incentive_branch_contests_touch BEFORE UPDATE ON public.incentive_branch_contests
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;
