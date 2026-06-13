-- Fix fn_rebind_ph_demo_wallets: uuid columns need ::text for LIKE pattern match.

CREATE OR REPLACE FUNCTION public.fn_rebind_ph_demo_wallets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priya uuid;
  v_rohit uuid;
BEGIN
  SELECT id INTO v_priya FROM auth.users WHERE email = 'ph.counselor1@flowlink.demo' LIMIT 1;
  SELECT id INTO v_rohit FROM auth.users WHERE email = 'ph.counselor2@flowlink.demo' LIMIT 1;

  IF v_priya IS NOT NULL THEN
    UPDATE public.discount_wallets
       SET counselor_id = v_priya,
           period_key = '2026-06',
           closed_at = NULL,
           updated_at = now()
     WHERE id IN (
       'a0020001-0001-4000-8000-000000000001',
       'a0020004-0004-4000-8000-000000000004'
     );

    UPDATE public.wallet_allocations
       SET counselor_id = v_priya
     WHERE wallet_id IN (
       'a0020001-0001-4000-8000-000000000001',
       'a0020004-0004-4000-8000-000000000004'
     );

    UPDATE public.clients
       SET assigned_counselor_id = v_priya
     WHERE application_id LIKE 'PH-DEMO-%';

    UPDATE public.incentive_targets
       SET counselor_id = v_priya,
           target_value = 300000,
           period_key = '2026-06'
     WHERE id = 'a0030001-0001-4000-8000-000000000001';

    UPDATE public.incentive_qualifying_events
       SET counselor_id = v_priya
     WHERE id::text LIKE 'a00e000%';

    UPDATE public.incentive_line_items
       SET counselor_id = v_priya
     WHERE id IN (
       'a0060001-0001-4000-8000-000000000001',
       'a0060002-0002-4000-8000-000000000002'
     );
  END IF;

  IF v_rohit IS NOT NULL THEN
    UPDATE public.discount_wallets
       SET counselor_id = v_rohit,
           period_key = '2026-06',
           closed_at = NULL,
           updated_at = now()
     WHERE id = 'a0020002-0002-4000-8000-000000000002';
  END IF;
END;
$$;

SELECT public.fn_rebind_ph_demo_wallets();
SELECT public.fn_sync_wallet_metrics('a0020001-0001-4000-8000-000000000001');
