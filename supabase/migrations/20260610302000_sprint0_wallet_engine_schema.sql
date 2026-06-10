-- Sprint 0: Counsellor wallet tables (exported from types.ts — previously dashboard-only)

CREATE TABLE IF NOT EXISTS public.discount_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  period_key text NOT NULL,
  name text,
  currency text NOT NULL DEFAULT 'INR',
  balance numeric NOT NULL DEFAULT 0,
  budget_kind public.wallet_budget_kind NOT NULL DEFAULT 'month_to_month',
  max_percent_per_client numeric NOT NULL DEFAULT 10,
  max_amount_per_client numeric,
  rollover_policy public.wallet_rollover_policy NOT NULL DEFAULT 'expire',
  rollover_cap numeric,
  allow_negative boolean NOT NULL DEFAULT false,
  scope_country_tag text,
  scope_service_code text,
  scope_master_key text,
  scope_sub_category text,
  valid_from date,
  valid_to date,
  carry_to_period text,
  carried_to_wallet uuid REFERENCES public.discount_wallets(id) ON DELETE SET NULL,
  closed_at timestamptz,
  close_outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_wallets_period_counselor
  ON public.discount_wallets (period_key, counselor_id);

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.discount_wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  topup_type text NOT NULL DEFAULT 'base',
  rollover_policy public.wallet_rollover_policy NOT NULL DEFAULT 'expire',
  rollover_cap numeric,
  scheme_id uuid REFERENCES public.incentive_schemes(id) ON DELETE SET NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.discount_wallets(id) ON DELETE RESTRICT,
  counselor_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  client_offer_id uuid REFERENCES public.client_offers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  percent numeric,
  applies_service_code text,
  status public.wallet_alloc_status NOT NULL DEFAULT 'applied',
  exceeded_cap boolean NOT NULL DEFAULT false,
  approved_by uuid,
  created_by uuid,
  applied_at timestamptz,
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_allocations_wallet
  ON public.wallet_allocations (wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_allocations_counselor
  ON public.wallet_allocations (counselor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_allocations_invoice
  ON public.wallet_allocations (invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.discount_wallets(id) ON DELETE CASCADE,
  entry_type text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  balance_after numeric,
  ref_allocation_id uuid,
  ref_topup_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_ledger_ref_allocation_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_ledger
      ADD CONSTRAINT wallet_ledger_ref_allocation_id_fkey
      FOREIGN KEY (ref_allocation_id) REFERENCES public.wallet_allocations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_ledger_ref_topup_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_ledger
      ADD CONSTRAINT wallet_ledger_ref_topup_id_fkey
      FOREIGN KEY (ref_topup_id) REFERENCES public.wallet_topups(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_topup_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  role_key text,
  scope_type text NOT NULL DEFAULT 'global',
  currency text NOT NULL DEFAULT 'INR',
  min_achievement_pct numeric NOT NULL DEFAULT 0,
  max_achievement_pct numeric,
  topup_amount numeric NOT NULL DEFAULT 0,
  rollover_policy public.wallet_rollover_policy NOT NULL DEFAULT 'expire',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_settings (
  id int PRIMARY KEY DEFAULT 1,
  grace_days int NOT NULL DEFAULT 30,
  grace_unit text NOT NULL DEFAULT 'days',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_settings_singleton CHECK (id = 1)
);

INSERT INTO public.wallet_settings (id, grace_days, grace_unit)
VALUES (1, 30, 'days')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_discount_wallets_touch'
  ) THEN
    CREATE TRIGGER trg_discount_wallets_touch
      BEFORE UPDATE ON public.discount_wallets
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

ALTER TABLE public.discount_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topup_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_settings ENABLE ROW LEVEL SECURITY;
