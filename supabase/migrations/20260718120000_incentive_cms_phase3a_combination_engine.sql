-- CMS Phase 3A — Commercial combination engine (logical mode + package stub)
-- Spec: docs/guides/FLC_CMS_Cursor_Package/01_Build_Guide/FLC_CMS_Transformation_Brief.md §5.1

CREATE TABLE IF NOT EXISTS public.service_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  combination_type text NOT NULL DEFAULT 'logical'
    CHECK (combination_type IN ('logical', 'package')),
  service_codes text[] NOT NULL DEFAULT '{}',
  branch_id uuid REFERENCES public.branches(id),
  firm_entity_id uuid,

  package_price numeric,
  package_currency text DEFAULT 'INR',
  package_discount numeric,
  custom_profitability boolean NOT NULL DEFAULT false,

  linked_offer_id uuid REFERENCES public.offers(id),
  linked_incentive_scheme_id uuid REFERENCES public.incentive_schemes(id),
  wallet_eligible boolean NOT NULL DEFAULT true,
  wallet_scope_master_key text,
  max_discount_pct numeric,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_combinations_active
  ON public.service_combinations (is_active, combination_type);

COMMENT ON TABLE public.service_combinations IS
  'CMS combination engine — logical (sum service prices + rules) or package (custom price).';

ALTER TABLE public.service_combinations ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'service_combinations_select' AND tablename = 'service_combinations'
  ) THEN
    CREATE POLICY service_combinations_select ON public.service_combinations
      FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.has_role(auth.uid(), 'director'::public.app_role)
        OR public.has_role(auth.uid(), 'viewer'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
        OR public.user_has_module(auth.uid(), 'incentives', 'view')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'service_combinations_write' AND tablename = 'service_combinations'
  ) THEN
    CREATE POLICY service_combinations_write ON public.service_combinations
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;
END
$pol$;

-- Parse fee amount text (₹12,000 / INR 12000) to numeric
CREATE OR REPLACE FUNCTION public.fn_parse_fee_amount(_raw text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(
      regexp_replace(COALESCE(_raw, '0'), '[^0-9.]', '', 'g'),
      ''
    )::numeric,
    0
  );
$$;

-- Best-effort INR consultancy fee for a service code (library_id or library_id::tag)
CREATE OR REPLACE FUNCTION public.fn_service_code_consultancy_inr(_service_code text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_lib text := split_part(COALESCE(_service_code, ''), '::', 1);
  v_amt numeric := 0;
BEGIN
  IF v_lib !~* '^[0-9a-f-]{36}$' THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(MAX(public.fn_parse_fee_amount(fi.amount)), 0)
    INTO v_amt
    FROM public.service_library_fee_items fi
   WHERE fi.library_id = v_lib::uuid
     AND (
       fi.fee_label ILIKE '%consult%'
       OR fi.fee_label ILIKE '%service fee%'
       OR fi.fee_label ILIKE '%professional%'
       OR fi.fee_label ILIKE '%flc%'
     )
     AND COALESCE(fi.currency, 'INR') ILIKE 'INR%';

  RETURN COALESCE(v_amt, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_combination(
  _combination_id uuid,
  _client_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.service_combinations%ROWTYPE;
  v_code text;
  v_sum numeric := 0;
  v_price numeric;
  v_currency text := 'INR';
  v_labels jsonb := '[]'::jsonb;
  v_lib text;
  v_label text;
BEGIN
  SELECT * INTO v_row
    FROM public.service_combinations
   WHERE id = _combination_id
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'combination not found or inactive';
  END IF;

  IF v_row.combination_type = 'package' AND v_row.package_price IS NOT NULL THEN
    v_price := v_row.package_price;
    v_currency := COALESCE(v_row.package_currency, 'INR');
  ELSE
    FOREACH v_code IN ARRAY COALESCE(v_row.service_codes, '{}')
    LOOP
      v_sum := v_sum + public.fn_service_code_consultancy_inr(v_code);
      v_lib := split_part(v_code, '::', 1);
      IF v_lib ~* '^[0-9a-f-]{36}$' THEN
        SELECT COALESCE(sl.sub_service, sl.service, v_code)
          INTO v_label
          FROM public.service_library sl
         WHERE sl.id = v_lib::uuid;
        v_labels := v_labels || to_jsonb(COALESCE(v_label, v_code));
      ELSE
        v_labels := v_labels || to_jsonb(v_code);
      END IF;
    END LOOP;
    v_price := v_sum;
  END IF;

  RETURN jsonb_build_object(
    'combination_id', v_row.id,
    'combination_type', v_row.combination_type,
    'name', v_row.name,
    'price', COALESCE(v_price, 0),
    'currency', v_currency,
    'composed_sum', v_sum,
    'package_price', v_row.package_price,
    'package_discount', v_row.package_discount,
    'offer_id', v_row.linked_offer_id,
    'incentive_scheme_id', v_row.linked_incentive_scheme_id,
    'wallet_eligible', v_row.wallet_eligible,
    'wallet_scope_master_key', v_row.wallet_scope_master_key,
    'max_discount_pct', v_row.max_discount_pct,
    'service_codes', to_jsonb(COALESCE(v_row.service_codes, '{}')),
    'service_labels', v_labels,
    'client_id', _client_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_combination(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_service_code_consultancy_inr(text) TO authenticated;

COMMENT ON FUNCTION public.fn_resolve_combination(uuid, uuid) IS
  'CMS combination resolver — logical sums service_library fees; package uses package_price. Returns linked rules.';
