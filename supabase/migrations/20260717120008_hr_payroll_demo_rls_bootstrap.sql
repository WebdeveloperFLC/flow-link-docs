-- =====================================================================
-- HR Payroll — Demo org RLS bootstrap (fixes white screen / empty UI)
-- Without role_assignments, current_hr_role() is NULL and all HR reads fail.
-- Demo org: allow authenticated users to read (View-as switcher + CRM admins).
-- Tighten in production by linking role_assignments per staff user.
-- =====================================================================

DO $$
DECLARE
  v_demo uuid := '00000000-0000-0000-0000-0000000000f1';
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'companies', 'shifts', 'employees', 'employee_documents',
    'payroll_cycles', 'attendance', 'leave_requests', 'approvals',
    'leave_balances', 'compoff_requests', 'late_exemptions', 'mispunch_requests',
    'training_records', 'holidays', 'payroll_lines', 'salary_slips',
    'role_permissions', 'role_assignments', 'audit_log', 'policies',
    'accounting_payouts'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS hr_demo_read_%I ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY hr_demo_read_%I ON %I FOR SELECT TO authenticated USING (org_id = %L::uuid)',
      t, t, v_demo
    );
  END LOOP;
END $$;

-- Allow authenticated users to insert/update demo org rows (dev/demo; prod uses role_assignments)
DO $$
DECLARE
  v_demo uuid := '00000000-0000-0000-0000-0000000000f1';
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'attendance', 'leave_requests', 'compoff_requests', 'late_exemptions',
    'mispunch_requests', 'training_records', 'audit_log'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS hr_demo_write_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS hr_demo_update_%I ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY hr_demo_write_%I ON %I FOR INSERT TO authenticated WITH CHECK (org_id = %L::uuid)',
      t, t, v_demo
    );
    EXECUTE format(
      'CREATE POLICY hr_demo_update_%I ON %I FOR UPDATE TO authenticated USING (org_id = %L::uuid) WITH CHECK (org_id = %L::uuid)',
      t, t, v_demo, v_demo
    );
  END LOOP;
END $$;
