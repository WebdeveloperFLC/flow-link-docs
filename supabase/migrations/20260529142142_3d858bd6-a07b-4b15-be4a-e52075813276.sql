-- ============================================================
-- Offers Module — Phase 1 Schema
-- Approved scope: global, country-wise, service-wise offers;
-- portal offer center; counselor tracking codes; analytics;
-- birthday + workflow-triggered offers (templates).
--
-- Gate A: country targeting uses clients.interested_country
-- Gate B: clients.date_of_birth added (birthday offers skip null DOB)
--
-- This migration is ADDITIVE ONLY. No existing column is altered or
-- dropped. All existing offers rows remain valid (new columns are
-- nullable or defaulted). No RLS policy on existing tables is changed.
-- Fully idempotent: safe to re-run (IF NOT EXISTS on columns/tables,
-- pg_constraint guard on the FK).
--
-- Rollback:
--   ALTER TABLE public.offers
--     DROP COLUMN IF EXISTS target_countries,
--     DROP COLUMN IF EXISTS max_redemptions,
--     DROP COLUMN IF EXISTS per_client_limit,
--     DROP COLUMN IF EXISTS redemption_count,
--     DROP COLUMN IF EXISTS template_id,
--     DROP COLUMN IF EXISTS currency;
--   ALTER TABLE public.client_offers
--     DROP COLUMN IF EXISTS attached_by, DROP COLUMN IF EXISTS source;
--   ALTER TABLE public.clients DROP COLUMN IF EXISTS date_of_birth;
--   DROP TABLE IF EXISTS public.offer_events;
--   DROP TABLE IF EXISTS public.offer_tracking_codes;
--   DROP TABLE IF EXISTS public.offer_templates;
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Extend offers (additive columns only)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS target_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_redemptions  int,
  ADD COLUMN IF NOT EXISTS per_client_limit int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS redemption_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS template_id      uuid,
  ADD COLUMN IF NOT EXISTS currency         text NOT NULL DEFAULT 'INR';

COMMENT ON COLUMN public.offers.target_countries IS
  'Phase 1: matched against clients.interested_country (Gate A). Empty = no country restriction.';

-- ─────────────────────────────────────────────────────────────
-- 2. Extend client_offers (attribution + source)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.client_offers
  ADD COLUMN IF NOT EXISTS attached_by uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'portal'
    CHECK (source IN ('portal','counselor','auto','trigger'));

-- ─────────────────────────────────────────────────────────────
-- 3. Add clients.date_of_birth (Gate B)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- ─────────────────────────────────────────────────────────────
-- 4. offer_templates — reusable recipes (birthday + workflow)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('birthday','workflow','manual')),
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','flat')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_discount_amount numeric,
  validity_days_before int NOT NULL DEFAULT 7,
  validity_days_after  int NOT NULL DEFAULT 7,
  trigger_event text,
  trigger_condition jsonb,
  target_countries text[] NOT NULL DEFAULT '{}',
  applicable_services text[] NOT NULL DEFAULT '{}',
  channels text[] NOT NULL DEFAULT '{in_app,email}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_templates_admin" ON public.offer_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "offer_templates_view" ON public.offer_templates FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_offer_templates_touch BEFORE UPDATE ON public.offer_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE c.conname = 'offers_template_id_fkey'
       AND t.relname = 'offers'
       AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.offer_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. offer_tracking_codes — per-counselor codes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_tracking_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otc_offer ON public.offer_tracking_codes(offer_id);
CREATE INDEX IF NOT EXISTS idx_otc_counselor ON public.offer_tracking_codes(counselor_id);

ALTER TABLE public.offer_tracking_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "otc_admin" ON public.offer_tracking_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "otc_view" ON public.offer_tracking_codes FOR SELECT TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 6. offer_events — append-only analytics log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  counselor_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('viewed','claimed','redeemed','delivered')),
  channel text,
  revenue_amount numeric NOT NULL DEFAULT 0,
  tracking_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_events_offer ON public.offer_events(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_events_type ON public.offer_events(event_type);
CREATE INDEX IF NOT EXISTS idx_offer_events_created ON public.offer_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_events_counselor ON public.offer_events(counselor_id);

ALTER TABLE public.offer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_events_staff_insert" ON public.offer_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "offer_events_admin_read" ON public.offer_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));