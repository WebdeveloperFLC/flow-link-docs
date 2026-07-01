-- Phase 3 F3.4 verification suite (Supabase SQL Editor compatible — no psql meta-commands)
-- Run after Step 0 + F3.4 migrations are published.
-- Success: all rows in the final summary show status = 'PASS'. Any FAIL raises an exception above.

-- ---------------------------------------------------------------------------
-- V0 — Step 0 config present
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'upi_commission_config'
  ) THEN
    RAISE EXCEPTION 'V0 FAIL: upi_commission_config missing — apply 20261030120000_commission_phase3_step0_config.sql';
  END IF;
  IF NOT public.commission_config_bool('approval_required', true) IS FALSE THEN
    RAISE EXCEPTION 'V0 FAIL: approval_required should be false';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- V1 — Policies use can_view/can_manage_commission_financial (sample)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count int;
BEGIN
  IF to_regclass('public.upi_commission_students') IS NULL THEN
    RAISE EXCEPTION 'V1 FAIL: upi_commission_students table missing';
  END IF;
  SELECT count(*) INTO v_count
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'upi_commission_students'
    AND (
      pg_get_expr(pol.polqual, pol.polrelid) LIKE '%can_view_commission_financial%'
      OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%can_manage_commission_financial%'
    );
  IF v_count < 2 THEN
    RAISE EXCEPTION 'V1 FAIL: upi_commission_students policies missing F3.4 helpers (found %)', v_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- V2 — No FOR ALL policies on financial tables (view-only write gap closed)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      SELECT tname FROM unnest(ARRAY[
        'upi_commission_receipts', 'upi_billing_profiles',
        'upi_commission_transfer_events', 'upi_commission_remittance_batches'
      ]) AS tname
      WHERE to_regclass(format('public.%s', tname)) IS NOT NULL
    )
    AND pol.polcmd = '*'
    AND pg_get_expr(pol.polqual, pol.polrelid) LIKE '%can_view_upi_confidential%'
    AND pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%can_view_upi_confidential%';
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'V2 FAIL: % policies still use FOR ALL + can_view only', v_bad;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- V3 — Helper functions exist
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.can_view_commission_financial(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'V3 FAIL: can_view_commission_financial missing';
  END IF;
  IF to_regprocedure('public.can_manage_commission_financial(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'V3 FAIL: can_manage_commission_financial missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- V4 — Counselor view exists
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.v_client_commission_status') IS NULL THEN
    RAISE EXCEPTION 'V4 FAIL: v_client_commission_status missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Summary (visible in SQL Editor results grid)
-- ---------------------------------------------------------------------------
SELECT * FROM (
  VALUES
    ('V0', 'Step 0 config + approval_required=false', 'PASS'),
    ('V1', 'F3.4 helpers on upi_commission_students', 'PASS'),
    ('V2', 'No FOR ALL + can_view on receipt tables', 'PASS'),
    ('V3', 'can_view/can_manage_commission_financial functions', 'PASS'),
    ('V4', 'v_client_commission_status exists', 'PASS')
) AS t(check_id, description, status)
ORDER BY check_id;

-- ---------------------------------------------------------------------------
-- V5 — Policy inventory (existing financial tables only)
-- ---------------------------------------------------------------------------
SELECT c.relname AS table_name, count(*) AS policy_count
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL (
  SELECT unnest(ARRAY[
    'upi_commission_students', 'upi_commission_invoices', 'upi_claim_cycles',
    'upi_invoice_line_items', 'upi_billing_profiles', 'upi_commission_eligibility_configs',
    'upi_commission_snapshots', 'upi_commission_transfer_events',
    'upi_commission_remittance_batches', 'upi_commission_receipts',
    'upi_commission_receipt_invoice_allocations',
    'upi_commission_receipt_student_allocations',
    'upi_commission_receipt_attachments',
    'upi_commission_aggregator_invoices', 'upi_commission_aggregator_invoice_lines'
  ]) AS tname
) names
WHERE n.nspname = 'public'
  AND c.relname = names.tname
  AND to_regclass(format('public.%s', names.tname)) IS NOT NULL
GROUP BY c.relname
ORDER BY c.relname;
