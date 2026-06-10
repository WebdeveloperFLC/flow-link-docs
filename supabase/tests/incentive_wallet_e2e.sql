-- Incentive wallet E2E validation (run in Supabase SQL editor on a TEST branch only)
-- Mirrors src/incentives/lib/walletEngineE2E.test.ts seeded scenario.
-- DO NOT run on production without rollback plan.

-- Quick assertion helpers (raise on failure)
CREATE OR REPLACE FUNCTION _e2e_assert(_label text, _cond boolean, _detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT _cond THEN
    RAISE EXCEPTION 'E2E FAIL [%]: %', _label, _detail;
  END IF;
  RAISE NOTICE 'E2E PASS [%]: %', _label, _detail;
END;
$$;

-- Example spot-checks against live RPCs (adjust IDs to test counsellor):
-- SELECT * FROM fn_counselor_period_achievement('2026-06');
-- SELECT * FROM fn_size_wallets_for_period('2026-06');
-- SELECT fn_apply_offer_discount(...);
-- SELECT fn_period_close_and_reseed('2026-06');

COMMENT ON FUNCTION _e2e_assert(text, boolean, text) IS
  'Dev-only assertion helper for incentive wallet E2E SQL checks.';
