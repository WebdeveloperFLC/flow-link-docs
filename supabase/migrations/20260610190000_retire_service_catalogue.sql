-- Retire service_catalogue: billing uses library composite codes + picker_variants.

-- Drop FK from ar_invoice_line_items → service_catalogue (if present).
ALTER TABLE public.ar_invoice_line_items
  DROP CONSTRAINT IF EXISTS ar_invoice_line_items_service_code_fkey;

-- Rewrite auto-draft RPC to resolve fees from picker_variants / fee_items by composite code.
DROP FUNCTION IF EXISTS public.create_invoice_from_services(uuid, uuid[], uuid, uuid, text, jsonb, date);

CREATE OR REPLACE FUNCTION public.create_invoice_from_services(
  p_client_id uuid,
  p_service_codes text[],
  p_branch_id uuid DEFAULT NULL,
  p_firm_entity_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'INR',
  p_installments jsonb DEFAULT NULL,
  p_due_date date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv_id uuid;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_entity_code text;
  v_branch_code text;
  v_i jsonb;
  v_n int := 0;
  v_code text;
  v_name text;
  v_amount numeric;
  v_lib_id uuid;
  v_country text;
  v_variant_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_edit_client(v_uid, p_client_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;

  IF p_service_codes IS NOT NULL THEN
    FOREACH v_code IN ARRAY p_service_codes LOOP
      v_name := v_code;
      v_amount := 0;

      -- Composite: {library_id}::Country::variant_key
      IF v_code ~ '^[0-9a-f-]{36}::' THEN
        v_lib_id := split_part(v_code, '::', 1)::uuid;
        v_country := split_part(v_code, '::', 2);
        v_variant_key := NULLIF(split_part(v_code, '::', 3), '');

        IF v_variant_key IS NOT NULL THEN
          SELECT pv.picker_label,
                 CASE WHEN p_currency = 'CAD' THEN pv.fee_cad ELSE pv.fee_inr END
            INTO v_name, v_amount
            FROM public.service_library_picker_variants pv
           WHERE pv.library_id = v_lib_id
             AND pv.country = v_country
             AND pv.variant_key = v_variant_key
             AND pv.is_active
           LIMIT 1;
        ELSE
          SELECT COALESCE(sl.academy_metadata->>'displayName', sl.sub_service),
                 COALESCE(
                   (SELECT CASE WHEN p_currency = 'CAD' THEN pv.fee_cad ELSE pv.fee_inr END
                      FROM public.service_library_picker_variants pv
                     WHERE pv.library_id = sl.id AND pv.country = v_country AND pv.is_active
                     ORDER BY pv.display_order LIMIT 1),
                   (SELECT NULLIF(REGEXP_REPLACE(fi.amount, '[^0-9.]', '', 'g'), '')::numeric
                      FROM public.service_library_fee_items fi
                     WHERE fi.library_id = sl.id
                       AND fi.fee_label ~* '(consultancy|consult|service fee)'
                       AND UPPER(COALESCE(fi.currency, 'INR')) = p_currency
                     ORDER BY fi.display_order LIMIT 1),
                   0
                 )
            INTO v_name, v_amount
            FROM public.service_library sl
           WHERE sl.id = v_lib_id;
        END IF;
      ELSIF v_code ~ '^[0-9a-f-]{36}$' THEN
        SELECT COALESCE(sl.academy_metadata->>'displayName', sl.sub_service),
               COALESCE(
                 (SELECT CASE WHEN p_currency = 'CAD' THEN pv.fee_cad ELSE pv.fee_inr END
                    FROM public.service_library_picker_variants pv
                   WHERE pv.library_id = sl.id AND pv.is_active
                   ORDER BY pv.display_order LIMIT 1),
                 (SELECT NULLIF(REGEXP_REPLACE(fi.amount, '[^0-9.]', '', 'g'), '')::numeric
                    FROM public.service_library_fee_items fi
                   WHERE fi.library_id = sl.id
                     AND fi.fee_label ~* '(consultancy|consult|service fee)'
                     AND UPPER(COALESCE(fi.currency, 'INR')) = p_currency
                   ORDER BY fi.display_order LIMIT 1),
                 0
               )
          INTO v_name, v_amount
          FROM public.service_library sl
         WHERE sl.id = v_code::uuid;
      END IF;

      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'service_id', v_code,
        'service_name', COALESCE(v_name, v_code),
        'description', COALESCE(v_name, v_code),
        'quantity', 1,
        'currency', p_currency,
        'amount', COALESCE(v_amount, 0),
        'discount', 0,
        'tax', 0,
        'total', COALESCE(v_amount, 0)
      ));
      v_total := v_total + COALESCE(v_amount, 0);
    END LOOP;
  END IF;

  IF p_branch_id IS NOT NULL THEN
    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 3)) INTO v_branch_code
      FROM public.branches WHERE id = p_branch_id;
  END IF;
  v_branch_code := COALESCE(v_branch_code, 'GEN');
  v_entity_code := 'FLC';

  INSERT INTO public.client_invoices (
    client_id, invoice_number, amount, currency, status,
    line_items, due_date, created_by,
    branch_id, firm_entity_id,
    invoice_entity_code, invoice_branch_code, invoice_year,
    fx_snapshot_date, fx_rate_to_inr, fx_rate_to_cad, fx_rate_to_usd, fx_provider,
    subtotal_in_inr, subtotal_in_cad, subtotal_in_usd
  ) VALUES (
    p_client_id,
    'TEMP-' || gen_random_uuid()::text,
    v_total, p_currency, 'draft',
    v_items, p_due_date, v_uid,
    p_branch_id, p_firm_entity_id,
    v_entity_code, v_branch_code, EXTRACT(YEAR FROM now())::int,
    CURRENT_DATE, 1, 1, 1, 'manual',
    v_total, v_total, v_total
  ) RETURNING id INTO v_inv_id;

  IF p_installments IS NOT NULL AND jsonb_typeof(p_installments) = 'array' THEN
    FOR v_i IN SELECT * FROM jsonb_array_elements(p_installments) LOOP
      v_n := v_n + 1;
      INSERT INTO public.client_invoice_installments(
        invoice_id, installment_number, installment_label, installment_due_date,
        installment_amount, currency, fee_category
      ) VALUES (
        v_inv_id,
        v_n,
        COALESCE(v_i->>'label', 'Installment ' || v_n),
        (v_i->>'due_date')::date,
        COALESCE((v_i->>'amount')::numeric, 0),
        p_currency,
        v_i->>'fee_category'
      );
    END LOOP;
  END IF;

  RETURN v_inv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice_from_services(uuid, text[], uuid, uuid, text, jsonb, date) TO authenticated;

DROP TABLE IF EXISTS public.service_catalogue CASCADE;
