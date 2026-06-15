-- =====================================================================
-- HR Payroll — ESS document download: employees read own hr-docs folder only
-- Path layout: {org_id}/{employee_id}/{filename}
-- =====================================================================

DROP POLICY IF EXISTS hr_docs_select ON storage.objects;

CREATE POLICY hr_docs_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hr-docs'
    AND (
      EXISTS (
        SELECT 1 FROM role_assignments ra
        WHERE ra.staff_id = auth.uid()
          AND ra.role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive', 'Manager')
      )
      OR EXISTS (
        SELECT 1 FROM employees e
        WHERE e.staff_id = auth.uid()
          AND (storage.foldername(name))[1] = e.org_id::text
          AND (storage.foldername(name))[2] = e.id::text
      )
    )
  );
