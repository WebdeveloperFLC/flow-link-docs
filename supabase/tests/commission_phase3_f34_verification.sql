-- Phase 3 F3.4 verification suite (run after Step 0 + F3.4 migrations)
-- Usage: Supabase SQL Editor, or psql "$DATABASE_URL" -f supabase/tests/commission_phase3_f34_verification.sql

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- V0 — Step 0 config present
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'upi_commission_config') THEN
    RAISE EXCEPTION 'V0 FAIL: upi_commission_config missing — apply 20261030120000_commission_phase3_step0_config.sql';
  END IF;
  IF NOT public.commission_config_bool('approval_required', true) IS FALSE THEN
    RAISE EXCEPTION 'V0 FAIL: approval_required should be false';
  END IF;
  RAISE NOTICE 'V0 PASS: Step 0 config table and approval_required=false';
END $$;

-- ---------------------------------------------------------------------------
-- V1 — Policies use can_view/can_manage_commission_financial (sample)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count int;
BEGIN
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
  RAISE NOTICE 'V1 PASS: F3.4 policy helpers on upi_commission_students';
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
      'upi_commission_receipts', 'upi_billing_profiles',
      'upi_commission_transfer_events', 'upi_commission_remittance_batches'
    )
    AND pol.polcmd = '*'
    AND pg_get_expr(pol.polqual, pol.polrelid) LIKE '%can_view_upi_confidential%'
    AND pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%can_view_upi_confidential%';
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'V2 FAIL: % financial tables still use FOR ALL + can_view only', v_bad;
  END IF;
  RAISE NOTICE 'V2 PASS: no permissive FOR ALL + can_view on key receipt tables';
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
  RAISE NOTICE 'V3 PASS: F3.4 scope helper functions present';
END $$;

-- ---------------------------------------------------------------------------
-- V4 — Counselor view readable (structure)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.v_client_commission_status') IS NULL THEN
    RAISE EXCEPTION 'V4 FAIL: v_client_commission_status missing';
  END IF;
  RAISE NOTICE 'V4 PASS: v_client_commission_status exists';
END $$;

-- ---------------------------------------------------------------------------
-- V5 — Policy inventory count (expect split policies on financial tables)
-- ---------------------------------------------------------------------------
SELECT c.relname AS table_name, count(*) AS policy_count
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'upi_commission_students', 'upi_commission_invoices', 'upi_claim_cycles',
    'upi_invoice_line_items', 'upi_billing_profiles', 'upi_commission_eligibility_configs',
    'upi_commission_snapshots', 'upi_commission_transfer_events',
    'upi_commission_remittance_batches', 'upi_commission_receipts',
    'upi_commission_receipt_invoice_allocations',
    'upi_commission_receipt_student_allocations',
    'upi_commission_receipt_attachments',
    'upi_commission_aggregator_invoices', 'upi_commission_aggregator_invoice_lines'
  )
GROUP BY c.relname
ORDER BY c.relname;
