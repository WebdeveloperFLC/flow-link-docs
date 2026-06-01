-- ============================================================
-- Offers Module — offers-expiry-tick (server-side expiry)
--
-- Daily pg_cron job. Flips client_offers.status from 'active' to
-- 'expired' for claims whose parent offer's valid_to has passed.
--
-- Pure SQL — no edge function. The cron runs an UPDATE directly.
--
-- SAFE BY DESIGN:
--   * Targets ONLY status='active'. 'used' and already-'expired' rows
--     are untouched (no accidental expiry of redeemed offers).
--   * Writes only client_offers.status. No financial/invoice/payment
--     table, no offers table mutation, no totals.
--   * Mirrors the existing offers-lifecycle-tick idempotent cron pattern.
--
-- Note: this UPDATE flips status to 'expired'. The Phase-1 trigger
-- fn_increment_redemption_count only reacts to transitions INTO/OUT OF
-- 'used' — an active->expired flip does NOT touch redemption_count.
--
-- Schedule: 05:30 UTC daily ('30 5 * * *') — before the 06:00 birthday tick.
--
-- Rollback:
--   SELECT cron.unschedule('offers-expiry-tick');
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: unschedule first if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'offers-expiry-tick') THEN
    PERFORM cron.unschedule('offers-expiry-tick');
  END IF;
END $$;

SELECT cron.schedule(
  'offers-expiry-tick',
  '30 5 * * *',
  $cron$
    UPDATE public.client_offers co
    SET status = 'expired'
    FROM public.offers o
    WHERE co.offer_id = o.id
      AND co.status = 'active'
      AND o.valid_to IS NOT NULL
      AND o.valid_to < now();
  $cron$
);