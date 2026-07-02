DO $$
DECLARE
  v_before_linked integer;
  v_before_unlinked integer;
  v_before_cf_total integer;
  v_after_linked integer;
  v_after_unlinked integer;
  v_created integer := 0;
  v_linked integer := 0;
  rec record;
BEGIN
  SELECT count(*)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NOT NULL)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NULL)::integer
  INTO v_before_cf_total, v_before_linked, v_before_unlinked
  FROM public.cf_universities;

  CREATE TEMP TABLE _cf_upi_shell_seed (
    cf_university_id uuid PRIMARY KEY,
    upi_institution_id uuid NOT NULL,
    cf_name text NOT NULL,
    cf_country_code text NOT NULL,
    country_name text NOT NULL,
    website_url text NOT NULL,
    slug text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _cf_upi_shell_seed (
    cf_university_id, upi_institution_id, cf_name, cf_country_code, country_name, website_url, slug
  ) VALUES
    ('7bb5cb3e-ee6f-4915-8a5d-4d8c95e9e275'::uuid, '22222222-1111-1111-1111-111111110001'::uuid,
      'Imperial College London', 'GB', 'United Kingdom', 'https://www.imperial.ac.uk', 'imperial-college-london'),
    ('51f5d567-0260-4516-a541-8cdf99ad4afd'::uuid, '22222222-1111-1111-1111-111111110002'::uuid,
      'McGill University', 'CA', 'Canada', 'https://www.mcgill.ca', 'mcgill-university'),
    ('2fd72b9a-4c04-467a-bc88-d05b3bc92e73'::uuid, '22222222-1111-1111-1111-111111110003'::uuid,
      'Monash University', 'AU', 'Australia', 'https://www.monash.edu', 'monash-university'),
    ('98a72c77-690d-4e82-9712-67c0a3d1c373'::uuid, '22222222-1111-1111-1111-111111110004'::uuid,
      'Northeastern University', 'US', 'United States', 'https://www.northeastern.edu', 'northeastern-university'),
    ('9b5b825a-19f9-4301-b6e9-2a43896babea'::uuid, '22222222-1111-1111-1111-111111110005'::uuid,
      'Technical University of Munich', 'DE', 'Germany', 'https://www.tum.de', 'technical-university-of-munich'),
    ('4f11e1d4-71ec-4897-b460-1e7b2bc880a4'::uuid, '22222222-1111-1111-1111-111111110006'::uuid,
      'Trinity College Dublin', 'IE', 'Ireland', 'https://www.tcd.ie', 'trinity-college-dublin'),
    ('5c8357fb-730a-4fd7-bfe2-149c7116d4f5'::uuid, '22222222-1111-1111-1111-111111110007'::uuid,
      'University College London', 'GB', 'United Kingdom', 'https://www.ucl.ac.uk', 'university-college-london'),
    ('c522ffcb-554f-4be5-b140-23dc55f4a0c5'::uuid, '22222222-1111-1111-1111-111111110008'::uuid,
      'University of British Columbia', 'CA', 'Canada', 'https://www.ubc.ca', 'university-of-british-columbia'),
    ('9c18bc58-7aa2-4c9d-8717-3595c18332d1'::uuid, '22222222-1111-1111-1111-111111110009'::uuid,
      'University of Manchester', 'GB', 'United Kingdom', 'https://www.manchester.ac.uk', 'university-of-manchester'),
    ('c5696b8a-3b31-4b52-934f-ba1ceb2c19bc'::uuid, '22222222-1111-1111-1111-111111110010'::uuid,
      'University of Melbourne', 'AU', 'Australia', 'https://www.unimelb.edu.au', 'university-of-melbourne'),
    ('80ce19e5-de72-4ff4-9c3a-ec6cded61264'::uuid, '22222222-1111-1111-1111-111111110011'::uuid,
      'University of Sydney', 'AU', 'Australia', 'https://www.sydney.edu.au', 'university-of-sydney'),
    ('5cf24a98-fd70-4916-8fbe-e03d59343ebb'::uuid, '22222222-1111-1111-1111-111111110012'::uuid,
      'University of Toronto', 'CA', 'Canada', 'https://www.utoronto.ca', 'university-of-toronto');

  WITH inserted AS (
    INSERT INTO public.upi_institutions (
      id,
      name,
      slug,
      country_name,
      country_id,
      website_url,
      institution_type,
      is_active,
      is_partner,
      catalog_status,
      metadata,
      notes
    )
    SELECT
      s.upi_institution_id,
      s.cf_name,
      s.slug,
      s.country_name,
      uc.id,
      s.website_url,
      'University',
      true,
      false,
      'promoted',
      jsonb_build_object(
        'source', 'cf_upi_institution_shell_remediation',
        'cf_university_id', s.cf_university_id,
        'cf_country_code', s.cf_country_code
      ),
      'Shell record created for CF ↔ UPI linkage remediation (UAT). No fees, commissions, or routes.'
    FROM _cf_upi_shell_seed s
    LEFT JOIN public.upi_countries uc ON uc.iso_alpha2 = s.cf_country_code
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.upi_institutions i
      WHERE public.upi_institution_dedup_key(i.name, i.country_name)
        = public.upi_institution_dedup_key(s.cf_name, s.country_name)
    )
    RETURNING id
  )
  SELECT count(*)::integer INTO v_created FROM inserted;

  WITH updated AS (
    UPDATE public.cf_universities u SET
      upi_institution_id = i.id,
      updated_at = now()
    FROM _cf_upi_shell_seed s
    JOIN public.upi_institutions i ON public.upi_institution_dedup_key(i.name, i.country_name)
      = public.upi_institution_dedup_key(s.cf_name, s.country_name)
    WHERE u.id = s.cf_university_id
      AND u.upi_institution_id IS DISTINCT FROM i.id
    RETURNING u.id
  )
  SELECT count(*)::integer INTO v_linked FROM updated;

  UPDATE public.cf_upi_linkage_candidates c SET
    status = 'superseded'::public.cf_upi_linkage_candidate_status,
    review_notes = coalesce(c.review_notes, '') || ' Superseded: shell UPI created + CF linked (20261002130000).'
  FROM _cf_upi_shell_seed s
  WHERE c.cf_university_id = s.cf_university_id
    AND c.status IN ('pending_review', 'approved');

  SELECT count(*)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NOT NULL)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NULL)::integer
  INTO v_before_cf_total, v_after_linked, v_after_unlinked
  FROM public.cf_universities;

  INSERT INTO public.cf_upi_linkage_runs (
    run_type,
    started_by,
    cf_total,
    cf_linked_before,
    cf_unlinked_before,
    applied_count,
    notes
  ) VALUES (
    'apply',
    NULL,
    v_before_cf_total,
    v_before_linked,
    v_before_unlinked,
    v_linked,
    jsonb_build_object(
      'action', 'cf_upi_institution_shell_remediation',
      'upi_shells_created', v_created,
      'cf_universities_linked', v_linked,
      'before', jsonb_build_object(
        'cf_total', v_before_cf_total,
        'linked', v_before_linked,
        'unlinked', v_before_unlinked,
        'mark_final_eligible_pct',
          CASE WHEN v_before_cf_total > 0 THEN round((v_before_linked::numeric / v_before_cf_total) * 100, 1) ELSE 0 END
      ),
      'after', jsonb_build_object(
        'cf_total', v_before_cf_total,
        'linked', v_after_linked,
        'unlinked', v_after_unlinked,
        'mark_final_eligible_pct',
          CASE WHEN v_before_cf_total > 0 THEN round((v_after_linked::numeric / v_before_cf_total) * 100, 1) ELSE 0 END
      )
    )::text
  );

  RAISE NOTICE 'CF_UPI_SHELL_REMEDIATION before linked=% unlinked=% | created=% linked=% | after linked=% unlinked=% mark_final_eligible=%',
    v_before_linked, v_before_unlinked, v_created, v_linked, v_after_linked, v_after_unlinked,
    CASE WHEN v_before_cf_total > 0 THEN round((v_after_linked::numeric / v_before_cf_total) * 100, 1) ELSE 0 END;
END $$;

DO $$
DECLARE
  v_unlinked integer;
BEGIN
  SELECT count(*)::integer INTO v_unlinked
  FROM public.cf_universities u
  WHERE u.id IN (
    '7bb5cb3e-ee6f-4915-8a5d-4d8c95e9e275',
    '51f5d567-0260-4516-a541-8cdf99ad4afd',
    '2fd72b9a-4c04-467a-bc88-d05b3bc92e73',
    '98a72c77-690d-4e82-9712-67c0a3d1c373',
    '9b5b825a-19f9-4301-b6e9-2a43896babea',
    '4f11e1d4-71ec-4897-b460-1e7b2bc880a4',
    '5c8357fb-730a-4fd7-bfe2-149c7116d4f5',
    'c522ffcb-554f-4be5-b140-23dc55f4a0c5',
    '9c18bc58-7aa2-4c9d-8717-3595c18332d1',
    'c5696b8a-3b31-4b52-934f-ba1ceb2c19bc',
    '80ce19e5-de72-4ff4-9c3a-ec6cded61264',
    '5cf24a98-fd70-4916-8fbe-e03d59343ebb'
  )
  AND u.upi_institution_id IS NULL;

  IF v_unlinked > 0 THEN
    RAISE EXCEPTION 'CF_UPI_SHELL_VERIFY_FAIL: % remediated CF universities still unlinked', v_unlinked;
  END IF;

  RAISE NOTICE 'CF_UPI_SHELL_VERIFY_OK all 12 remediated CF universities linked';
END $$;