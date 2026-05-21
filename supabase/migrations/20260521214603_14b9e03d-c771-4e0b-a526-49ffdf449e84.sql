
CREATE TABLE public.dsh_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('poster','copy','edit')),
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt TEXT,
  image_paths TEXT[] NOT NULL DEFAULT '{}',
  output_text TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dsh_ai_gen_user ON public.dsh_ai_generations(user_id, created_at DESC);

ALTER TABLE public.dsh_ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own ai gens"
  ON public.dsh_ai_generations FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users insert own ai gens"
  ON public.dsh_ai_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own ai gens"
  ON public.dsh_ai_generations FOR DELETE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
