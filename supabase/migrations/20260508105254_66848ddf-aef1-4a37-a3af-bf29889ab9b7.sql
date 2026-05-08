-- 1. user_roles: restrict SELECT to own row + admin
DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;
CREATE POLICY "user_roles select own or admin"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. call_events: unmatched (client_id IS NULL) → admin only
DROP POLICY IF EXISTS "call_events view scoped" ON public.call_events;
CREATE POLICY "call_events view scoped"
  ON public.call_events
  FOR SELECT
  TO authenticated
  USING (
    (client_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
  );

DROP POLICY IF EXISTS "call_events update scoped" ON public.call_events;
CREATE POLICY "call_events update scoped"
  ON public.call_events
  FOR UPDATE
  TO authenticated
  USING (
    (client_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
  );

-- 3. document_fingerprints: unmatched → admin only
DROP POLICY IF EXISTS "fingerprints view scoped" ON public.document_fingerprints;
CREATE POLICY "fingerprints view scoped"
  ON public.document_fingerprints
  FOR SELECT
  TO authenticated
  USING (
    (client_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
  );

DROP POLICY IF EXISTS "fingerprints insert scoped" ON public.document_fingerprints;
CREATE POLICY "fingerprints insert scoped"
  ON public.document_fingerprints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (client_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
  );

-- 4. document_verifications: unmatched → admin only
DROP POLICY IF EXISTS "verifications view scoped" ON public.document_verifications;
CREATE POLICY "verifications view scoped"
  ON public.document_verifications
  FOR SELECT
  TO authenticated
  USING (
    (client_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
  );

DROP POLICY IF EXISTS "verifications insert scoped" ON public.document_verifications;
CREATE POLICY "verifications insert scoped"
  ON public.document_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (client_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
  );

DROP POLICY IF EXISTS "verifications update scoped" ON public.document_verifications;
CREATE POLICY "verifications update scoped"
  ON public.document_verifications
  FOR UPDATE
  TO authenticated
  USING (
    (client_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
  );