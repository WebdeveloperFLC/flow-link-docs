-- Phase 4: FX purposes, target suggestions, finance export metadata

-- ── Purpose-specific FX rates ─────────────────────────────────────────────────
ALTER TABLE public.fx_rates
  ADD COLUMN IF NOT EXISTS rate_purpose text NOT NULL DEFAULT 'general'
    CHECK (rate_purpose IN ('general', 'billing', 'incentive_settlement', 'payout'));

COMMENT ON COLUMN public.fx_rates.rate_purpose IS
  'general = all uses; billing = client invoices; incentive_settlement = run calc; payout = counselor payout conversion';

CREATE INDEX IF NOT EXISTS idx_fx_rates_purpose
  ON public.fx_rates (currency, period_key, rate_purpose);

-- Prefer purpose-specific rate, fall back to general
CREATE OR REPLACE FUNCTION public.fn_effective_fx_rate_to_inr(
  _currency text,
  _period_key text DEFAULT NULL,
  _purpose text DEFAULT 'incentive_settlement'
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cur text := upper(trim(coalesce(_currency, 'INR')));
  v_row public.fx_rates%ROWTYPE;
  v_base numeric;
  v_eff numeric;
  v_purpose text := coalesce(nullif(trim(_purpose), ''), 'incentive_settlement');
BEGIN
  IF v_cur = 'INR' THEN
    RETURN 1;
  END IF;

  SELECT * INTO v_row
  FROM public.fx_rates r
  WHERE upper(r.currency) = v_cur
    AND (_period_key IS NULL OR r.period_key <= _period_key)
    AND (r.rate_purpose = v_purpose OR r.rate_purpose = 'general')
  ORDER BY
    CASE WHEN r.rate_purpose = v_purpose THEN 0 ELSE 1 END,
    r.period_key DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_base := coalesce(v_row.base_rate_to_inr, v_row.rate_to_inr);
  IF coalesce(v_row.buffer_pct, 0) > 0 THEN
    v_eff := v_base * (1 + v_row.buffer_pct / 100);
  ELSE
    v_eff := v_base + coalesce(v_row.buffer_fixed, 0);
  END IF;
  RETURN round(v_eff, 4);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_effective_fx_rate_to_inr(text, text, text) TO authenticated;

-- ── Auto-suggest targets from prior period ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_suggest_incentive_targets(
  _source_period_key text,
  _growth_pct numeric DEFAULT 10,
  _plan_id uuid DEFAULT NULL
)
RETURNS TABLE (
  counselor_id uuid,
  full_name text,
  prior_total numeric,
  suggested_target numeric,
  target_currency text,
  event_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qe.counselor_id,
    coalesce(p.full_name, qe.counselor_id::text) AS full_name,
    round(coalesce(sum(qe.amount), 0)::numeric, 2) AS prior_total,
    round(coalesce(sum(qe.amount), 0) * (1 + coalesce(_growth_pct, 10) / 100), 2) AS suggested_target,
    coalesce(max(qe.currency), 'INR') AS target_currency,
    count(*)::bigint AS event_count
  FROM public.incentive_qualifying_events qe
  LEFT JOIN public.profiles p ON p.id = qe.counselor_id
  WHERE qe.period_key = _source_period_key
  GROUP BY qe.counselor_id, p.full_name
  HAVING coalesce(sum(qe.amount), 0) > 0
  ORDER BY sum(qe.amount) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.fn_suggest_incentive_targets(text, numeric, uuid) TO authenticated;

-- ── Finance export view (payouts + counselor + run for CSV/AP) ─────────────────
CREATE OR REPLACE FUNCTION public.fn_incentive_payout_export(
  _run_id uuid DEFAULT NULL,
  _period_key text DEFAULT NULL
)
RETURNS TABLE (
  payout_id uuid,
  run_id uuid,
  period_key text,
  counselor_id uuid,
  counselor_name text,
  gross_amount numeric,
  tds_amount numeric,
  net_amount numeric,
  settlement_currency text,
  status text,
  paid_at timestamptz,
  accounting_ap_bill_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ip.id AS payout_id,
    ip.run_id,
    ir.period_key,
    ip.counselor_id,
    coalesce(p.full_name, ip.counselor_id::text) AS counselor_name,
    ip.gross_amount,
    ip.tds_amount,
    ip.net_amount,
    ip.settlement_currency,
    ip.status::text,
    ip.paid_at,
    ip.accounting_ap_bill_id
  FROM public.incentive_payouts ip
  LEFT JOIN public.incentive_runs ir ON ir.id = ip.run_id
  LEFT JOIN public.profiles p ON p.id = ip.counselor_id
  WHERE (_run_id IS NULL OR ip.run_id = _run_id)
    AND (_period_key IS NULL OR ir.period_key = _period_key)
  ORDER BY ip.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.fn_incentive_payout_export(uuid, text) TO authenticated;

-- Allow finance to update AP bill reference on payouts
COMMENT ON COLUMN public.incentive_payouts.accounting_ap_bill_id IS
  'Optional link to accounting AP bill after finance export (Phase 4).';
