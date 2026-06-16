-- Catch-up for partial applies: tables/policies may exist from a failed first run.

CREATE TABLE IF NOT EXISTS public.client_stage_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.stage_pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  note text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id),
  UNIQUE (client_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_client_stage_completions_client
  ON public.client_stage_completions (client_id);

CREATE TABLE IF NOT EXISTS public.client_stage_completion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.stage_pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  action text NOT NULL,
  note text,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_stage_completion_log_client
  ON public.client_stage_completion_log (client_id, created_at DESC);

ALTER TABLE public.client_stage_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_stage_completion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_stage_completions view scoped" ON public.client_stage_completions;
CREATE POLICY "client_stage_completions view scoped"
  ON public.client_stage_completions FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_stage_completions edit scoped" ON public.client_stage_completions;
CREATE POLICY "client_stage_completions edit scoped"
  ON public.client_stage_completions FOR ALL TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_stage_completion_log view scoped" ON public.client_stage_completion_log;
CREATE POLICY "client_stage_completion_log view scoped"
  ON public.client_stage_completion_log FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_stage_completion_log insert scoped" ON public.client_stage_completion_log;
CREATE POLICY "client_stage_completion_log insert scoped"
  ON public.client_stage_completion_log FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

ALTER TABLE public.client_stage_completion_log
  DROP CONSTRAINT IF EXISTS client_stage_completion_log_action_check;

ALTER TABLE public.client_stage_completion_log
  ADD CONSTRAINT client_stage_completion_log_action_check
  CHECK (action IN ('tick', 'untick', 'note_cleared'));

INSERT INTO public.client_stage_completions (client_id, pipeline_id, stage_id, completed_at)
SELECT c.id, c.pipeline_id, ps.id, now()
FROM public.clients c
JOIN public.pipeline_stages cur ON cur.id = c.current_stage_id
JOIN public.pipeline_stages ps
  ON ps.pipeline_id = c.pipeline_id
 AND ps.sort_order < cur.sort_order
WHERE c.pipeline_id IS NOT NULL
  AND c.current_stage_id IS NOT NULL
ON CONFLICT (client_id, stage_id) DO NOTHING;
