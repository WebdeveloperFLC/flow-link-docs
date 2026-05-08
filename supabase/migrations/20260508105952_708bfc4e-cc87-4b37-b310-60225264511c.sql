-- Phase 2c: Storage RLS hardening for the 'client-documents' bucket.
--
-- POLICY LOGIC
-- ------------
-- The bucket previously allowed any authenticated user to read/write any object,
-- relying on the secrecy of the path. Phase 2b confirmed every object is
-- tracked in client_documents, binders, or filled_forms, with the client UUID
-- always at the first path segment.
--
-- New rules (authenticated role, non-service-role traffic only — service role
-- continues to bypass RLS, so all edge functions remain unaffected):
--
--   SELECT  : object path must appear in client_documents.storage_path,
--             binders.storage_path, or filled_forms.file_path, AND the caller
--             must pass can_view_client(client_id) for that row.
--   INSERT  : object is being created BEFORE the tracking row exists, so we
--             authorize using the first path segment as the client_id and
--             require can_upload_client(auth.uid(), that_id).
--   UPDATE  : same path-prefix check using can_edit_client. Used by upserts
--             from fill-form (service role today, but kept user-safe).
--   DELETE  : unchanged — admin-only (existing "admins delete client docs").
--
-- Signed URLs: createSignedUrl issued by service role (generate-letter,
-- process-large-file) is unaffected. Client-side createSignedUrl in
-- ClientFormsCard targets filled_forms.file_path, which the SELECT policy
-- explicitly authorizes.
--
-- ROLLBACK
-- --------
-- To revert, run:
--   DROP POLICY "client-documents read scoped"   ON storage.objects;
--   DROP POLICY "client-documents insert scoped" ON storage.objects;
--   DROP POLICY "client-documents update scoped" ON storage.objects;
--   CREATE POLICY "team reads client docs" ON storage.objects FOR SELECT TO authenticated
--     USING (bucket_id = 'client-documents');
--   CREATE POLICY "team uploads client docs" ON storage.objects FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'client-documents'
--       AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'counselor') OR has_role(auth.uid(),'documentation')));
--   CREATE POLICY "team updates client docs" ON storage.objects FOR UPDATE TO authenticated
--     USING (bucket_id = 'client-documents'
--       AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'counselor') OR has_role(auth.uid(),'documentation')));

-- Replace permissive policies
DROP POLICY IF EXISTS "team reads client docs"   ON storage.objects;
DROP POLICY IF EXISTS "team uploads client docs" ON storage.objects;
DROP POLICY IF EXISTS "team updates client docs" ON storage.objects;

-- SELECT: must be a tracked path AND caller can view the owning client
CREATE POLICY "client-documents read scoped"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.client_documents d
         WHERE d.storage_path = storage.objects.name
           AND public.can_view_client(auth.uid(), d.client_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.binders b
         WHERE b.storage_path = storage.objects.name
           AND public.can_view_client(auth.uid(), b.client_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.filled_forms f
         WHERE f.file_path = storage.objects.name
           AND public.can_view_client(auth.uid(), f.client_id)
      )
    )
  );

-- INSERT: tracking row does not exist yet; authorize by client UUID prefix
CREATE POLICY "client-documents insert scoped"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND public.can_upload_client(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

-- UPDATE: same prefix-based check using edit permission (covers upsert flows)
CREATE POLICY "client-documents update scoped"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND public.can_edit_client(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

-- DELETE policy ("admins delete client docs") is intentionally left untouched.