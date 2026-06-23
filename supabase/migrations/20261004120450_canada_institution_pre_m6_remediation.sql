-- Pre-M6 Canada Institution Master remediation
-- 1) Audit baseline captured in docs/guides/CANADA_INSTITUTION_PRE_M6_GAP_REPORT.md
-- 2) Populate institution_type where NULL on existing Canadian UPI rows
-- 3) Insert missing Ontario public colleges (9) + major ON universities (12) as Draft
-- 4) Ensure website_url, country_name, state_province, institution_type on all seeded rows
-- Institution Master only — no CF, Mark Final, or fee schedule changes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'upi_institutions'
      AND column_name = 'institution_status'
  ) THEN
    RAISE EXCEPTION 'PRE_M6_CANADA_BLOCKED: run M1 migration 20261004120000 first';
  END IF;
END $$;

CREATE TEMP TABLE _canada_pre_m6_seed (
  upi_institution_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  institution_type text NOT NULL,
  city text NOT NULL,
  state_province text NOT NULL DEFAULT 'Ontario',
  website_url text NOT NULL,
  notes text
) ON COMMIT DROP;

INSERT INTO _canada_pre_m6_seed (
  upi_institution_id, name, slug, institution_type, city, state_province, website_url, notes
) VALUES
  -- Existing CF-linked (update/enrich by dedup key — IDs informational only)
  ('a835c2fd-27fc-448f-b814-26fe807033bb'::uuid,
    'Algonquin College', 'algonquin-college', 'Public College', 'Ottawa', 'Ontario',
    'https://www.algonquincollege.com', 'Pre-M6 enrich existing CF-linked UPI'),
  ('11111111-1111-1111-1111-111111110002'::uuid,
    'Conestoga College', 'conestoga-college', 'Public College', 'Kitchener', 'Ontario',
    'https://www.conestogac.on.ca', 'Pre-M6 enrich existing CF-linked UPI'),
  ('11111111-1111-1111-1111-111111110001'::uuid,
    'Seneca Polytechnic', 'seneca-polytechnic', 'Polytechnic', 'Toronto', 'Ontario',
    'https://www.senecapolytechnic.ca', 'Pre-M6 enrich existing CF-linked UPI'),
  ('22222222-1111-1111-1111-111111110002'::uuid,
    'McGill University', 'mcgill-university', 'University', 'Montreal', 'Quebec',
    'https://www.mcgill.ca', 'Pre-M6 enrich existing CF-linked UPI'),
  ('22222222-1111-1111-1111-111111110008'::uuid,
    'University of British Columbia', 'university-of-british-columbia', 'University', 'Vancouver', 'British Columbia',
    'https://www.ubc.ca', 'Pre-M6 enrich existing CF-linked UPI'),
  ('22222222-1111-1111-1111-111111110012'::uuid,
    'University of Toronto', 'university-of-toronto', 'University', 'Toronto', 'Ontario',
    'https://www.utoronto.ca', 'Pre-M6 enrich existing CF-linked UPI'),

  -- Missing Ontario public colleges (9)
  ('33333333-1111-1111-1111-111111110001'::uuid,
    'Cambrian College', 'cambrian-college', 'Public College', 'Sudbury', 'Ontario',
    'https://cambriancollege.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110002'::uuid,
    'Fleming College', 'fleming-college', 'Public College', 'Peterborough', 'Ontario',
    'https://flemingcollege.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110003'::uuid,
    'Lambton College', 'lambton-college', 'Public College', 'Sarnia', 'Ontario',
    'https://www.lambtoncollege.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110004'::uuid,
    'Niagara College', 'niagara-college', 'Public College', 'Welland', 'Ontario',
    'https://www.niagaracollege.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110005'::uuid,
    'Northern College', 'northern-college', 'Public College', 'Timmins', 'Ontario',
    'https://www.northernc.on.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110006'::uuid,
    'St. Clair College', 'st-clair-college', 'Public College', 'Windsor', 'Ontario',
    'https://www.stclaircollege.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110007'::uuid,
    'St. Lawrence College', 'st-lawrence-college', 'Public College', 'Kingston', 'Ontario',
    'https://www.stlawrencecollege.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110008'::uuid,
    'Collège La Cité', 'college-la-cite', 'Public College', 'Ottawa', 'Ontario',
    'https://www.collegelacite.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110009'::uuid,
    'Collège Boréal', 'college-boreal', 'Public College', 'Sudbury', 'Ontario',
    'https://www.collegeboreal.ca', 'Pre-M6 insert Draft'),

  -- Missing major Canadian universities (12 — Ontario focus)
  ('33333333-1111-1111-1111-111111110010'::uuid,
    'McMaster University', 'mcmaster-university', 'University', 'Hamilton', 'Ontario',
    'https://www.mcmaster.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110011'::uuid,
    'University of Waterloo', 'university-of-waterloo', 'University', 'Waterloo', 'Ontario',
    'https://uwaterloo.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110012'::uuid,
    'York University', 'york-university', 'University', 'Toronto', 'Ontario',
    'https://www.yorku.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110013'::uuid,
    'Toronto Metropolitan University', 'toronto-metropolitan-university', 'University', 'Toronto', 'Ontario',
    'https://www.torontomu.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110014'::uuid,
    'Western University', 'western-university', 'University', 'London', 'Ontario',
    'https://www.uwo.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110015'::uuid,
    'University of Ottawa', 'university-of-ottawa', 'University', 'Ottawa', 'Ontario',
    'https://www.uottawa.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110016'::uuid,
    'Carleton University', 'carleton-university', 'University', 'Ottawa', 'Ontario',
    'https://carleton.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110017'::uuid,
    'Wilfrid Laurier University', 'wilfrid-laurier-university', 'University', 'Waterloo', 'Ontario',
    'https://www.wlu.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110018'::uuid,
    'University of Guelph', 'university-of-guelph', 'University', 'Guelph', 'Ontario',
    'https://www.uoguelph.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110019'::uuid,
    'Trent University', 'trent-university', 'University', 'Peterborough', 'Ontario',
    'https://www.trentu.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110020'::uuid,
    'Nipissing University', 'nipissing-university', 'University', 'North Bay', 'Ontario',
    'https://www.nipissingu.ca', 'Pre-M6 insert Draft'),
  ('33333333-1111-1111-1111-111111110021'::uuid,
    'OCAD University', 'ocad-university', 'University', 'Toronto', 'Ontario',
    'https://www.ocadu.ca', 'Pre-M6 insert Draft');

-- ---------------------------------------------------------------------------
-- Enrich existing Canadian UPI rows (by dedup key — preserves actual id)
-- ---------------------------------------------------------------------------

WITH updated AS (
  UPDATE public.upi_institutions i
  SET
    institution_type = COALESCE(
      NULLIF(trim(i.institution_type), ''),
      s.institution_type
    ),
    website_url = COALESCE(NULLIF(trim(i.website_url), ''), s.website_url),
    country_name = COALESCE(NULLIF(trim(i.country_name), ''), 'Canada'),
    country_id = COALESCE(
      i.country_id,
      (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA' LIMIT 1)
    ),
    city = COALESCE(NULLIF(trim(i.city), ''), s.city),
    state_province = COALESCE(NULLIF(trim(i.state_province), ''), s.state_province),
    slug = COALESCE(NULLIF(trim(i.slug), ''), s.slug),
    metadata = i.metadata || jsonb_build_object(
      'pre_m6_canada_remediation', '20261004120450',
      'pre_m6_enriched_at', now()
    )
  FROM _canada_pre_m6_seed s
  WHERE public.upi_institution_dedup_key(i.name, i.country_name)
      = public.upi_institution_dedup_key(s.name, 'Canada')
     OR public.upi_institution_dedup_key(i.name, 'Canada')
      = public.upi_institution_dedup_key(s.name, 'Canada')
  RETURNING i.id
)
SELECT count(*) FROM updated;

-- Populate institution_type on ANY remaining Canadian row where still NULL
UPDATE public.upi_institutions i
SET institution_type = CASE
  WHEN lower(i.name) LIKE '%polytechnic%' THEN 'Polytechnic'
  WHEN lower(i.name) LIKE '%university%' OR lower(i.name) LIKE '%université%' THEN 'University'
  WHEN lower(i.name) LIKE '%college%' OR lower(i.name) LIKE '%collège%' OR lower(i.name) LIKE '%cégep%' THEN 'Public College'
  ELSE 'Other'
END
WHERE i.institution_type IS NULL
  AND (
    lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
    OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA')
  );

-- Backfill country/province on Canadian rows still missing them
UPDATE public.upi_institutions i
SET
  country_name = COALESCE(NULLIF(trim(i.country_name), ''), 'Canada'),
  country_id = COALESCE(
    i.country_id,
    (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA' LIMIT 1)
  ),
  state_province = COALESCE(NULLIF(trim(i.state_province), ''), 'Ontario')
WHERE (
    lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
    OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA')
  )
  AND (
    i.country_name IS NULL OR trim(i.country_name) = ''
    OR i.state_province IS NULL OR trim(i.state_province) = ''
  );

-- ---------------------------------------------------------------------------
-- Insert missing institutions (Draft — no CF linkage in this migration)
-- ---------------------------------------------------------------------------

INSERT INTO public.upi_institutions (
  id,
  name,
  slug,
  country_name,
  country_id,
  city,
  state_province,
  website_url,
  institution_type,
  institution_status,
  is_active,
  is_partner,
  catalog_status,
  metadata,
  notes
)
SELECT
  s.upi_institution_id,
  s.name,
  s.slug,
  'Canada',
  (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA' LIMIT 1),
  s.city,
  s.state_province,
  s.website_url,
  s.institution_type,
  'Draft',
  false,
  false,
  'hidden',
  jsonb_build_object(
    'source', 'canada_pre_m6_remediation',
    'seed_phase', 'pre_m6_targeted',
    'migration', '20261004120450'
  ),
  s.notes
FROM _canada_pre_m6_seed s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.upi_institutions i
  WHERE public.upi_institution_dedup_key(i.name, coalesce(i.country_name, 'Canada'))
    = public.upi_institution_dedup_key(s.name, 'Canada')
);

-- ---------------------------------------------------------------------------
-- Verification + audit notices
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_canada_total integer;
  v_missing_type integer;
  v_missing_website integer;
  v_missing_country integer;
  v_missing_province integer;
  v_draft_new integer;
  rec record;
BEGIN
  SELECT count(*)::integer INTO v_canada_total
  FROM public.upi_institutions i
  WHERE lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
     OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA');

  SELECT count(*)::integer INTO v_missing_type
  FROM public.upi_institutions i
  WHERE (lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
     OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA'))
    AND (i.institution_type IS NULL OR trim(i.institution_type) = '');

  SELECT count(*)::integer INTO v_missing_website
  FROM public.upi_institutions i
  WHERE (lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
     OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA'))
    AND (i.website_url IS NULL OR trim(i.website_url) = '');

  SELECT count(*)::integer INTO v_missing_country
  FROM public.upi_institutions i
  WHERE (lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
     OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA'))
    AND (i.country_name IS NULL OR trim(i.country_name) = '');

  SELECT count(*)::integer INTO v_missing_province
  FROM public.upi_institutions i
  WHERE (lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
     OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA'))
    AND (i.state_province IS NULL OR trim(i.state_province) = '');

  SELECT count(*)::integer INTO v_draft_new
  FROM public.upi_institutions i
  WHERE i.metadata->>'source' = 'canada_pre_m6_remediation'
    AND i.institution_status = 'Draft';

  RAISE NOTICE 'PRE_M6_CANADA_AUDIT total=% missing_type=% missing_website=% missing_country=% missing_province=% new_draft=%',
    v_canada_total, v_missing_type, v_missing_website, v_missing_country, v_missing_province, v_draft_new;

  IF v_missing_type > 0 OR v_missing_website > 0 OR v_missing_country > 0 THEN
    RAISE WARNING 'PRE_M6_CANADA_GAPS: type=% website=% country=% province=% — see CANADA_INSTITUTION_PRE_M6_GAP_REPORT.md',
      v_missing_type, v_missing_website, v_missing_country, v_missing_province;
  END IF;

  FOR rec IN
    SELECT i.name, i.institution_type, i.website_url IS NOT NULL AS has_web,
           i.country_name, i.state_province, i.institution_status
    FROM public.upi_institutions i
    WHERE lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
       OR i.country_id IN (SELECT c.id FROM public.upi_countries c WHERE c.iso_alpha2 = 'CA')
    ORDER BY i.name
  LOOP
    RAISE NOTICE 'PRE_M6_CANADA_ROW name=% type=% web=% country=% prov=% status=%',
      rec.name, rec.institution_type, rec.has_web, rec.country_name, rec.state_province, rec.institution_status;
  END LOOP;
END $$;

COMMENT ON TABLE public.upi_institutions IS
  'Institution Master SSOT. Pre-M6 Canada targeted seed: 20261004120450. Full library seed deferred to M6.';
