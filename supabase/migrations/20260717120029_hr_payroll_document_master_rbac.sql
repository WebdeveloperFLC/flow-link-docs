-- HR Payroll — expose Document Master in role_permissions screens JSON

UPDATE role_permissions
SET screens = screens || '{"docTypes":true}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive')
  AND COALESCE((screens->>'docTypes')::boolean, false) = false;

UPDATE role_permissions
SET screens = screens || '{"docTypes":false}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role IN ('Manager', 'Employee')
  AND NOT (screens ? 'docTypes');

CREATE OR REPLACE FUNCTION fn_reset_hr_role_permissions(p_org uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  DELETE FROM role_permissions WHERE org_id = p_org;

  INSERT INTO role_permissions(org_id, role, can_view, can_apply, can_approve, can_override, can_export, can_configure, can_manage_emp, screens) VALUES
    (p_org, 'Super Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"docTypes":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"docTypes":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Manager', true, true, true, true, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"docTypes":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Executive', true, true, true, false, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"docTypes":true,"shifts":false,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":false,"audit":true}'::jsonb),
    (p_org, 'Manager', true, true, true, false, false, false, false,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":false,"docTypes":false,"shifts":false,"training":true,"calculator":false,"verify":false,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":false,"config":false,"roles":false,"audit":false}'::jsonb),
    (p_org, 'Employee', true, true, false, false, false, false, false,
      '{"dashboard":false,"ess":true,"emp360":false,"employees":false,"docTypes":false,"shifts":false,"training":false,"calculator":false,"verify":false,"attendance":false,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":false,"audit":false}'::jsonb);

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'RBAC Reset', 'role_permissions', '6 roles');

  RETURN 6;
END;
$$;
