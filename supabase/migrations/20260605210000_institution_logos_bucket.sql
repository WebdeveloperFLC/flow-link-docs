-- Public bucket for institution logos (Course Finder + Course Review display).

INSERT INTO storage.buckets (id, name, public)
VALUES ('institution-logos', 'institution-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS institution_logos_public_read ON storage.objects;
CREATE POLICY institution_logos_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'institution-logos');

DROP POLICY IF EXISTS institution_logos_catalog_insert ON storage.objects;
CREATE POLICY institution_logos_catalog_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'institution-logos'
    AND public.can_manage_upi_catalog(auth.uid())
  );

DROP POLICY IF EXISTS institution_logos_catalog_update ON storage.objects;
CREATE POLICY institution_logos_catalog_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'institution-logos'
    AND public.can_manage_upi_catalog(auth.uid())
  );

DROP POLICY IF EXISTS institution_logos_catalog_delete ON storage.objects;
CREATE POLICY institution_logos_catalog_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'institution-logos'
    AND (
      public.can_manage_upi_catalog(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
