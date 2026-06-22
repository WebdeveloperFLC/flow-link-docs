-- =====================================================================
-- HR Payroll Phase C — Earned days engine (dual-path, legacy default)
-- Canonical spec: docs/HR_PAYROLL_PHASE_C_LOCKED_SPEC.md
-- =====================================================================

-- ---- Policy domain: payroll formula mode ----
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  o.org_id,
  'payroll',
  '2026-01-01'::date,
  1,
  '{"formula_mode":"legacy","sandwich_enabled":true}'::jsonb
FROM (SELECT DISTINCT org_id FROM employees UNION SELECT '00000000-0000-0000-0000-0000000000f1'::uuid) o(org_id)
WHERE NOT EXISTS (
  SELECT 1 FROM policies p
  WHERE p.org_id = o.org_id AND p.domain = 'payroll' AND p.version = 1
);

CREATE OR REPLACE FUNCTION fn_resolve_payroll_policy(p_org uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (
      SELECT p.config
      FROM policies p
      WHERE p.org_id = p_org
        AND p.domain = 'payroll'
        AND p.effective_from <= COALESCE(p_as_of, current_date)
      ORDER BY p.effective_from DESC, p.version DESC
      LIMIT 1
    ),
    '{"formula_mode":"legacy","sandwich_enabled":true}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION fn_payroll_formula_mode(p_org uuid, p_as_of date DEFAULT current_date)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(COALESCE(fn_resolve_payroll_policy(p_org, p_as_of)->>'formula_mode', 'legacy'));
$$;

-- ---- payroll_lines Phase C columns ----
ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS payroll_days_effective int,
  ADD COLUMN IF NOT EXISTS attendance_earned numeric(6,2),
  ADD COLUMN IF NOT EXISTS earned_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS formula_mode text NOT NULL DEFAULT 'legacy';

-- ---- Legacy rollup (frozen — RC-1) ----
CREATE OR REPLACE FUNCTION fn_rollup_inputs_legacy(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
  e record;
  v_late int := 0;
  v_mis int := 0;
  v_leaves numeric := 0;
  v_woff int := 0;
  v_working numeric := 0;
  v_ul int := 0;
  v_paid numeric := 0;
  v_compoff numeric := 0;
  v_sandwich numeric := 0;
  v_train int := 0;
  v_ot int := 0;
  v_off_shift int := 0;
  v_shift_work int := 0;
  v_late_exempt int := 0;
  v_mis_approved int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  SELECT * INTO e FROM employees WHERE id = p_employee;

  SELECT
    count(*) FILTER (WHERE a.status = 'Present')
      + count(*) FILTER (WHERE a.status = 'Half Day') * 0.5,
    count(*) FILTER (WHERE a.status IN ('Leave', 'Sick Leave')),
    count(*) FILTER (WHERE a.status IN ('Week Off', 'Holiday')),
    count(*) FILTER (WHERE a.status = 'Unauthorized Leave'),
    count(*) FILTER (WHERE a.is_mispunch)
      + count(*) FILTER (WHERE a.status = 'Absent'),
    count(*) FILTER (
      WHERE fn_is_late_check_in(
        a.check_in,
        COALESCE(sh.login_time, '10:00'::time),
        COALESCE(sh.logout_time, '19:00'::time),
        COALESCE(sh.grace_min, 5)
      )
      AND a.status NOT IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave', 'Unauthorized Leave', 'Absent')
    ),
    COALESCE(sum(a.off_shift_min), 0)::int,
    COALESCE(sum(a.shift_work_min), 0)::int
  INTO v_working, v_leaves, v_woff, v_ul, v_mis, v_late, v_off_shift, v_shift_work
  FROM attendance a
  LEFT JOIN shifts sh ON sh.id = fn_employee_shift_at(a.employee_id, a.work_date)
  WHERE a.employee_id = p_employee AND a.work_date BETWEEN c.start_date AND c.end_date;

  SELECT COALESCE(sum(days), 0) INTO v_paid FROM leave_requests
  WHERE employee_id = p_employee AND status = 'Approved' AND type <> 'Unpaid Leave'
    AND from_date BETWEEN c.start_date AND c.end_date;

  SELECT count(*) INTO v_compoff FROM compoff_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND worked_date BETWEEN c.start_date AND c.end_date;

  SELECT count(*) INTO v_late_exempt FROM late_exemptions le
  WHERE le.employee_id = p_employee
    AND le.status = 'Approved'
    AND le.late_date BETWEEN c.start_date AND c.end_date
    AND le.delay_min > COALESCE(
      (SELECT s.grace_min FROM shifts s WHERE s.id = fn_employee_shift_at(p_employee, le.late_date)),
      5
    );

  SELECT count(*) INTO v_mis_approved FROM mispunch_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND punch_date BETWEEN c.start_date AND c.end_date;

  SELECT COALESCE(sum(CASE WHEN is_sandwich THEN 1 ELSE 0 END), 0) INTO v_sandwich
  FROM leave_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND from_date BETWEEN c.start_date AND c.end_date;

  SELECT COALESCE(sum(unpaid_days), 0) INTO v_train FROM training_records
  WHERE employee_id = p_employee AND status <> 'Cancelled';

  SELECT COALESCE(sum(fn_calc_day_ot_minutes(
    a.check_in, a.check_out, COALESCE(a.break_min, 0)::int,
    sh.login_time, sh.logout_time, COALESCE(sh.break_min, 0)::int, COALESCE(sh.ot_eligible, true)
  )), 0)::int INTO v_ot
  FROM attendance a
  LEFT JOIN shifts sh ON sh.id = fn_employee_shift_at(a.employee_id, a.work_date)
  WHERE a.employee_id = p_employee
    AND a.work_date BETWEEN c.start_date AND c.end_date
    AND a.status IN ('Present', 'Half Day');

  RETURN jsonb_build_object(
    'formula_mode', 'legacy',
    'late', greatest(0, v_late - v_late_exempt),
    'mispunch', greatest(0, v_mis - v_mis_approved),
    'leaves', v_leaves,
    'paid_leaves', v_paid,
    'comp_off', v_compoff,
    'ul', v_ul,
    'sandwich', v_sandwich,
    'unpaid_training', v_train,
    'ot_minutes', v_ot,
    'off_shift_minutes', v_off_shift,
    'shift_work_minutes', v_shift_work,
    'working', round(v_working, 1),
    'week_off', v_woff
  );
END;
$$;

-- ---- Daily priority matrix (spec: HR_PAYROLL_PHASE_C_LOCKED_SPEC.md §5) ----
CREATE OR REPLACE FUNCTION fn_apply_priority_matrix_c17(
  p_org uuid,
  p_employee uuid,
  p_date date
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eligible boolean;
  v_att record;
  v_status att_status;
  v_base numeric := 0;
  v_bonus numeric := 0;
  v_day numeric := 0;
  v_is_wo boolean;
  v_worked_wo_hol boolean := false;
  v_half_leave boolean := false;
  v_paid_leave numeric := 0;
BEGIN
  v_eligible := fn_employee_attendance_eligible(p_employee, p_date);
  IF NOT v_eligible THEN
    RETURN jsonb_build_object(
      'base_credit', 0, 'comp_off_bonus', 0, 'day_credit', 0,
      'late_eligible', false, 'mispunch_eligible', false, 'ul_day', false
    );
  END IF;

  SELECT a.status, a.is_mispunch, a.check_in, a.check_out
  INTO v_att
  FROM attendance a
  WHERE a.employee_id = p_employee AND a.work_date = p_date;

  v_status := v_att.status;
  IF v_status IS NULL THEN
    v_status := 'Absent';
  END IF;
  v_is_wo := fn_is_weekly_off_day(p_org, p_employee, p_date);

  SELECT EXISTS (
    SELECT 1 FROM leave_requests lr
    WHERE lr.employee_id = p_employee
      AND lr.status = 'Approved'
      AND lr.type <> 'Unpaid Leave'
      AND p_date BETWEEN lr.from_date AND lr.to_date
      AND (lr.duration_type = 'Half Day' OR lr.days <= 0.5)
  ) INTO v_half_leave;

  -- P1 Holiday (C3)
  IF v_status = 'Holiday' THEN
    v_base := 1.0;
  -- P2 Half leave + Half present (C2)
  ELSIF v_half_leave AND v_status = 'Half Day' THEN
    v_base := 1.0;
  -- P3 Week Off unworked
  ELSIF v_status = 'Week Off' THEN
    v_base := 1.0;
  -- P4 Present
  ELSIF v_status = 'Present' THEN
    v_base := 1.0;
    v_worked_wo_hol := v_is_wo OR v_status = 'Holiday';
  -- P5 Half Day
  ELSIF v_status = 'Half Day' THEN
    v_base := 0.5;
    v_worked_wo_hol := v_is_wo;
  -- P6 Leave / Sick
  ELSIF v_status IN ('Leave', 'Sick Leave') THEN
    v_base := 1.0;
  ELSE
    SELECT COALESCE(max(
      CASE
        WHEN lr.duration_type = 'Half Day' OR lr.days <= 0.5 THEN 0.5
        ELSE 1.0
      END
    ), 0) INTO v_paid_leave
    FROM leave_requests lr
    WHERE lr.employee_id = p_employee
      AND lr.status = 'Approved'
      AND lr.type <> 'Unpaid Leave'
      AND p_date BETWEEN lr.from_date AND lr.to_date;

    IF v_paid_leave > 0 THEN
      v_base := v_paid_leave;
    ELSIF v_status = 'Unauthorized Leave' THEN
      v_base := 0;
    ELSE
      v_base := 0;
    END IF;
  END IF;

  IF v_status = 'Present' AND (v_is_wo OR v_status = 'Holiday') THEN
    v_worked_wo_hol := true;
  END IF;
  IF v_status = 'Half Day' AND v_is_wo THEN
    v_worked_wo_hol := true;
  END IF;

  -- C1 comp-off bonus
  IF v_worked_wo_hol AND EXISTS (
    SELECT 1 FROM compoff_requests co
    WHERE co.employee_id = p_employee
      AND co.status = 'Approved'
      AND co.worked_date = p_date
  ) THEN
    v_bonus := least(1.0, 2.0 - v_base);
  END IF;

  v_day := least(v_base + v_bonus, 2.0);

  RETURN jsonb_build_object(
    'base_credit', v_base,
    'comp_off_bonus', v_bonus,
    'day_credit', round(v_day, 2),
    'late_eligible', (
      v_att.check_in IS NOT NULL
      AND v_status IS NOT NULL
      AND v_status NOT IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave', 'Unauthorized Leave', 'Absent', 'Half Day')
      AND fn_is_late_check_in(
        v_att.check_in,
        COALESCE((SELECT login_time FROM shifts s WHERE s.id = fn_employee_shift_at(p_employee, p_date)), '10:00'::time),
        COALESCE((SELECT logout_time FROM shifts s WHERE s.id = fn_employee_shift_at(p_employee, p_date)), '19:00'::time),
        COALESCE((SELECT grace_min FROM shifts s WHERE s.id = fn_employee_shift_at(p_employee, p_date)), 5)
      )
    ),
    'mispunch_eligible', COALESCE(v_att.is_mispunch, false),
    'ul_day', COALESCE(v_status = 'Unauthorized Leave', false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_payroll_days_effective(p_employee uuid, p_cycle uuid)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e employees;
  v_from date;
  v_to date;
  v_eligible int;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  SELECT * INTO e FROM employees WHERE id = p_employee;

  v_from := greatest(c.start_date, COALESCE(e.date_of_joining, c.start_date));
  v_to := least(c.end_date, COALESCE(e.exit_date, c.end_date));

  IF v_to < v_from THEN
    RETURN 0;
  END IF;

  IF v_from = c.start_date AND v_to = c.end_date THEN
    RETURN c.payroll_days;
  END IF;

  v_eligible := (v_to - v_from) + 1;
  RETURN v_eligible;
END;
$$;

-- ---- Earned rollup (C1–C7) ----
CREATE OR REPLACE FUNCTION fn_rollup_inputs_earned(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
  e record;
  v_pol jsonb;
  v_from date;
  v_to date;
  d date;
  v_day jsonb;
  v_attendance_earned numeric := 0;
  v_late int := 0;
  v_mis int := 0;
  v_ul int := 0;
  v_late_exempt int := 0;
  v_mis_approved int := 0;
  v_sandwich numeric := 0;
  v_train int := 0;
  v_ot int := 0;
  v_off_shift int := 0;
  v_shift_work int := 0;
  v_compoff_audit int := 0;
  v_effective int;
  v_breakdown jsonb := '{}'::jsonb;
  v_present int := 0;
  v_half_count int := 0;
  v_wo int := 0;
  v_holiday int := 0;
  v_comp_bonus numeric := 0;
  v_day_present int;
  v_day_half numeric;
  v_day_wo int;
  v_day_hol int;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  SELECT * INTO e FROM employees WHERE id = p_employee;
  v_pol := fn_resolve_payroll_policy(e.org_id, c.start_date);

  v_from := greatest(c.start_date, COALESCE(e.date_of_joining, c.start_date));
  v_to := least(c.end_date, COALESCE(e.exit_date, c.end_date));
  v_effective := fn_payroll_days_effective(p_employee, p_cycle);

  d := v_from;
  WHILE d <= v_to LOOP
    v_day := fn_apply_priority_matrix_c17(e.org_id, p_employee, d);
    v_attendance_earned := v_attendance_earned + COALESCE((v_day->>'day_credit')::numeric, 0);
    v_comp_bonus := v_comp_bonus + COALESCE((v_day->>'comp_off_bonus')::numeric, 0);

    IF COALESCE((v_day->>'late_eligible')::boolean, false) THEN
      v_late := v_late + 1;
    END IF;
    IF COALESCE((v_day->>'mispunch_eligible')::boolean, false) THEN
      v_mis := v_mis + 1;
    END IF;
    IF COALESCE((v_day->>'ul_day')::boolean, false) THEN
      v_ul := v_ul + 1;
    END IF;

    SELECT
      CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END,
      CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END,
      CASE WHEN a.status = 'Week Off' THEN 1 ELSE 0 END,
      CASE WHEN a.status = 'Holiday' THEN 1 ELSE 0 END
    INTO v_day_present, v_day_half, v_day_wo, v_day_hol
    FROM attendance a
    WHERE a.employee_id = p_employee AND a.work_date = d;

    v_present := v_present + COALESCE(v_day_present, 0);
    v_half_count := v_half_count + COALESCE(v_day_half, 0);
    v_wo := v_wo + COALESCE(v_day_wo, 0);
    v_holiday := v_holiday + COALESCE(v_day_hol, 0);

    d := d + 1;
  END LOOP;

  SELECT count(*) INTO v_late_exempt FROM late_exemptions le
  WHERE le.employee_id = p_employee
    AND le.status = 'Approved'
    AND le.late_date BETWEEN v_from AND v_to
    AND le.delay_min > COALESCE(
      (SELECT s.grace_min FROM shifts s WHERE s.id = fn_employee_shift_at(p_employee, le.late_date)),
      5
    );

  SELECT count(*) INTO v_mis_approved FROM mispunch_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND punch_date BETWEEN v_from AND v_to;

  IF COALESCE((v_pol->>'sandwich_enabled')::boolean, true) THEN
    SELECT COALESCE(sum(CASE WHEN is_sandwich THEN 1 ELSE 0 END), 0) INTO v_sandwich
    FROM leave_requests
    WHERE employee_id = p_employee AND status = 'Approved'
      AND from_date BETWEEN c.start_date AND c.end_date;
  ELSE
    v_sandwich := 0;
  END IF;

  SELECT COALESCE(sum(unpaid_days), 0) INTO v_train FROM training_records
  WHERE employee_id = p_employee AND status <> 'Cancelled';

  SELECT count(*) INTO v_compoff_audit FROM compoff_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND worked_date BETWEEN v_from AND v_to;

  SELECT COALESCE(sum(fn_calc_day_ot_minutes(
    a.check_in, a.check_out, COALESCE(a.break_min, 0)::int,
    sh.login_time, sh.logout_time, COALESCE(sh.break_min, 0)::int, COALESCE(sh.ot_eligible, true)
  )), 0)::int,
  COALESCE(sum(a.off_shift_min), 0)::int,
  COALESCE(sum(a.shift_work_min), 0)::int
  INTO v_ot, v_off_shift, v_shift_work
  FROM attendance a
  LEFT JOIN shifts sh ON sh.id = fn_employee_shift_at(a.employee_id, a.work_date)
  WHERE a.employee_id = p_employee
    AND a.work_date BETWEEN v_from AND v_to
    AND a.status IN ('Present', 'Half Day');

  v_breakdown := jsonb_build_object(
    'present', v_present,
    'half', v_half_count,
    'week_off', v_wo,
    'holiday', v_holiday,
    'comp_off_bonus', round(v_comp_bonus, 2),
    'comp_off_audit_count', v_compoff_audit
  );

  RETURN jsonb_build_object(
    'formula_mode', 'earned',
    'payroll_days_effective', v_effective,
    'attendance_earned', round(v_attendance_earned, 2),
    'earned_breakdown', v_breakdown,
    'late', greatest(0, v_late - v_late_exempt),
    'mispunch', greatest(0, v_mis - v_mis_approved),
    'leaves', 0,
    'paid_leaves', 0,
    'comp_off', v_compoff_audit,
    'ul', v_ul,
    'sandwich', v_sandwich,
    'unpaid_training', v_train,
    'ot_minutes', v_ot,
    'off_shift_minutes', v_off_shift,
    'shift_work_minutes', v_shift_work,
    'working', round(v_attendance_earned, 1),
    'week_off', v_wo
  );
END;
$$;

-- ---- Rollup router (RC-1) ----
CREATE OR REPLACE FUNCTION fn_rollup_inputs(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e employees;
  v_mode text;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  SELECT * INTO e FROM employees WHERE id = p_employee;
  v_mode := fn_payroll_formula_mode(e.org_id, c.start_date);

  IF v_mode = 'earned' THEN
    RETURN fn_rollup_inputs_earned(p_employee, p_cycle);
  END IF;

  RETURN fn_rollup_inputs_legacy(p_employee, p_cycle);
END;
$$;

-- ---- Dual-path compute ----
CREATE OR REPLACE FUNCTION fn_compute_payroll(
  p_payroll_days  int,
  p_monthly       numeric,
  p_basic         numeric,
  p_incentive     numeric DEFAULT 0,
  p_bonus         numeric DEFAULT 0,
  p_pf_applicable boolean DEFAULT true,
  p_esic_applicable boolean DEFAULT false,
  p_leaves        numeric DEFAULT 0,
  p_paid_leaves   numeric DEFAULT 0,
  p_late          int DEFAULT 0,
  p_ul            int DEFAULT 0,
  p_sandwich      numeric DEFAULT 0,
  p_mispunch      int DEFAULT 0,
  p_compoff       numeric DEFAULT 0,
  p_unpaid_training int DEFAULT 0,
  p_late_policy   jsonb DEFAULT NULL,
  p_mispunch_policy jsonb DEFAULT NULL,
  p_ul_mult       numeric DEFAULT 2,
  p_ot_minutes    int DEFAULT 0,
  p_ot_policy     jsonb DEFAULT NULL,
  p_pt_applicable boolean DEFAULT false,
  p_pt_amount     numeric DEFAULT 0,
  p_payroll_country text DEFAULT 'IN',
  p_canada_policy jsonb DEFAULT NULL,
  p_other_deductions numeric DEFAULT 0,
  p_tds_applicable boolean DEFAULT false,
  p_formula_mode text DEFAULT 'legacy',
  p_payroll_days_effective int DEFAULT NULL,
  p_attendance_earned numeric DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k numeric; n numeric; payable numeric; daily numeric; gross numeric;
  basic numeric; pf_wage numeric; pf_emp numeric; esic_emp numeric; pt_emp numeric; net numeric;
  pf_ceiling numeric := COALESCE((p_late_policy->>'pf_ceiling')::numeric, 15000);
  esic_ceiling numeric := COALESCE((p_late_policy->>'esic_ceiling')::numeric, 21000);
  v_ot_pay numeric := 0;
  v_hourly numeric;
  v_formula text;
  v_ot_mode text;
  v_min_ot int;
  v_cpp_rate numeric;
  v_ei_rate numeric;
  v_policy_other numeric;
  v_is_ca boolean;
  v_divisor int;
BEGIN
  k := fn_late_deduction(p_late, p_late_policy);
  n := fn_mispunch_deduction(p_mispunch, p_mispunch_policy);
  v_formula := lower(COALESCE(p_formula_mode, 'legacy'));

  IF v_formula = 'earned' THEN
    payable := COALESCE(p_attendance_earned, 0) - k
               - (COALESCE(p_ul, 0) * COALESCE(p_ul_mult, 2))
               - COALESCE(p_sandwich, 0) - n - COALESCE(p_unpaid_training, 0);
    v_divisor := NULLIF(COALESCE(p_payroll_days_effective, p_payroll_days), 0);
    daily := round(p_monthly / v_divisor, 2);
  ELSE
    payable := p_payroll_days - COALESCE(p_leaves, 0) + COALESCE(p_paid_leaves, 0)
               + COALESCE(p_compoff, 0) - k - (COALESCE(p_ul, 0) * COALESCE(p_ul_mult, 2))
               - COALESCE(p_sandwich, 0) - n - COALESCE(p_unpaid_training, 0);
    daily := round(p_monthly / NULLIF(p_payroll_days, 0), 2);
  END IF;

  gross := round(daily * payable);
  basic := COALESCE(p_basic, round(p_monthly * 0.5));

  v_ot_mode := COALESCE(p_ot_policy->>'mode', 'display');
  v_min_ot := COALESCE((p_ot_policy->>'min_ot_minutes')::int, 30);
  IF v_ot_mode = 'paid' AND COALESCE(p_ot_minutes, 0) >= v_min_ot THEN
    v_hourly := daily / COALESCE((p_ot_policy->>'hours_per_day')::numeric, 8);
    v_ot_pay := round(
      (p_ot_minutes / 60.0) * v_hourly * COALESCE((p_ot_policy->>'rate_multiplier')::numeric, 1.5)
    );
  END IF;

  v_is_ca := upper(COALESCE(p_payroll_country, 'IN')) IN ('CA', 'CAN', 'CANADA');

  IF v_is_ca THEN
    v_cpp_rate := COALESCE((p_canada_policy->>'cpp_rate')::numeric, 0.0595);
    v_ei_rate := COALESCE((p_canada_policy->>'ei_rate')::numeric, 0.0166);
    v_policy_other := COALESCE((p_canada_policy->>'other_deductions')::numeric, 0);
    pf_emp := round(gross * v_cpp_rate);
    esic_emp := round(gross * v_ei_rate);
    pt_emp := fn_canada_income_tax(gross, p_canada_policy, p_tds_applicable)
              + v_policy_other + COALESCE(p_other_deductions, 0);
  ELSE
    pf_wage := least(basic, pf_ceiling);
    pf_emp  := CASE WHEN p_pf_applicable THEN round(pf_wage * 0.12) ELSE 0 END;
    esic_emp := CASE WHEN p_esic_applicable AND p_monthly <= esic_ceiling THEN round(gross * 0.0075) ELSE 0 END;
    pt_emp := CASE WHEN COALESCE(p_pt_applicable, false) THEN COALESCE(p_pt_amount, 0) ELSE 0 END;
    IF COALESCE(p_tds_applicable, false) THEN
      pt_emp := pt_emp + COALESCE(p_other_deductions, 0);
    END IF;
  END IF;

  net := gross + COALESCE(p_incentive, 0) + COALESCE(p_bonus, 0) + v_ot_pay - pf_emp - esic_emp - pt_emp;
  RETURN jsonb_build_object(
    'formula_mode', lower(COALESCE(p_formula_mode, 'legacy')),
    'late_deduction', k,
    'mispunch_deduction', n,
    'payable_days', round(payable, 2),
    'daily_rate', daily,
    'gross_earned', gross,
    'pf_employee', pf_emp,
    'esic_employee', esic_emp,
    'pt_employee', pt_emp,
    'incentive', COALESCE(p_incentive, 0),
    'bonus', COALESCE(p_bonus, 0),
    'ot_minutes', COALESCE(p_ot_minutes, 0),
    'ot_pay', v_ot_pay,
    'net_salary', round(net),
    'payroll_country', CASE WHEN v_is_ca THEN 'CA' ELSE 'IN' END,
    'attendance_earned', COALESCE(p_attendance_earned, NULL),
    'payroll_days_effective', COALESCE(p_payroll_days_effective, NULL)
  );
END;
$$;

-- ---- Build payroll line (persist Phase C fields) ----
CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
  v_late_pol jsonb; v_mis_pol jsonb; v_sul_pol jsonb; v_ot_pol jsonb; v_pt_pol jsonb; v_ca_pol jsonb;
  v_pay_pol jsonb;
  v_ul_mult numeric; v_pt_amt numeric; v_country text;
  v_formula_mode text;
  v_effective int;
  v_earned numeric;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.status NOT IN ('Draft', 'Processed', 'Approved') THEN
    RAISE EXCEPTION 'Cycle % is %; cannot rebuild line', c.label, c.status;
  END IF;
  SELECT * INTO e FROM employees WHERE id = p_employee;

  use_override := false;
  ov := NULL;
  SELECT is_overridden, override_json INTO use_override, ov
  FROM payroll_lines WHERE cycle_id = p_cycle AND employee_id = p_employee;
  use_override := COALESCE(use_override, false);

  v_pay_pol := fn_resolve_payroll_policy(e.org_id, c.start_date);
  v_formula_mode := lower(COALESCE(v_pay_pol->>'formula_mode', 'legacy'));

  IF use_override THEN
    inp := ov;
    v_formula_mode := lower(COALESCE(inp->>'formula_mode', v_formula_mode));
  ELSE
    inp := fn_rollup_inputs(p_employee, p_cycle);
  END IF;

  v_late_pol := fn_resolve_policy(e.org_id, 'late', c.start_date);
  v_mis_pol := fn_resolve_policy(e.org_id, 'mispunch', c.start_date);
  v_sul_pol := fn_resolve_policy(e.org_id, 'sandwich_ul', c.start_date);
  v_ot_pol := fn_resolve_policy(e.org_id, 'overtime', c.start_date);
  v_pt_pol := fn_resolve_policy(e.org_id, 'professional_tax', c.start_date);
  v_ca_pol := fn_resolve_policy(e.org_id, 'canada_deductions', c.start_date);
  v_ul_mult := COALESCE((v_sul_pol->>'ul_multiplier')::numeric, 2);
  v_pt_amt := COALESCE((v_pt_pol->>'default_amount')::numeric, 200);
  v_country := COALESCE(NULLIF(trim(e.payroll_country), ''), 'IN');

  v_effective := COALESCE((inp->>'payroll_days_effective')::int, c.payroll_days);
  v_earned := (inp->>'attendance_earned')::numeric;

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
    e.pf_applicable, e.esic_applicable,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric,
    (inp->>'late')::int, (inp->>'ul')::int, (inp->>'sandwich')::numeric,
    (inp->>'mispunch')::int, (inp->>'comp_off')::numeric, (inp->>'unpaid_training')::int,
    v_late_pol, v_mis_pol, v_ul_mult,
    COALESCE((inp->>'ot_minutes')::int, 0), v_ot_pol,
    COALESCE(e.pt_applicable, false),
    CASE WHEN COALESCE(e.pt_applicable, false) THEN v_pt_amt ELSE 0 END,
    v_country,
    v_ca_pol,
    COALESCE(e.other_deductions, 0),
    COALESCE(e.tds_applicable, false),
    v_formula_mode,
    v_effective,
    v_earned
  );

  INSERT INTO payroll_lines AS pl (
    org_id, cycle_id, employee_id, payroll_days, monthly_gross, basic,
    leaves_taken, paid_leaves, comp_off, late_count, mispunch_count, ul_count,
    sandwich_count, unpaid_training, ot_minutes, ot_pay, off_shift_minutes,
    late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, pt_employee, net_salary, is_overridden, override_json,
    payroll_days_effective, attendance_earned, earned_breakdown, formula_mode
  ) VALUES (
    e.org_id, p_cycle, p_employee, c.payroll_days, e.monthly_gross, e.basic,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric, (inp->>'comp_off')::numeric,
    (inp->>'late')::int, (inp->>'mispunch')::int, (inp->>'ul')::int,
    (inp->>'sandwich')::numeric, (inp->>'unpaid_training')::int,
    COALESCE((inp->>'ot_minutes')::int, 0), COALESCE((calc->>'ot_pay')::numeric, 0),
    COALESCE((inp->>'off_shift_minutes')::int, 0),
    (calc->>'late_deduction')::numeric, (calc->>'mispunch_deduction')::numeric,
    (calc->>'payable_days')::numeric, (calc->>'daily_rate')::numeric,
    (calc->>'gross_earned')::numeric, (calc->>'incentive')::numeric, (calc->>'bonus')::numeric,
    (calc->>'pf_employee')::numeric, (calc->>'esic_employee')::numeric,
    COALESCE((calc->>'pt_employee')::numeric, 0), (calc->>'net_salary')::numeric,
    COALESCE(use_override, false), ov,
    CASE WHEN v_formula_mode = 'earned' THEN v_effective ELSE NULL END,
    CASE WHEN v_formula_mode = 'earned' THEN v_earned ELSE NULL END,
    CASE WHEN v_formula_mode = 'earned' THEN inp->'earned_breakdown' ELSE NULL END,
    v_formula_mode
  )
  ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
    payroll_days = excluded.payroll_days, monthly_gross = excluded.monthly_gross, basic = excluded.basic,
    leaves_taken = excluded.leaves_taken, paid_leaves = excluded.paid_leaves, comp_off = excluded.comp_off,
    late_count = excluded.late_count, mispunch_count = excluded.mispunch_count, ul_count = excluded.ul_count,
    sandwich_count = excluded.sandwich_count, unpaid_training = excluded.unpaid_training,
    ot_minutes = excluded.ot_minutes, ot_pay = excluded.ot_pay, off_shift_minutes = excluded.off_shift_minutes,
    late_deduction = excluded.late_deduction, mispunch_deduction = excluded.mispunch_deduction,
    payable_days = excluded.payable_days, daily_rate = excluded.daily_rate, gross_earned = excluded.gross_earned,
    incentive = excluded.incentive, bonus = excluded.bonus,
    pf_employee = excluded.pf_employee, esic_employee = excluded.esic_employee,
    pt_employee = excluded.pt_employee, net_salary = excluded.net_salary,
    is_overridden = excluded.is_overridden, override_json = excluded.override_json,
    payroll_days_effective = excluded.payroll_days_effective,
    attendance_earned = excluded.attendance_earned,
    earned_breakdown = excluded.earned_breakdown,
    formula_mode = excluded.formula_mode
  RETURNING * INTO row;
  RETURN row;
END;
$$;

-- ---- Parallel validation (cutover gate — does not change mode) ----
CREATE OR REPLACE FUNCTION fn_compare_payroll_formulas(p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e record;
  v_legacy jsonb;
  v_earned jsonb;
  v_legacy_calc jsonb;
  v_earned_calc jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_late_pol jsonb;
  v_mis_pol jsonb;
  v_sul_pol jsonb;
  v_ot_pol jsonb;
  v_pt_pol jsonb;
  v_ca_pol jsonb;
  v_ul_mult numeric;
  v_pt_amt numeric;
  v_country text;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;

  FOR e IN
    SELECT emp.* FROM employees emp
    WHERE emp.org_id = c.org_id AND emp.status NOT IN ('Terminated', 'Resigned')
  LOOP
    v_legacy := fn_rollup_inputs_legacy(e.id, p_cycle);
    v_earned := fn_rollup_inputs_earned(e.id, p_cycle);

    v_late_pol := fn_resolve_policy(e.org_id, 'late', c.start_date);
    v_mis_pol := fn_resolve_policy(e.org_id, 'mispunch', c.start_date);
    v_sul_pol := fn_resolve_policy(e.org_id, 'sandwich_ul', c.start_date);
    v_ot_pol := fn_resolve_policy(e.org_id, 'overtime', c.start_date);
    v_pt_pol := fn_resolve_policy(e.org_id, 'professional_tax', c.start_date);
    v_ca_pol := fn_resolve_policy(e.org_id, 'canada_deductions', c.start_date);
    v_ul_mult := COALESCE((v_sul_pol->>'ul_multiplier')::numeric, 2);
    v_pt_amt := COALESCE((v_pt_pol->>'default_amount')::numeric, 200);
    v_country := COALESCE(NULLIF(trim(e.payroll_country), ''), 'IN');

    v_legacy_calc := fn_compute_payroll(
      c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
      e.pf_applicable, e.esic_applicable,
      (v_legacy->>'leaves')::numeric, (v_legacy->>'paid_leaves')::numeric,
      (v_legacy->>'late')::int, (v_legacy->>'ul')::int, (v_legacy->>'sandwich')::numeric,
      (v_legacy->>'mispunch')::int, (v_legacy->>'comp_off')::numeric, (v_legacy->>'unpaid_training')::int,
      v_late_pol, v_mis_pol, v_ul_mult,
      COALESCE((v_legacy->>'ot_minutes')::int, 0), v_ot_pol,
      COALESCE(e.pt_applicable, false),
      CASE WHEN COALESCE(e.pt_applicable, false) THEN v_pt_amt ELSE 0 END,
      v_country, v_ca_pol, COALESCE(e.other_deductions, 0), COALESCE(e.tds_applicable, false),
      'legacy', NULL, NULL
    );

    v_earned_calc := fn_compute_payroll(
      c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
      e.pf_applicable, e.esic_applicable,
      0, 0,
      (v_earned->>'late')::int, (v_earned->>'ul')::int, (v_earned->>'sandwich')::numeric,
      (v_earned->>'mispunch')::int, 0, (v_earned->>'unpaid_training')::int,
      v_late_pol, v_mis_pol, v_ul_mult,
      COALESCE((v_earned->>'ot_minutes')::int, 0), v_ot_pol,
      COALESCE(e.pt_applicable, false),
      CASE WHEN COALESCE(e.pt_applicable, false) THEN v_pt_amt ELSE 0 END,
      v_country, v_ca_pol, COALESCE(e.other_deductions, 0), COALESCE(e.tds_applicable, false),
      'earned',
      (v_earned->>'payroll_days_effective')::int,
      (v_earned->>'attendance_earned')::numeric
    );

    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'employee_id', e.id,
      'emp_code', e.emp_code,
      'legacy_payable', v_legacy_calc->'payable_days',
      'earned_payable', v_earned_calc->'payable_days',
      'delta', round(
        COALESCE((v_earned_calc->>'payable_days')::numeric, 0)
        - COALESCE((v_legacy_calc->>'payable_days')::numeric, 0),
        2
      ),
      'legacy_net', v_legacy_calc->'net_salary',
      'earned_net', v_earned_calc->'net_salary',
      'attendance_earned', v_earned->'attendance_earned',
      'payroll_days_effective', v_earned->'payroll_days_effective'
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'cycle_id', p_cycle,
    'cycle_label', c.label,
    'formula_mode_live', fn_payroll_formula_mode(c.org_id, c.start_date),
    'employees', v_rows
  );
END;
$$;

-- Extend cycle policy snapshot collection
CREATE OR REPLACE FUNCTION fn_collect_cycle_policies(p_org uuid, p_as_of date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  d text;
  pol jsonb;
BEGIN
  FOR d IN SELECT unnest(ARRAY[
    'late', 'mispunch', 'leave', 'sandwich_ul', 'overtime',
    'professional_tax', 'canada_deductions', 'workflow', 'payroll', 'weekly_off'
  ])
  LOOP
    pol := fn_resolve_policy(p_org, d, p_as_of);
    IF pol IS NOT NULL THEN
      v_out := v_out || jsonb_build_object(d, pol);
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_resolve_payroll_policy',
      'fn_payroll_formula_mode',
      'fn_rollup_inputs_legacy',
      'fn_rollup_inputs_earned',
      'fn_rollup_inputs',
      'fn_apply_priority_matrix_c17',
      'fn_payroll_days_effective',
      'fn_compute_payroll',
      'fn_build_payroll_line',
      'fn_compare_payroll_formulas',
      'fn_collect_cycle_policies'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
