-- Prevent duplicate incentive runs for the same plan + period + branch scope.
-- Keeps the newest row when historical duplicates exist.

DELETE FROM public.incentive_runs a
USING public.incentive_runs b
WHERE a.plan_id = b.plan_id
  AND a.period_key = b.period_key
  AND a.branch_id IS NOT DISTINCT FROM b.branch_id
  AND a.id <> b.id
  AND coalesce(a.calculated_at, a.created_at) < coalesce(b.calculated_at, b.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_incentive_runs_plan_period_branch
  ON public.incentive_runs (plan_id, period_key, branch_id)
  NULLS NOT DISTINCT;
