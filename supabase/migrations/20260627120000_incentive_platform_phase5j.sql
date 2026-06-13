-- Phase 5J — Admin run unlock/void, next-month wallet preview, command center RPC

CREATE OR REPLACE FUNCTION public.fn_can_admin_incentive_runs(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'administrator'::public.app_role)
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_can_admin_incentive_runs(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.incentive_run_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.incentive_runs(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('unlock', 'void')),
  reason text NOT NULL,
  performed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_run_admin_actions_run
  ON public.incentive_run_admin_actions (run_id, created_at DESC);

ALTER TABLE public.incentive_run_admin_actions ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_run_admin_actions_select' AND tablename = 'incentive_run_admin_actions'
  ) THEN
    CREATE POLICY incentive_run_admin_actions_select ON public.incentive_run_admin_actions FOR SELECT TO authenticated
      USING (public.fn_can_admin_incentive_runs(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_run_admin_actions_insert' AND tablename = 'incentive_run_admin_actions'
  ) THEN
    CREATE POLICY incentive_run_admin_actions_insert ON public.incentive_run_admin_actions FOR INSERT TO authenticated
      WITH CHECK (
        performed_by = auth.uid()
        AND public.fn_can_admin_incentive_runs(auth.uid())
      );
  END IF;
END
$pol$;

GRANT SELECT, INSERT ON public.incentive_run_admin_actions TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_admin_unlock_incentive_run(
  _run_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_run public.incentive_runs%ROWTYPE;
  v_payouts int;
BEGIN
  IF NOT public.fn_can_admin_incentive_runs(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF trim(coalesce(_reason, '')) = '' THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  SELECT * INTO v_run FROM public.incentive_runs WHERE id = _run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'run not found';
  END IF;

  IF NOT v_run.locked THEN
    RAISE EXCEPTION 'run is not locked';
  END IF;

  IF v_run.status = 'void' THEN
    RAISE EXCEPTION 'voided runs cannot be unlocked';
  END IF;

  SELECT count(*)::int INTO v_payouts
    FROM public.incentive_payouts ip
   WHERE ip.run_id = _run_id
     AND ip.status IN ('approved', 'processed', 'paid');

  IF v_payouts > 0 THEN
    RAISE EXCEPTION 'cannot unlock — % payout(s) already approved or paid', v_payouts;
  END IF;

  UPDATE public.incentive_runs
     SET locked = false,
         status = 'calculated',
         approved_at = NULL,
         approved_by = NULL,
         updated_at = now()
   WHERE id = _run_id;

  INSERT INTO public.incentive_run_admin_actions (run_id, action, reason, performed_by)
  VALUES (_run_id, 'unlock', trim(_reason), v_uid);

  RETURN jsonb_build_object(
    'ok', true,
    'run_id', _run_id,
    'action', 'unlock',
    'period_key', v_run.period_key,
    'message', 'Run unlocked — recalculate is allowed again'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_void_incentive_run(
  _run_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_run public.incentive_runs%ROWTYPE;
  v_payouts int;
BEGIN
  IF NOT public.fn_can_admin_incentive_runs(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF trim(coalesce(_reason, '')) = '' THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  SELECT * INTO v_run FROM public.incentive_runs WHERE id = _run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'run not found';
  END IF;

  IF v_run.status = 'void' THEN
    RAISE EXCEPTION 'run already voided';
  END IF;

  SELECT count(*)::int INTO v_payouts
    FROM public.incentive_payouts ip
   WHERE ip.run_id = _run_id;

  IF v_payouts > 0 THEN
    RAISE EXCEPTION 'cannot void — delete payouts first (% row(s))', v_payouts;
  END IF;

  UPDATE public.incentive_runs
     SET locked = false,
         status = 'void',
         approved_at = NULL,
         approved_by = NULL,
         updated_at = now()
   WHERE id = _run_id;

  DELETE FROM public.incentive_line_items WHERE run_id = _run_id;

  INSERT INTO public.incentive_run_admin_actions (run_id, action, reason, performed_by)
  VALUES (_run_id, 'void', trim(_reason), v_uid);

  RETURN jsonb_build_object(
    'ok', true,
    'run_id', _run_id,
    'action', 'void',
    'period_key', v_run.period_key,
    'message', 'Run voided — line items cleared'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_unlock_incentive_run(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_void_incentive_run(uuid, text) TO authenticated;

-- X4: preview next-period wallet sizing without writing
CREATE OR REPLACE FUNCTION public.fn_preview_next_period_wallets(_period_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next text := public.fn_next_period_key(_period_key);
  v_rows jsonb := '[]'::jsonb;
  r record;
  v_ach numeric;
  v_target numeric;
  v_base numeric;
  v_mult numeric;
  v_potential numeric;
  v_name text;
BEGIN
  FOR r IN
    SELECT w.counselor_id, w.currency, w.branch_id
      FROM public.discount_wallets w
     WHERE w.period_key = _period_key
       AND w.budget_kind = 'month_to_month'
     GROUP BY w.counselor_id, w.currency, w.branch_id
  LOOP
    SELECT a.achievement_pct INTO v_ach
      FROM public.fn_counselor_period_achievement(_period_key) a
     WHERE a.counselor_id = r.counselor_id;

    v_ach := coalesce(v_ach, 0);

    SELECT t.target_value INTO v_target
      FROM public.incentive_targets t
     WHERE t.counselor_id = r.counselor_id
       AND t.period_key = v_next
       AND coalesce(t.target_metric, 'revenue') IN ('revenue', 'net_revenue')
     ORDER BY t.created_at DESC
     LIMIT 1;

    IF v_target IS NULL THEN
      SELECT t.target_value INTO v_target
        FROM public.incentive_targets t
       WHERE t.counselor_id = r.counselor_id
         AND t.period_key = _period_key
         AND coalesce(t.target_metric, 'revenue') IN ('revenue', 'net_revenue')
       ORDER BY t.created_at DESC
       LIMIT 1;
    END IF;

    v_base := public.fn_wallet_base_from_rules(v_ach, v_target, r.currency, r.branch_id);
    v_mult := public.fn_wallet_multiplier_for_achievement(v_ach);
    v_potential := round(v_base * v_mult, 2);

    SELECT coalesce(p.full_name, p.email, r.counselor_id::text) INTO v_name
      FROM public.profiles p
     WHERE p.id = r.counselor_id;

    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'counselor_id', r.counselor_id,
      'counselor_name', v_name,
      'prior_achievement_pct', v_ach,
      'assigned_target', coalesce(v_target, 0),
      'base_wallet', v_base,
      'multiplier', v_mult,
      'potential_wallet', v_potential,
      'currency', r.currency
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'next_period_key', v_next,
    'preview', v_rows,
    'total_potential', (
      SELECT coalesce(sum((x->>'potential_wallet')::numeric), 0)
        FROM jsonb_array_elements(v_rows) x
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_preview_next_period_wallets(text) TO authenticated;

-- Command center snapshot (period + optional branch filter by name)
CREATE OR REPLACE FUNCTION public.fn_period_command_center(
  _period_key text,
  _branch_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_lock jsonb;
  v_open_wallets int;
  v_closed_wallets int;
  v_locked_run record;
  v_preview jsonb;
BEGIN
  IF _branch_name IS NOT NULL AND _branch_name <> 'All branches' THEN
    SELECT b.id INTO v_branch_id FROM public.branches b WHERE b.name = _branch_name LIMIT 1;
  END IF;

  v_lock := public.fn_period_lock_readiness(_period_key);

  SELECT count(*)::int INTO v_open_wallets
    FROM public.discount_wallets w
   WHERE w.period_key = _period_key
     AND w.closed_at IS NULL
     AND (v_branch_id IS NULL OR w.branch_id = v_branch_id);

  SELECT count(*)::int INTO v_closed_wallets
    FROM public.discount_wallets w
   WHERE w.period_key = _period_key
     AND w.closed_at IS NOT NULL
     AND (v_branch_id IS NULL OR w.branch_id = v_branch_id);

  SELECT ir.id, ir.locked, ir.status, ir.total_settlement
    INTO v_locked_run
    FROM public.incentive_runs ir
   WHERE ir.period_key = _period_key
     AND ir.locked = true
     AND (v_branch_id IS NULL OR ir.branch_id = v_branch_id)
   ORDER BY ir.calculated_at DESC NULLS LAST
   LIMIT 1;

  v_preview := public.fn_preview_next_period_wallets(_period_key);

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'branch_name', coalesce(_branch_name, 'All branches'),
    'lock_readiness', v_lock,
    'wallets_open', v_open_wallets,
    'wallets_closed', v_closed_wallets,
    'period_fully_closed', v_open_wallets = 0 AND v_closed_wallets > 0,
    'locked_run_id', v_locked_run.id,
    'run_locked', coalesce(v_locked_run.locked, false),
    'run_status', v_locked_run.status,
    'cash_incentive_locked', coalesce(v_locked_run.total_settlement, 0),
    'next_period_key', v_preview->>'next_period_key',
    'next_wallet_total_potential', coalesce((v_preview->>'total_potential')::numeric, 0),
    'next_wallet_preview_count', jsonb_array_length(coalesce(v_preview->'preview', '[]'::jsonb))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_period_command_center(text, text) TO authenticated;

COMMENT ON FUNCTION public.fn_admin_unlock_incentive_run IS 'Phase 5J — admin-only unlock locked run for recalculate (blocks if payouts approved/paid)';
COMMENT ON FUNCTION public.fn_admin_void_incentive_run IS 'Phase 5J — admin-only void run and clear line items (blocks if any payouts exist)';
COMMENT ON FUNCTION public.fn_preview_next_period_wallets IS 'Phase 5J — X4 preview next month wallet potential without reseed';
COMMENT ON FUNCTION public.fn_period_command_center IS 'Phase 5J — command center KPI snapshot for period/branch';
