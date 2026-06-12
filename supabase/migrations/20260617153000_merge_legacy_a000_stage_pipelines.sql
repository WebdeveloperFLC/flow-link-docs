-- Merge legacy a0000000-* stage_pipelines into canonical c3000001-* seeds.
-- Backfill only touched pipeline_id IS NULL; clients on old pipelines were skipped.
-- Run after 20260617100000_seed_stage_pipelines.sql

CREATE OR REPLACE FUNCTION public._merge_stage_pipeline(_legacy_id uuid, _canonical_id uuid, _note text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  moved integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stage_pipelines WHERE id = _legacy_id) THEN
    RETURN 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stage_pipelines WHERE id = _canonical_id) THEN
    RAISE WARNING 'Canonical pipeline % not found for legacy % (%)', _canonical_id, _legacy_id, _note;
    RETURN 0;
  END IF;

  IF _legacy_id = _canonical_id THEN
    RETURN 0;
  END IF;

  UPDATE public.clients c
  SET
    pipeline_id = _canonical_id,
    current_stage_id = COALESCE(
      (
        SELECT ns.id
        FROM public.pipeline_stages os
        JOIN public.pipeline_stages ns
          ON ns.pipeline_id = _canonical_id
         AND ns.key = os.key
        WHERE os.id = c.current_stage_id
        LIMIT 1
      ),
      public._first_pipeline_stage(_canonical_id)
    ),
    updated_at = now()
  WHERE c.pipeline_id = _legacy_id;

  GET DIAGNOSTICS moved = ROW_COUNT;

  UPDATE public.stage_pipelines
  SET
    is_active = false,
    description = trim(COALESCE(description, '') || ' [Merged → ' || _note || ']'),
    updated_at = now()
  WHERE id = _legacy_id
    AND is_active = true;

  RETURN moved;
END;
$$;

DO $$
DECLARE
  rec record;
  total_moved integer := 0;
  moved integer;
BEGIN
  -- Explicit legacy id → canonical id (production bootstrap set)
  FOR rec IN
    SELECT * FROM (VALUES
      ('a0000000-0000-0000-0000-000000000001'::uuid, 'c3000001-0001-4000-8000-f69c28e543f3'::uuid, 'Canada Study Visa'),
      ('a0000000-0000-0000-0000-000000000002'::uuid, 'c3000001-0001-4000-8000-92607e42d49f'::uuid, 'Canada Express Entry PR'),
      ('a0000000-0000-0000-0000-000000000003'::uuid, 'c3000001-0001-4000-8000-d079aac13902'::uuid, 'United Kingdom Visitor Visa'),
      ('a0000000-0000-0000-0000-000000000004'::uuid, 'c3000001-0001-4000-8000-f172d14c0284'::uuid, 'Australia Student Visa'),
      ('a0000000-0000-0000-0000-000000000005'::uuid, 'c3000001-0001-4000-8000-2b22ec44e33d'::uuid, 'United States Visitor Visa')
    ) AS t(legacy_id, canonical_id, note)
  LOOP
    moved := public._merge_stage_pipeline(rec.legacy_id, rec.canonical_id, rec.note);
    total_moved := total_moved + moved;
  END LOOP;

  -- Same display name → canonical seed (covers any extra a0000000 rows)
  FOR rec IN
    SELECT l.id AS legacy_id, c.id AS canonical_id, c.name AS note
    FROM public.stage_pipelines l
    JOIN public.stage_pipelines c
      ON c.name = l.name
     AND c.id::text LIKE 'c3000001%'
    WHERE l.id::text LIKE 'a0000000-0000-0000-0000%'
      AND l.is_active = true
      AND l.id <> c.id
  LOOP
    moved := public._merge_stage_pipeline(rec.legacy_id, rec.canonical_id, rec.note);
    total_moved := total_moved + moved;
  END LOOP;

  RAISE NOTICE 'Legacy pipeline merge moved % client(s).', total_moved;
END $$;

-- Verify:
-- SELECT sp.id, sp.name, sp.is_active, count(c.id) AS clients
-- FROM stage_pipelines sp
-- LEFT JOIN clients c ON c.pipeline_id = sp.id
-- WHERE sp.id::text LIKE 'a0000000%' OR sp.name ILIKE '%study visa%'
-- GROUP BY sp.id, sp.name, sp.is_active
-- ORDER BY clients DESC, sp.name;

COMMENT ON FUNCTION public._merge_stage_pipeline IS
  'Move clients from a legacy stage_pipeline to canonical; map stages by key; deactivate legacy.';
