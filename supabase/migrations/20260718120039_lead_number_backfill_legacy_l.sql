-- One-time backfill: legacy FL-L-YYYY-NNNN → FL-H|W|C|B-YYYY-NNNN
-- Safe for empty/test environments: two-phase rename avoids unique-index clashes.

CREATE TEMP TABLE _lead_number_remap ON COMMIT DROP AS
SELECT
  l.id,
  l.lead_number AS old_number,
  'FL-' ||
    CASE
      WHEN l.b2b_partner_id IS NOT NULL THEN 'B'
      WHEN l.is_cold_pool OR l.lead_type = 'cold'
           OR COALESCE(l.lead_temperature, '') = 'cold' THEN 'C'
      WHEN l.lead_type = 'hot' OR COALESCE(l.lead_temperature, '') = 'hot' THEN 'H'
      ELSE 'W'
    END ||
    '-' ||
    substring(l.lead_number from '^FL-L-([0-9]{4}-[0-9]{4})$') AS new_number
FROM public.leads l
WHERE l.lead_number ~ '^FL-L-[0-9]{4}-[0-9]{4}$';

DO $$
DECLARE
  v_map_count integer;
  v_collision_count integer;
BEGIN
  SELECT count(*) INTO v_map_count FROM _lead_number_remap;
  IF v_map_count = 0 THEN
    RAISE NOTICE 'lead_number_backfill: no FL-L-* leads to update';
    RETURN;
  END IF;

  SELECT count(*) INTO v_collision_count
  FROM _lead_number_remap r
  JOIN public.leads existing ON existing.lead_number = r.new_number
  WHERE existing.id <> r.id;

  IF v_collision_count > 0 THEN
    RAISE EXCEPTION
      'lead_number_backfill: % target numbers already exist — resolve collisions before re-run',
      v_collision_count;
  END IF;
END;
$$;

-- Phase 1: stage away from FL-L prefix (unique constraint safe)
UPDATE public.leads l
   SET lead_number = 'FL-MIG-' || substring(l.lead_number from '^FL-L-(.+)$')
  FROM _lead_number_remap r
 WHERE l.id = r.id;

-- Phase 2: apply H/W/C/B numbers (preserve year + sequence suffix)
UPDATE public.leads l
   SET lead_number = r.new_number
  FROM _lead_number_remap r
 WHERE l.id = r.id;

-- Clients: refresh denormalized source lead #
UPDATE public.clients c
   SET source_lead_number = l.lead_number
  FROM public.leads l
 WHERE c.source_lead_id = l.id
   AND (
     c.source_lead_number IS NULL
     OR c.source_lead_number ~ '^FL-L-[0-9]{4}-[0-9]{4}$'
   );

-- Activity log: metadata + embedded lead # in summary lines
UPDATE public.client_activity_log cal
   SET metadata = jsonb_set(cal.metadata, '{lead_number}', to_jsonb(l.lead_number::text), true)
  FROM public.leads l
 WHERE cal.lead_id = l.id
   AND cal.metadata ? 'lead_number'
   AND cal.metadata->>'lead_number' ~ '^FL-L-[0-9]{4}-[0-9]{4}$';

UPDATE public.client_activity_log cal
   SET new_value = l.lead_number || substring(cal.new_value from ' — .+$')
  FROM public.leads l
 WHERE cal.lead_id = l.id
   AND cal.new_value ~ '^FL-L-[0-9]{4}-[0-9]{4} — ';

-- Keep sequences ahead of highest issued number per year/type
INSERT INTO public.lead_number_sequences (year, lead_type, last_number)
SELECT
  (regexp_match(l.lead_number, '^FL-[HWCB]-([0-9]{4})-[0-9]{4}$'))[1]::integer AS year,
  (regexp_match(l.lead_number, '^FL-([HWCB])-[0-9]{4}-[0-9]{4}$'))[1] AS lead_type,
  max((regexp_match(l.lead_number, '^FL-[HWCB]-[0-9]{4}-([0-9]{4})$'))[1]::integer) AS last_number
FROM public.leads l
WHERE l.lead_number ~ '^FL-[HWCB]-[0-9]{4}-[0-9]{4}$'
GROUP BY 1, 2
ON CONFLICT (year, lead_type) DO UPDATE
  SET last_number = GREATEST(public.lead_number_sequences.last_number, EXCLUDED.last_number);

DO $$
DECLARE
  v_updated integer;
  v_remaining integer;
BEGIN
  SELECT count(*) INTO v_updated FROM _lead_number_remap;
  SELECT count(*) INTO v_remaining
    FROM public.leads
   WHERE lead_number ~ '^FL-L-[0-9]{4}-[0-9]{4}$';

  RAISE NOTICE 'lead_number_backfill: updated % lead(s); remaining FL-L-*: %', v_updated, v_remaining;

  IF v_remaining > 0 THEN
    RAISE WARNING 'lead_number_backfill: % FL-L-* row(s) still present', v_remaining;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
