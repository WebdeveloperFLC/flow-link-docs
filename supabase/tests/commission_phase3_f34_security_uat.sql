-- Phase 3 F3.4 — Security-model regression (Supabase SQL Editor)
-- Run after commission_phase3_f34_verification.sql passes.
-- Covers RLS-relevant checks from Phase 1 + 2A UAT without UI login.

-- ---------------------------------------------------------------------------
-- S1 — PF-2: Phase 1 core objects exist
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  missing text[] := '{}';
  required text[] := ARRAY[
    'upi_billing_profiles', 'upi_commission_eligibility_configs',
    'upi_commission_hold_reasons', 'upi_commission_periods',
    'upi_commission_transfer_events'
  ];
BEGIN
  FOREACH t IN ARRAY required LOOP
    IF to_regclass(format('public.%s', t)) IS NULL THEN
      missing := array_append(missing, t);
    END IF;
  END LOOP;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'S1 FAIL: missing Phase 1 tables: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S2 — G-3 / 2A counselor pass: view exposes no amount columns
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  forbidden text[] := ARRAY[
    'commission_amount', 'expected_amount', 'amount_received', 'amount_outstanding',
    'tuition_amount', 'line_amount', 'subtotal', 'total_amount'
  ];
  bad text;
BEGIN
  IF to_regclass('public.v_client_commission_status') IS NULL THEN
    RAISE EXCEPTION 'S2 FAIL: v_client_commission_status missing';
  END IF;
  SELECT a.attname INTO bad
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'v_client_commission_status'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname = ANY (forbidden)
  LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'S2 FAIL: counselor view exposes forbidden column %', bad;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S3 — G-2: snapshot immutability trigger
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.upi_commission_snapshots') IS NULL THEN
    RAISE EXCEPTION 'S3 FAIL: upi_commission_snapshots missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_block_snapshot_update'
      AND tgrelid = 'public.upi_commission_snapshots'::regclass
  ) THEN
    RAISE EXCEPTION 'S3 FAIL: trg_block_snapshot_update missing on snapshots';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S4 — 2A-20: posted receipt edit blocked
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.upi_commission_receipts') IS NULL THEN
    RAISE EXCEPTION 'S4 FAIL: upi_commission_receipts missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_block_receipt_edit'
      AND tgrelid = 'public.upi_commission_receipts'::regclass
  ) THEN
    RAISE EXCEPTION 'S4 FAIL: trg_block_receipt_edit missing on receipts';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S5 — 2A RPCs exist (post / void)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.fn_post_commission_receipt(uuid)') IS NULL THEN
    RAISE EXCEPTION 'S5 FAIL: fn_post_commission_receipt missing';
  END IF;
  IF to_regprocedure('public.fn_void_commission_receipt(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'S5 FAIL: fn_void_commission_receipt missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S6 — F3.4: view-only path cannot use manage helper at institution scope
--     (logic check — no real user UUID required)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF public.can_manage_commission_financial('00000000-0000-0000-0000-000000000000'::uuid, NULL) THEN
    RAISE EXCEPTION 'S6 FAIL: anonymous UUID must not manage commission rows';
  END IF;
  IF public.can_view_commission_financial('00000000-0000-0000-0000-000000000000'::uuid, NULL) THEN
    RAISE EXCEPTION 'S6 FAIL: anonymous UUID must not view commission rows';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
SELECT * FROM (
  VALUES
    ('S1', 'Phase 1 core tables exist (PF-2)', 'PASS'),
    ('S2', 'Counselor view hides amounts (G-3 / 2A-12)', 'PASS'),
    ('S3', 'Snapshot immutability trigger (G-2)', 'PASS'),
    ('S4', 'Posted receipt edit guard (2A-20)', 'PASS'),
    ('S5', 'Receipt post/void RPCs exist (2A-1..16)', 'PASS'),
    ('S6', 'Anonymous UUID denied view/manage (F3.4)', 'PASS')
) AS t(check_id, description, status)
ORDER BY check_id;
