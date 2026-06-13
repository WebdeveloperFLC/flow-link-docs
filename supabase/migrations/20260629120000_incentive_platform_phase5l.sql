-- Phase 5L (part 1) — enum value must commit before use in part 2

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'wallet_budget_kind' AND e.enumlabel = 'branch_pool'
  ) THEN
    ALTER TYPE public.wallet_budget_kind ADD VALUE 'branch_pool';
  END IF;
END $$;

ALTER TABLE public.incentive_branch_contests
  ADD COLUMN IF NOT EXISTS prize_settlement text NOT NULL DEFAULT 'cash'
    CHECK (prize_settlement IN ('cash', 'wallet_topup'));

COMMENT ON COLUMN public.incentive_branch_contests.prize_settlement IS
  'Phase 5L — cash adds incentive line; wallet_topup credits counselor discount wallet on calculate';
