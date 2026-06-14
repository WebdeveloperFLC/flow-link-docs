-- CMS Phase 3C — Commercial profitability RPC (§5.3)
-- Reporting only — joins client_invoices, wallet_allocations, incentive_line_items, qualifying events

CREATE OR REPLACE FUNCTION public.fn_commercial_profitability(
  _period_key text,
  _group_by text DEFAULT 'counselor',
  _branch_id uuid DEFAULT NULL,
  _limit int DEFAULT 25
)
RETURNS TABLE (
  dimension text,
  group_key text,
  group_label text,
  revenue_inr numeric,
  discount_inr numeric,
  incentive_inr numeric,
  commission_inr numeric,
  net_inr numeric,
  net_margin_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_group text := lower(trim(coalesce(_group_by, 'counselor')));
BEGIN
  v_start := to_timestamp(_period_key || '-01', 'YYYY-MM-DD');
  v_end := v_start + interval '1 month';

  IF v_group NOT IN ('counselor', 'branch', 'service', 'country') THEN
    RAISE EXCEPTION 'unsupported group_by: %', _group_by;
  END IF;

  RETURN QUERY
  WITH wallet_by_invoice AS (
    SELECT
      wa.invoice_id,
      sum(
        wa.amount * coalesce(public.fn_effective_fx_rate_to_inr(wa.currency, _period_key, 'general'), 1)
      ) AS wallet_inr
    FROM public.wallet_allocations wa
    WHERE wa.status = 'applied'
      AND wa.invoice_id IS NOT NULL
    GROUP BY wa.invoice_id
  ),
  invoice_facts AS (
    SELECT
      i.id,
      i.branch_id,
      coalesce(i.assigned_counselor_id, i.attributed_counselor_id) AS counselor_id,
      i.amount * coalesce(public.fn_effective_fx_rate_to_inr(i.currency, _period_key, 'general'), 1) AS revenue_inr,
      i.offer_discount_amount * coalesce(public.fn_effective_fx_rate_to_inr(i.currency, _period_key, 'general'), 1)
        + coalesce(w.wallet_inr, 0) AS discount_inr
    FROM public.client_invoices i
    LEFT JOIN wallet_by_invoice w ON w.invoice_id = i.id
    WHERE i.created_at >= v_start
      AND i.created_at < v_end
      AND i.status NOT IN ('draft', 'cancelled', 'void', 'refunded')
      AND (_branch_id IS NULL OR i.branch_id = _branch_id)
  ),
  incentive_facts AS (
    SELECT
      li.counselor_id,
      sum(
        li.earned_amount
        * coalesce(public.fn_effective_fx_rate_to_inr(li.settlement_currency, _period_key, 'incentive_settlement'), 1)
      ) AS incentive_inr,
      sum(
        CASE
          WHEN li.source_type IN ('direct_visa_commission', 'b2b_admission_commission') THEN
            li.earned_amount
            * coalesce(public.fn_effective_fx_rate_to_inr(li.settlement_currency, _period_key, 'incentive_settlement'), 1)
          ELSE 0
        END
      ) AS commission_inr
    FROM public.incentive_line_items li
    JOIN public.incentive_runs r ON r.id = li.run_id
    LEFT JOIN public.profiles p ON p.id = li.counselor_id
    WHERE r.period_key = _period_key
      AND (_branch_id IS NULL OR p.branch_id = _branch_id OR r.branch_id = _branch_id)
    GROUP BY li.counselor_id
  ),
  qe_service AS (
    SELECT
      coalesce(qe.dimensions->>'master_key', 'unknown') AS group_key,
      replace(coalesce(qe.dimensions->>'master_key', 'unknown'), '_', ' ') AS group_label,
      sum(qe.amount * coalesce(public.fn_effective_fx_rate_to_inr(qe.currency, _period_key, 'general'), 1)) AS revenue_inr
    FROM public.incentive_qualifying_events qe
    WHERE qe.period_key = _period_key
      AND (_branch_id IS NULL OR qe.branch_id = _branch_id)
    GROUP BY 1, 2
  ),
  qe_country AS (
    SELECT
      coalesce(qe.dimensions->>'country_code', qe.dimensions->>'country', 'unknown') AS group_key,
      coalesce(qe.dimensions->>'country_code', qe.dimensions->>'country', 'Unknown') AS group_label,
      sum(qe.amount * coalesce(public.fn_effective_fx_rate_to_inr(qe.currency, _period_key, 'general'), 1)) AS revenue_inr
    FROM public.incentive_qualifying_events qe
    WHERE qe.period_key = _period_key
      AND (_branch_id IS NULL OR qe.branch_id = _branch_id)
    GROUP BY 1, 2
  ),
  counselor_rows AS (
    SELECT
      coalesce(if.counselor_id, inf.counselor_id) AS counselor_id,
      coalesce(sum(if.revenue_inr), 0) AS revenue_inr,
      coalesce(sum(if.discount_inr), 0) AS discount_inr,
      coalesce(max(inf.incentive_inr), 0) AS incentive_inr,
      coalesce(max(inf.commission_inr), 0) AS commission_inr
    FROM invoice_facts if
    FULL OUTER JOIN incentive_facts inf ON inf.counselor_id = if.counselor_id
    GROUP BY 1
  ),
  branch_invoice AS (
    SELECT
      if.branch_id,
      sum(if.revenue_inr) AS revenue_inr,
      sum(if.discount_inr) AS discount_inr
    FROM invoice_facts if
    WHERE if.branch_id IS NOT NULL
    GROUP BY if.branch_id
  ),
  branch_incentive AS (
    SELECT
      p.branch_id,
      sum(inf.incentive_inr) AS incentive_inr,
      sum(inf.commission_inr) AS commission_inr
    FROM incentive_facts inf
    JOIN public.profiles p ON p.id = inf.counselor_id
    WHERE p.branch_id IS NOT NULL
    GROUP BY p.branch_id
  ),
  branch_rows AS (
    SELECT
      coalesce(bi.branch_id, binf.branch_id) AS branch_id,
      coalesce(bi.revenue_inr, 0) AS revenue_inr,
      coalesce(bi.discount_inr, 0) AS discount_inr,
      coalesce(binf.incentive_inr, 0) AS incentive_inr,
      coalesce(binf.commission_inr, 0) AS commission_inr
    FROM branch_invoice bi
    FULL OUTER JOIN branch_incentive binf ON binf.branch_id = bi.branch_id
  ),
  period_totals AS (
    SELECT
      coalesce(sum(if.revenue_inr), 0) AS total_revenue,
      coalesce(sum(if.discount_inr), 0) AS total_discount,
      coalesce((SELECT sum(incentive_inr) FROM incentive_facts), 0) AS total_incentive,
      coalesce((SELECT sum(commission_inr) FROM incentive_facts), 0) AS total_commission
    FROM invoice_facts if
  ),
  proportional AS (
    SELECT
      qs.group_key,
      qs.group_label,
      qs.revenue_inr,
      CASE
        WHEN pt.total_revenue > 0 THEN pt.total_discount * (qs.revenue_inr / pt.total_revenue)
        ELSE 0
      END AS discount_inr,
      CASE
        WHEN pt.total_revenue > 0 THEN pt.total_incentive * (qs.revenue_inr / pt.total_revenue)
        ELSE 0
      END AS incentive_inr,
      CASE
        WHEN pt.total_revenue > 0 THEN pt.total_commission * (qs.revenue_inr / pt.total_revenue)
        ELSE 0
      END AS commission_inr
    FROM qe_service qs
    CROSS JOIN period_totals pt
    WHERE v_group = 'service'
    UNION ALL
    SELECT
      qc.group_key,
      qc.group_label,
      qc.revenue_inr,
      CASE WHEN pt.total_revenue > 0 THEN pt.total_discount * (qc.revenue_inr / pt.total_revenue) ELSE 0 END,
      CASE WHEN pt.total_revenue > 0 THEN pt.total_incentive * (qc.revenue_inr / pt.total_revenue) ELSE 0 END,
      CASE WHEN pt.total_revenue > 0 THEN pt.total_commission * (qc.revenue_inr / pt.total_revenue) ELSE 0 END
    FROM qe_country qc
    CROSS JOIN period_totals pt
    WHERE v_group = 'country'
  )
  SELECT
    v_group AS dimension,
    cr.counselor_id::text AS group_key,
    coalesce(p.full_name, cr.counselor_id::text) AS group_label,
    round(cr.revenue_inr, 2),
    round(cr.discount_inr, 2),
    round(cr.incentive_inr, 2),
    round(cr.commission_inr, 2),
    round(cr.revenue_inr - cr.discount_inr - cr.incentive_inr - cr.commission_inr, 2),
    CASE
      WHEN cr.revenue_inr > 0 THEN round(
        100 * (cr.revenue_inr - cr.discount_inr - cr.incentive_inr - cr.commission_inr) / cr.revenue_inr,
        1
      )
      ELSE NULL
    END
  FROM counselor_rows cr
  LEFT JOIN public.profiles p ON p.id = cr.counselor_id
  WHERE v_group = 'counselor' AND cr.counselor_id IS NOT NULL

  UNION ALL

  SELECT
    v_group,
    br.branch_id::text,
    coalesce(b.name, br.branch_id::text),
    round(br.revenue_inr, 2),
    round(br.discount_inr, 2),
    round(br.incentive_inr, 2),
    round(br.commission_inr, 2),
    round(br.revenue_inr - br.discount_inr - br.incentive_inr - br.commission_inr, 2),
    CASE
      WHEN br.revenue_inr > 0 THEN round(
        100 * (br.revenue_inr - br.discount_inr - br.incentive_inr - br.commission_inr) / br.revenue_inr,
        1
      )
      ELSE NULL
    END
  FROM branch_rows br
  LEFT JOIN public.branches b ON b.id = br.branch_id
  WHERE v_group = 'branch' AND br.branch_id IS NOT NULL

  UNION ALL

  SELECT
    v_group,
    pr.group_key,
    pr.group_label,
    round(pr.revenue_inr, 2),
    round(pr.discount_inr, 2),
    round(pr.incentive_inr, 2),
    round(pr.commission_inr, 2),
    round(pr.revenue_inr - pr.discount_inr - pr.incentive_inr - pr.commission_inr, 2),
    CASE
      WHEN pr.revenue_inr > 0 THEN round(
        100 * (pr.revenue_inr - pr.discount_inr - pr.incentive_inr - pr.commission_inr) / pr.revenue_inr,
        1
      )
      ELSE NULL
    END
  FROM proportional pr
  WHERE v_group IN ('service', 'country')

  ORDER BY revenue_inr DESC
  LIMIT greatest(_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_commercial_profitability(text, text, uuid, int) TO authenticated;

COMMENT ON FUNCTION public.fn_commercial_profitability(text, text, uuid, int) IS
  'CMS profitability matrix — revenue, discount/wallet, incentive & commission cost, net margin by dimension.';
