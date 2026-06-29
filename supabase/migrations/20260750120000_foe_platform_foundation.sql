-- FLEOS Phase A+B platform foundation (PROPOSED — apply via Lovable Publish after review)

CREATE TABLE IF NOT EXISTS public.foe_business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  event_type text NOT NULL,
  entity_id uuid NULL,
  branch_id uuid NULL,
  source_module text NOT NULL,
  source_record_id text NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_foe_business_events_source
  ON public.foe_business_events (source_module, source_record_id);

CREATE TABLE IF NOT EXISTS public.foe_business_event_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_event_id uuid NOT NULL REFERENCES public.foe_business_events(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  record_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_event_id, link_type, record_id)
);

CREATE TABLE IF NOT EXISTS public.platform_workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id text NOT NULL,
  business_event_id uuid NOT NULL REFERENCES public.foe_business_events(id) ON DELETE CASCADE,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_step_index int NOT NULL DEFAULT 0,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  step_states jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_work_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_domain text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  title text NOT NULL,
  subtitle text NULL,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  source_module text NULL,
  source_record_id text NULL,
  entity_id uuid NULL,
  branch_id uuid NULL,
  assigned_to_user_id uuid NULL REFERENCES auth.users(id),
  priority int NOT NULL DEFAULT 0,
  link text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_work_queue_open
  ON public.platform_work_queue_items (queue_domain, kind, status);

CREATE TABLE IF NOT EXISTS public.foe_cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, branch_id, code)
);

ALTER TABLE public.client_invoice_payments
  ADD COLUMN IF NOT EXISTS business_status text,
  ADD COLUMN IF NOT EXISTS workflow_status text,
  ADD COLUMN IF NOT EXISTS accounting_status text,
  ADD COLUMN IF NOT EXISTS business_event_id uuid NULL REFERENCES public.foe_business_events(id),
  ADD COLUMN IF NOT EXISTS lock_state text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS cash_register_id uuid NULL REFERENCES public.foe_cash_registers(id);

CREATE OR REPLACE FUNCTION public.trg_enforce_payment_sod_on_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status = 'verified'
     AND NEW.posted_by IS NOT NULL
     AND NEW.verified_by IS NOT NULL
     AND NEW.posted_by = NEW.verified_by THEN
    RAISE EXCEPTION 'SOD_VIOLATION: the user who recorded this payment cannot verify it';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_sod_on_verify ON public.client_invoice_payments;
CREATE TRIGGER trg_enforce_payment_sod_on_verify
  BEFORE UPDATE ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_payment_sod_on_verify();

ALTER TABLE public.foe_business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_work_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foe_events_select ON public.foe_business_events;
CREATE POLICY foe_events_select ON public.foe_business_events FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS foe_events_insert ON public.foe_business_events;
CREATE POLICY foe_events_insert ON public.foe_business_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS work_queue_select ON public.platform_work_queue_items;
CREATE POLICY work_queue_select ON public.platform_work_queue_items FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS work_queue_insert ON public.platform_work_queue_items;
CREATE POLICY work_queue_insert ON public.platform_work_queue_items FOR INSERT TO authenticated
  WITH CHECK (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS work_queue_update ON public.platform_work_queue_items;
CREATE POLICY work_queue_update ON public.platform_work_queue_items FOR UPDATE TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
