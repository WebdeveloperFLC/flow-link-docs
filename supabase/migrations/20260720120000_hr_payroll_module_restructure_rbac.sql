-- HR Payroll — RBAC screens for restructured module (Approvals, Reports, Payroll sub-screens)

UPDATE role_permissions
SET screens = screens || '{
  "documents": true,
  "approvals": true,
  "reports": true,
  "payrollCycle": true,
  "salaryRegister": true,
  "payrollHistory": true
}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive');

UPDATE role_permissions
SET screens = screens || '{
  "documents": false,
  "approvals": true,
  "reports": false,
  "payrollCycle": false,
  "salaryRegister": false,
  "payrollHistory": false
}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role = 'Manager';

UPDATE role_permissions
SET screens = screens || '{
  "documents": false,
  "approvals": false,
  "reports": false,
  "payrollCycle": false,
  "salaryRegister": false,
  "payrollHistory": false
}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role = 'Employee';

CREATE OR REPLACE FUNCTION fn_reset_hr_role_permissions(p_org uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  DELETE FROM role_permissions WHERE org_id = p_org;

  INSERT INTO role_permissions(org_id, role, can_view, can_apply, can_approve, can_override, can_export, can_configure, can_manage_emp, screens) VALUES
    (p_org, 'Super Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":true,"docTypes":true,"shifts":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":true,"docTypes":true,"shifts":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Manager', true, true, true, true, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":false,"docTypes":true,"shifts":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Executive', true, true, true, false, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":false,"docTypes":true,"shifts":false,"roles":false,"audit":true}'::jsonb),
    (p_org, 'Manager', true, true, true, false, false, false, false,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":false,"documents":false,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":false,"payrollCycle":false,"calculator":false,"verify":false,"salaryRegister":false,"payrollHistory":false,"approvals":true,"reports":false,"config":false,"docTypes":false,"shifts":false,"roles":false,"audit":false}'::jsonb),
    (p_org, 'Employee', true, true, false, false, false, false, false,
      '{"dashboard":false,"ess":true,"emp360":false,"employees":false,"documents":false,"training":false,"attendance":false,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":false,"calculator":false,"verify":false,"salaryRegister":false,"payrollHistory":false,"approvals":false,"reports":false,"config":false,"docTypes":false,"shifts":false,"roles":false,"audit":false}'::jsonb);

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'RBAC Reset', 'role_permissions', '6 roles (restructured nav)');

  RETURN 6;
END;
$$;
