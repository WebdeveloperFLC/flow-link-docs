-- Fix stale references to dropped public.service_catalogue (retired in 20260610190000).
-- Symptom: fn_apply_offer_discount fails with relation "public.service_catalogue" does not exist.

-- ── 1. Remove legacy invoice RPC that queried service_catalogue ───────────────
DROP FUNCTION IF EXISTS public.create_invoice_from_services(uuid, uuid[], uuid, uuid, text, jsonb, date);

-- ── 2. DSH media search: use service_library instead of service_catalogue ─────
CREATE OR REPLACE FUNCTION public.dsh_media_refresh_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
DECLARE
  v_branch text;
  v_service text;
BEGIN
  SELECT name INTO v_branch FROM public.branches WHERE id = NEW.branch_id;

  SELECT string_agg(DISTINCT COALESCE(sl.sub_service, sl.master_service), ' ')
    INTO v_service
    FROM public.service_library sl
   WHERE sl.master_key = NEW.service_master_key
     AND (NEW.service_sub_category IS NULL OR sl.sub_category = NEW.service_sub_category);

  NEW.search_doc :=
      setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A')
   || setweight(to_tsvector('simple', coalesce(NEW.campaign_name,'')), 'A')
   || setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B')
   || setweight(to_tsvector('simple', coalesce(NEW.content_type::text,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.country_name,'')), 'B')
   || setweight(to_tsvector('simple', coalesce(v_branch,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.service_master_key,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.service_sub_category,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(v_service,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.google_review_text,'')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── 3. Re-assert wallet allocation trigger (no service_catalogue dependency) ──
CREATE OR REPLACE FUNCTION public.trg_wallet_allocation_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_balance numeric;
  v_spent numeric;
  v_remaining numeric;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'applied' THEN
    SELECT * INTO w FROM public.discount_wallets WHERE id = NEW.wallet_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'wallet not found: %', NEW.wallet_id;
    END IF;

    IF NEW.percent IS NOT NULL AND NEW.percent > w.max_percent_per_client THEN
      RAISE EXCEPTION 'discount percent % exceeds cap %', NEW.percent, w.max_percent_per_client;
    END IF;

    IF w.max_amount_per_client IS NOT NULL AND NEW.amount > w.max_amount_per_client THEN
      RAISE EXCEPTION 'discount amount % exceeds per-client cap %', NEW.amount, w.max_amount_per_client;
    END IF;

    IF COALESCE(w.potential_wallet, 0) > 0 OR w.assigned_target IS NOT NULL THEN
      SELECT COALESCE(SUM(a.amount), 0) INTO v_spent
        FROM public.wallet_allocations a
       WHERE a.wallet_id = NEW.wallet_id
         AND a.status = 'applied';

      v_remaining := COALESCE(w.unlocked_amount, 0) - v_spent;
      IF NEW.amount > 0 AND NEW.amount > v_remaining THEN
        RAISE EXCEPTION 'exceeds unlocked budget (remaining %, requested %)', v_remaining, NEW.amount;
      END IF;
    END IF;

    IF NOT w.allow_negative AND NEW.amount > w.balance THEN
      RAISE EXCEPTION 'insufficient wallet balance (have %, need %)', w.balance, NEW.amount;
    END IF;

    UPDATE public.discount_wallets
       SET balance = balance - NEW.amount,
           updated_at = now()
     WHERE id = NEW.wallet_id
     RETURNING balance INTO v_balance;

    INSERT INTO public.wallet_ledger (
      wallet_id, entry_type, amount, currency, balance_after, ref_allocation_id, note
    ) VALUES (
      NEW.wallet_id, 'allocation', -NEW.amount, NEW.currency, v_balance, NEW.id, 'discount applied'
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.dsh_media_refresh_search() IS
  'DSH media full-text search doc; uses service_library (service_catalogue retired).';
