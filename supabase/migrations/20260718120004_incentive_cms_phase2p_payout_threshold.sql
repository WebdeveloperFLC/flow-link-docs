-- CMS Phase 2P — Incentive plan payout threshold columns (§5.5)
-- Spec: docs/guides/FLC_CMS_Cursor_Package/01_Build_Guide/FLC_CMS_Transformation_Brief.md §5.5

ALTER TABLE public.incentive_plans
  ADD COLUMN IF NOT EXISTS min_payout_threshold numeric,
  ADD COLUMN IF NOT EXISTS carry_below_threshold boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.incentive_plans.min_payout_threshold IS
  'Minimum earned amount before a payout row is generated; null = no threshold.';
COMMENT ON COLUMN public.incentive_plans.carry_below_threshold IS
  'When true, sub-threshold earnings carry to the next payout cycle instead of paying out.';
