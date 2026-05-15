
CREATE TABLE public.course_finder_saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfsf_owner ON public.course_finder_saved_filters(owner_id);
CREATE INDEX idx_cfsf_shared ON public.course_finder_saved_filters(is_shared) WHERE is_shared;

ALTER TABLE public.course_finder_saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cfsf_select"
  ON public.course_finder_saved_filters FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_shared = true
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "cfsf_insert"
  ON public.course_finder_saved_filters FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_shared = false OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "cfsf_update"
  ON public.course_finder_saved_filters FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    AND (is_shared = false OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "cfsf_delete"
  ON public.course_finder_saved_filters FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_cfsf_touch_updated_at
  BEFORE UPDATE ON public.course_finder_saved_filters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
