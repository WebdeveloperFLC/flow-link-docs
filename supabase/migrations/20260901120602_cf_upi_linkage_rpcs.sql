-- CF ↔ UPI linkage — dry-run, review, apply RPCs (no auto-apply on refresh)

CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_assert_editor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF NOT public.fn_cf_upi_linkage_can_edit(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_refresh(p_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_cf record;
  v_course_count integer;
  v_exact jsonb;
  v_norm jsonb;
  v_alias jsonb;
  v_exact_len integer;
  v_norm_len integer;
  v_alias_len integer;
  v_upi_id uuid;
  v_upi_name text;
  v_method public.cf_upi_linkage_match_method;
  v_confidence smallint;
  v_ambiguous boolean;
  v_candidates jsonb;
  v_cf_total integer;
  v_linked_before integer;
  v_unlinked_before integer;
  v_exact_count integer := 0;
  v_normalized_count integer := 0;
  v_alias_count integer := 0;
  v_ambiguous_count integer := 0;
  v_unmatched_count integer := 0;
  v_already_linked_count integer := 0;
BEGIN
  PERFORM public.fn_cf_upi_linkage_assert_editor();

  IF NOT COALESCE(p_dry_run, true) THEN
    RAISE EXCEPTION 'Refresh is dry-run only; use fn_cf_upi_linkage_apply to write links';
  END IF;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NOT NULL)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NULL)::integer
  INTO v_cf_total, v_linked_before, v_unlinked_before
  FROM public.cf_universities;

  INSERT INTO public.cf_upi_linkage_runs (
    run_type, started_by, cf_total, cf_linked_before, cf_unlinked_before
  ) VALUES (
    'dry_run', auth.uid(), v_cf_total, v_linked_before, v_unlinked_before
  )
  RETURNING id INTO v_run_id;

  UPDATE public.cf_upi_linkage_candidates c SET
    status = 'superseded'::public.cf_upi_linkage_candidate_status
  WHERE c.status IN ('pending_review', 'approved');

  FOR v_cf IN
    SELECT u.id, u.name, u.country_code, u.upi_institution_id
    FROM public.cf_universities u
    ORDER BY u.name
  LOOP
    IF v_cf.upi_institution_id IS NOT NULL THEN
      v_already_linked_count := v_already_linked_count + 1;
      CONTINUE;
    END IF;

    SELECT count(*)::integer INTO v_course_count
    FROM public.cf_courses c
    WHERE c.university_id = v_cf.id;

    v_method := 'unmatched'::public.cf_upi_linkage_match_method;
    v_confidence := 0;
    v_ambiguous := false;
    v_candidates := '[]'::jsonb;
    v_upi_id := NULL;
    v_upi_name := NULL;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'name', i.name,
      'country_name', i.country_name
    ) ORDER BY i.is_partner DESC, i.updated_at DESC NULLS LAST), '[]'::jsonb)
    INTO v_exact
    FROM public.upi_institutions i
    WHERE public.fn_cf_upi_names_match_exact(v_cf.name, i.name)
      AND public.fn_cf_upi_upi_matches_cf_country(i.country_name, v_cf.country_code);

    v_exact_len := jsonb_array_length(v_exact);

    IF v_exact_len = 1 THEN
      v_upi_id := (v_exact->0->>'id')::uuid;
      v_upi_name := v_exact->0->>'name';
      v_method := 'exact'::public.cf_upi_linkage_match_method;
      v_confidence := 100;
      v_exact_count := v_exact_count + 1;
    ELSIF v_exact_len > 1 THEN
      v_ambiguous := true;
      v_candidates := v_exact;
      v_ambiguous_count := v_ambiguous_count + 1;
    ELSE
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'country_name', i.country_name
      ) ORDER BY i.is_partner DESC, i.updated_at DESC NULLS LAST), '[]'::jsonb)
      INTO v_norm
      FROM public.upi_institutions i
      WHERE public.fn_cf_upi_names_match_normalized(v_cf.name, i.name)
        AND public.fn_cf_upi_upi_matches_cf_country(i.country_name, v_cf.country_code);

      v_norm_len := jsonb_array_length(v_norm);

      IF v_norm_len = 1 THEN
        v_upi_id := (v_norm->0->>'id')::uuid;
        v_upi_name := v_norm->0->>'name';
        v_method := 'normalized'::public.cf_upi_linkage_match_method;
        v_confidence := 85;
        v_normalized_count := v_normalized_count + 1;
      ELSIF v_norm_len > 1 THEN
        v_ambiguous := true;
        v_candidates := v_norm;
        v_ambiguous_count := v_ambiguous_count + 1;
      ELSE
        SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object(
          'id', i.id,
          'name', i.name,
          'country_name', i.country_name,
          'alias_id', a.id,
          'alias_pattern', a.cf_name_pattern
        )), '[]'::jsonb)
        INTO v_alias
        FROM public.cf_upi_name_aliases a
        JOIN public.upi_institutions i ON i.id = a.upi_institution_id
        WHERE a.is_active
          AND lower(trim(a.cf_name_pattern)) = lower(trim(v_cf.name))
          AND (a.country_code IS NULL OR a.country_code = v_cf.country_code);

        v_alias_len := jsonb_array_length(v_alias);

        IF v_alias_len = 1 THEN
          v_upi_id := (v_alias->0->>'id')::uuid;
          v_upi_name := v_alias->0->>'name';
          v_method := 'alias'::public.cf_upi_linkage_match_method;
          v_confidence := 90;
          v_alias_count := v_alias_count + 1;
        ELSIF v_alias_len > 1 THEN
          v_ambiguous := true;
          v_candidates := v_alias;
          v_ambiguous_count := v_ambiguous_count + 1;
        ELSE
          v_unmatched_count := v_unmatched_count + 1;
        END IF;
      END IF;
    END IF;

    INSERT INTO public.cf_upi_linkage_candidates (
      run_id,
      cf_university_id,
      cf_name,
      cf_country_code,
      cf_course_count,
      suggested_upi_institution_id,
      suggested_upi_name,
      match_method,
      confidence,
      status,
      is_ambiguous,
      ambiguous_candidates
    ) VALUES (
      v_run_id,
      v_cf.id,
      v_cf.name,
      v_cf.country_code,
      v_course_count,
      v_upi_id,
      v_upi_name,
      v_method,
      v_confidence,
      'pending_review'::public.cf_upi_linkage_candidate_status,
      v_ambiguous,
      CASE WHEN v_ambiguous THEN v_candidates ELSE '[]'::jsonb END
    );
  END LOOP;

  UPDATE public.cf_upi_linkage_runs r SET
    completed_at = now(),
    exact_count = v_exact_count,
    normalized_count = v_normalized_count,
    alias_count = v_alias_count,
    ambiguous_count = v_ambiguous_count,
    unmatched_count = v_unmatched_count,
    already_linked_count = v_already_linked_count
  WHERE r.id = v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'dry_run', true,
    'cf_total', v_cf_total,
    'cf_linked_before', v_linked_before,
    'cf_unlinked_before', v_unlinked_before,
    'already_linked', v_already_linked_count,
    'exact', v_exact_count,
    'normalized', v_normalized_count,
    'alias', v_alias_count,
    'ambiguous', v_ambiguous_count,
    'unmatched', v_unmatched_count,
    'auto_link_eligible_if_approved', v_exact_count + v_normalized_count + v_alias_count,
    'estimated_mark_final_pct_after_apply',
      CASE WHEN v_cf_total > 0 THEN
        round(((v_linked_before + v_exact_count + v_normalized_count + v_alias_count)::numeric / v_cf_total) * 100, 1)
      ELSE 0 END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_set_review(
  p_candidate_id uuid,
  p_status text,
  p_upi_institution_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.cf_upi_linkage_candidates%ROWTYPE;
  v_upi_name text;
  v_status public.cf_upi_linkage_candidate_status;
BEGIN
  PERFORM public.fn_cf_upi_linkage_assert_editor();

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'status must be approved or rejected';
  END IF;

  SELECT * INTO v_row
  FROM public.cf_upi_linkage_candidates c
  WHERE c.id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  IF v_row.status NOT IN ('pending_review', 'approved') THEN
    RAISE EXCEPTION 'Candidate is not open for review';
  END IF;

  v_status := p_status::public.cf_upi_linkage_candidate_status;

  IF v_status = 'approved' THEN
    IF p_upi_institution_id IS NOT NULL THEN
      SELECT i.name INTO v_upi_name
      FROM public.upi_institutions i
      WHERE i.id = p_upi_institution_id;
      IF v_upi_name IS NULL THEN
        RAISE EXCEPTION 'UPI institution not found';
      END IF;
    ELSIF v_row.is_ambiguous OR v_row.suggested_upi_institution_id IS NULL THEN
      RAISE EXCEPTION 'Ambiguous or unmatched rows require p_upi_institution_id on approve';
    ELSE
      v_upi_name := v_row.suggested_upi_name;
    END IF;
  END IF;

  UPDATE public.cf_upi_linkage_candidates c SET
    status = v_status,
    suggested_upi_institution_id = CASE
      WHEN v_status = 'approved' THEN coalesce(p_upi_institution_id, c.suggested_upi_institution_id)
      ELSE c.suggested_upi_institution_id
    END,
    suggested_upi_name = CASE
      WHEN v_status = 'approved' THEN coalesce(v_upi_name, c.suggested_upi_name)
      ELSE c.suggested_upi_name
    END,
    match_method = CASE
      WHEN v_status = 'approved' AND p_upi_institution_id IS NOT NULL
           AND (c.suggested_upi_institution_id IS DISTINCT FROM p_upi_institution_id OR c.is_ambiguous) THEN
        'manual'::public.cf_upi_linkage_match_method
      ELSE c.match_method
    END,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = NULLIF(trim(p_notes), '')
  WHERE c.id = p_candidate_id;

  RETURN p_candidate_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_apply(p_candidate_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_applied integer := 0;
  v_row record;
  v_linked_before integer;
  v_cf_total integer;
BEGIN
  PERFORM public.fn_cf_upi_linkage_assert_editor();

  SELECT count(*)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NOT NULL)::integer
  INTO v_cf_total, v_linked_before
  FROM public.cf_universities;

  INSERT INTO public.cf_upi_linkage_runs (
    run_type, started_by, cf_total, cf_linked_before, cf_unlinked_before
  ) VALUES (
    'apply',
    auth.uid(),
    v_cf_total,
    v_linked_before,
    v_cf_total - v_linked_before
  )
  RETURNING id INTO v_run_id;

  FOR v_row IN
    SELECT c.*
    FROM public.cf_upi_linkage_candidates c
    WHERE c.status = 'approved'::public.cf_upi_linkage_candidate_status
      AND c.suggested_upi_institution_id IS NOT NULL
      AND (p_candidate_ids IS NULL OR c.id = ANY(p_candidate_ids))
    FOR UPDATE
  LOOP
    UPDATE public.cf_universities u SET
      upi_institution_id = v_row.suggested_upi_institution_id,
      updated_at = now()
    WHERE u.id = v_row.cf_university_id
      AND u.upi_institution_id IS NULL;

    IF FOUND THEN
      v_applied := v_applied + 1;
    END IF;

    UPDATE public.cf_upi_linkage_candidates c SET
      status = 'applied'::public.cf_upi_linkage_candidate_status,
      applied_at = now()
    WHERE c.id = v_row.id;
  END LOOP;

  UPDATE public.cf_upi_linkage_runs r SET
    completed_at = now(),
    applied_count = v_applied
  WHERE r.id = v_run_id;

  SELECT count(*) FILTER (WHERE upi_institution_id IS NOT NULL)::integer
  INTO v_linked_before
  FROM public.cf_universities;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'applied', v_applied,
    'cf_linked_after', v_linked_before,
    'cf_total', v_cf_total,
    'mark_final_eligible_pct',
      CASE WHEN v_cf_total > 0 THEN round((v_linked_before::numeric / v_cf_total) * 100, 1) ELSE 0 END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cf_total integer;
  v_linked integer;
  v_last_run public.cf_upi_linkage_runs%ROWTYPE;
BEGIN
  SELECT count(*)::integer,
         count(*) FILTER (WHERE upi_institution_id IS NOT NULL)::integer
  INTO v_cf_total, v_linked
  FROM public.cf_universities;

  SELECT * INTO v_last_run
  FROM public.cf_upi_linkage_runs r
  WHERE r.run_type = 'dry_run'
  ORDER BY r.started_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'cf_total', v_cf_total,
    'linked', v_linked,
    'unlinked', v_cf_total - v_linked,
    'mark_final_eligible_pct',
      CASE WHEN v_cf_total > 0 THEN round((v_linked::numeric / v_cf_total) * 100, 1) ELSE 0 END,
    'pending_review', (
      SELECT count(*)::integer FROM public.cf_upi_linkage_candidates c
      WHERE c.status = 'pending_review'::public.cf_upi_linkage_candidate_status
    ),
    'approved_ready', (
      SELECT count(*)::integer FROM public.cf_upi_linkage_candidates c
      WHERE c.status = 'approved'::public.cf_upi_linkage_candidate_status
    ),
    'ambiguous', (
      SELECT count(*)::integer FROM public.cf_upi_linkage_candidates c
      WHERE c.status = 'pending_review'::public.cf_upi_linkage_candidate_status AND c.is_ambiguous
    ),
    'unmatched', (
      SELECT count(*)::integer FROM public.cf_upi_linkage_candidates c
      WHERE c.status = 'pending_review'::public.cf_upi_linkage_candidate_status
        AND c.match_method = 'unmatched'::public.cf_upi_linkage_match_method
    ),
    'last_dry_run_at', v_last_run.started_at,
    'last_run_id', v_last_run.id,
    'last_dry_run_summary', CASE WHEN v_last_run.id IS NOT NULL THEN jsonb_build_object(
      'exact', v_last_run.exact_count,
      'normalized', v_last_run.normalized_count,
      'alias', v_last_run.alias_count,
      'ambiguous', v_last_run.ambiguous_count,
      'unmatched', v_last_run.unmatched_count
    ) ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_list_candidates(
  p_run_id uuid DEFAULT NULL,
  p_match_method text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  run_id uuid,
  cf_university_id uuid,
  cf_name text,
  cf_country_code text,
  cf_course_count integer,
  suggested_upi_institution_id uuid,
  suggested_upi_name text,
  match_method public.cf_upi_linkage_match_method,
  confidence smallint,
  status public.cf_upi_linkage_candidate_status,
  is_ambiguous boolean,
  ambiguous_candidates jsonb,
  review_notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  v_run_id := coalesce(
    p_run_id,
    (SELECT r.id FROM public.cf_upi_linkage_runs r WHERE r.run_type = 'dry_run' ORDER BY r.started_at DESC LIMIT 1)
  );

  RETURN QUERY
  SELECT
    c.id,
    c.run_id,
    c.cf_university_id,
    c.cf_name,
    c.cf_country_code,
    c.cf_course_count,
    c.suggested_upi_institution_id,
    c.suggested_upi_name,
    c.match_method,
    c.confidence,
    c.status,
    c.is_ambiguous,
    c.ambiguous_candidates,
    c.review_notes,
    c.created_at
  FROM public.cf_upi_linkage_candidates c
  WHERE c.run_id = v_run_id
    AND (p_match_method IS NULL OR c.match_method::text = p_match_method)
    AND (p_status IS NULL OR c.status::text = p_status)
  ORDER BY
    CASE c.match_method
      WHEN 'exact' THEN 1
      WHEN 'normalized' THEN 2
      WHEN 'alias' THEN 3
      WHEN 'unmatched' THEN 5
      ELSE 4
    END,
    c.cf_name
  LIMIT greatest(coalesce(p_limit, 100), 1)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_assert_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_refresh(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_set_review(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_apply(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_list_candidates(uuid, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_can_edit(uuid) TO authenticated;

COMMENT ON FUNCTION public.fn_cf_upi_linkage_refresh IS
  'Dry-run scan: populate cf_upi_linkage_candidates. Never writes cf_universities.upi_institution_id.';
COMMENT ON FUNCTION public.fn_cf_upi_linkage_apply IS
  'Apply admin-approved candidates only; explicit second step after review.';
