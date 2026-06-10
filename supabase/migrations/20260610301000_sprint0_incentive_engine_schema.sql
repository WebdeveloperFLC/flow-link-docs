-- Sprint 0: Incentive engine tables (exported from types.ts — previously dashboard-only)

CREATE TABLE IF NOT EXISTS public.incentive_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  period_type public.incentive_period_type NOT NULL DEFAULT 'monthly',
  settlement_currency text NOT NULL DEFAULT 'INR',
  revenue_basis text NOT NULL DEFAULT 'net',
  scope_type text NOT NULL DEFAULT 'org',
  role_key text,
  is_active boolean NOT NULL DEFAULT true,
  active_from date NOT NULL DEFAULT CURRENT_DATE,
  active_to date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incentive_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scheme_type text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  source_type public.incentive_source_type,
  rate_type public.incentive_rate_type,
  rate_value numeric,
  currency text NOT NULL DEFAULT 'INR',
  scope_type text NOT NULL DEFAULT 'org',
  role_key text,
  service_filter text,
  is_active boolean NOT NULL DEFAULT true,
  active_from date NOT NULL,
  active_to date NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incentive_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.incentive_plans(id) ON DELETE CASCADE,
  source_type public.incentive_source_type NOT NULL,
  metric text NOT NULL DEFAULT 'revenue',
  min_threshold numeric NOT NULL DEFAULT 0,
  max_threshold numeric,
  rate_type public.incentive_rate_type NOT NULL,
  rate_value numeric NOT NULL DEFAULT 0,
  service_filter text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incentive_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.incentive_plans(id) ON DELETE SET NULL,
  period_key text NOT NULL,
  period_type public.incentive_period_type NOT NULL DEFAULT 'monthly',
  target_metric text NOT NULL DEFAULT 'revenue',
  target_value numeric NOT NULL DEFAULT 0,
  target_currency text NOT NULL DEFAULT 'INR',
  bonus_trigger_pct numeric,
  bonus_rate_type public.incentive_rate_type,
  bonus_value numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_targets_period_counselor
  ON public.incentive_targets (period_key, counselor_id);

CREATE TABLE IF NOT EXISTS public.incentive_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.incentive_plans(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  period_key text NOT NULL,
  period_type public.incentive_period_type NOT NULL DEFAULT 'monthly',
  settlement_currency text NOT NULL DEFAULT 'INR',
  status public.incentive_run_status NOT NULL DEFAULT 'draft',
  total_settlement numeric NOT NULL DEFAULT 0,
  fx_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked boolean NOT NULL DEFAULT false,
  calculated_at timestamptz,
  calculated_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_runs_period
  ON public.incentive_runs (period_key, plan_id);

CREATE TABLE IF NOT EXISTS public.incentive_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.incentive_runs(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL,
  source_type public.incentive_source_type NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  slab_id uuid REFERENCES public.incentive_slabs(id) ON DELETE SET NULL,
  source_payment_id uuid,
  source_invoice_id uuid,
  source_commission_id uuid,
  base_amount numeric NOT NULL DEFAULT 0,
  base_currency text NOT NULL DEFAULT 'INR',
  fx_rate_used numeric,
  earned_amount numeric NOT NULL DEFAULT 0,
  settlement_currency text NOT NULL DEFAULT 'INR',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_line_items_run_counselor
  ON public.incentive_line_items (run_id, counselor_id);

CREATE TABLE IF NOT EXISTS public.incentive_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.incentive_runs(id) ON DELETE SET NULL,
  counselor_id uuid NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  tds_amount numeric NOT NULL DEFAULT 0,
  tds_percent numeric NOT NULL DEFAULT 0,
  settlement_currency text NOT NULL DEFAULT 'INR',
  status public.payout_status NOT NULL DEFAULT 'pending',
  notes text,
  accounting_ap_bill_id uuid,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incentive_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.incentive_runs(id) ON DELETE SET NULL,
  counselor_id uuid NOT NULL,
  adjustment_type text NOT NULL DEFAULT 'manual',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  reason text NOT NULL,
  source_payment_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incentive_plans_touch'
  ) THEN
    CREATE TRIGGER trg_incentive_plans_touch
      BEFORE UPDATE ON public.incentive_plans
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incentive_runs_touch'
  ) THEN
    CREATE TRIGGER trg_incentive_runs_touch
      BEFORE UPDATE ON public.incentive_runs
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incentive_payouts_touch'
  ) THEN
    CREATE TRIGGER trg_incentive_payouts_touch
      BEFORE UPDATE ON public.incentive_payouts
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

ALTER TABLE public.incentive_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_adjustments ENABLE ROW LEVEL SECURITY;
