-- Phase 2B: Storage policies for aggregator remittance statements
-- NOTE: Bucket creation INSERT stripped (D13) — bucket already exists; created via storage_create_bucket per platform rule.

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