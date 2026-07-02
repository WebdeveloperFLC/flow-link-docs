ALTER TABLE public.client_service_cases
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS removal_reason text;

ALTER TABLE public.client_service_cases
  DROP CONSTRAINT IF EXISTS client_service_cases_lifecycle_status_check;

-- Backfill FIRST (D17: reorder to satisfy CHECK constraint)
UPDATE public.client_service_cases
SET lifecycle_status = CASE WHEN status = 'closed' THEN 'closed' ELSE 'active' END
WHERE lifecycle_status IS NULL
   OR lifecycle_status NOT IN ('active', 'cancelled', 'withdrawn', 'closed', 'archived');

ALTER TABLE public.client_service_cases
  ADD CONSTRAINT client_service_cases_lifecycle_status_check
  CHECK (lifecycle_status IN ('active', 'cancelled', 'withdrawn', 'closed', 'archived'));

COMMENT ON COLUMN public.client_service_cases.lifecycle_status IS
  'Soft lifecycle — archived when removed from client file; never hard-deleted.';

ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS assignment_status text NOT NULL DEFAULT 'assigned';

UPDATE public.client_documents
SET assignment_status = 'assigned'
WHERE assignment_status IS NULL OR assignment_status NOT IN ('assigned', 'unassigned');

ALTER TABLE public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_assignment_status_check;

ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_assignment_status_check
  CHECK (assignment_status IN ('assigned', 'unassigned'));

COMMENT ON COLUMN public.client_documents.assignment_status IS
  'unassigned = stored on client profile, not linked to an active service case.';

CREATE TABLE IF NOT EXISTS public.client_service_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.client_service_cases(id) ON DELETE SET NULL,
  service_code text NOT NULL,
  action text NOT NULL CHECK (action IN (
    'added', 'modified', 'reassigned', 'cancelled', 'removed', 'payment_reassigned'
  )),
  actor_id uuid REFERENCES auth.users(id),
  previous_value jsonb,
  new_value jsonb,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_service_audit_log TO authenticated;
GRANT ALL ON public.client_service_audit_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_client_service_audit_client
  ON public.client_service_audit_log (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_service_audit_case
  ON public.client_service_audit_log (case_id, created_at DESC)
  WHERE case_id IS NOT NULL;

ALTER TABLE public.client_service_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_service_audit_log view scoped" ON public.client_service_audit_log;
CREATE POLICY "client_service_audit_log view scoped"
  ON public.client_service_audit_log FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_service_audit_log insert scoped" ON public.client_service_audit_log;
CREATE POLICY "client_service_audit_log insert scoped"
  ON public.client_service_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

COMMENT ON TABLE public.client_service_audit_log IS
  'Audit trail for service add/remove/reassign — required by SERVICE_MANAGEMENT_AND_DELETION_RULES.md';