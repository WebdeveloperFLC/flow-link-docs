ALTER TABLE public.letter_templates
  ADD COLUMN IF NOT EXISTS country text NULL,
  ADD COLUMN IF NOT EXISTS category text NULL;

-- Replace the implicit "one active per kind" with "one active per (kind, country, category)"
CREATE UNIQUE INDEX IF NOT EXISTS letter_templates_active_scope_uniq
  ON public.letter_templates (kind, COALESCE(country, ''), COALESCE(category, ''))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS letter_templates_kind_scope_idx
  ON public.letter_templates (kind, country, category, is_active);