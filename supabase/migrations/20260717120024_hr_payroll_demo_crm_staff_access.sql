-- HR Payroll — demo org CRM staff list access (View-as / UAT)
-- fn_list_crm_staff required role_assignments; demo bootstrap only relaxed SELECT on HR tables.
-- Allow authenticated users on demo org to list/link CRM staff (staging UAT).

CREATE OR REPLACE FUNCTION fn_hr_can_access_crm(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    is_hr(p_org)
    OR has_perm(p_org, 'configure')
    OR has_perm(p_org, 'manage_emp')
    OR (
      p_org = '00000000-0000-0000-0000-0000000000f1'::uuid
      AND auth.uid() IS NOT NULL
    );
$$;

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
  WHERE COALESCE(p.deleted_at, p.status) IS DISTINCT FROM 'deleted'
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

CREATE OR REPLACE FUNCTION fn_get_crm_profile(p_staff_id uuid)
RETURNS TABLE (staff_id uuid, email text, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    p.email,
    COALESCE(NULLIF(trim(p.full_name), ''), p.email, p.id::text)
  FROM profiles p
  WHERE p.id = p_staff_id
    AND auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION fn_link_employee_staff(
  p_employee_id uuid,
  p_staff_id    uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_label text;
BEGIN
  SELECT org_id INTO v_org FROM employees WHERE id = p_employee_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  IF NOT fn_hr_can_access_crm(v_org) THEN
    RAISE EXCEPTION 'Manage Emp permission required';
  END IF;

  IF p_staff_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM employees
    WHERE staff_id = p_staff_id AND org_id = v_org AND id <> p_employee_id
  ) THEN
    RAISE EXCEPTION 'This CRM login is already linked to another employee';
  END IF;

  UPDATE employees SET staff_id = p_staff_id, updated_at = now()
  WHERE id = p_employee_id;

  SELECT emp_code || ' · ' || full_name INTO v_label FROM employees WHERE id = p_employee_id;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    v_org, 'HR Admin', 'CRM Login Linked', v_label,
    COALESCE((SELECT email FROM profiles WHERE id = p_staff_id), 'unlinked')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fn_hr_can_access_crm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_crm_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_list_crm_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_link_employee_staff(uuid, uuid) TO authenticated;
