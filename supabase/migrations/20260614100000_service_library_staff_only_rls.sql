-- Restrict Service Library reads to staff roles (block client portal accounts).

CREATE OR REPLACE FUNCTION public.can_view_service_library(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'admin',
        'administrator',
        'counselor',
        'documentation',
        'telecaller'
      )
  );
$$;

COMMENT ON FUNCTION public.can_view_service_library(uuid) IS
  'Staff-only read access for counselor training / Service Library.';

-- service_library
DROP POLICY IF EXISTS "sl view auth" ON public.service_library;
DROP POLICY IF EXISTS "sl view staff" ON public.service_library;
CREATE POLICY "sl view staff" ON public.service_library
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_fee_items
DROP POLICY IF EXISTS "sl_fee view auth" ON public.service_library_fee_items;
DROP POLICY IF EXISTS "sl_fee view staff" ON public.service_library_fee_items;
CREATE POLICY "sl_fee view staff" ON public.service_library_fee_items
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_attachments
DROP POLICY IF EXISTS "sl_att view auth" ON public.service_library_attachments;
DROP POLICY IF EXISTS "sl_att view staff" ON public.service_library_attachments;
CREATE POLICY "sl_att view staff" ON public.service_library_attachments
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_countries
DROP POLICY IF EXISTS "sl_countries view auth" ON public.service_library_countries;
DROP POLICY IF EXISTS "sl_countries view staff" ON public.service_library_countries;
CREATE POLICY "sl_countries view staff" ON public.service_library_countries
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_overrides
DROP POLICY IF EXISTS "sl_overrides view auth" ON public.service_library_overrides;
DROP POLICY IF EXISTS "sl_overrides view staff" ON public.service_library_overrides;
CREATE POLICY "sl_overrides view staff" ON public.service_library_overrides
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_checklist_files
DROP POLICY IF EXISTS "sl_cfiles view auth" ON public.service_library_checklist_files;
DROP POLICY IF EXISTS "sl_cfiles view staff" ON public.service_library_checklist_files;
CREATE POLICY "sl_cfiles view staff" ON public.service_library_checklist_files
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_sop_tasks
DROP POLICY IF EXISTS "sl_sop_tasks view auth" ON public.service_library_sop_tasks;
DROP POLICY IF EXISTS "sl_sop_tasks view staff" ON public.service_library_sop_tasks;
CREATE POLICY "sl_sop_tasks view staff" ON public.service_library_sop_tasks
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_sop_completions
DROP POLICY IF EXISTS "sl_sop_comp view auth" ON public.service_library_sop_completions;
DROP POLICY IF EXISTS "sl_sop_comp view staff" ON public.service_library_sop_completions;
CREATE POLICY "sl_sop_comp view staff" ON public.service_library_sop_completions
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_submission_checklist
DROP POLICY IF EXISTS "sl_sub_chk view auth" ON public.service_library_submission_checklist;
DROP POLICY IF EXISTS "sl_sub_chk view staff" ON public.service_library_submission_checklist;
CREATE POLICY "sl_sub_chk view staff" ON public.service_library_submission_checklist
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_submission_completions
DROP POLICY IF EXISTS "sl_sub_comp view auth" ON public.service_library_submission_completions;
DROP POLICY IF EXISTS "sl_sub_comp view staff" ON public.service_library_submission_completions;
CREATE POLICY "sl_sub_comp view staff" ON public.service_library_submission_completions
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_migration_log
DROP POLICY IF EXISTS "sl_mig_log view auth" ON public.service_library_migration_log;
DROP POLICY IF EXISTS "sl_mig_log view staff" ON public.service_library_migration_log;
CREATE POLICY "sl_mig_log view staff" ON public.service_library_migration_log
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_visa_form_files
DROP POLICY IF EXISTS "sl_vforms view auth" ON public.service_library_visa_form_files;
DROP POLICY IF EXISTS "sl_vforms view staff" ON public.service_library_visa_form_files;
CREATE POLICY "sl_vforms view staff" ON public.service_library_visa_form_files
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service_library_picker_variants
DROP POLICY IF EXISTS "sl_picker_variants read auth" ON public.service_library_picker_variants;
DROP POLICY IF EXISTS "sl_picker_variants read staff" ON public.service_library_picker_variants;
CREATE POLICY "sl_picker_variants read staff" ON public.service_library_picker_variants
  FOR SELECT TO authenticated
  USING (public.can_view_service_library(auth.uid()));

-- service-library-files storage bucket
DROP POLICY IF EXISTS "service_lib_files read" ON storage.objects;
DROP POLICY IF EXISTS "service_lib_files read staff" ON storage.objects;
CREATE POLICY "service_lib_files read staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'service-library-files'
    AND public.can_view_service_library(auth.uid())
  );
