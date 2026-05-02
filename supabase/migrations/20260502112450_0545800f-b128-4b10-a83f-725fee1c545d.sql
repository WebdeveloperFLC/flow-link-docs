ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS suppressed_template_items text[] NOT NULL DEFAULT '{}';