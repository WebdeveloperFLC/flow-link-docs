-- FLEOS Phase C — production hardening (platform config, pipeline jobs, SoD, cash register seed)

-- ── Platform configuration (DB-driven workflows) ─────────────────────
CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_json jsonb NOT NULL,
  domain text NOT NULL DEFAULT 'platform',
  version int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_config_select ON public.platform_config;
CREATE POLICY platform_config_select ON public.platform_config FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS platform_config_admin ON public.platform_config;
CREATE POLICY platform_config_admin ON public.platform_config FOR ALL TO authenticated
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Seed defaults (code fallback remains authoritative until edited in DB)
INSERT INTO public.platform_config (config_key, config_json, domain)
VALUES
  ('payment_method_configs', '[]'::jsonb, 'money_in'),
  ('workflow_definitions', '[]'::jsonb, 'platform'),
  ('notification_rules', '[]'::jsonb, 'platform'),
  ('sod_rules', '[]'::jsonb, 'platform')
ON CONFLICT (config_key) DO NOTHING;

-- ── FOE pipeline jobs (durable post-verify reconciliation) ─────────────
CREATE TABLE IF NOT EXISTS public.platform_foe_pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL DEFAULT 'money_in_post_verify',
  payment_id uuid NOT NULL REFERENCES public.client_invoice_payments(id) ON DELETE CASCADE,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  UNIQUE (job_type, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_foe_pipeline_jobs_pending
  ON public.platform_foe_pipeline_jobs (status, created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.platform_foe_pipeline_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foe_pipeline_jobs_select ON public.platform_foe_pipeline_jobs;
CREATE POLICY foe_pipeline_jobs_select ON public.platform_foe_pipeline_jobs FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS foe_pipeline_jobs_service ON public.platform_foe_pipeline_jobs;
CREATE POLICY foe_pipeline_jobs_service ON public.platform_foe_pipeline_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Enqueue job when payment verified
CREATE OR REPLACE FUNCTION public.trg_enqueue_foe_pipeline_on_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status = 'verified'
     AND COALESCE(NEW.is_refund, false) = false THEN
    INSERT INTO public.platform_foe_pipeline_jobs (job_type, payment_id, business_event_id, status)
    VALUES ('money_in_post_verify', NEW.id, NEW.business_event_id, 'pending')
    ON CONFLICT (job_type, payment_id) DO UPDATE
      SET status = CASE
            WHEN platform_foe_pipeline_jobs.status = 'completed' THEN 'completed'
            ELSE 'pending'
          END,
          business_event_id = EXCLUDED.business_event_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_foe_pipeline_on_verify ON public.client_invoice_payments;
CREATE TRIGGER trg_enqueue_foe_pipeline_on_verify
  AFTER UPDATE ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_enqueue_foe_pipeline_on_verify();

-- Journal approval SoD — verifier cannot post CRM payment journal
CREATE OR REPLACE FUNCTION public.trg_enforce_journal_sod_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_by uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status = 'POSTED'
     AND NEW.source_module = 'CRM_AR'
     AND NEW.source_record_id IS NOT NULL
     AND NEW.posted_by IS NOT NULL THEN
    SELECT verified_by INTO v_verified_by
      FROM public.client_invoice_payments
     WHERE id = NEW.source_record_id;
    IF v_verified_by IS NOT NULL AND v_verified_by = NEW.posted_by THEN
      RAISE EXCEPTION 'SOD_VIOLATION: the user who verified this payment cannot approve its journal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_journal_sod_on_post ON public.accounting_journals;
CREATE TRIGGER trg_enforce_journal_sod_on_post
  BEFORE UPDATE ON public.accounting_journals
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_journal_sod_on_post();

-- Seed cash registers from firm entities + branches
CREATE OR REPLACE FUNCTION public.fn_seed_foe_cash_registers()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT fp.id AS entity_id, b.id AS branch_id, 'INR'::text AS currency
      FROM public.firm_profile fp
      CROSS JOIN public.branches b
     WHERE fp.id IS NOT NULL AND b.id IS NOT NULL
  LOOP
    INSERT INTO public.foe_cash_registers (entity_id, branch_id, code, name, currency, active)
    VALUES (r.entity_id, r.branch_id, 'MAIN', 'Main cash register', r.currency, true)
    ON CONFLICT (entity_id, branch_id, code) DO NOTHING;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Run seed (idempotent)
SELECT public.fn_seed_foe_cash_registers();

-- Workflow instance updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_platform_workflow_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_workflow_updated_at ON public.platform_workflow_instances;
CREATE TRIGGER trg_platform_workflow_updated_at
  BEFORE UPDATE ON public.platform_workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.trg_platform_workflow_updated_at();

COMMENT ON TABLE public.platform_config IS
  'DB-driven workflow/notification/SoD configuration. Empty JSON arrays = use code defaults.';
COMMENT ON TABLE public.platform_foe_pipeline_jobs IS
  'Durable FOE pipeline reconciliation queue after payment verification.';
