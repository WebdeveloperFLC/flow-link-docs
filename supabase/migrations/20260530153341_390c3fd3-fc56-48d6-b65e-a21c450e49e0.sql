CREATE OR REPLACE FUNCTION public.fn_redeem_offer_on_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_status text;
  v_co_id uuid;
BEGIN
  IF NEW.applied_offer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.applied_offer_id::text, '') = COALESCE(NEW.applied_offer_id::text, '') THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT id, status INTO v_co_id, v_existing_status
      FROM public.client_offers
     WHERE client_id = NEW.client_id
       AND offer_id  = NEW.applied_offer_id
     LIMIT 1;

    IF v_co_id IS NULL THEN
      INSERT INTO public.client_offers (client_id, offer_id, status, used_at, source)
      VALUES (NEW.client_id, NEW.applied_offer_id, 'used', now(), 'auto')
      ON CONFLICT (client_id, offer_id) DO NOTHING;
    ELSIF v_existing_status IS DISTINCT FROM 'used' THEN
      UPDATE public.client_offers
         SET status = 'used', used_at = now()
       WHERE id = v_co_id;
    END IF;

    IF v_co_id IS NULL OR v_existing_status IS DISTINCT FROM 'used' THEN
      PERFORM public.log_offer_event(
        NEW.applied_offer_id,
        NEW.client_id,
        NEW.attributed_counselor_id,
        'redeemed',
        'invoice',
        COALESCE(NEW.offer_discount_amount, 0),
        NEW.tracking_code
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_redeem_offer_on_invoice: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_offer_redemption ON public.client_invoices;
CREATE TRIGGER trg_invoice_offer_redemption
  AFTER INSERT OR UPDATE OF applied_offer_id ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_redeem_offer_on_invoice();