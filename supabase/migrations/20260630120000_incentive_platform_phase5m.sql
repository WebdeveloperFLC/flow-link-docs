-- Phase 5M — settlement governance: I3 scheme templates, I6 disputes, I1 payroll status, I2 FX audit

-- ── I3: reusable plan templates ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_scheme_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  source_plan_id uuid REFERENCES public.incentive_plans(id) ON DELETE SET NULL,
  plan_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  slabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_scheme_templates_active
  ON public.incentive_scheme_templates (is_active, created_at DESC);

ALTER TABLE public.incentive_scheme_templates ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_scheme_templates_admin' AND tablename = 'incentive_scheme_templates'
  ) THEN
    CREATE POLICY incentive_scheme_templates_admin ON public.incentive_scheme_templates FOR ALL TO authenticated
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
END
$pol$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incentive_scheme_templates TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_save_plan_as_scheme_template(
  _plan_id uuid,
  _template_name text,
  _description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan public.incentive_plans%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_plan FROM public.incentive_plans WHERE id = _plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan not found'; END IF;
  IF coalesce(trim(_template_name), '') = '' THEN RAISE EXCEPTION 'template name required'; END IF;

  INSERT INTO public.incentive_scheme_templates (
    name, description, source_plan_id, plan_defaults, slabs, rules, created_by
  ) VALUES (
    trim(_template_name),
    nullif(trim(_description), ''),
    _plan_id,
    jsonb_build_object(
      'period_type', v_plan.period_type,
      'settlement_currency', v_plan.settlement_currency,
      'revenue_basis', v_plan.revenue_basis,
      'scope_type', v_plan.scope_type,
      'role_key', v_plan.role_key,
      'branch_id', v_plan.branch_id
    ),
    coalesce((
      SELECT jsonb_agg(to_jsonb(s) - 'id' - 'plan_id' - 'created_at' ORDER BY s.sort_order)
        FROM public.incentive_slabs s WHERE s.plan_id = _plan_id
    ), '[]'::jsonb),
    coalesce((
      SELECT jsonb_agg(to_jsonb(r) - 'id' - 'plan_id' - 'created_at' - 'updated_at' ORDER BY r.sort_order)
        FROM public.incentive_rules r WHERE r.plan_id = _plan_id
    ), '[]'::jsonb),
    v_uid
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_clone_scheme_template_to_plan(
  _template_id uuid,
  _plan_name text,
  _branch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tpl public.incentive_scheme_templates%ROWTYPE;
  v_plan_id uuid;
  v_rule jsonb;
  v_slab jsonb;
  v_new_rule_id uuid;
  v_rule_map jsonb := '{}'::jsonb;
  v_old_rule_id text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_tpl FROM public.incentive_scheme_templates WHERE id = _template_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;
  IF coalesce(trim(_plan_name), '') = '' THEN RAISE EXCEPTION 'plan name required'; END IF;

  INSERT INTO public.incentive_plans (
    name, description, branch_id, period_type, settlement_currency, revenue_basis,
    scope_type, role_key, is_active, created_by
  ) VALUES (
    trim(_plan_name),
    coalesce(v_tpl.description, 'Cloned from template ' || v_tpl.name),
    coalesce(_branch_id, (v_tpl.plan_defaults->>'branch_id')::uuid),
    coalesce(v_tpl.plan_defaults->>'period_type', 'monthly')::public.incentive_period_type,
    coalesce(v_tpl.plan_defaults->>'settlement_currency', 'INR'),
    coalesce(v_tpl.plan_defaults->>'revenue_basis', 'net'),
    coalesce(v_tpl.plan_defaults->>'scope_type', 'global'),
    v_tpl.plan_defaults->>'role_key',
    true,
    v_uid
  )
  RETURNING id INTO v_plan_id;

  FOR v_rule IN SELECT * FROM jsonb_array_elements(v_tpl.rules)
  LOOP
    v_old_rule_id := v_rule->>'id';
    INSERT INTO public.incentive_rules (
      plan_id, name, sort_order, is_active, scope_preset, scope_json,
      source_type, metric, rate_type, rate_value, stacking_mode, cap_amount,
      settlement_currency, milestone
    ) VALUES (
      v_plan_id,
      coalesce(v_rule->>'name', 'Rule'),
      coalesce((v_rule->>'sort_order')::int, 0),
      coalesce((v_rule->>'is_active')::boolean, true),
      v_rule->>'scope_preset',
      coalesce(v_rule->'scope_json', '{}'::jsonb),
      coalesce(v_rule->>'source_type', 'service_revenue')::public.incentive_source_type,
      coalesce(v_rule->>'metric', 'net_revenue'),
      coalesce(v_rule->>'rate_type', 'percent')::public.incentive_rate_type,
      coalesce((v_rule->>'rate_value')::numeric, 0),
      coalesce(v_rule->>'stacking_mode', 'additive'),
      (v_rule->>'cap_amount')::numeric,
      v_rule->>'settlement_currency',
      v_rule->>'milestone'
    )
    RETURNING id INTO v_new_rule_id;
    IF v_old_rule_id IS NOT NULL THEN
      v_rule_map := v_rule_map || jsonb_build_object(v_old_rule_id, v_new_rule_id::text);
    END IF;
  END LOOP;

  FOR v_slab IN SELECT * FROM jsonb_array_elements(v_tpl.slabs)
  LOOP
    INSERT INTO public.incentive_slabs (
      plan_id, rule_id, source_type, metric, min_threshold, max_threshold,
      rate_type, rate_value, service_filter, sort_order
    ) VALUES (
      v_plan_id,
      CASE
        WHEN v_slab->>'rule_id' IS NOT NULL AND v_rule_map ? (v_slab->>'rule_id')
          THEN (v_rule_map->>(v_slab->>'rule_id'))::uuid
        ELSE NULL
      END,
      coalesce(v_slab->>'source_type', 'service_revenue')::public.incentive_source_type,
      coalesce(v_slab->>'metric', 'net_revenue'),
      coalesce((v_slab->>'min_threshold')::numeric, 0),
      (v_slab->>'max_threshold')::numeric,
      coalesce(v_slab->>'rate_type', 'percent')::public.incentive_rate_type,
      coalesce((v_slab->>'rate_value')::numeric, 0),
      v_slab->>'service_filter',
      coalesce((v_slab->>'sort_order')::int, 0)
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'plan_id', v_plan_id, 'template_id', _template_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_save_plan_as_scheme_template(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_clone_scheme_template_to_plan(uuid, text, uuid) TO authenticated;

-- ── I6: line-item dispute threads ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_run_item_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id uuid NOT NULL UNIQUE REFERENCES public.incentive_line_items(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.incentive_runs(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.incentive_run_item_dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.incentive_run_item_disputes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_run_item_disputes_run ON public.incentive_run_item_disputes (run_id, status);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON public.incentive_run_item_dispute_messages (dispute_id, created_at);

ALTER TABLE public.incentive_run_item_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_run_item_dispute_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.incentive_run_item_disputes TO authenticated;
GRANT SELECT ON public.incentive_run_item_dispute_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_open_run_item_dispute(
  _line_item_id uuid,
  _body text,
  _subject text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_line public.incentive_line_items%ROWTYPE;
  v_dispute_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF coalesce(trim(_body), '') = '' THEN RAISE EXCEPTION 'message required'; END IF;

  SELECT * INTO v_line FROM public.incentive_line_items WHERE id = _line_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'line item not found'; END IF;

  IF v_line.counselor_id <> v_uid AND NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM public.incentive_run_item_disputes WHERE line_item_id = _line_item_id AND status = 'open') THEN
    RAISE EXCEPTION 'dispute already open for this line';
  END IF;

  INSERT INTO public.incentive_run_item_disputes (
    line_item_id, run_id, counselor_id, subject
  ) VALUES (
    v_line.id, v_line.run_id, v_line.counselor_id, nullif(trim(_subject), '')
  )
  RETURNING id INTO v_dispute_id;

  INSERT INTO public.incentive_run_item_dispute_messages (dispute_id, author_id, body)
  VALUES (v_dispute_id, v_uid, trim(_body));

  RETURN v_dispute_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reply_run_item_dispute(_dispute_id uuid, _body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dispute public.incentive_run_item_disputes%ROWTYPE;
  v_msg_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF coalesce(trim(_body), '') = '' THEN RAISE EXCEPTION 'message required'; END IF;

  SELECT * INTO v_dispute FROM public.incentive_run_item_disputes WHERE id = _dispute_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'dispute not found'; END IF;
  IF v_dispute.status <> 'open' THEN RAISE EXCEPTION 'dispute is resolved'; END IF;

  IF v_dispute.counselor_id <> v_uid AND NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.incentive_run_item_dispute_messages (dispute_id, author_id, body)
  VALUES (_dispute_id, v_uid, trim(_body))
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_run_item_dispute(_dispute_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.incentive_run_item_disputes
     SET status = 'resolved', resolved_at = now(), resolved_by = v_uid
   WHERE id = _dispute_id AND status = 'open';

  IF NOT FOUND THEN RAISE EXCEPTION 'open dispute not found'; END IF;

  RETURN jsonb_build_object('ok', true, 'dispute_id', _dispute_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_run_disputes(_run_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'dispute_id', d.id,
        'line_item_id', d.line_item_id,
        'counselor_id', d.counselor_id,
        'counselor_name', coalesce(p.full_name, p.email, d.counselor_id::text),
        'subject', d.subject,
        'status', d.status,
        'opened_at', d.opened_at,
        'resolved_at', d.resolved_at,
        'messages', (
          SELECT coalesce(jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'author_id', m.author_id,
              'author_name', coalesce(ap.full_name, ap.email, m.author_id::text),
              'body', m.body,
              'created_at', m.created_at
            ) ORDER BY m.created_at
          ), '[]'::jsonb)
          FROM public.incentive_run_item_dispute_messages m
          LEFT JOIN public.profiles ap ON ap.id = m.author_id
          WHERE m.dispute_id = d.id
        )
      )
      ORDER BY d.opened_at DESC
    ),
    '[]'::jsonb
  )
  FROM public.incentive_run_item_disputes d
  LEFT JOIN public.profiles p ON p.id = d.counselor_id
  WHERE d.run_id = _run_id
    AND (
      d.counselor_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'administrator'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
    );
$$;

GRANT EXECUTE ON FUNCTION public.fn_open_run_item_dispute(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reply_run_item_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_run_item_dispute(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_run_disputes(uuid) TO authenticated;

-- ── I1: payroll tracking on payouts ─────────────────────────────────────────
ALTER TABLE public.incentive_payouts
  ADD COLUMN IF NOT EXISTS payroll_status text NOT NULL DEFAULT 'pending'
    CHECK (payroll_status IN ('pending', 'exported', 'sent_to_payroll', 'acknowledged'));

ALTER TABLE public.incentive_payouts
  ADD COLUMN IF NOT EXISTS payroll_sent_at timestamptz;

ALTER TABLE public.incentive_payouts
  ADD COLUMN IF NOT EXISTS payroll_batch_ref text;

COMMENT ON COLUMN public.incentive_payouts.payroll_status IS 'Phase 5M I1 — payroll handoff lifecycle';

CREATE OR REPLACE FUNCTION public.fn_mark_payouts_payroll_sent(
  _payout_ids uuid[],
  _batch_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.incentive_payouts
     SET payroll_status = 'sent_to_payroll',
         payroll_sent_at = now(),
         payroll_batch_ref = nullif(trim(_batch_ref), '')
   WHERE id = ANY(_payout_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'updated', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_mark_payouts_payroll_sent(uuid[], text) TO authenticated;

DROP FUNCTION IF EXISTS public.fn_incentive_payout_export(uuid, text);

CREATE OR REPLACE FUNCTION public.fn_incentive_payout_export(
  _run_id uuid DEFAULT NULL,
  _period_key text DEFAULT NULL
)
RETURNS TABLE (
  payout_id uuid,
  run_id uuid,
  period_key text,
  counselor_id uuid,
  counselor_name text,
  gross_amount numeric,
  tds_amount numeric,
  net_amount numeric,
  settlement_currency text,
  status text,
  paid_at timestamptz,
  accounting_ap_bill_id uuid,
  payroll_status text,
  payroll_batch_ref text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ip.id AS payout_id,
    ip.run_id,
    ir.period_key,
    ip.counselor_id,
    coalesce(p.full_name, ip.counselor_id::text) AS counselor_name,
    ip.gross_amount,
    ip.tds_amount,
    ip.net_amount,
    ip.settlement_currency,
    ip.status::text,
    ip.paid_at,
    ip.accounting_ap_bill_id,
    ip.payroll_status,
    ip.payroll_batch_ref
  FROM public.incentive_payouts ip
  LEFT JOIN public.incentive_runs ir ON ir.id = ip.run_id
  LEFT JOIN public.profiles p ON p.id = ip.counselor_id
  WHERE (_run_id IS NULL OR ip.run_id = _run_id)
    AND (_period_key IS NULL OR ir.period_key = _period_key)
  ORDER BY ip.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.fn_incentive_payout_export(uuid, text) TO authenticated;

-- ── I2: FX rate change audit ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fx_rate_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fx_rate_id uuid REFERENCES public.fx_rates(id) ON DELETE SET NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb
);

CREATE INDEX IF NOT EXISTS idx_fx_rate_audit_log_at ON public.fx_rate_audit_log (changed_at DESC);

ALTER TABLE public.fx_rate_audit_log ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'fx_rate_audit_log_admin' AND tablename = 'fx_rate_audit_log'
  ) THEN
    CREATE POLICY fx_rate_audit_log_admin ON public.fx_rate_audit_log FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;
END
$pol$;

GRANT SELECT ON public.fx_rate_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_fx_rates_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.fx_rate_audit_log (fx_rate_id, changed_by, action, new_values)
    VALUES (NEW.id, auth.uid(), 'insert', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.fx_rate_audit_log (fx_rate_id, changed_by, action, old_values, new_values)
    VALUES (NEW.id, auth.uid(), 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.fx_rate_audit_log (fx_rate_id, changed_by, action, old_values)
    VALUES (OLD.id, auth.uid(), 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_fx_rates_audit ON public.fx_rates;
CREATE TRIGGER trg_fx_rates_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.fx_rates
  FOR EACH ROW EXECUTE FUNCTION public.trg_fx_rates_audit();

COMMENT ON TABLE public.incentive_scheme_templates IS 'Phase 5M I3 — reusable incentive plan blueprints';
COMMENT ON TABLE public.incentive_run_item_disputes IS 'Phase 5M I6 — counselor query on run line items';
COMMENT ON TABLE public.fx_rate_audit_log IS 'Phase 5M I2 — FX rate change history';
