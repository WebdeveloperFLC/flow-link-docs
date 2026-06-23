-- Pre-production UAT: merge legacy Seneca College CF into Seneca Polytechnic.
-- Aborts if applications (client_institution_qualifications) or finalized programs exist.
-- Shortlisted cf_client_programs are preserved (course_id unchanged; parent university moves).

DO $$
DECLARE
  v_college_id constant uuid := 'ee75f8e4-b6fe-485e-bde4-bf51459ecd5c';
  v_poly_id constant uuid := '300db4aa-ce52-433e-bd71-39e4b54a87ac';
  v_upi_id constant uuid := '11111111-1111-1111-1111-111111110001';

  v_college_exists boolean;
  v_poly_exists boolean;

  v_course_count integer := 0;
  v_program_total integer := 0;
  v_program_shortlisted integer := 0;
  v_program_final integer := 0;
  v_qual_count integer := 0;
  v_conflict_count integer := 0;
  v_courses_moved integer := 0;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.cf_universities WHERE id = v_college_id) INTO v_college_exists;
  SELECT EXISTS(SELECT 1 FROM public.cf_universities WHERE id = v_poly_id) INTO v_poly_exists;

  IF NOT v_college_exists THEN
    RAISE NOTICE 'SENECA_CLEANUP: Seneca College CF row already removed — nothing to do';
    RETURN;
  END IF;

  IF NOT v_poly_exists THEN
    RAISE EXCEPTION 'SENECA_CLEANUP_BLOCKED: Seneca Polytechnic CF row % not found', v_poly_id;
  END IF;

  SELECT count(*)::integer INTO v_course_count
  FROM public.cf_courses c
  WHERE c.university_id = v_college_id;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE cp.status = 'shortlisted')::integer,
    count(*) FILTER (WHERE cp.status = 'final')::integer
  INTO v_program_total, v_program_shortlisted, v_program_final
  FROM public.cf_client_programs cp
  JOIN public.cf_courses c ON c.id = cp.course_id
  WHERE c.university_id = v_college_id;

  SELECT count(*)::integer INTO v_qual_count
  FROM public.client_institution_qualifications q
  JOIN public.cf_courses c ON c.id = q.cf_course_id
  WHERE c.university_id = v_college_id;

  RAISE NOTICE 'SENECA_CLEANUP_PREFLIGHT courses=% programs_total=% programs_shortlisted=% programs_final=% qualifications=%',
    v_course_count, v_program_total, v_program_shortlisted, v_program_final, v_qual_count;

  IF v_qual_count > 0 THEN
    RAISE EXCEPTION
      'SENECA_CLEANUP_BLOCKED: % client_institution_qualifications linked to Seneca College courses — report before cleanup',
      v_qual_count;
  END IF;

  IF v_program_final > 0 THEN
    RAISE EXCEPTION
      'SENECA_CLEANUP_BLOCKED: % finalized cf_client_programs on Seneca College courses — report before cleanup',
      v_program_final;
  END IF;

  SELECT count(*)::integer INTO v_conflict_count
  FROM public.cf_courses college
  JOIN public.cf_courses poly ON poly.university_id = v_poly_id
    AND lower(trim(college.name)) = lower(trim(poly.name))
    AND college.study_level = poly.study_level
  WHERE college.university_id = v_college_id;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION
      'SENECA_CLEANUP_BLOCKED: % course name/study_level conflicts would violate uq_cf_courses_uni_name_level',
      v_conflict_count;
  END IF;

  -- Enrich Polytechnic CF metadata from legacy College row where empty.
  UPDATE public.cf_universities poly SET
    city = coalesce(nullif(trim(poly.city), ''), col.city),
    province = coalesce(nullif(trim(poly.province), ''), col.province),
    description = coalesce(nullif(trim(poly.description), ''), col.description),
    logo_url = coalesce(nullif(trim(poly.logo_url), ''), col.logo_url),
    cover_url = coalesce(nullif(trim(poly.cover_url), ''), col.cover_url),
    upi_institution_id = coalesce(poly.upi_institution_id, v_upi_id),
    updated_at = now()
  FROM public.cf_universities col
  WHERE poly.id = v_poly_id
    AND col.id = v_college_id;

  UPDATE public.cf_courses SET
    university_id = v_poly_id,
    updated_at = now()
  WHERE university_id = v_college_id;

  GET DIAGNOSTICS v_courses_moved = ROW_COUNT;

  -- Remove stale alias rows; Polytechnic links via direct upi_institution_id.
  DELETE FROM public.cf_upi_name_aliases
  WHERE lower(trim(cf_name_pattern)) IN ('seneca college', 'seneca polytechnic');

  -- Supersede open linkage candidates for the legacy CF row before delete.
  UPDATE public.cf_upi_linkage_candidates SET
    status = 'superseded'::public.cf_upi_linkage_candidate_status,
    review_notes = coalesce(review_notes, '') || ' Superseded: Seneca College CF merged into Seneca Polytechnic.'
  WHERE cf_university_id = v_college_id
    AND status IN ('pending_review', 'approved');

  DELETE FROM public.cf_universities
  WHERE id = v_college_id;

  INSERT INTO public.cf_upi_linkage_runs (
    run_type,
    started_by,
    cf_total,
    cf_linked_before,
    cf_unlinked_before,
    applied_count,
    notes
  )
  SELECT
    'apply',
    NULL,
    (SELECT count(*)::integer FROM public.cf_universities),
    (SELECT count(*)::integer FROM public.cf_universities WHERE upi_institution_id IS NOT NULL),
    (SELECT count(*)::integer FROM public.cf_universities WHERE upi_institution_id IS NULL),
    0,
    jsonb_build_object(
      'action', 'seneca_college_cf_cleanup',
      'courses_moved', v_courses_moved,
      'programs_shortlisted_preserved', v_program_shortlisted,
      'college_cf_id', v_college_id,
      'polytechnic_cf_id', v_poly_id,
      'upi_institution_id', v_upi_id
    )::text
  ;

  RAISE NOTICE 'SENECA_CLEANUP_DONE courses_moved=% programs_shortlisted_preserved=%',
    v_courses_moved, v_program_shortlisted;
END $$;

-- Post-cleanup verification (raises if legacy row or orphan courses remain).
DO $$
DECLARE
  v_college_id constant uuid := 'ee75f8e4-b6fe-485e-bde4-bf51459ecd5c';
  v_poly_id constant uuid := '300db4aa-ce52-433e-bd71-39e4b54a87ac';
  v_upi_id constant uuid := '11111111-1111-1111-1111-111111110001';
  v_college_remaining integer;
  v_poly_course_count integer;
  v_poly_upi uuid;
BEGIN
  SELECT count(*)::integer INTO v_college_remaining
  FROM public.cf_universities
  WHERE id = v_college_id OR lower(trim(name)) = 'seneca college';

  IF v_college_remaining > 0 THEN
    RAISE EXCEPTION 'SENECA_CLEANUP_VERIFY_FAIL: Seneca College CF row still exists (count=%)', v_college_remaining;
  END IF;

  SELECT count(*)::integer, u.upi_institution_id
  INTO v_poly_course_count, v_poly_upi
  FROM public.cf_universities u
  LEFT JOIN public.cf_courses c ON c.university_id = u.id
  WHERE u.id = v_poly_id
  GROUP BY u.upi_institution_id;

  IF v_poly_upi IS DISTINCT FROM v_upi_id THEN
    RAISE EXCEPTION 'SENECA_CLEANUP_VERIFY_FAIL: Seneca Polytechnic upi_institution_id=% expected=%',
      v_poly_upi, v_upi_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cf_courses c
    JOIN public.cf_universities u ON u.id = c.university_id
    WHERE lower(trim(u.name)) LIKE '%seneca%'
      AND u.id <> v_poly_id
  ) THEN
    RAISE EXCEPTION 'SENECA_CLEANUP_VERIFY_FAIL: Seneca courses exist outside Polytechnic CF row';
  END IF;

  RAISE NOTICE 'SENECA_CLEANUP_VERIFY_OK polytechnic_courses=% upi_institution_id=%',
    v_poly_course_count, v_poly_upi;
END $$;
