-- Late coming deduction: configured slabs + uncapped formula fallback (no 5.5 cap).
-- Empty/invalid slab_table → default company slabs + RAISE WARNING.

CREATE OR REPLACE FUNCTION fn_late_deduction_formula(p_late int)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_late <= 0 THEN 0::numeric
    ELSE 1.0 + floor((p_late - 1) / 3.0) * 0.5
  END;
$$;

CREATE OR REPLACE FUNCTION fn_is_valid_late_slab_table(p_table jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  elem jsonb;
  v_max int;
  v_ded numeric;
BEGIN
  IF p_table IS NULL OR jsonb_typeof(p_table) <> 'array' OR jsonb_array_length(p_table) = 0 THEN
    RETURN false;
  END IF;
  FOR elem IN SELECT value FROM jsonb_array_elements(p_table) AS t(value)
  LOOP
    IF elem->>'max' IS NULL OR elem->>'deduction' IS NULL THEN
      RETURN false;
    END IF;
    BEGIN
      v_max := (elem->>'max')::int;
      v_ded := (elem->>'deduction')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RETURN false;
    END;
    IF v_max <= 0 OR v_ded < 0 THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION fn_resolve_late_slab_table(p_policy jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_table jsonb;
BEGIN
  v_table := p_policy->'slab_table';
  IF fn_is_valid_late_slab_table(v_table) THEN
    RETURN v_table;
  END IF;
  RAISE WARNING 'Late policy slab_table missing or invalid; using default company late deduction slabs.';
  RETURN '[
    {"max": 3, "deduction": 1.0},
    {"max": 6, "deduction": 1.5},
    {"max": 9, "deduction": 2.0},
    {"max": 12, "deduction": 2.5},
    {"max": 15, "deduction": 3.0},
    {"max": 18, "deduction": 3.5},
    {"max": 21, "deduction": 4.0},
    {"max": 24, "deduction": 4.5},
    {"max": 27, "deduction": 5.0}
  ]'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION fn_late_deduction(p_late int, p_policy jsonb DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE
  slab record;
  v_table jsonb;
BEGIN
  IF p_late <= 0 THEN
    RETURN 0;
  END IF;

  v_table := fn_resolve_late_slab_table(p_policy);

  FOR slab IN
    SELECT (elem->>'max')::int AS max_late, (elem->>'deduction')::numeric AS ded
    FROM jsonb_array_elements(v_table) AS elem
    ORDER BY (elem->>'max')::int
  LOOP
    IF p_late <= slab.max_late THEN
      RETURN slab.ded;
    END IF;
  END LOOP;

  RETURN fn_late_deduction_formula(p_late);
END;
$$;

-- Remove legacy 999/5.5 cap rows from stored late policies.
UPDATE policies
SET config = jsonb_set(
  config,
  '{slab_table}',
  (
    SELECT COALESCE(jsonb_agg(elem ORDER BY (elem->>'max')::int), '[]'::jsonb)
    FROM jsonb_array_elements(config->'slab_table') AS elem
    WHERE (elem->>'max')::int < 900
  )
)
WHERE domain = 'late'
  AND config ? 'slab_table'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(config->'slab_table') AS elem
    WHERE (elem->>'max')::int >= 900
  );

-- Ensure demo org late policy v2 seed matches (no cap row).
UPDATE policies
SET config = jsonb_set(
  config,
  '{slab_table}',
  '[
    {"max": 3, "deduction": 1.0},
    {"max": 6, "deduction": 1.5},
    {"max": 9, "deduction": 2.0},
    {"max": 12, "deduction": 2.5},
    {"max": 15, "deduction": 3.0},
    {"max": 18, "deduction": 3.5},
    {"max": 21, "deduction": 4.0},
    {"max": 24, "deduction": 4.5},
    {"max": 27, "deduction": 5.0}
  ]'::jsonb
)
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
  AND domain = 'late'
  AND version = 2;
