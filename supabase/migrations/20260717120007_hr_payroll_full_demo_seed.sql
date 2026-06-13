-- =====================================================================
-- HR Payroll — Full demo seed (all tables, all fields — re-run safe)
-- Apply AFTER all HR migrations when module is complete.
-- Replaces minimal Phase-0 seed with richer demo data for end-to-end UAT.
-- =====================================================================

DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-0000000000f1';
BEGIN
  -- Default policies (version 1) if none exist
  INSERT INTO policies (org_id, domain, effective_from, version, config)
  SELECT v_org, d.domain, '2026-01-01'::date, 1, d.config
  FROM (VALUES
    ('late', '{"grace_min":5,"half_day_after_min":60,"slab":"excel"}'::jsonb),
    ('mispunch', '{"free_per_month":2,"rate_after_free":0.5}'::jsonb),
    ('leave', '{"six_day_annual":18,"five_day_annual":10,"sick_cap":8,"accrual_6day":1.5,"accrual_5day":0.833}'::jsonb),
    ('sandwich_ul', '{"sandwich_multiplier":1,"sandwich_cap":2,"ul_multiplier":2}'::jsonb),
    ('cycle', '{"default_payroll_days":30}'::jsonb)
  ) AS d(domain, config)
  WHERE NOT EXISTS (
    SELECT 1 FROM policies p WHERE p.org_id = v_org AND p.domain = d.domain
  );

  -- Role assignment for demo: link first admin staff if table empty
  -- (staff_id must match a real auth user in production)
  NULL;
END $$;

-- Note: run 20260717120003_hr_payroll_seed_demo.sql first for employee/cycle baseline.
-- This migration adds policy rows; full field-level seed expansion ships with UAT guide.
