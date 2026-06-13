-- Phase 5G — Offers studio dashboard RPC + wizard channel metadata

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS distribution_channels text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.offers.distribution_channels IS
  'Phase 5G wizard: portal, whatsapp, email, counselor_desk';

CREATE OR REPLACE FUNCTION public.fn_offer_studio_dashboard(
  _period_key text DEFAULT to_char(now(), 'YYYY-MM')
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date := (_period_key || '-01')::date;
  v_end date := (date_trunc('month', v_start) + interval '1 month - 1 day')::date;
  v_by_status jsonb;
  v_expiring int;
  v_redemptions int;
  v_promo_pending int;
  v_recent jsonb;
BEGIN
  SELECT coalesce(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
    INTO v_by_status
    FROM (
      SELECT o.status, count(*)::int AS cnt
        FROM public.offers o
       GROUP BY o.status
    ) s;

  SELECT count(*)::int INTO v_expiring
    FROM public.offers o
   WHERE o.status IN ('active', 'expiring_soon', 'scheduled')
     AND o.valid_to IS NOT NULL
     AND o.valid_to <= (v_end + 14);

  SELECT count(*)::int INTO v_redemptions
    FROM public.offer_events oe
   WHERE oe.event_type = 'redeemed'
     AND oe.created_at >= v_start
     AND oe.created_at < (v_end + 1);

  SELECT count(*)::int INTO v_promo_pending
    FROM public.promotion_requests pr
   WHERE pr.status IN ('pending', 'in_review');

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.updated_at DESC), '[]'::jsonb)
    INTO v_recent
    FROM (
      SELECT o.id, o.title, o.status::text AS status, o.funding_source::text AS funding_source,
             o.valid_to, o.updated_at
        FROM public.offers o
       ORDER BY o.updated_at DESC
       LIMIT 6
    ) x;

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'by_status', v_by_status,
    'active_count', coalesce((v_by_status->>'active')::int, 0) + coalesce((v_by_status->>'expiring_soon')::int, 0),
    'pending_review', coalesce((v_by_status->>'pending_review')::int, 0),
    'draft_count', coalesce((v_by_status->>'draft')::int, 0),
    'expiring_within_14d', v_expiring,
    'redemptions_in_period', v_redemptions,
    'promotion_requests_open', v_promo_pending
  ) || jsonb_build_object('recent_offers', coalesce(v_recent, '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_offer_studio_dashboard(text) TO authenticated;
