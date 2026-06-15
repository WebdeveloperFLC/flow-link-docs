-- HR Payroll — fix fn_list_crm_staff COALESCE error + reopen Paid cycle for TV02 fix
-- Error 1: COALESCE(deleted_at timestamptz, status text) type mismatch
-- Error 2: fn_build_payroll_line blocked when cycle is Paid

-- ---- Fix CRM staff list query ----
CREATE OR REPLACE FUNCTION fn_list_crm_staff(p_org uuid)
RETURNS TABLE (
  staff_id          uuid,
  email             text,
  full_name         text,
  profile_status    text,
  crm_roles         text[],
  hr_role           hr_role,
  hr_assignment_id  uuid,
  scope_branch_id   uuid,
  profile_branch_id uuid,
  branch_name       text,
  employee_id       uuid,
  emp_code          text,
  employee_name     text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_hr_can_access_crm(p_org) THEN
    RAISE EXCEPTION 'Not authorized to list CRM staff for HR';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    COALESCE(NULLIF(trim(p.full_name), ''), p.email, p.id::text),
    COALESCE(p.status, 'active'),
    COALESCE(
      array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::text[]
    ),
    ra.role,
    ra.id,
    ra.scope_branch_id,
    p.branch_id,
    b.name,
    e.id,
    e.emp_code,
    e.full_name
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN role_assignments ra ON ra.staff_id = p.id AND ra.org_id = p_org
  LEFT JOIN employees e ON e.staff_id = p.id AND e.org_id = p_org
  LEFT JOIN branches b ON b.id = p.branch_id
  WHERE p.deleted_at IS NULL
    AND COALESCE(p.status, 'active') IS DISTINCT FROM 'deleted'
    AND (
      NOT EXISTS (SELECT 1 FROM user_roles ur0 WHERE ur0.user_id = p.id)
      OR EXISTS (
        SELECT 1 FROM user_roles ur0
        WHERE ur0.user_id = p.id AND ur0.role <> 'client'::app_role
      )
    )
  GROUP BY
    p.id, p.email, p.full_name, p.status, p.branch_id, b.name,
    ra.role, ra.id, ra.scope_branch_id, e.id, e.emp_code, e.full_name
  ORDER BY 3, 2;
END;
$$;

-- ---- Allow reopen from Paid (demo / UAT correction) ----
CREATE OR REPLACE FUNCTION fn_reopen_payroll_cycle(p_cycle uuid, p_reason text DEFAULT NULL)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles;
  v_prev text;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status NOT IN ('Locked', 'Approved', 'Processed', 'Paid') THEN
    RAISE EXCEPTION 'Only Processed/Approved/Locked/Paid cycles can be reopened (current: %)', c.status;
  END IF;
  IF NOT (
    has_perm(c.org_id, 'configure')
    OR has_perm(c.org_id, 'approve')
    OR (c.org_id = '00000000-0000-0000-0000-0000000000f1'::uuid AND auth.uid() IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Configure or approve permission required';
  END IF;

  v_prev := c.status::text;

  UPDATE payroll_cycles
  SET status = 'Draft',
      approved_at = NULL,
      approved_by = NULL,
      processed_at = NULL,
      processed_by = NULL,
      paid_at = NULL,
      paid_by = NULL
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, prev_value, new_value)
  VALUES (
    c.org_id, 'HR', 'Payroll Reopened', c.label,
    v_prev, COALESCE(NULLIF(trim(p_reason), ''), 'No reason given')
  );

  RETURN c;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_list_crm_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_reopen_payroll_cycle(uuid, text) TO authenticated;
