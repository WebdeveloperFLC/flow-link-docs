-- =====================================================================
-- HR Payroll — Supabase Storage bucket `hr-docs`
-- Document files for employee_documents.storage_path
-- Run after 20260717120009_hr_payroll_crm_team_integration.sql
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-docs',
  'hr-docs',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS hr_docs_select ON storage.objects;
DROP POLICY IF EXISTS hr_docs_insert ON storage.objects;
DROP POLICY IF EXISTS hr_docs_update ON storage.objects;
DROP POLICY IF EXISTS hr_docs_delete ON storage.objects;

-- Authenticated HR users (role assignment or linked employee) may access hr-docs
CREATE POLICY hr_docs_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hr-docs'
    AND (
      EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.staff_id = auth.uid())
      OR EXISTS (SELECT 1 FROM employees e WHERE e.staff_id = auth.uid())
    )
  );

CREATE POLICY hr_docs_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hr-docs'
    AND EXISTS (
      SELECT 1 FROM role_assignments ra
      WHERE ra.staff_id = auth.uid()
        AND ra.role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive')
    )
  );

CREATE POLICY hr_docs_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hr-docs')
  WITH CHECK (bucket_id = 'hr-docs');

CREATE POLICY hr_docs_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hr-docs'
    AND EXISTS (
      SELECT 1 FROM role_assignments ra
      WHERE ra.staff_id = auth.uid()
        AND ra.role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive')
    )
  );
