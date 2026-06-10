-- Slab commission tiers and time-limited application fee waiver on partnership routes.

ALTER TABLE public.upi_partnership_routes
  ADD COLUMN IF NOT EXISTS commission_slabs jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS application_fee_waiver boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS application_fee_waiver_from date,
  ADD COLUMN IF NOT EXISTS application_fee_waiver_to date;

COMMENT ON COLUMN public.upi_partnership_routes.commission_slabs IS
  'Volume tiers: [{min_students, max_students|null, amount}] when commission_model = slab';

-- Disable fee waivers whose end date has passed (safe to call on load / cron).
CREATE OR REPLACE FUNCTION public.expire_upi_route_fee_waivers()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.upi_partnership_routes
  SET application_fee_waiver = false,
      updated_at = now()
  WHERE application_fee_waiver = true
    AND application_fee_waiver_to IS NOT NULL
    AND application_fee_waiver_to < current_date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
