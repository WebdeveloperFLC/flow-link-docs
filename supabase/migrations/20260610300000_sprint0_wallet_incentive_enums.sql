-- Sprint 0: Wallet & incentive enums (exported from live schema / types.ts)
-- Idempotent: safe on fresh installs and environments where Lovable already created these.

DO $$ BEGIN
  CREATE TYPE public.wallet_alloc_status AS ENUM ('reserved', 'applied', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_budget_kind AS ENUM ('month_to_month', 'festive', 'scoped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_rollover_policy AS ENUM ('expire', 'partial', 'full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.incentive_period_type AS ENUM ('monthly', 'quarterly', 'half_yearly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.incentive_rate_type AS ENUM ('flat', 'per_unit', 'percent', 'slab');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.incentive_run_status AS ENUM ('draft', 'calculated', 'submitted', 'approved', 'paid', 'void');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.incentive_source_type AS ENUM (
    'service_revenue',
    'ancillary',
    'direct_visa_commission',
    'b2b_admission_commission'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'processed', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
