-- Merge legacy "Canada PR Express Entry" into seeded "Canada Express Entry PR".
-- Legacy id: a0000000-0000-0000-0000-000000000002 (PR Express Entry)
-- Canonical: c3000001-0001-4000-8000-92607e42d49f (Express Entry PR)

DO $$
DECLARE
  legacy_pid uuid := 'a0000000-0000-0000-0000-000000000002'::uuid;
  canonical_pid uuid := 'c3000001-0001-4000-8000-92607e42d49f'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stage_pipelines WHERE id = legacy_pid) THEN
    RAISE NOTICE 'Legacy Express Entry pipeline not found — skipping merge.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stage_pipelines WHERE id = canonical_pid) THEN
    RAISE EXCEPTION 'Canonical Canada Express Entry PR pipeline missing. Apply 20260617100000_seed_stage_pipelines.sql first.';
  END IF;

  UPDATE public.clients c
  SET
    pipeline_id = canonical_pid,
    current_stage_id = COALESCE(
      (
        SELECT ns.id
        FROM public.pipeline_stages os
        JOIN public.pipeline_stages ns
          ON ns.pipeline_id = canonical_pid
         AND ns.key = os.key
        WHERE os.id = c.current_stage_id
        LIMIT 1
      ),
      public._first_pipeline_stage(canonical_pid)
    ),
    updated_at = now()
  WHERE c.pipeline_id = legacy_pid;

  UPDATE public.stage_pipelines
  SET
    is_active = false,
    description = COALESCE(description, '') || ' [Merged into Canada Express Entry PR — inactive]',
    updated_at = now()
  WHERE id = legacy_pid;
END $$;
