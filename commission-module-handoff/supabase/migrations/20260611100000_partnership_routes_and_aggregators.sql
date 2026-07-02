-- Partnership channels: aggregators master, per-institution routes, commission snapshots.
-- Supports promotion-only institutions, direct tie-up, and multiple indirect aggregators.

-- ---------------------------------------------------------------------------
-- Aggregators master (ApplyBoard, Navitas, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.upi_aggregators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_code text,
  is_active boolean NOT NULL DEFAULT true,
  countries_served text[] DEFAULT '{}',
  website_url text,
  logo_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  address text,
  city text,
  country_name text,
  agreement_status text DEFAULT 'active' CHECK (agreement_status IN ('draft', 'active', 'expired', 'suspended')),
  agreement_valid_from date,
  agreement_valid_to date,
  agreement_reference text,
  default_portal_url text,
  default_payment_terms text,
  default_currency text DEFAULT 'CAD',
  billing_email text,
  tax_id text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_aggregators_short_code
  ON public.upi_aggregators (lower(trim(short_code)))
  WHERE short_code IS NOT NULL AND trim(short_code) <> '';

CREATE INDEX IF NOT EXISTS idx_upi_aggregators_active ON public.upi_aggregators (is_active, name);

-- ---------------------------------------------------------------------------
-- Partnership routes (many per institution: direct + indirect)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.upi_partnership_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('direct', 'indirect', 'student_direct')),
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  route_code text,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'suspended')),
  valid_from date,
  valid_to date,
  intakes_covered text[] DEFAULT '{}',
  program_levels_covered text[] DEFAULT '{}',
  application_portal_url text,
  aggregator_institution_code text,
  is_default_route boolean NOT NULL DEFAULT false,
  priority_rank int NOT NULL DEFAULT 100,
  agreement_id uuid REFERENCES public.upi_agreements(id) ON DELETE SET NULL,
  -- Summary terms for compare UI (full rules live in upi_commissions)
  commission_model text,
  commission_rate numeric(8,4),
  commission_currency text DEFAULT 'CAD',
  bonus_notes text,
  payment_terms text,
  estimated_payout_days int,
  processing_sla_days int,
  application_fee numeric(12,2),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upi_partnership_routes_channel_chk CHECK (
    (channel_type = 'indirect' AND aggregator_id IS NOT NULL)
    OR (channel_type IN ('direct', 'student_direct') AND aggregator_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_upi_partnership_routes_inst
  ON public.upi_partnership_routes (institution_id, status);

CREATE INDEX IF NOT EXISTS idx_upi_partnership_routes_aggregator
  ON public.upi_partnership_routes (aggregator_id)
  WHERE aggregator_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_partnership_routes_direct_unique
  ON public.upi_partnership_routes (institution_id)
  WHERE channel_type = 'direct' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_partnership_routes_indirect_unique
  ON public.upi_partnership_routes (institution_id, aggregator_id)
  WHERE channel_type = 'indirect' AND status = 'active' AND aggregator_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Commission calculation snapshots (audit / reports)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.upi_commission_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES public.upi_commissions(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  channel_type text,
  rules_json jsonb NOT NULL DEFAULT '[]',
  input_json jsonb NOT NULL DEFAULT '{}',
  breakdown_json jsonb NOT NULL DEFAULT '{}',
  total_amount numeric(14,2),
  currency text DEFAULT 'CAD',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_upi_commission_snapshots_route
  ON public.upi_commission_snapshots (partnership_route_id, calculated_at DESC);

-- ---------------------------------------------------------------------------
-- Extend existing tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.upi_institutions
  ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'promoted'
    CHECK (catalog_status IN ('promoted', 'hidden', 'archived')),
  ADD COLUMN IF NOT EXISTS promotion_notes text;

ALTER TABLE public.upi_commissions
  ADD COLUMN IF NOT EXISTS partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL;

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel_type text CHECK (channel_type IS NULL OR channel_type IN ('direct', 'indirect', 'student_direct', 'none')),
  ADD COLUMN IF NOT EXISTS commission_snapshot_id uuid REFERENCES public.upi_commission_snapshots(id) ON DELETE SET NULL;

ALTER TABLE public.upi_claim_cycles
  ADD COLUMN IF NOT EXISTS partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payer_type text CHECK (payer_type IS NULL OR payer_type IN ('institution', 'aggregator'));

ALTER TABLE public.cf_universities
  ADD COLUMN IF NOT EXISTS upi_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cf_universities_upi_inst
  ON public.cf_universities (upi_institution_id)
  WHERE upi_institution_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill: is_partner institutions → direct route
-- ---------------------------------------------------------------------------

INSERT INTO public.upi_partnership_routes (
  institution_id,
  channel_type,
  display_name,
  status,
  valid_from,
  is_default_route,
  priority_rank,
  notes
)
SELECT
  i.id,
  'direct',
  'Direct partnership',
  'active',
  i.partner_since,
  true,
  1,
  'Migrated from is_partner flag'
FROM public.upi_institutions i
WHERE i.is_partner = true
  AND NOT EXISTS (
    SELECT 1 FROM public.upi_partnership_routes r
    WHERE r.institution_id = i.id AND r.channel_type = 'direct'
  );

-- Keep is_partner in sync: true when an active direct route exists
CREATE OR REPLACE FUNCTION public.sync_upi_institution_is_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.upi_institutions i
  SET is_partner = EXISTS (
    SELECT 1 FROM public.upi_partnership_routes r
    WHERE r.institution_id = i.id
      AND r.channel_type = 'direct'
      AND r.status = 'active'
  ),
  updated_at = now()
  WHERE i.id = COALESCE(NEW.institution_id, OLD.institution_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_is_partner_on_route ON public.upi_partnership_routes;
CREATE TRIGGER trg_sync_is_partner_on_route
  AFTER INSERT OR UPDATE OR DELETE ON public.upi_partnership_routes
  FOR EACH ROW EXECUTE FUNCTION public.sync_upi_institution_is_partner();

-- One-time sync after backfill
UPDATE public.upi_institutions i
SET is_partner = EXISTS (
  SELECT 1 FROM public.upi_partnership_routes r
  WHERE r.institution_id = i.id AND r.channel_type = 'direct' AND r.status = 'active'
);

-- ---------------------------------------------------------------------------
-- RLS (catalog tier for aggregators + routes; confidential for snapshots)
-- ---------------------------------------------------------------------------

ALTER TABLE public.upi_aggregators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_partnership_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_aggregators_catalog_select ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_aggregators_catalog_insert ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_aggregators_catalog_update ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_aggregators_catalog_delete ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_select ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_insert ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_update ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_delete ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_commission_snapshots_confidential_select ON public.upi_commission_snapshots;
DROP POLICY IF EXISTS upi_commission_snapshots_confidential_insert ON public.upi_commission_snapshots;

CREATE POLICY upi_aggregators_catalog_select ON public.upi_aggregators
  FOR SELECT TO authenticated
  USING (public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid()));

CREATE POLICY upi_aggregators_catalog_insert ON public.upi_aggregators
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_aggregators_catalog_update ON public.upi_aggregators
  FOR UPDATE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()))
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_aggregators_catalog_delete ON public.upi_aggregators
  FOR DELETE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY upi_partnership_routes_catalog_select ON public.upi_partnership_routes
  FOR SELECT TO authenticated
  USING (public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid()));

CREATE POLICY upi_partnership_routes_catalog_insert ON public.upi_partnership_routes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_partnership_routes_catalog_update ON public.upi_partnership_routes
  FOR UPDATE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()))
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_partnership_routes_catalog_delete ON public.upi_partnership_routes
  FOR DELETE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY upi_commission_snapshots_confidential_select ON public.upi_commission_snapshots
  FOR SELECT TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()));

CREATE POLICY upi_commission_snapshots_confidential_insert ON public.upi_commission_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_confidential(auth.uid()));

DROP TRIGGER IF EXISTS upi_aggregators_updated_at ON public.upi_aggregators;
CREATE TRIGGER upi_aggregators_updated_at
  BEFORE UPDATE ON public.upi_aggregators
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS upi_partnership_routes_updated_at ON public.upi_partnership_routes;
CREATE TRIGGER upi_partnership_routes_updated_at
  BEFORE UPDATE ON public.upi_partnership_routes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
