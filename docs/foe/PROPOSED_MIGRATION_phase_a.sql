/**
 * PROPOSED MIGRATION — FLEOS Phase A (requires approval before apply).
 * File: supabase/migrations/20260750120000_foe_phase_a_platform_foundation.sql
 *
 * Do NOT apply until reviewed. Application layer includes localStorage fallbacks until this ships.
 */

-- =====================================================================
-- 1. Business Event foundation
-- =====================================================================
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

-- =====================================================================
-- 2. Workflow instances (EWE)
-- =====================================================================
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

-- =====================================================================
-- 3. Universal work queue
-- =====================================================================
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

-- =====================================================================
-- 4. Cash register foundation
-- =====================================================================
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

-- =====================================================================
-- 5. Three independent statuses on payments (+ event correlation)
-- =====================================================================
ALTER TABLE public.client_invoice_payments
  ADD COLUMN IF NOT EXISTS business_status text,
  ADD COLUMN IF NOT EXISTS workflow_status text,
  ADD COLUMN IF NOT EXISTS accounting_status text,
  ADD COLUMN IF NOT EXISTS business_event_id uuid NULL REFERENCES public.foe_business_events(id),
  ADD COLUMN IF NOT EXISTS lock_state text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS cash_register_id uuid NULL REFERENCES public.foe_cash_registers(id);

-- =====================================================================
-- 6. Separation of duties — recorder cannot verify same payment
-- =====================================================================
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

-- =====================================================================
-- 7. RLS (minimal — finance users + client access)
-- =====================================================================
ALTER TABLE public.foe_business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_work_queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY foe_events_select ON public.foe_business_events FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY work_queue_select ON public.platform_work_queue_items FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY work_queue_update ON public.platform_work_queue_items FOR UPDATE TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
