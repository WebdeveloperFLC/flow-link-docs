-- CMS Phase 3D — Commercial auto-inheritance policy (§5.4)
-- Config-as-data: how new CRM master rows inherit wallet/offer/incentive scopes

CREATE TABLE IF NOT EXISTS public.commercial_autoapply_policy (
  entity_type text PRIMARY KEY
    CHECK (entity_type IN ('service', 'country', 'institution', 'program', 'intake')),
  policy text NOT NULL
    CHECK (policy IN ('auto_include', 'require_opt_in', 'inherit_parent')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

COMMENT ON TABLE public.commercial_autoapply_policy IS
  'When CRM adds new master data, CMS applies wallet/offer/incentive scopes per policy.';

INSERT INTO public.commercial_autoapply_policy (entity_type, policy) VALUES
  ('country', 'auto_include'),
  ('service', 'require_opt_in'),
  ('institution', 'auto_include'),
  ('program', 'inherit_parent'),
  ('intake', 'auto_include')
ON CONFLICT (entity_type) DO NOTHING;

ALTER TABLE public.commercial_autoapply_policy ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'commercial_autoapply_policy_select' AND tablename = 'commercial_autoapply_policy'
  ) THEN
    CREATE POLICY commercial_autoapply_policy_select ON public.commercial_autoapply_policy
      FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.has_role(auth.uid(), 'director'::public.app_role)
        OR public.has_role(auth.uid(), 'viewer'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
        OR public.user_has_module(auth.uid(), 'incentives', 'view')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'commercial_autoapply_policy_write' AND tablename = 'commercial_autoapply_policy'
  ) THEN
    CREATE POLICY commercial_autoapply_policy_write ON public.commercial_autoapply_policy
      FOR ALL TO authenticated
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

CREATE OR REPLACE FUNCTION public.fn_crm_integration_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clients bigint;
  v_leads bigint;
  v_branches bigint;
  v_services bigint;
  v_countries bigint;
  v_institutions bigint;
  v_intakes bigint;
BEGIN
  SELECT count(*) INTO v_clients FROM public.clients;
  SELECT count(*) INTO v_leads FROM public.leads;
  SELECT count(*) INTO v_branches FROM public.branches;
  SELECT count(*) INTO v_services FROM public.service_library WHERE is_active = true;
  SELECT count(*) INTO v_countries FROM public.countries;
  SELECT count(*) INTO v_institutions FROM public.upi_institutions;
  SELECT count(DISTINCT intake) INTO v_intakes FROM public.clients WHERE intake IS NOT NULL AND btrim(intake) <> '';

  RETURN jsonb_build_object(
    'sync_status', 'ok',
    'synced_at', now(),
    'entities', jsonb_build_array(
      jsonb_build_object('key', 'clients', 'label', 'Clients', 'count', v_clients),
      jsonb_build_object('key', 'leads', 'label', 'Leads', 'count', v_leads),
      jsonb_build_object('key', 'branches', 'label', 'Branches', 'count', v_branches),
      jsonb_build_object('key', 'services', 'label', 'Services', 'count', v_services),
      jsonb_build_object('key', 'countries', 'label', 'Countries', 'count', v_countries),
      jsonb_build_object('key', 'institutions', 'label', 'Institutions', 'count', v_institutions),
      jsonb_build_object('key', 'intakes', 'label', 'Intakes', 'count', v_intakes)
    ),
    'checks', jsonb_build_array(
      jsonb_build_object('key', 'master_data', 'label', 'Master data sync', 'status', 'ok'),
      jsonb_build_object('key', 'lead_client_api', 'label', 'Lead / client read API', 'status', 'ok'),
      jsonb_build_object('key', 'invoice_writeback', 'label', 'Invoice write-back', 'status', 'ok'),
      jsonb_build_object('key', 'webhook_backlog', 'label', 'Webhook backlog', 'status', 'warn', 'detail', '0')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_crm_integration_health() TO authenticated;

COMMENT ON FUNCTION public.fn_crm_integration_health() IS
  'CMS CRM integration panel — read-only entity counts and sync health placeholders.';
