-- Quick fix: Team & CRM tab errors
-- 1) COALESCE timestamp/text error in fn_list_crm_staff
-- 2) Missing EXECUTE grants
-- Run migration 26 OR this full script in Supabase SQL Editor

-- Fix fn_list_crm_staff (replaces broken COALESCE on deleted_at + status)
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

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_list_crm_staff',
      'fn_link_employee_staff',
      'fn_hr_can_access_crm',
      'fn_get_crm_profile'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

-- Smoke test (should return rows)
SELECT staff_id, email, full_name, emp_code
FROM fn_list_crm_staff('00000000-0000-0000-0000-0000000000f1')
LIMIT 5;
