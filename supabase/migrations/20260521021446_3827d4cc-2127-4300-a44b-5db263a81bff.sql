
WITH lvl AS (
  SELECT id, name FROM public.upi_program_levels
),
src AS (
  SELECT
    s.id,
    lower(regexp_replace(coalesce(s.metadata->>'program_level',''), '[._-]+', ' ', 'g')) AS t
  FROM public.upi_courses_staging s
  WHERE s.program_level_id IS NULL
    AND coalesce(s.metadata->>'program_level','') <> ''
),
mapped AS (
  SELECT
    src.id,
    CASE
      WHEN src.t ~ '\mmba\M' THEN 'MBA'
      WHEN src.t ~ '\m(phd|ph\.?d|doctorate|doctoral|dphil)\M' THEN 'PhD / Doctorate'
      WHEN src.t ~ '\mpost\s*doc' THEN 'Postdoctoral'
      WHEN src.t ~ '(graduate|grad|postgraduate|pg)\s+certificate' OR src.t ~ 'ontario college graduate certificate' THEN 'Graduate Certificate'
      WHEN src.t ~ '(graduate|grad|postgraduate|pg)\s+diploma' OR src.t ~ 'postgraduate diploma' THEN 'Graduate Diploma'
      WHEN src.t ~ '\massociate\M' THEN 'Associate Degree'
      WHEN src.t ~ 'advanced\s+diploma' THEN 'Advanced Diploma'
      WHEN src.t ~ '\m(master|masters|m\.?a|m\.?sc|m\.?ed|m\.?eng|meng|mres)\M' OR src.t ~ 'master of' OR src.t ~ 'master''s' THEN 'Master'
      WHEN src.t ~ '\m(bachelor|bachelors|undergrad|undergraduate|b\.?a|b\.?sc|b\.?ed|b\.?eng|beng|bcom|honors|honours)\M' OR src.t ~ 'bachelor of' OR src.t ~ 'bachelor''s' THEN 'Bachelor'
      WHEN src.t ~ '\mdiploma\M' THEN 'Diploma'
      WHEN src.t ~ '\mcertificate\M' THEN 'Certificate'
      ELSE NULL
    END AS canonical_name
  FROM src
)
UPDATE public.upi_courses_staging s
   SET program_level_id = lvl.id
  FROM mapped, lvl
 WHERE s.id = mapped.id
   AND mapped.canonical_name IS NOT NULL
   AND lvl.name = mapped.canonical_name;
