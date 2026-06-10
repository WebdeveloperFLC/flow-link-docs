-- Sprint 1: Offer lifecycle governance
-- Adds status workflow, funding source, version history; keeps is_active in sync for portal/admin.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.offer_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'scheduled',
    'active',
    'expiring_soon',
    'expired',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.offer_funding_source AS ENUM ('future_link', 'university', 'joint');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Extend offers ────────────────────────────────────────────────────────────
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS status public.offer_status,
  ADD COLUMN IF NOT EXISTS funding_source public.offer_funding_source NOT NULL DEFAULT 'future_link',
  ADD COLUMN IF NOT EXISTS fl_contribution_pct numeric,
  ADD COLUMN IF NOT EXISTS university_contribution_pct numeric,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_category text,
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Backfill status from legacy is_active flag
UPDATE public.offers
   SET status = CASE WHEN is_active THEN 'active'::public.offer_status ELSE 'archived'::public.offer_status END
 WHERE status IS NULL;

ALTER TABLE public.offers
  ALTER COLUMN status SET DEFAULT 'draft'::public.offer_status;

UPDATE public.offers SET status = 'draft'::public.offer_status WHERE status IS NULL;

ALTER TABLE public.offers
  ALTER COLUMN status SET NOT NULL;

COMMENT ON COLUMN public.offers.status IS
  'Lifecycle status. is_active is kept in sync via trg_offers_sync_is_active for backward compatibility.';
COMMENT ON COLUMN public.offers.funding_source IS
  'Who funds the discount. Only future_link (and FL share of joint) debits counsellor wallet (Sprint 3).';

-- ── Audit tables ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  from_status public.offer_status,
  to_status public.offer_status NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_status_history_offer
  ON public.offer_status_history (offer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.offer_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, version)
);

CREATE INDEX IF NOT EXISTS idx_offer_versions_offer
  ON public.offer_versions (offer_id, version DESC);

ALTER TABLE public.offer_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_versions ENABLE ROW LEVEL SECURITY;

-- ── is_active sync ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_offers_sync_is_active()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_active := NEW.status IN ('active', 'expiring_soon');
  IF NEW.status = 'archived' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'archived') THEN
    NEW.archived_at := COALESCE(NEW.archived_at, now());
  END IF;
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offers_sync_is_active ON public.offers;
CREATE TRIGGER trg_offers_sync_is_active
  BEFORE INSERT OR UPDATE OF status ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.trg_offers_sync_is_active();

-- One-time sync after backfill
UPDATE public.offers
   SET is_active = (status IN ('active', 'expiring_soon'));

-- ── Version snapshot on material edit ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_offer_version_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title
    OR OLD.description IS DISTINCT FROM NEW.description
    OR OLD.discount_type IS DISTINCT FROM NEW.discount_type
    OR OLD.discount_value IS DISTINCT FROM NEW.discount_value
    OR OLD.max_discount_amount IS DISTINCT FROM NEW.max_discount_amount
    OR OLD.promo_code IS DISTINCT FROM NEW.promo_code
    OR OLD.applicable_services IS DISTINCT FROM NEW.applicable_services
    OR OLD.target_countries IS DISTINCT FROM NEW.target_countries
    OR OLD.funding_source IS DISTINCT FROM NEW.funding_source
    OR OLD.fl_contribution_pct IS DISTINCT FROM NEW.fl_contribution_pct
    OR OLD.university_contribution_pct IS DISTINCT FROM NEW.university_contribution_pct
    OR OLD.valid_from IS DISTINCT FROM NEW.valid_from
    OR OLD.valid_to IS DISTINCT FROM NEW.valid_to
  ) THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
    INSERT INTO public.offer_versions (offer_id, version, snapshot, changed_by)
    VALUES (
      NEW.id,
      NEW.version,
      to_jsonb(NEW),
      auth.uid()
    )
    ON CONFLICT (offer_id, version) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offer_version_snapshot ON public.offers;
CREATE TRIGGER trg_offer_version_snapshot
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.trg_offer_version_snapshot();

-- ── Status transition RPC ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_offer_set_status(
  _offer_id uuid,
  _to_status public.offer_status,
  _note text DEFAULT NULL
)
RETURNS public.offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.offer_status;
  v_offer public.offers%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'offers', 'edit')
  ) THEN
    RAISE EXCEPTION 'forbidden: offers edit permission required';
  END IF;

  SELECT status INTO v_old FROM public.offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer not found';
  END IF;

  IF v_old = _to_status THEN
    SELECT * INTO v_offer FROM public.offers WHERE id = _offer_id;
    RETURN v_offer;
  END IF;

  UPDATE public.offers
     SET status = _to_status,
         updated_at = now()
   WHERE id = _offer_id
   RETURNING * INTO v_offer;

  INSERT INTO public.offer_status_history (offer_id, from_status, to_status, changed_by, note)
  VALUES (_offer_id, v_old, _to_status, v_uid, _note);

  RETURN v_offer;
END;
$$;

-- ── Clone offer ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_clone_offer(_offer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src public.offers%ROWTYPE;
  v_new_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'offers', 'edit')
  ) THEN
    RAISE EXCEPTION 'forbidden: offers edit permission required';
  END IF;

  SELECT * INTO v_src FROM public.offers WHERE id = _offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer not found';
  END IF;

  INSERT INTO public.offers (
    title, description, discount_type, discount_value, max_discount_amount,
    promo_code, valid_from, valid_to, applicable_services, terms_conditions,
    audience, target_countries, per_client_limit, max_redemptions, currency,
    template_id, funding_source, fl_contribution_pct, university_contribution_pct,
    branch_id, offer_category, requires_approval, status, created_by, version
  ) VALUES (
    v_src.title || ' (copy)',
    v_src.description,
    v_src.discount_type,
    v_src.discount_value,
    v_src.max_discount_amount,
    NULL,
    v_src.valid_from,
    v_src.valid_to,
    v_src.applicable_services,
    v_src.terms_conditions,
    v_src.audience,
    v_src.target_countries,
    v_src.per_client_limit,
    v_src.max_redemptions,
    v_src.currency,
    v_src.template_id,
    v_src.funding_source,
    v_src.fl_contribution_pct,
    v_src.university_contribution_pct,
    v_src.branch_id,
    v_src.offer_category,
    v_src.requires_approval,
    'draft'::public.offer_status,
    v_uid,
    1
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.offer_status_history (offer_id, from_status, to_status, changed_by, note)
  VALUES (v_new_id, NULL, 'draft', v_uid, 'Cloned from ' || _offer_id::text);

  INSERT INTO public.offer_audience_targets (offer_id, group_id, client_id)
  SELECT v_new_id, group_id, client_id
    FROM public.offer_audience_targets
   WHERE offer_id = _offer_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_offer_set_status(uuid, public.offer_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_clone_offer(uuid) TO authenticated;

-- ── Eligibility: belt-and-suspenders status check ────────────────────────────
CREATE OR REPLACE FUNCTION public.offers_eligible_for_client(
  _client_id uuid,
  _service_codes text[] DEFAULT NULL
)
RETURNS SETOF public.offers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
    FROM public.offers o
   WHERE public.can_view_client(auth.uid(), _client_id)
     AND o.is_active
     AND o.status IN ('active', 'expiring_soon')
     AND (o.valid_from IS NULL OR o.valid_from <= now())
     AND (o.valid_to   IS NULL OR o.valid_to   >= now())
     AND (
       o.audience = 'global'
       OR (o.audience = 'individual' AND EXISTS (
         SELECT 1 FROM public.offer_audience_targets t
          WHERE t.offer_id = o.id AND t.client_id = _client_id
       ))
       OR (o.audience = 'group' AND EXISTS (
         SELECT 1 FROM public.offer_audience_targets t
          JOIN public.offer_group_members m ON m.group_id = t.group_id
          WHERE t.offer_id = o.id AND m.client_id = _client_id
       ))
     )
     AND (
       cardinality(o.target_countries) = 0
       OR EXISTS (
         SELECT 1 FROM public.clients c
          WHERE c.id = _client_id
            AND c.interested_country = ANY (o.target_countries)
       )
     )
     AND (
       cardinality(o.applicable_services) = 0
       OR _service_codes IS NULL
       OR cardinality(_service_codes) = 0
       OR o.applicable_services && _service_codes
     )
     AND (
       o.max_redemptions IS NULL
       OR o.redemption_count < o.max_redemptions
     )
     AND (
       o.per_client_limit IS NULL
       OR (
         SELECT count(*) FROM public.client_offers co
          WHERE co.offer_id = o.id
            AND co.client_id = _client_id
            AND co.status = 'used'
       ) < o.per_client_limit
     )
   ORDER BY o.created_at DESC
$$;

-- ── RLS for audit tables ─────────────────────────────────────────────────────
DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'offer_status_history_read' AND tablename = 'offer_status_history') THEN
    CREATE POLICY offer_status_history_read ON public.offer_status_history FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'offer_versions_read' AND tablename = 'offer_versions') THEN
    CREATE POLICY offer_versions_read ON public.offer_versions FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      );
  END IF;
END
$pol$;
