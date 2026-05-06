-- Allow upsert with onConflict on client_access
CREATE UNIQUE INDEX IF NOT EXISTS client_access_client_user_uq
  ON public.client_access (client_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS client_access_client_team_uq
  ON public.client_access (client_id, team_id)
  WHERE team_id IS NOT NULL;
