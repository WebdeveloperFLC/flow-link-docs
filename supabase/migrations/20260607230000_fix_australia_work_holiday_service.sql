-- Merge duplicate Australia Work & Holiday rows into one canonical service (id 046).
-- Safe to re-run. Run in Supabase SQL Editor after publishing frontend checklist HTML.

DO $$
DECLARE
  v_canonical uuid := 'b2000001-0001-4000-8000-000000000046';
  v_dupe uuid;
BEGIN
  -- Temporarily rename sub_service on duplicates so the canonical unique key is free
  UPDATE public.service_library sl
  SET
    sub_service = left(sl.sub_service, 80) || ' [merge-' || left(sl.id::text, 8) || ']',
    updated_at = now()
  WHERE sl.service_category = 'visa_immigration'
    AND sl.id <> v_canonical
    AND (
      lower(coalesce(sl.academy_metadata->>'displayName', '')) LIKE '%work%holiday%'
      OR lower(coalesce(sl.academy_metadata->>'displayName', '')) LIKE '%work%travel%'
      OR lower(sl.sub_service) LIKE '%work%holiday%'
      OR lower(sl.sub_service) LIKE '%work%travel%'
      OR lower(sl.sub_service) LIKE '%whv%'
      OR lower(sl.service) LIKE '%work%holiday%'
      OR lower(sl.service) LIKE '%work%travel%'
    );

  INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
  VALUES (
    v_canonical,
    'visa_immigration',
    'Australia',
    'Work & Holiday Visa (Subclass 417/462)',
    45,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    service = EXCLUDED.service,
    sub_service = EXCLUDED.sub_service,
    display_order = EXCLUDED.display_order,
    is_active = true,
    updated_at = now();

  -- Re-point child rows from every duplicate WHV record to canonical
  FOR v_dupe IN
    SELECT sl.id
    FROM public.service_library sl
    WHERE sl.service_category = 'visa_immigration'
      AND sl.id <> v_canonical
      AND (
        lower(coalesce(sl.academy_metadata->>'displayName', '')) LIKE '%work%holiday%'
        OR lower(coalesce(sl.academy_metadata->>'displayName', '')) LIKE '%work%travel%'
        OR lower(sl.sub_service) LIKE '%work%holiday%'
        OR lower(sl.sub_service) LIKE '%work%travel%'
        OR lower(sl.sub_service) LIKE '%whv%'
        OR lower(sl.sub_service) LIKE '%merge-%'
        OR lower(sl.service) LIKE '%work%holiday%'
        OR lower(sl.service) LIKE '%work%travel%'
      )
  LOOP
    -- Drop dupe child rows when canonical already has the same unique key
    DELETE FROM public.service_library_countries c
    WHERE c.library_id = v_dupe
      AND EXISTS (
        SELECT 1 FROM public.service_library_countries x
        WHERE x.library_id = v_canonical AND x.country = c.country
      );

    DELETE FROM public.service_library_overrides o
    WHERE o.library_id = v_dupe
      AND EXISTS (
        SELECT 1 FROM public.service_library_overrides x
        WHERE x.library_id = v_canonical AND x.country = o.country
      );

    DELETE FROM public.service_library_submission_checklist sc
    WHERE sc.library_id = v_dupe
      AND EXISTS (
        SELECT 1 FROM public.service_library_submission_checklist x
        WHERE x.library_id = v_canonical AND x.item_key = sc.item_key
      );

    DELETE FROM public.service_library_checklist_files cf
    WHERE cf.library_id = v_dupe
      AND EXISTS (
        SELECT 1 FROM public.service_library_checklist_files x
        WHERE x.library_id = v_canonical AND x.file_path = cf.file_path
      );

    DELETE FROM public.service_library_visa_form_files vf
    WHERE vf.library_id = v_dupe
      AND EXISTS (
        SELECT 1 FROM public.service_library_visa_form_files x
        WHERE x.library_id = v_canonical
          AND coalesce(x.form_code, '') = coalesce(vf.form_code, '')
          AND x.file_path = vf.file_path
      );

    UPDATE public.service_library_countries SET library_id = v_canonical WHERE library_id = v_dupe;
    UPDATE public.service_library_overrides SET library_id = v_canonical WHERE library_id = v_dupe;
    UPDATE public.service_library_checklist_files SET library_id = v_canonical WHERE library_id = v_dupe;
    UPDATE public.service_library_sop_tasks SET library_id = v_canonical WHERE library_id = v_dupe;
    UPDATE public.service_library_submission_checklist SET library_id = v_canonical WHERE library_id = v_dupe;
    UPDATE public.service_library_visa_form_files SET library_id = v_canonical WHERE library_id = v_dupe;
    UPDATE public.service_library_fee_items SET library_id = v_canonical WHERE library_id = v_dupe;
    UPDATE public.service_library_attachments SET library_id = v_canonical WHERE library_id = v_dupe;
    DELETE FROM public.service_library WHERE id = v_dupe;
  END LOOP;

  INSERT INTO public.service_library_countries (library_id, country)
  VALUES (v_canonical, 'Australia')
  ON CONFLICT DO NOTHING;

  UPDATE public.service_library
  SET
    service = 'Australia',
    sub_service = 'Work & Holiday Visa (Subclass 417/462)',
    is_active = true,
    updated_at = now()
  WHERE id = v_canonical;
END $$;

-- Branded HTML checklist (primary) + optional PDF reference
UPDATE public.service_library_checklist_files
SET is_current = false, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND file_path NOT IN (
    '/specimens/checklists/australia-work-holiday.html',
    '/specimens/checklists/Australia work and holiday.pdf'
  );

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-000000000046'::uuid,
  v.file_name,
  v.file_path,
  v.mime_type,
  v.size_bytes,
  1,
  v.is_current,
  v.notes
FROM (VALUES
  (
    'Australia – Work & Holiday Visa (1 year Work & Travel) — Document Checklist.html',
    '/specimens/checklists/australia-work-holiday.html',
    'text/html',
    0,
    true,
    'Future Link branded checklist — fields auto-fill when linked to client'
  ),
  (
    'Australia – Work & Holiday Visa — Document Checklist.pdf',
    '/specimens/checklists/Australia work and holiday.pdf',
    'application/pdf',
    586959,
    false,
    'Reference PDF (Claude draft) — use HTML checklist as primary'
  )
) AS v(file_name, file_path, mime_type, size_bytes, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
    AND cf.file_path = v.file_path
);

UPDATE public.service_library_checklist_files
SET
  is_current = true,
  size_bytes = CASE
    WHEN file_path = '/specimens/checklists/australia-work-holiday.html' THEN 111576
    ELSE size_bytes
  END,
  updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND file_path = '/specimens/checklists/australia-work-holiday.html';

-- Official visa form links
UPDATE public.service_library_visa_form_files
SET is_current = false, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-000000000046'::uuid,
  v.form_code,
  v.file_name,
  v.file_path,
  v.mime_type,
  v.sort_order,
  1,
  true,
  v.notes
FROM (VALUES
  (
    'Subclass 417/462',
    'Working Holiday visa — Home Affairs',
    'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417',
    'text/html',
    1,
    'Official government form — verify current version before client use'
  ),
  (
    'Form 1150',
    'Application for a Visitor visa — Tourist stream (reference)',
    'https://immi.homeaffairs.gov.au/form-listing/forms/1150.pdf',
    'application/pdf',
    2,
    'Verify current WHM application process on immi.homeaffairs.gov.au'
  )
) AS v(form_code, file_name, file_path, mime_type, sort_order, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_visa_form_files vf
  WHERE vf.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
    AND vf.form_code = v.form_code
);

-- Submission checklist tab items (Service Library → Checklist)
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000046'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('passport_from_eligible_whm_country', 'Passport from eligible WHM country', true, 1),
  ('age_within_limit_at_application', 'Age within limit at application', true, 2),
  ('first_working_holiday_maker_visa', 'First Working Holiday Maker visa', true, 3),
  ('sufficient_funds_aud_5_000', 'Sufficient funds (~AUD 5,000+)', true, 4),
  ('adequate_health_insurance_for_stay', 'Adequate health insurance for stay', true, 5),
  ('health_character_requirements', 'Health & character requirements', true, 6),
  ('not_bringing_dependent_children', 'Not bringing dependent children', true, 7),
  ('genuine_intention_to_holiday_work_temporarily', 'Genuine intention to holiday/work temporarily', true, 8),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 9),
  ('client_approval_received', 'Client approval on final file', true, 10),
  ('quality_review_completed', 'Quality review sign-off', true, 11),
  ('submission_approved', 'Submission approved & lodged', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid AND c.item_key = x.item_key
);

-- Verify: expect exactly 1 Australia WHV row
SELECT
  sl.id,
  sl.service,
  sl.sub_service,
  sl.academy_metadata->>'displayName' AS display_name,
  (SELECT count(*) FROM service_library_countries c WHERE c.library_id = sl.id) AS countries,
  (SELECT count(*) FROM service_library_checklist_files cf WHERE cf.library_id = sl.id AND cf.is_current) AS checklist_files,
  (SELECT count(*) FROM service_library_submission_checklist sc WHERE sc.library_id = sl.id AND sc.is_active) AS submission_items
FROM public.service_library sl
WHERE sl.id = 'b2000001-0001-4000-8000-000000000046'::uuid;

-- Should return 0 duplicate WHV rows remaining
SELECT count(*) AS duplicate_whm_rows_remaining
FROM public.service_library sl
WHERE sl.service_category = 'visa_immigration'
  AND sl.id <> 'b2000001-0001-4000-8000-000000000046'::uuid
  AND (
    lower(coalesce(sl.academy_metadata->>'displayName', '')) LIKE '%work%holiday%'
    OR lower(coalesce(sl.academy_metadata->>'displayName', '')) LIKE '%work%travel%'
    OR lower(sl.sub_service) LIKE '%work%holiday%'
    OR lower(sl.sub_service) LIKE '%work%travel%'
    OR lower(sl.sub_service) LIKE '%whv%'
    OR lower(sl.sub_service) LIKE '%merge-%'
    OR lower(sl.service) LIKE '%work%holiday%'
    OR lower(sl.service) LIKE '%work%travel%'
  );
