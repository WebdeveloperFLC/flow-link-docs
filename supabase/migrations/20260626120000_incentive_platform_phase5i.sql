-- Phase 5I — Offers studio: corporate calendar, segment library, auto-offer rules

CREATE OR REPLACE FUNCTION public.fn_can_manage_offers_studio(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'administrator'::public.app_role)
    OR public.has_role(_user_id, 'manager'::public.app_role)
    OR public.user_has_module(_user_id, 'offers', 'edit')
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_can_manage_offers_studio(uuid) TO authenticated;

-- ── Corporate calendar (O4) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'seasonal'
    CHECK (campaign_type IN ('festival', 'intake', 'branch', 'seasonal', 'other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  owner_name text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'live', 'completed', 'cancelled')),
  linked_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_calendar_dates
  ON public.campaign_calendar (start_date, end_date, status);

ALTER TABLE public.campaign_calendar ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'campaign_calendar_select' AND tablename = 'campaign_calendar'
  ) THEN
    CREATE POLICY campaign_calendar_select ON public.campaign_calendar FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'campaign_calendar_write' AND tablename = 'campaign_calendar'
  ) THEN
    CREATE POLICY campaign_calendar_write ON public.campaign_calendar FOR ALL TO authenticated
      USING (public.fn_can_manage_offers_studio(auth.uid()))
      WITH CHECK (public.fn_can_manage_offers_studio(auth.uid()));
  END IF;
END
$pol$;

DROP TRIGGER IF EXISTS trg_campaign_calendar_touch ON public.campaign_calendar;
CREATE TRIGGER trg_campaign_calendar_touch
  BEFORE UPDATE ON public.campaign_calendar
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_calendar TO authenticated;

-- ── Segment library metadata on offer_groups (O5) ───────────────────────────
ALTER TABLE public.offer_groups
  ADD COLUMN IF NOT EXISTS definition text,
  ADD COLUMN IF NOT EXISTS segment_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_offer_groups_touch ON public.offer_groups;
CREATE TRIGGER trg_offer_groups_touch
  BEFORE UPDATE ON public.offer_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "ogroups_admin" ON public.offer_groups;
CREATE POLICY ogroups_admin ON public.offer_groups FOR ALL TO authenticated
  USING (public.fn_can_manage_offers_studio(auth.uid()))
  WITH CHECK (public.fn_can_manage_offers_studio(auth.uid()));

DROP POLICY IF EXISTS "ogm_admin" ON public.offer_group_members;
CREATE POLICY ogm_admin ON public.offer_group_members FOR ALL TO authenticated
  USING (public.fn_can_manage_offers_studio(auth.uid()))
  WITH CHECK (public.fn_can_manage_offers_studio(auth.uid()));

-- ── Auto-offer rules: MarCom can manage offer_templates (O6) ─────────────────
DROP POLICY IF EXISTS "offer_templates_admin" ON public.offer_templates;
CREATE POLICY offer_templates_admin ON public.offer_templates FOR ALL TO authenticated
  USING (public.fn_can_manage_offers_studio(auth.uid()))
  WITH CHECK (public.fn_can_manage_offers_studio(auth.uid()));

CREATE OR REPLACE FUNCTION public.fn_offer_segments_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'description', g.description,
        'definition', g.definition,
        'is_active', g.is_active,
        'member_count', coalesce(m.cnt, 0),
        'linked_offers', coalesce(o.cnt, 0),
        'created_at', g.created_at,
        'updated_at', g.updated_at
      )
      ORDER BY g.name
    ),
    '[]'::jsonb
  )
  FROM public.offer_groups g
  LEFT JOIN (
    SELECT group_id, count(*)::int AS cnt
      FROM public.offer_group_members
     GROUP BY group_id
  ) m ON m.group_id = g.id
  LEFT JOIN (
    SELECT group_id, count(DISTINCT offer_id)::int AS cnt
      FROM public.offer_audience_targets
     WHERE group_id IS NOT NULL
     GROUP BY group_id
  ) o ON o.group_id = g.id;
$$;

GRANT EXECUTE ON FUNCTION public.fn_offer_segments_summary() TO authenticated;

COMMENT ON TABLE public.campaign_calendar IS 'Phase 5I — corporate promotions calendar; lifecycle tick activates linked offers';
COMMENT ON FUNCTION public.fn_can_manage_offers_studio IS 'MarCom/admin gate for calendar, segments, automation CRUD';
COMMENT ON FUNCTION public.fn_offer_segments_summary IS 'Segment library cards with member + linked offer counts';
