-- =====================================================================
-- HR Payroll — Full demo seed (all tables / fields — idempotent enrich)
-- Apply AFTER 20260717120003_hr_payroll_seed_demo.sql (+ migrations 05–08).
-- Safe to re-run: upserts and skips existing rows; does not truncate.
-- =====================================================================

DO $$
DECLARE
  v_org   uuid := '00000000-0000-0000-0000-0000000000f1';
  v_cycle uuid;
  v_isha  uuid; v_karan uuid; v_priya uuid; v_sneha uuid; v_imran uuid;
  v_lv_isha uuid; v_lv_karan uuid; v_lv_priya uuid;
  v_co_karan uuid; v_co_imran uuid;
  v_admin uuid;
BEGIN
  -- ---- resolve demo entities (requires baseline seed) ----
  SELECT id INTO v_isha  FROM employees WHERE org_id = v_org AND emp_code = 'FL-1042';
  SELECT id INTO v_karan FROM employees WHERE org_id = v_org AND emp_code = 'FL-1043';
  SELECT id INTO v_priya FROM employees WHERE org_id = v_org AND emp_code = 'FL-1044';
  SELECT id INTO v_sneha FROM employees WHERE org_id = v_org AND emp_code = 'FL-1046';
  SELECT id INTO v_imran FROM employees WHERE org_id = v_org AND emp_code = 'FL-1047';

  IF v_isha IS NULL THEN
    RAISE NOTICE 'HR full seed skipped — run 20260717120003_hr_payroll_seed_demo.sql first';
    RETURN;
  END IF;

  SELECT id INTO v_cycle FROM payroll_cycles
  WHERE org_id = v_org AND start_date = '2026-05-26' AND end_date = '2026-06-25'
  ORDER BY created_at DESC LIMIT 1;

  -- ---- policies (version 1) ----
  INSERT INTO policies (org_id, domain, effective_from, version, config)
  SELECT v_org, d.domain, '2026-01-01'::date, 1, d.config
  FROM (VALUES
    ('late', '{"grace_min":5,"half_day_after_min":60,"slab":"excel"}'::jsonb),
    ('mispunch', '{"free_per_month":2,"rate_after_free":0.5}'::jsonb),
    ('leave', '{"six_day_annual":18,"five_day_annual":10,"sick_cap":8,"accrual_6day":1.5,"accrual_5day":0.833}'::jsonb),
    ('sandwich_ul', '{"sandwich_multiplier":1,"sandwich_cap":2,"ul_multiplier":2}'::jsonb),
    ('cycle', '{"default_payroll_days":30}'::jsonb)
  ) AS d(domain, config)
  ON CONFLICT (org_id, domain, version) DO NOTHING;

  -- ---- employee profile enrichment (all fields) ----
  UPDATE employees SET
    addr_current = '12 Alkapuri, Vadodara', addr_permanent = '12 Alkapuri, Vadodara',
    emergency = 'Ramesh S · +91 99999 00011', annual_entitlement = 18,
    reporting_mgr_id = NULL
  WHERE id = v_isha;

  UPDATE employees SET
    addr_current = 'Satellite, Ahmedabad', addr_permanent = 'Satellite, Ahmedabad',
    emergency = 'Meena J · +91 98888 77665', annual_entitlement = 18,
    reporting_mgr_id = v_imran,
    bank_holder_name = 'Karan Joshi', bank_name = 'ICICI Bank',
    bank_account_number = '601234567890', bank_ifsc = 'ICIC0006012',
    bank_branch = 'Satellite, Ahmedabad', bank_account_type = 'Savings', bank_verified = true
  WHERE id = v_karan;

  UPDATE employees SET
    addr_current = 'Race Course, Vadodara', addr_permanent = 'Race Course, Vadodara',
    emergency = 'Amit S · +91 97777 66554', annual_entitlement = 18,
    reporting_mgr_id = v_imran,
    bank_holder_name = 'Priya Sharma', bank_name = 'Axis Bank',
    bank_account_number = '912345678901', bank_ifsc = 'UTIB0000123',
    bank_branch = 'Race Course, Vadodara', bank_account_type = 'Savings', bank_verified = true
  WHERE id = v_priya;

  UPDATE employees SET
    addr_current = 'Adajan, Surat', addr_permanent = 'Adajan, Surat',
    emergency = 'Kiran P · +91 96666 55443', annual_entitlement = 10,
    reporting_mgr_id = v_priya,
    bank_holder_name = 'Sneha Patel', bank_name = 'SBI',
    bank_account_number = '30123456789', bank_ifsc = 'SBIN0003456',
    bank_branch = 'Adajan, Surat', bank_account_type = 'Savings', bank_verified = false
  WHERE id = v_sneha;

  UPDATE employees SET
    addr_current = 'Navrangpura, Ahmedabad', addr_permanent = 'Navrangpura, Ahmedabad',
    emergency = 'Salma S · +91 95555 44332', annual_entitlement = 18,
    reporting_mgr_id = NULL,
    bank_holder_name = 'Imran Shaikh', bank_name = 'HDFC Bank',
    bank_account_number = '502345678901', bank_ifsc = 'HDFC0006011',
    bank_branch = 'Navrangpura, Ahmedabad', bank_account_type = 'Savings', bank_verified = true
  WHERE id = v_imran;

  -- ---- documents (metadata) ----
  INSERT INTO employee_documents (org_id, employee_id, doc_type, file_name, mime)
  SELECT v_org, v_isha, 'Appointment Letter', 'appointment_isha.pdf', 'application/pdf'
  WHERE NOT EXISTS (
    SELECT 1 FROM employee_documents WHERE employee_id = v_isha AND doc_type = 'Appointment Letter'
  );
  INSERT INTO employee_documents (org_id, employee_id, doc_type, file_name, mime)
  SELECT v_org, v_karan, 'Resume', 'resume_karan.pdf', 'application/pdf'
  WHERE NOT EXISTS (
    SELECT 1 FROM employee_documents WHERE employee_id = v_karan AND doc_type = 'Resume'
  );
  INSERT INTO employee_documents (org_id, employee_id, doc_type, file_name, mime)
  SELECT v_org, v_sneha, 'Aadhaar Card', 'aadhaar_sneha.jpg', 'image/jpeg'
  WHERE NOT EXISTS (
    SELECT 1 FROM employee_documents WHERE employee_id = v_sneha AND doc_type = 'Aadhaar Card'
  );
  INSERT INTO employee_documents (org_id, employee_id, doc_type, file_name, mime)
  SELECT v_org, v_imran, 'Appointment Letter', 'appointment_imran.pdf', 'application/pdf'
  WHERE NOT EXISTS (
    SELECT 1 FROM employee_documents WHERE employee_id = v_imran AND doc_type = 'Appointment Letter'
  );

  -- ---- attendance gaps (prototype Jun 5–12 window) ----
  INSERT INTO attendance (org_id, employee_id, work_date, check_in, check_out, break_min, status, is_mispunch, source)
  VALUES
    (v_org, v_priya, '2026-06-05', '10:30', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_priya, '2026-06-06', '10:25', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_priya, '2026-06-07', NULL, NULL, NULL, 'Week Off', false, 'manual'),
    (v_org, v_priya, '2026-06-08', '10:40', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_priya, '2026-06-09', '10:35', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_imran, '2026-06-05', '10:00', '19:30', 45, 'Present', false, 'manual'),
    (v_org, v_imran, '2026-06-06', '10:00', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_imran, '2026-06-07', NULL, NULL, NULL, 'Week Off', false, 'manual'),
    (v_org, v_imran, '2026-06-08', '10:00', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_imran, '2026-06-09', NULL, NULL, NULL, 'Leave', false, 'manual'),
    (v_org, v_imran, '2026-06-10', NULL, NULL, NULL, 'Leave', false, 'manual'),
    (v_org, v_imran, '2026-06-11', '10:00', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_imran, '2026-06-12', '10:00', '19:00', 45, 'Present', false, 'manual'),
    (v_org, v_sneha, '2026-06-05', '10:01', '18:00', 30, 'Present', false, 'manual'),
    (v_org, v_sneha, '2026-06-06', NULL, NULL, NULL, 'Week Off', false, 'manual'),
    (v_org, v_sneha, '2026-06-07', NULL, NULL, NULL, 'Week Off', false, 'manual'),
    (v_org, v_sneha, '2026-06-12', '10:00', '18:00', 30, 'Present', false, 'manual')
  ON CONFLICT (employee_id, work_date) DO NOTHING;

  -- ---- leave status align with prototype (keep TV02 anchor: Leave day + paid add-back net zero) ----
  UPDATE attendance SET status = 'Leave', check_in = NULL, check_out = NULL,
    break_start = NULL, break_end = NULL, break_min = NULL, is_mispunch = false
  WHERE employee_id = v_isha AND work_date = '2026-06-09';

  UPDATE leave_requests SET status = 'Approved'
  WHERE org_id = v_org AND employee_id = v_isha
    AND from_date = '2026-06-09' AND type = 'Annual Leave';

  -- ---- sandwich flag on Imran leave (demo) ----
  UPDATE leave_requests SET is_sandwich = true
  WHERE org_id = v_org AND employee_id = v_imran
    AND from_date = '2026-06-09';

  -- ---- approval trail ----
  SELECT id INTO v_lv_isha FROM leave_requests
  WHERE employee_id = v_isha AND from_date = '2026-06-09' LIMIT 1;
  SELECT id INTO v_lv_karan FROM leave_requests
  WHERE employee_id = v_karan AND from_date = '2026-06-09' LIMIT 1;
  SELECT id INTO v_lv_priya FROM leave_requests
  WHERE employee_id = v_priya AND from_date = '2026-06-12' LIMIT 1;
  SELECT id INTO v_co_karan FROM compoff_requests
  WHERE employee_id = v_karan AND worked_date = '2026-06-08' LIMIT 1;
  SELECT id INTO v_co_imran FROM compoff_requests
  WHERE employee_id = v_imran AND worked_date = '2026-06-02' LIMIT 1;

  IF v_lv_isha IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM approvals WHERE entity_type = 'leave' AND entity_id = v_lv_isha
  ) THEN
    INSERT INTO approvals (org_id, entity_type, entity_id, stage, decision, acted_at, comment) VALUES
      (v_org, 'leave', v_lv_isha, 'Manager', 'Approved', now() - interval '2 days', 'OK'),
      (v_org, 'leave', v_lv_isha, 'HR', 'Approved', now() - interval '1 day', 'Approved');
  END IF;

  IF v_lv_karan IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM approvals WHERE entity_type = 'leave' AND entity_id = v_lv_karan
  ) THEN
    INSERT INTO approvals (org_id, entity_type, entity_id, stage, decision, comment) VALUES
      (v_org, 'leave', v_lv_karan, 'Manager', 'Pending', 'Awaiting medical review');
  END IF;

  IF v_co_karan IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM approvals WHERE entity_type = 'compoff' AND entity_id = v_co_karan
  ) THEN
    INSERT INTO approvals (org_id, entity_type, entity_id, stage, decision, acted_at) VALUES
      (v_org, 'compoff', v_co_karan, 'HR', 'Approved', now() - interval '3 days');
  END IF;

  -- ---- leave balances (all employees) ----
  INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken, carried_in)
  VALUES
    (v_org, v_isha,  2026, 'Annual Leave', 18, 9, 1, 0),
    (v_org, v_isha,  2026, 'Sick Leave',    8,  4, 0, 0),
    (v_org, v_karan, 2026, 'Sick Leave',    8,  2, 0, 0),
    (v_org, v_karan, 2026, 'Annual Leave', 18, 1.5, 0, 0),
    (v_org, v_priya, 2026, 'Annual Leave', 18, 12, 0, 2),
    (v_org, v_priya, 2026, 'Casual Leave',  4,  2, 0, 0),
    (v_org, v_sneha, 2026, 'Annual Leave', 10, 5, 3, 0),
    (v_org, v_sneha, 2026, 'Sick Leave',    8,  3, 0, 0),
    (v_org, v_imran, 2026, 'Annual Leave', 18, 15, 2, 1),
    (v_org, v_imran, 2026, 'Comp-Off Leave', 4, 1, 0, 0)
  ON CONFLICT (employee_id, policy_year, type) DO UPDATE SET
    entitled = EXCLUDED.entitled, accrued = EXCLUDED.accrued,
    taken = EXCLUDED.taken, carried_in = EXCLUDED.carried_in;

  -- ---- extra training record ----
  INSERT INTO training_records (org_id, employee_id, type, duration, unpaid_days, start_date, status)
  SELECT v_org, v_imran, 'Unpaid Training', '3 days', 2, '2026-05-28', 'Completed'
  WHERE NOT EXISTS (
    SELECT 1 FROM training_records
    WHERE employee_id = v_imran AND type = 'Unpaid Training' AND start_date = '2026-05-28'
  );

  -- ---- CRM admin → HR role assignments ----
  INSERT INTO role_assignments (org_id, staff_id, role)
  SELECT v_org, ur.user_id, 'Admin'::hr_role
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role
  ON CONFLICT (org_id, staff_id) DO UPDATE SET role = 'Admin'::hr_role;

  INSERT INTO role_assignments (org_id, staff_id, role)
  SELECT v_org, ur.user_id, 'HR Manager'::hr_role
  FROM public.user_roles ur
  WHERE ur.role = 'counselor'::public.app_role
  ON CONFLICT (org_id, staff_id) DO NOTHING;

  -- Link first admin to Isha for ESS self-service demo
  SELECT ur.user_id INTO v_admin
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role
  ORDER BY ur.user_id LIMIT 1;

  IF v_admin IS NOT NULL THEN
    UPDATE employees SET staff_id = v_admin
    WHERE id = v_isha AND staff_id IS NULL;
  END IF;

  -- ---- payroll overrides (prototype manual: Sneha UL=1, Imran sandwich=1) ----
  IF v_cycle IS NOT NULL THEN
    UPDATE payroll_lines SET
      is_overridden = true,
      override_json = jsonb_build_object(
        'late', late_count, 'mispunch', mispunch_count, 'leaves', leaves_taken,
        'paid_leaves', paid_leaves, 'comp_off', comp_off, 'ul', 1,
        'sandwich', sandwich_count, 'unpaid_training', unpaid_training
      )
    WHERE cycle_id = v_cycle AND employee_id = v_sneha AND ul_count <> 1;

    UPDATE payroll_lines SET
      is_overridden = true,
      override_json = jsonb_build_object(
        'late', late_count, 'mispunch', mispunch_count, 'leaves', leaves_taken,
        'paid_leaves', paid_leaves, 'comp_off', comp_off, 'ul', ul_count,
        'sandwich', 1, 'unpaid_training', unpaid_training
      )
    WHERE cycle_id = v_cycle AND employee_id = v_imran AND sandwich_count <> 1;

    PERFORM fn_build_payroll_line(v_isha,  v_cycle);
    PERFORM fn_build_payroll_line(v_karan, v_cycle);
    PERFORM fn_build_payroll_line(v_priya, v_cycle);
    PERFORM fn_build_payroll_line(v_sneha, v_cycle);
    PERFORM fn_build_payroll_line(v_imran, v_cycle);

    -- salary slip archive metadata (PDF generated client-side)
    INSERT INTO salary_slips (org_id, payroll_line_id, employee_id, cycle_id, storage_path)
    SELECT pl.org_id, pl.id, pl.employee_id, pl.cycle_id,
           'demo/slips/' || e.emp_code || '_' || to_char(c.start_date, 'YYYYMM') || '.pdf'
    FROM payroll_lines pl
    JOIN employees e ON e.id = pl.employee_id
    JOIN payroll_cycles c ON c.id = pl.cycle_id
    WHERE pl.cycle_id = v_cycle
    ON CONFLICT (payroll_line_id) DO NOTHING;
  END IF;

  -- ---- audit trail (UAT scenarios) ----
  IF NOT EXISTS (
    SELECT 1 FROM audit_log WHERE org_id = v_org AND action = 'Full demo seed applied'
  ) THEN
    INSERT INTO audit_log (org_id, actor_label, action, target, prev_value, new_value) VALUES
      (v_org, 'HR Manager', 'Leave Approved', 'LV · Isha Sikligar · 09 Jun', 'Pending', 'Approved'),
      (v_org, 'HR Manager', 'Comp-Off Approved', 'CO · Karan Joshi · 08 Jun', 'Pending', 'Approved'),
      (v_org, 'System', 'Payroll Rebuilt', '26 May 2026 – 25 Jun 2026', '—', '5 lines'),
      (v_org, 'HR Manager', 'Override Applied', 'Sneha Patel · UL=1', 'auto', 'manual'),
      (v_org, 'HR Manager', 'Override Applied', 'Imran Shaikh · Sandwich=1', 'auto', 'manual'),
      (v_org, 'System', 'Full demo seed applied', 'HR Payroll demo org', '—', 'enriched');
  END IF;

  RAISE NOTICE 'HR full demo seed complete — org=%, cycle=%', v_org, v_cycle;
END $$;
