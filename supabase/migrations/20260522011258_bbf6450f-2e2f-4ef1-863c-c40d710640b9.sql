
CREATE POLICY "dsh_media insert self"
  ON public.dsh_media
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "dsh_media update self"
  ON public.dsh_media
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "dsh_media delete self"
  ON public.dsh_media
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);
