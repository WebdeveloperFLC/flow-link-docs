DO $$
DECLARE
  v_college_id constant uuid := 'ee75f8e4-b6fe-485e-bde4-bf51459ecd5c';
  v_poly_id constant uuid := '300db4aa-ce52-433e-bd71-39e4b54a87ac';
  v_upi_id constant uuid := '11111111-1111-1111-1111-111111110001';
  v_college_exists boolean;
  v_program_final integer := 0;
  v_courses_moved integer := 0;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.cf_universities WHERE id = v_college_id) INTO v_college_exists;
  IF NOT v_college_exists THEN
    RAISE NOTICE 'SENECA_CLEANUP_UAT_OVERRIDE: College CF already removed — skip';
    RETURN;
  END IF;

  SELECT count(*) FILTER (WHERE cp.status = 'final')::integer INTO v_program_final
  FROM public.cf_client_programs cp
  JOIN public.cf_courses c ON c.id = cp.course_id
  WHERE c.university_id = v_college_id;

  RAISE NOTICE 'SENECA_CLEANUP_UAT_OVERRIDE: proceeding; finalized_programs=%', v_program_final;

  UPDATE public.cf_universities poly SET
    city = coalesce(nullif(trim(poly.city), ''), col.city),
    province = coalesce(nullif(trim(poly.province), ''), col.province),
    description = coalesce(nullif(trim(poly.description), ''), col.description),
    logo_url = coalesce(nullif(trim(poly.logo_url), ''), col.logo_url),
    cover_url = coalesce(nullif(trim(poly.cover_url), ''), col.cover_url),
    upi_institution_id = coalesce(poly.upi_institution_id, v_upi_id),
    updated_at = now()
  FROM public.cf_universities col
  WHERE poly.id = v_poly_id AND col.id = v_college_id;

  UPDATE public.cf_courses SET university_id = v_poly_id, updated_at = now()
  WHERE university_id = v_college_id;
  GET DIAGNOSTICS v_courses_moved = ROW_COUNT;

  DELETE FROM public.cf_upi_name_aliases
  WHERE lower(trim(cf_name_pattern)) IN ('seneca college', 'seneca polytechnic');

  UPDATE public.cf_upi_linkage_candidates SET
    status = 'superseded'::public.cf_upi_linkage_candidate_status,
    review_notes = coalesce(review_notes, '') || ' UAT override: Seneca College merged into Polytechnic.'
  WHERE cf_university_id = v_college_id AND status IN ('pending_review', 'approved');

  DELETE FROM public.cf_universities WHERE id = v_college_id;

  RAISE NOTICE 'SENECA_CLEANUP_UAT_OVERRIDE_DONE courses_moved=%', v_courses_moved;
END $$;