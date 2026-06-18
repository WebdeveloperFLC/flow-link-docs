-- Counselor-assigned 1–5 star rating (Google-review style) on clients.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_rating smallint;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_client_rating_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_client_rating_check
  CHECK (client_rating IS NULL OR (client_rating >= 1 AND client_rating <= 5));

COMMENT ON COLUMN public.clients.client_rating IS 'Counselor-assigned 1-5 star client rating.';
