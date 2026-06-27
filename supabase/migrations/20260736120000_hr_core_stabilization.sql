-- =====================================================================
-- HR Core Stabilization Sprint — approved P1/P2/P3 database catchups
-- No payroll engine / leave policy / architecture changes
-- =====================================================================

-- P3: Training assignment remarks
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS remarks text;

-- P2: Holiday multi-branch (preserve branch_id; branch_ids is additive)
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS branch_ids uuid[];

UPDATE holidays
SET branch_ids = ARRAY[branch_id]
WHERE branch_id IS NOT NULL
  AND (branch_ids IS NULL OR branch_ids = '{}');

COMMENT ON COLUMN holidays.branch_ids IS
  'Optional multi-branch applicability. NULL/empty = all branches (or legacy branch_id when set).';

-- P1: Approval Center — HR approvers may act on Manager stage (small org / no manager assigned)
CREATE OR REPLACE FUNCTION fn_can_approve_stage(
  p_org uuid,
  p_employee_id uuid,
  p_stage approval_stage
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mgr uuid;
BEGIN
  IF p_stage = 'Manager' THEN
    IF manages_employee(p_org, p_employee_id) OR has_perm(p_org, 'manage_emp') THEN
      RETURN true;
    END IF;
    IF has_perm(p_org, 'approve') THEN
      SELECT reporting_mgr_id INTO v_mgr FROM employees WHERE id = p_employee_id;
      IF v_mgr IS NULL THEN
        RETURN true;
      END IF;
    END IF;
    RETURN false;
  ELSIF p_stage IN ('HR', 'Final') THEN
    RETURN has_perm(p_org, 'approve');
  END IF;
  RETURN false;
END;
$$;
