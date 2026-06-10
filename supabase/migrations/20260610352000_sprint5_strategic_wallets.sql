-- Sprint 5: Strategic wallets — scope enforcement, spend order, approved offer types

-- ── Spend order config ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.wallet_spend_order AS ENUM ('strategic_first', 'personal_first', 'parallel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.wallet_settings
  ADD COLUMN IF NOT EXISTS spend_order public.wallet_spend_order NOT NULL DEFAULT 'strategic_first';

COMMENT ON COLUMN public.wallet_settings.spend_order IS
  'Which wallet debits first: scoped/festive (strategic) vs month_to_month (personal).';

-- ── Approved offer types (counsellor self-serve vs admin-only) ────────────────
CREATE TABLE IF NOT EXISTS public.approved_offer_types (
  offer_type text PRIMARY KEY,
  label text NOT NULL,
  counselor_self_serve boolean NOT NULL DEFAULT true,
  requires_manager_approval boolean NOT NULL DEFAULT false,
  requires_admin boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.approved_offer_types (offer_type, label, counselor_self_serve, requires_admin, sort_order)
VALUES
  ('standard', 'Standard discount', true, false, 10),
  ('festive', 'Festive / seasonal', true, false, 20),
  ('early_bird', 'Early bird', true, false, 30),
  ('bundle', 'Bundle / combo', true, false, 40),
  ('referral', 'Referral', true, false, 50),
  ('loyalty', 'Loyalty / repeat client', true, false, 60),
  ('waiver', 'Fee waiver', false, true, 70),
  ('scholarship', 'Scholarship', false, true, 80),
  ('full_fee_waiver', 'Full fee waiver', false, true, 90)
ON CONFLICT (offer_type) DO NOTHING;

ALTER TABLE public.approved_offer_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'approved_offer_types_read' AND tablename = 'approved_offer_types'
  ) THEN
    CREATE POLICY approved_offer_types_read ON public.approved_offer_types
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'approved_offer_types_admin' AND tablename = 'approved_offer_types'
  ) THEN
    CREATE POLICY approved_offer_types_admin ON public.approved_offer_types
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
      );
  END IF;
END $$;

-- ── Scope match helper ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_wallet_scope_matches(
  _wallet public.discount_wallets,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country text;
  v_countries text[];
  v_services text[];
  v_master text;
BEGIN
  IF _wallet.scope_country_tag IS NULL
     AND _wallet.scope_master_key IS NULL
     AND _wallet.scope_service_code IS NULL
     AND _wallet.scope_sub_category IS NULL THEN
    RETURN true;
  END IF;

  IF _client_id IS NOT NULL THEN
    SELECT
      COALESCE(NULLIF(trim(c.interested_country), ''), NULLIF(trim(c.country), '')),
      c.interested_countries,
      array_cat(
        array_cat(c.visa_services, c.coaching_services),
        array_cat(c.admission_services, array_cat(c.allied_services, c.travel_financial_services))
      )
    INTO v_country, v_countries, v_services
    FROM public.clients c
    WHERE c.id = _client_id;
  ELSIF _lead_id IS NOT NULL THEN
    SELECT
      NULL::text,
      l.interested_countries,
      array_cat(
        array_cat(COALESCE(l.visa_services, '{}'), COALESCE(l.coaching_services, '{}')),
        array_cat(COALESCE(l.admission_services, '{}'), COALESCE(l.allied_services, '{}'))
      )
    INTO v_country, v_countries, v_services
    FROM public.leads l
    WHERE l.id = _lead_id;
  ELSE
    RETURN false;
  END IF;

  IF _wallet.scope_country_tag IS NOT NULL THEN
    IF NOT (
      lower(_wallet.scope_country_tag) = lower(COALESCE(v_country, ''))
      OR lower(_wallet.scope_country_tag) = ANY (SELECT lower(x) FROM unnest(COALESCE(v_countries, '{}')) AS x)
    ) THEN
      RETURN false;
    END IF;
  END IF;

  IF _wallet.scope_service_code IS NOT NULL THEN
    IF NOT (
      _wallet.scope_service_code = ANY(COALESCE(v_services, '{}'))
      OR EXISTS (
        SELECT 1 FROM unnest(COALESCE(v_services, '{}')) s
        WHERE s ILIKE '%' || _wallet.scope_service_code || '%'
      )
    ) THEN
      RETURN false;
    END IF;
  END IF;

  IF _wallet.scope_master_key IS NOT NULL THEN
    v_master := _wallet.scope_master_key;
    IF _client_id IS NOT NULL THEN
      IF NOT (
        (v_master = 'visa_immigration' AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = _client_id AND cardinality(c.visa_services) > 0))
        OR (v_master = 'coaching_services' AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = _client_id AND cardinality(c.coaching_services) > 0))
        OR (v_master = 'admission_services' AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = _client_id AND cardinality(c.admission_services) > 0))
        OR (v_master = 'allied_services' AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = _client_id AND cardinality(c.allied_services) > 0))
        OR (v_master = 'travel_financial' AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = _client_id AND cardinality(c.travel_financial_services) > 0))
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(v_services, '{}')) s
          WHERE s ILIKE v_master || '%'
        )
      ) THEN
        RETURN false;
      END IF;
    ELSE
      IF NOT (
        (v_master = 'visa_immigration' AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = _lead_id AND cardinality(COALESCE(l.visa_services, '{}')) > 0))
        OR (v_master = 'coaching_services' AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = _lead_id AND cardinality(COALESCE(l.coaching_services, '{}')) > 0))
        OR (v_master = 'admission_services' AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = _lead_id AND cardinality(COALESCE(l.admission_services, '{}')) > 0))
        OR (v_master = 'allied_services' AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = _lead_id AND cardinality(COALESCE(l.allied_services, '{}')) > 0))
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(v_services, '{}')) s
          WHERE s ILIKE v_master || '%'
        )
      ) THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  IF _wallet.scope_sub_category IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM unnest(COALESCE(v_services, '{}')) s
      WHERE s ILIKE '%' || _wallet.scope_sub_category || '%'
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- ── Offer type gate for counsellors ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_counselor_can_use_offer_type(
  _offer_category text,
  _uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _offer_category IS NULL OR trim(_offer_category) = '' THEN true
    WHEN public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'administrator'::public.app_role)
      OR public.has_role(_uid, 'manager'::public.app_role) THEN true
    ELSE COALESCE((
      SELECT t.counselor_self_serve
        FROM public.approved_offer_types t
       WHERE t.offer_type = lower(trim(_offer_category))
    ), true)
  END;
$$;

-- ── Pick wallet by spend order + scope ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_pick_discount_wallet(
  _counselor_id uuid,
  _period_key text,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _wallet_id uuid DEFAULT NULL,
  _debit numeric DEFAULT 0
)
RETURNS public.discount_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.wallet_spend_order;
  w public.discount_wallets%ROWTYPE;
BEGIN
  IF _wallet_id IS NOT NULL THEN
    SELECT * INTO w
      FROM public.discount_wallets
     WHERE id = _wallet_id
       AND counselor_id = _counselor_id
       AND period_key = _period_key
       AND closed_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'wallet not found or not yours: %', _wallet_id;
    END IF;
    IF NOT public.fn_wallet_scope_matches(w, _client_id, _lead_id) THEN
      RAISE EXCEPTION 'wallet scope does not match this client/lead';
    END IF;
    RETURN w;
  END IF;

  SELECT spend_order INTO v_order FROM public.wallet_settings WHERE id = 1;
  v_order := COALESCE(v_order, 'strategic_first'::public.wallet_spend_order);

  SELECT * INTO w
    FROM public.discount_wallets dw
   WHERE dw.counselor_id = _counselor_id
     AND dw.period_key = _period_key
     AND dw.closed_at IS NULL
     AND public.fn_wallet_scope_matches(dw, _client_id, _lead_id)
     AND (COALESCE(_debit, 0) <= 0 OR dw.balance >= _debit OR dw.allow_negative)
   ORDER BY
     CASE v_order
       WHEN 'personal_first' THEN
         CASE dw.budget_kind WHEN 'month_to_month' THEN 0 ELSE 1 END
       WHEN 'parallel' THEN
         CASE dw.budget_kind WHEN 'month_to_month' THEN 0 ELSE 1 END
       ELSE
         CASE dw.budget_kind WHEN 'month_to_month' THEN 1 ELSE 0 END
     END,
     dw.updated_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no eligible wallet for this client/lead (scope or balance)';
  END IF;

  RETURN w;
END;
$$;

-- ── Allocation trigger: scope + unlock (exclude current row) ───────────────────
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

    IF NOT public.fn_wallet_scope_matches(w, NEW.client_id, NEW.lead_id) THEN
      RAISE EXCEPTION 'wallet scope does not match recipient (country/service/category)';
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
         AND a.status = 'applied'
         AND a.id IS DISTINCT FROM NEW.id;

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

-- ── Apply discount RPC: wallet pick + offer type gate ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_apply_offer_discount(
  _offer_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _percent numeric DEFAULT NULL,
  _wallet_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_period text := to_char(CURRENT_DATE, 'YYYY-MM');
  w public.discount_wallets%ROWTYPE;
  o public.offers%ROWTYPE;
  v_spent numeric;
  v_remaining numeric;
  v_debit numeric;
  v_discount numeric;
  v_alloc_id uuid;
  v_funding text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF (_client_id IS NULL) = (_lead_id IS NULL) THEN
    RAISE EXCEPTION 'provide exactly one of client_id or lead_id';
  END IF;

  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  v_discount := _amount;

  IF _offer_id IS NOT NULL THEN
    SELECT * INTO o FROM public.offers WHERE id = _offer_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'offer not found';
    END IF;
    IF o.status NOT IN ('active', 'expiring_soon') THEN
      RAISE EXCEPTION 'offer is not active (status: %)', o.status;
    END IF;
    IF NOT public.fn_counselor_can_use_offer_type(o.offer_category, v_uid) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', format('offer type "%s" requires manager or admin approval', COALESCE(o.offer_category, 'restricted'))
      );
    END IF;
    v_funding := o.funding_source::text;
    v_debit := CASE o.funding_source
      WHEN 'university' THEN 0
      WHEN 'joint' THEN ROUND(v_discount * COALESCE(o.fl_contribution_pct, 50) / 100, 2)
      ELSE v_discount
    END;
  ELSE
    v_funding := 'future_link';
    v_debit := v_discount;
  END IF;

  w := public.fn_pick_discount_wallet(v_uid, v_period, _client_id, _lead_id, _wallet_id, v_debit);
  w := public.fn_sync_wallet_metrics(w.id);

  IF _percent IS NOT NULL AND _percent > w.max_percent_per_client THEN
    RAISE EXCEPTION 'discount percent % exceeds cap %', _percent, w.max_percent_per_client;
  END IF;

  IF w.max_amount_per_client IS NOT NULL AND v_discount > w.max_amount_per_client THEN
    RAISE EXCEPTION 'discount amount % exceeds per-client cap %', v_discount, w.max_amount_per_client;
  END IF;

  SELECT COALESCE(SUM(a.amount), 0) INTO v_spent
    FROM public.wallet_allocations a
   WHERE a.wallet_id = w.id
     AND a.status = 'applied';

  v_remaining := COALESCE(w.unlocked_amount, 0) - v_spent;

  IF COALESCE(w.potential_wallet, 0) > 0 OR w.assigned_target IS NOT NULL THEN
    IF v_debit > 0 AND v_debit > v_remaining THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', format('exceeds unlocked budget (remaining %s)', v_remaining),
        'remaining_unlocked', v_remaining,
        'debited', 0,
        'funding_source', v_funding,
        'wallet_id', w.id
      );
    END IF;
  END IF;

  IF NOT w.allow_negative AND v_debit > w.balance THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', format('insufficient balance (have %s, need %s)', w.balance, v_debit),
      'remaining_unlocked', v_remaining,
      'debited', 0,
      'funding_source', v_funding,
      'wallet_id', w.id
    );
  END IF;

  INSERT INTO public.wallet_allocations (
    wallet_id, counselor_id, client_id, lead_id, offer_id,
    amount, currency, percent, status, created_by, applied_at
  ) VALUES (
    w.id, v_uid, _client_id, _lead_id, _offer_id,
    v_debit, w.currency, _percent, 'applied', v_uid, now()
  )
  RETURNING id INTO v_alloc_id;

  IF _offer_id IS NOT NULL AND _client_id IS NOT NULL THEN
    PERFORM public.log_offer_event(
      _offer_id, _client_id, v_uid, 'redeemed', 'give_discount', v_discount, NULL
    );
  END IF;

  v_remaining := v_remaining - v_debit;

  RETURN jsonb_build_object(
    'ok', true,
    'allocation_id', v_alloc_id,
    'debited', v_debit,
    'discount_value', v_discount,
    'funding_source', v_funding,
    'remaining_unlocked', GREATEST(v_remaining, 0),
    'wallet_balance', (SELECT balance FROM public.discount_wallets WHERE id = w.id),
    'wallet_id', w.id,
    'wallet_name', w.name,
    'budget_kind', w.budget_kind
  );
END;
$$;

-- Counsellor wallet list for UI
CREATE OR REPLACE FUNCTION public.fn_counselor_wallets_for_period(
  _period_key text DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL
)
RETURNS SETOF public.discount_wallets
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dw.*
    FROM public.discount_wallets dw
   WHERE dw.counselor_id = auth.uid()
     AND dw.period_key = _period_key
     AND dw.closed_at IS NULL
     AND (
       (_client_id IS NULL AND _lead_id IS NULL)
       OR public.fn_wallet_scope_matches(dw, _client_id, _lead_id)
     )
   ORDER BY
     CASE dw.budget_kind WHEN 'month_to_month' THEN 1 ELSE 0 END,
     dw.updated_at DESC;
$$;

COMMENT ON FUNCTION public.fn_wallet_scope_matches(public.discount_wallets, uuid, uuid) IS
  'Sprint 5: ring-fence check using wallet scope tags vs client/lead country and services.';
COMMENT ON FUNCTION public.fn_pick_discount_wallet(uuid, text, uuid, uuid, uuid, numeric) IS
  'Sprint 5: select wallet per spend_order and scope match.';
COMMENT ON FUNCTION public.fn_counselor_can_use_offer_type(text, uuid) IS
  'Sprint 5: blocks counsellors from waiver/scholarship offer types unless admin/manager.';
