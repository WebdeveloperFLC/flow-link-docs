CREATE OR REPLACE FUNCTION public.offer_roi_stats(
  _date_from date DEFAULT NULL,
  _date_to   date DEFAULT NULL
)
RETURNS TABLE (
  offer_id uuid,
  title text,
  is_active boolean,
  views bigint,
  claims bigint,
  redemptions bigint,
  redemption_rate numeric,
  total_discount numeric,
  influenced_revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT e.offer_id,
           COUNT(*) FILTER (WHERE e.event_type = 'viewed')    AS views,
           COUNT(*) FILTER (WHERE e.event_type = 'claimed')   AS claims,
           COUNT(*) FILTER (WHERE e.event_type = 'redeemed')  AS redemptions
      FROM public.offer_events e
     WHERE (_date_from IS NULL OR e.created_at >= _date_from)
       AND (_date_to   IS NULL OR e.created_at < (_date_to + 1))
     GROUP BY e.offer_id
  ),
  inv AS (
    SELECT i.applied_offer_id AS offer_id,
           COALESCE(SUM(i.offer_discount_amount), 0) AS total_discount,
           COALESCE(SUM(i.amount), 0)                AS influenced_revenue
      FROM public.client_invoices i
     WHERE i.applied_offer_id IS NOT NULL
       AND (_date_from IS NULL OR i.created_at >= _date_from)
       AND (_date_to   IS NULL OR i.created_at < (_date_to + 1))
     GROUP BY i.applied_offer_id
  )
  SELECT
    o.id,
    o.title,
    o.is_active,
    COALESCE(ev.views, 0),
    COALESCE(ev.claims, 0),
    COALESCE(ev.redemptions, 0),
    CASE WHEN COALESCE(ev.claims, 0) > 0
         THEN ROUND((COALESCE(ev.redemptions, 0)::numeric / ev.claims) * 100, 1)
         ELSE 0 END,
    COALESCE(inv.total_discount, 0),
    COALESCE(inv.influenced_revenue, 0)
  FROM public.offers o
  LEFT JOIN ev  ON ev.offer_id  = o.id
  LEFT JOIN inv ON inv.offer_id = o.id
  WHERE COALESCE(ev.views,0) + COALESCE(ev.claims,0) + COALESCE(ev.redemptions,0)
        + COALESCE(inv.influenced_revenue,0) > 0
  ORDER BY COALESCE(inv.influenced_revenue, 0) DESC, COALESCE(ev.redemptions,0) DESC;
$$;

REVOKE ALL ON FUNCTION public.offer_roi_stats(date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.offer_roi_stats(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.counselor_offer_stats(
  _date_from date DEFAULT NULL,
  _date_to   date DEFAULT NULL
)
RETURNS TABLE (
  counselor_id uuid,
  counselor_name text,
  redemptions bigint,
  total_discount numeric,
  attributed_revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.attributed_counselor_id,
    COALESCE(p.full_name, p.email, 'Unknown'),
    COUNT(*)::bigint,
    COALESCE(SUM(i.offer_discount_amount), 0),
    COALESCE(SUM(i.amount), 0)
  FROM public.client_invoices i
  LEFT JOIN public.profiles p ON p.id = i.attributed_counselor_id
  WHERE i.applied_offer_id IS NOT NULL
    AND i.attributed_counselor_id IS NOT NULL
    AND (_date_from IS NULL OR i.created_at >= _date_from)
    AND (_date_to   IS NULL OR i.created_at < (_date_to + 1))
  GROUP BY i.attributed_counselor_id, p.full_name, p.email
  ORDER BY COALESCE(SUM(i.amount), 0) DESC;
$$;

REVOKE ALL ON FUNCTION public.counselor_offer_stats(date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.counselor_offer_stats(date, date) TO authenticated;