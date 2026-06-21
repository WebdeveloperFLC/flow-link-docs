-- Phase 2: one-time auto-approve + apply exact linkage candidates (no aliases)

-- Remove any Seneca alias rows if present (Seneca Polytechnic links via exact match)
DELETE FROM public.cf_upi_name_aliases
WHERE lower(trim(cf_name_pattern)) IN ('seneca college', 'seneca polytechnic');

DO $$
DECLARE
  v_row public.cf_upi_linkage_candidates%ROWTYPE;
  v_applied integer := 0;
  v_run_id uuid;
BEGIN
  SELECT r.id INTO v_run_id
  FROM public.cf_upi_linkage_runs r
  WHERE r.run_type = 'dry_run'
  ORDER BY r.started_at DESC
  LIMIT 1;

  FOR v_row IN
    SELECT c.*
    FROM public.cf_upi_linkage_candidates c
    WHERE c.match_method = 'exact'::public.cf_upi_linkage_match_method
      AND c.status = 'pending_review'::public.cf_upi_linkage_candidate_status
      AND c.suggested_upi_institution_id IS NOT NULL
      AND NOT c.is_ambiguous
      AND (v_run_id IS NULL OR c.run_id = v_run_id)
  LOOP
    UPDATE public.cf_upi_linkage_candidates SET
      status = 'approved'::public.cf_upi_linkage_candidate_status,
      reviewed_at = now(),
      review_notes = 'Phase 2 auto-approve exact matches'
    WHERE id = v_row.id;

    UPDATE public.cf_universities u SET
      upi_institution_id = v_row.suggested_upi_institution_id,
      updated_at = now()
    WHERE u.id = v_row.cf_university_id
      AND u.upi_institution_id IS NULL;

    IF FOUND THEN
      v_applied := v_applied + 1;
    END IF;

    UPDATE public.cf_upi_linkage_candidates SET
      status = 'applied'::public.cf_upi_linkage_candidate_status,
      applied_at = now()
    WHERE id = v_row.id;
  END LOOP;

  IF v_run_id IS NOT NULL THEN
    INSERT INTO public.cf_upi_linkage_runs (
      run_type, started_by, cf_total, cf_linked_before, cf_unlinked_before, applied_count, notes
    )
    SELECT
      'apply',
      NULL,
      (SELECT count(*)::integer FROM public.cf_universities),
      (SELECT count(*)::integer FROM public.cf_universities WHERE upi_institution_id IS NOT NULL) - v_applied,
      (SELECT count(*)::integer FROM public.cf_universities WHERE upi_institution_id IS NULL) + v_applied,
      v_applied,
      'Phase 2 migration: auto-applied exact matches'
    ;
  END IF;

  RAISE NOTICE 'cf_upi_linkage phase2: applied % exact matches', v_applied;
END $$;

-- Reusable RPC for future exact-batch apply (authenticated institutions editor only)
CREATE OR REPLACE FUNCTION public.fn_cf_upi_linkage_auto_apply_exact()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.cf_upi_linkage_candidates%ROWTYPE;
  v_applied integer := 0;
BEGIN
  PERFORM public.fn_cf_upi_linkage_assert_editor();

  FOR v_row IN
    SELECT c.*
    FROM public.cf_upi_linkage_candidates c
    WHERE c.match_method = 'exact'::public.cf_upi_linkage_match_method
      AND c.status IN ('pending_review', 'approved')
      AND c.suggested_upi_institution_id IS NOT NULL
      AND NOT c.is_ambiguous
  LOOP
    UPDATE public.cf_upi_linkage_candidates SET
      status = 'approved'::public.cf_upi_linkage_candidate_status,
      reviewed_at = coalesce(reviewed_at, now()),
      reviewed_by = coalesce(reviewed_by, auth.uid()),
      review_notes = coalesce(review_notes, 'Auto-approve exact match')
    WHERE id = v_row.id;

    UPDATE public.cf_universities u SET
      upi_institution_id = v_row.suggested_upi_institution_id,
      updated_at = now()
    WHERE u.id = v_row.cf_university_id
      AND u.upi_institution_id IS NULL;

    IF FOUND THEN
      v_applied := v_applied + 1;
    END IF;

    UPDATE public.cf_upi_linkage_candidates SET
      status = 'applied'::public.cf_upi_linkage_candidate_status,
      applied_at = now()
    WHERE id = v_row.id;
  END LOOP;

  RETURN jsonb_build_object(
    'applied', v_applied,
    'linked', (SELECT count(*)::integer FROM public.cf_universities WHERE upi_institution_id IS NOT NULL),
    'cf_total', (SELECT count(*)::integer FROM public.cf_universities)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cf_upi_linkage_auto_apply_exact() TO authenticated;

COMMENT ON FUNCTION public.fn_cf_upi_linkage_auto_apply_exact IS
  'Approve and apply all exact-match linkage candidates (Phase 2 batch).';
