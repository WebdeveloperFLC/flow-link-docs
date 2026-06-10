-- Replace Lovable legacy wallet allocation triggers (fn_wallet_alloc_guard → service_catalogue).
-- Production had: trg_wallet_alloc_guard, trg_wallet_alloc_ledger, trg_wallet_alloc_reverse

-- ── 1. Drop legacy Lovable triggers + functions ───────────────────────────────
DROP TRIGGER IF EXISTS trg_wallet_alloc_guard ON public.wallet_allocations;
DROP TRIGGER IF EXISTS trg_wallet_allocation_guard ON public.wallet_allocations;
DROP TRIGGER IF EXISTS trg_wallet_alloc_ledger ON public.wallet_allocations;
DROP TRIGGER IF EXISTS trg_wallet_alloc_reverse ON public.wallet_allocations;

DROP FUNCTION IF EXISTS public.fn_wallet_alloc_guard() CASCADE;
DROP FUNCTION IF EXISTS public.fn_wallet_alloc_ledger() CASCADE;
DROP FUNCTION IF EXISTS public.fn_wallet_alloc_reverse() CASCADE;

-- ── 2. Sprint 3 apply trigger (unlock + debit + ledger) ─────────────────────────
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

DROP TRIGGER IF EXISTS trg_wallet_allocation_apply ON public.wallet_allocations;
CREATE TRIGGER trg_wallet_allocation_apply
  AFTER INSERT ON public.wallet_allocations
  FOR EACH ROW EXECUTE FUNCTION public.trg_wallet_allocation_apply();

-- ── 3. Reversal trigger (credit balance when counsellor reverses) ─────────────
CREATE OR REPLACE FUNCTION public.trg_wallet_allocation_reverse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'applied'
     AND NEW.status = 'reversed'
     AND COALESCE(OLD.amount, 0) > 0 THEN
    UPDATE public.discount_wallets
       SET balance = balance + OLD.amount,
           updated_at = now()
     WHERE id = OLD.wallet_id
     RETURNING balance INTO v_balance;

    INSERT INTO public.wallet_ledger (
      wallet_id, entry_type, amount, currency, balance_after, ref_allocation_id, note
    ) VALUES (
      OLD.wallet_id, 'reversal', OLD.amount, OLD.currency, v_balance, OLD.id,
      COALESCE(NEW.reversal_reason, 'allocation reversed')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_allocation_reverse ON public.wallet_allocations;
CREATE TRIGGER trg_wallet_allocation_reverse
  AFTER UPDATE OF status ON public.wallet_allocations
  FOR EACH ROW EXECUTE FUNCTION public.trg_wallet_allocation_reverse();

COMMENT ON FUNCTION public.trg_wallet_allocation_apply() IS
  'Sprint 3: cap/unlock/balance guard + wallet_ledger debit. Replaces fn_wallet_alloc_guard + fn_wallet_alloc_ledger.';
COMMENT ON FUNCTION public.trg_wallet_allocation_reverse() IS
  'Credit wallet + ledger on allocation reversal. Replaces fn_wallet_alloc_reverse.';
