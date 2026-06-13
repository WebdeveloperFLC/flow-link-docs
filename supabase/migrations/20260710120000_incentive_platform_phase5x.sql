-- Phase 5X — O11b multi-variant A/B experiments (3–5 offers per test)

ALTER TABLE public.offer_ab_variants
  DROP CONSTRAINT IF EXISTS offer_ab_variants_variant_code_check;

ALTER TABLE public.offer_ab_variants
  ADD CONSTRAINT offer_ab_variants_variant_code_check
  CHECK (variant_code ~ '^[A-E]$');

-- ── Multi-variant create (2–5 offers) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_offer_ab_experiment_multi(
  _name text,
  _variants jsonb,
  _description text DEFAULT NULL,
  _min_conversions int DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exp_id uuid;
  v_count int;
  v_elem jsonb;
  v_offer_id uuid;
  v_label text;
  v_codes text[] := ARRAY['A', 'B', 'C', 'D', 'E'];
  v_seen uuid[] := ARRAY[]::uuid[];
  i int := 0;
BEGIN
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'offers', 'edit')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _variants IS NULL OR jsonb_typeof(_variants) <> 'array' THEN
    RAISE EXCEPTION 'variants must be a JSON array of {offer_id, label?}';
  END IF;

  v_count := jsonb_array_length(_variants);
  IF v_count < 2 OR v_count > 5 THEN
    RAISE EXCEPTION 'Experiments need 2–5 variants (got %)', v_count;
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(_variants) LOOP
    v_offer_id := (v_elem->>'offer_id')::uuid;
    IF v_offer_id IS NULL THEN
      RAISE EXCEPTION 'Each variant requires offer_id';
    END IF;
    IF v_offer_id = ANY (v_seen) THEN
      RAISE EXCEPTION 'Duplicate offer in variants';
    END IF;
    v_seen := array_append(v_seen, v_offer_id);
  END LOOP;

  INSERT INTO public.offer_ab_experiments (name, description, min_conversions, created_by)
  VALUES (trim(_name), nullif(trim(_description), ''), greatest(_min_conversions, 1), v_uid)
  RETURNING id INTO v_exp_id;

  i := 0;
  FOR v_elem IN SELECT value FROM jsonb_array_elements(_variants) LOOP
    i := i + 1;
    v_offer_id := (v_elem->>'offer_id')::uuid;
    v_label := nullif(trim(v_elem->>'label'), '');
    INSERT INTO public.offer_ab_variants (experiment_id, offer_id, variant_code, label)
    VALUES (
      v_exp_id,
      v_offer_id,
      v_codes[i],
      coalesce(v_label, 'Variant ' || v_codes[i])
    );
  END LOOP;

  RETURN v_exp_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_offer_ab_experiment_multi(text, jsonb, text, int) TO authenticated;

-- Keep two-variant helper; delegate to multi RPC
CREATE OR REPLACE FUNCTION public.fn_create_offer_ab_experiment(
  _name text,
  _offer_id_a uuid,
  _offer_id_b uuid,
  _description text DEFAULT NULL,
  _min_conversions int DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _offer_id_a = _offer_id_b THEN
    RAISE EXCEPTION 'Variant A and B must be different offers';
  END IF;

  RETURN public.fn_create_offer_ab_experiment_multi(
    _name,
    jsonb_build_array(
      jsonb_build_object('offer_id', _offer_id_a, 'label', 'Variant A'),
      jsonb_build_object('offer_id', _offer_id_b, 'label', 'Variant B')
    ),
    _description,
    _min_conversions
  );
END;
$$;

-- ── Balanced assignment across N variants ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_assign_offer_ab_variant(
  _experiment_id uuid,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exp public.offer_ab_experiments%ROWTYPE;
  v_existing public.offer_ab_assignments%ROWTYPE;
  v_variant public.offer_ab_variants%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _client_id IS NULL AND _lead_id IS NULL THEN RAISE EXCEPTION 'client or lead required'; END IF;

  SELECT * INTO v_exp FROM public.offer_ab_experiments
   WHERE id = _experiment_id AND status = 'running';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'experiment_not_running');
  END IF;

  SELECT * INTO v_existing FROM public.offer_ab_assignments a
   WHERE a.experiment_id = _experiment_id
     AND ((_client_id IS NOT NULL AND a.client_id = _client_id)
       OR (_lead_id IS NOT NULL AND a.lead_id = _lead_id))
   LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_variant FROM public.offer_ab_variants WHERE id = v_existing.variant_id;
    RETURN jsonb_build_object(
      'assigned', true,
      'experiment_id', _experiment_id,
      'variant_id', v_variant.id,
      'variant_code', v_variant.variant_code,
      'offer_id', v_variant.offer_id
    );
  END IF;

  SELECT v.* INTO v_variant
    FROM public.offer_ab_variants v
    LEFT JOIN public.offer_ab_assignments a
      ON a.variant_id = v.id AND a.experiment_id = _experiment_id
   WHERE v.experiment_id = _experiment_id
   GROUP BY v.id
   ORDER BY count(a.id) ASC, v.variant_code
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'no_variants');
  END IF;

  INSERT INTO public.offer_ab_assignments (experiment_id, variant_id, client_id, lead_id, counselor_id)
  VALUES (_experiment_id, v_variant.id, _client_id, _lead_id, v_uid);

  RETURN jsonb_build_object(
    'assigned', true,
    'experiment_id', _experiment_id,
    'variant_id', v_variant.id,
    'variant_code', v_variant.variant_code,
    'offer_id', v_variant.offer_id
  );
END;
$$;

COMMENT ON FUNCTION public.fn_create_offer_ab_experiment_multi(text, jsonb, text, int) IS
  'Phase 5X O11b — create A/B/C/D/E experiment with 2–5 distinct offers';

COMMENT ON TABLE public.offer_ab_experiments IS
  'O11/O11b — offer A/B tests (2–5 variants) with balanced assignment and winner promotion';
