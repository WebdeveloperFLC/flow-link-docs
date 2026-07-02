-- Phase 2B: Storage for aggregator remittance statements

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'upi-commission-aggregator-statements',
  'upi-commission-aggregator-statements',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS ucas_storage_select ON storage.objects;
DROP POLICY IF EXISTS ucas_storage_insert ON storage.objects;
DROP POLICY IF EXISTS ucas_storage_delete ON storage.objects;

CREATE POLICY ucas_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'upi-commission-aggregator-statements'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucas_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'upi-commission-aggregator-statements'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucas_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'upi-commission-aggregator-statements'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_admin(auth.uid())
    )
  );
