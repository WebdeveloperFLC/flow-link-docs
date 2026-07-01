-- Phase 3 Step 0: Commission configuration / feature flags
-- Governance: approval_required=false bypasses Phase 4 gate without schema redesign.

CREATE TABLE IF NOT EXISTS public.upi_commission_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

COMMENT ON TABLE public.upi_commission_config IS
  'Commission module runtime flags (Phase 3+). No hardcoded business thresholds in code.';

CREATE OR REPLACE FUNCTION public.commission_config_bool(_key text, _default boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE jsonb_typeof(c.value)
        WHEN 'boolean' THEN (c.value #>> '{}')::boolean
        WHEN 'string'  THEN lower(c.value #>> '{}') IN ('true', '1', 'yes')
        ELSE NULL
      END
      FROM public.upi_commission_config c
      WHERE c.key = _key
    ),
    _default
  );
$$;

CREATE OR REPLACE FUNCTION public.commission_config_text(_key text, _default text DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c.value #>> '{}' FROM public.upi_commission_config c WHERE c.key = _key),
    _default
  );
$$;

GRANT EXECUTE ON FUNCTION public.commission_config_bool(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commission_config_text(text, text) TO authenticated;

INSERT INTO public.upi_commission_config (key, value, description)
VALUES
  (
    'approval_required',
    'false'::jsonb,
    'When true (Phase 4+), financial RPCs route through maker-checker. Phase 3 ships false.'
  ),
  (
    'financial_events_enabled',
    'false'::jsonb,
    'When true (F3.1+), money-moving RPCs emit rows to upi_commission_financial_events.'
  ),
  (
    'financial_events_table',
    '"upi_commission_financial_events"'::jsonb,
    'Canonical financial-events table name for Commission → Finance boundary.'
  ),
  (
    'audit_log_enabled',
    'false'::jsonb,
    'When true (F3.3+), mutating financial RPCs write upi_commission_audit_log rows.'
  )
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.upi_commission_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_commission_config_select ON public.upi_commission_config;
CREATE POLICY upi_commission_config_select ON public.upi_commission_config
  FOR SELECT TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS upi_commission_config_insert ON public.upi_commission_config;
CREATE POLICY upi_commission_config_insert ON public.upi_commission_config
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_commission_admin(auth.uid())
  );

DROP POLICY IF EXISTS upi_commission_config_update ON public.upi_commission_config;
CREATE POLICY upi_commission_config_update ON public.upi_commission_config
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_commission_admin(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_commission_admin(auth.uid())
  );

DROP POLICY IF EXISTS upi_commission_config_delete ON public.upi_commission_config;
CREATE POLICY upi_commission_config_delete ON public.upi_commission_config
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_commission_admin(auth.uid())
  );
