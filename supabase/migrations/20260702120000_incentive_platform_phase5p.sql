-- Phase 5P — I4 split attribution, I7 multi-plan stacking, rule stacking_mode support

-- ── I4: explicit client attribution splits (e.g. 50/50 handoff) ───────────────
CREATE TABLE IF NOT EXISTS public.incentive_attribution_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_pct numeric NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, counselor_id)
);

CREATE INDEX IF NOT EXISTS idx_incentive_attribution_splits_client
  ON public.incentive_attribution_splits (client_id)
  WHERE is_active;

ALTER TABLE public.incentive_attribution_splits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.incentive_attribution_splits IS
  'Phase 5P I4 — explicit revenue split across counselors per client; active rows must sum to 100%.';

-- ── I7: counselor enrolled on multiple plans same period ────────────────────────
ALTER TABLE public.incentive_plans
  ADD COLUMN IF NOT EXISTS plan_stack_role text NOT NULL DEFAULT 'base'
    CHECK (plan_stack_role IN ('base', 'overlay'));

COMMENT ON COLUMN public.incentive_plans.plan_stack_role IS
  'Phase 5P I7 — base = one primary plan per counselor per period; overlay stacks on top.';

CREATE TABLE IF NOT EXISTS public.incentive_counselor_plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.incentive_plans(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  assignment_role text NOT NULL DEFAULT 'primary'
    CHECK (assignment_role IN ('primary', 'overlay')),
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counselor_id, plan_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_incentive_plan_assignments_period
  ON public.incentive_counselor_plan_assignments (period_key, counselor_id)
  WHERE is_active;

ALTER TABLE public.incentive_counselor_plan_assignments ENABLE ROW LEVEL SECURITY;

-- ── RLS ───────────────────────────────────────────────────────────────────────
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_attribution_splits_staff' AND tablename = 'incentive_attribution_splits'
  ) THEN
    CREATE POLICY incentive_attribution_splits_staff ON public.incentive_attribution_splits FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_attribution_splits_read' AND tablename = 'incentive_attribution_splits'
  ) THEN
    CREATE POLICY incentive_attribution_splits_read ON public.incentive_attribution_splits FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_plan_assignments_staff' AND tablename = 'incentive_counselor_plan_assignments'
  ) THEN
    CREATE POLICY incentive_plan_assignments_staff ON public.incentive_counselor_plan_assignments FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_plan_assignments_read' AND tablename = 'incentive_counselor_plan_assignments'
  ) THEN
    CREATE POLICY incentive_plan_assignments_read ON public.incentive_counselor_plan_assignments FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$pol$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incentive_attribution_splits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incentive_counselor_plan_assignments TO authenticated;

-- ── I4: resolve attribution shares (fallback closer-wins 100%) ────────────────
CREATE OR REPLACE FUNCTION public.fn_resolve_client_incentive_attribution(_client_id uuid)
RETURNS TABLE (counselor_id uuid, share_pct numeric, share_ratio numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum numeric;
BEGIN
  SELECT coalesce(sum(s.share_pct), 0) INTO v_sum
    FROM public.incentive_attribution_splits s
   WHERE s.client_id = _client_id AND s.is_active;

  IF v_sum > 0 THEN
    RETURN QUERY
      SELECT s.counselor_id, s.share_pct, round(s.share_pct / v_sum, 6)
        FROM public.incentive_attribution_splits s
       WHERE s.client_id = _client_id AND s.is_active
       ORDER BY s.share_pct DESC, s.counselor_id;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT attr.counselor_id, 100::numeric, 1::numeric
      FROM public.fn_incentive_resolve_client_attribution(_client_id) attr
     WHERE attr.counselor_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_client_incentive_attribution(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_set_client_attribution_splits(
  _client_id uuid,
  _counselor_ids uuid[],
  _share_pcts numeric[],
  _notes text DEFAULT NULL,
  _actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum numeric := 0;
  v_i int;
  v_client record;
BEGIN
  IF NOT (
    public.has_role(_actor_id, 'admin'::public.app_role)
    OR public.has_role(_actor_id, 'administrator'::public.app_role)
    OR public.has_role(_actor_id, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Forbidden: manager or admin only';
  END IF;

  SELECT id INTO v_client FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF coalesce(array_length(_counselor_ids, 1), 0) < 1 THEN
    RAISE EXCEPTION 'At least one counselor required';
  END IF;

  IF array_length(_counselor_ids, 1) <> array_length(_share_pcts, 1) THEN
    RAISE EXCEPTION 'counselor_ids and share_pcts length mismatch';
  END IF;

  FOR v_i IN 1 .. array_length(_share_pcts, 1) LOOP
    IF _share_pcts[v_i] <= 0 OR _share_pcts[v_i] > 100 THEN
      RAISE EXCEPTION 'Each share_pct must be between 0 and 100';
    END IF;
    v_sum := v_sum + _share_pcts[v_i];
  END LOOP;

  IF abs(v_sum - 100) > 0.01 THEN
    RAISE EXCEPTION 'Share percentages must sum to 100 (got %)', v_sum;
  END IF;

  UPDATE public.incentive_attribution_splits
     SET is_active = false, updated_at = now()
   WHERE client_id = _client_id AND is_active;

  FOR v_i IN 1 .. array_length(_counselor_ids, 1) LOOP
    INSERT INTO public.incentive_attribution_splits (
      client_id, counselor_id, share_pct, notes, is_active, created_by
    ) VALUES (
      _client_id, _counselor_ids[v_i], _share_pcts[v_i], _notes, true, _actor_id
    )
    ON CONFLICT (client_id, counselor_id) DO UPDATE SET
      share_pct = EXCLUDED.share_pct,
      notes = EXCLUDED.notes,
      is_active = true,
      updated_at = now();
  END LOOP;

  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    _actor_id,
    'incentive_attribution_split_set',
    'client',
    _client_id,
    jsonb_build_object(
      'counselor_ids', to_jsonb(_counselor_ids),
      'share_pcts', to_jsonb(_share_pcts),
      'notes', _notes
    )
  );

  RETURN jsonb_build_object('ok', true, 'client_id', _client_id, 'split_count', array_length(_counselor_ids, 1));
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_set_client_attribution_splits(uuid, uuid[], numeric[], text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_clear_client_attribution_splits(
  _client_id uuid,
  _actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(_actor_id, 'admin'::public.app_role)
    OR public.has_role(_actor_id, 'administrator'::public.app_role)
    OR public.has_role(_actor_id, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Forbidden: manager or admin only';
  END IF;

  UPDATE public.incentive_attribution_splits
     SET is_active = false, updated_at = now()
   WHERE client_id = _client_id AND is_active;

  RETURN jsonb_build_object('ok', true, 'client_id', _client_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_clear_client_attribution_splits(uuid, uuid) TO authenticated;

-- ── I7: plan assignment RPCs ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_set_counselor_plan_assignment(
  _counselor_id uuid,
  _plan_id uuid,
  _period_key text,
  _assignment_role text DEFAULT 'primary',
  _notes text DEFAULT NULL,
  _actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.incentive_plans%ROWTYPE;
  v_role text;
BEGIN
  IF NOT (
    public.has_role(_actor_id, 'admin'::public.app_role)
    OR public.has_role(_actor_id, 'administrator'::public.app_role)
    OR public.has_role(_actor_id, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Forbidden: manager or admin only';
  END IF;

  SELECT * INTO v_plan FROM public.incentive_plans WHERE id = _plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  v_role := CASE
    WHEN v_plan.plan_stack_role = 'overlay' THEN 'overlay'
    ELSE coalesce(nullif(_assignment_role, ''), 'primary')
  END;

  IF v_plan.plan_stack_role = 'base' AND v_role = 'primary' THEN
    UPDATE public.incentive_counselor_plan_assignments a
       SET is_active = false, updated_at = now()
      FROM public.incentive_plans p
     WHERE a.plan_id = p.id
       AND a.counselor_id = _counselor_id
       AND a.period_key = _period_key
       AND a.is_active
       AND a.assignment_role = 'primary'
       AND p.plan_stack_role = 'base'
       AND a.plan_id <> _plan_id;
  END IF;

  INSERT INTO public.incentive_counselor_plan_assignments (
    counselor_id, plan_id, period_key, assignment_role, notes, is_active, assigned_by
  ) VALUES (
    _counselor_id, _plan_id, _period_key, v_role, _notes, true, _actor_id
  )
  ON CONFLICT (counselor_id, plan_id, period_key) DO UPDATE SET
    assignment_role = EXCLUDED.assignment_role,
    notes = EXCLUDED.notes,
    is_active = true,
    assigned_by = EXCLUDED.assigned_by,
    updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'counselor_id', _counselor_id,
    'plan_id', _plan_id,
    'period_key', _period_key,
    'assignment_role', v_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_set_counselor_plan_assignment(uuid, uuid, text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_remove_counselor_plan_assignment(
  _counselor_id uuid,
  _plan_id uuid,
  _period_key text,
  _actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(_actor_id, 'admin'::public.app_role)
    OR public.has_role(_actor_id, 'administrator'::public.app_role)
    OR public.has_role(_actor_id, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Forbidden: manager or admin only';
  END IF;

  UPDATE public.incentive_counselor_plan_assignments
     SET is_active = false, updated_at = now()
   WHERE counselor_id = _counselor_id
     AND plan_id = _plan_id
     AND period_key = _period_key
     AND is_active;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_remove_counselor_plan_assignment(uuid, uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_counselor_plan_stack_summary(
  _counselor_id uuid,
  _period_key text
)
RETURNS TABLE (
  plan_id uuid,
  plan_name text,
  plan_stack_role text,
  assignment_role text,
  run_id uuid,
  run_status text,
  run_locked boolean,
  earned_amount numeric,
  settlement_currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH assignments AS (
    SELECT a.plan_id, a.assignment_role, p.name AS plan_name, p.plan_stack_role
      FROM public.incentive_counselor_plan_assignments a
      JOIN public.incentive_plans p ON p.id = a.plan_id
     WHERE a.counselor_id = _counselor_id
       AND a.period_key = _period_key
       AND a.is_active
  ),
  runs AS (
    SELECT r.id, r.plan_id, r.status, r.locked, r.settlement_currency
      FROM public.incentive_runs r
     WHERE r.period_key = _period_key
       AND r.plan_id IN (SELECT plan_id FROM assignments)
  ),
  earned AS (
    SELECT li.run_id, sum(li.earned_amount) AS total
      FROM public.incentive_line_items li
     WHERE li.counselor_id = _counselor_id
       AND li.run_id IN (SELECT id FROM runs)
     GROUP BY li.run_id
  )
  SELECT
    a.plan_id,
    a.plan_name,
    a.plan_stack_role,
    a.assignment_role,
    r.id AS run_id,
    r.status::text AS run_status,
    coalesce(r.locked, false) AS run_locked,
    coalesce(e.total, 0) AS earned_amount,
    coalesce(r.settlement_currency, 'INR') AS settlement_currency
  FROM assignments a
  LEFT JOIN runs r ON r.plan_id = a.plan_id
  LEFT JOIN earned e ON e.run_id = r.id
  ORDER BY a.plan_stack_role, a.plan_name;
$$;

GRANT EXECUTE ON FUNCTION public.fn_counselor_plan_stack_summary(uuid, text) TO authenticated;
