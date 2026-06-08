-- Fix Work & Holiday checklist download + process steps + submission checklist.
-- Run after 20260607230000 and 20260607231000. Safe to re-run.

-- WHM is Australia-only; remove erroneous multi-country mappings (causes old template country chips)
DELETE FROM public.service_library_countries
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND country <> 'Australia';

INSERT INTO public.service_library_countries (library_id, country)
VALUES ('b2000001-0001-4000-8000-000000000046'::uuid, 'Australia')
ON CONFLICT DO NOTHING;

-- HTML checklist is primary; PDF reference only (PDF URL often blocked by browser extensions)
UPDATE public.service_library_checklist_files
SET is_current = false, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND file_path = '/specimens/checklists/Australia work and holiday.pdf';

UPDATE public.service_library_checklist_files
SET
  is_current = true,
  size_bytes = 112837,
  file_name = 'Australia – Work & Holiday Visa (1 year Work & Travel) — Document Checklist.html',
  mime_type = 'text/html',
  notes = 'Future Link branded checklist — fields auto-fill when linked to client',
  updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND file_path = '/specimens/checklists/australia-work-holiday.html';

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-000000000046'::uuid,
  'Australia – Work & Holiday Visa (1 year Work & Travel) — Document Checklist.html',
  '/specimens/checklists/australia-work-holiday.html',
  'text/html',
  112837,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
    AND cf.file_path = '/specimens/checklists/australia-work-holiday.html'
);

-- Process tab steps (matches timeline in academy metadata)
UPDATE public.service_library
SET
  process_flow = '[
    {"title": "Eligibility screen — passport, age, WHM history", "duration": "Week 1", "owner": "Counselor"},
    {"title": "Documents, funds, insurance, ImmiAccount", "duration": "Week 1–2", "owner": "Counselor"},
    {"title": "Lodgement & biometrics", "duration": "Week 2–3", "owner": "Documentation"},
    {"title": "Home Affairs processing", "duration": "Week 2–8", "owner": "Home Affairs"}
  ]'::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-000000000046'::uuid;

-- Submission checklist tab (in-app Checklist section)
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

-- Remove duplicate keys from earlier migration runs (keep canonical 12-item set)
DELETE FROM public.service_library_submission_checklist
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND item_key IN (
    'passport_from_eligible_working_holiday_country',
    'first_working_holiday_maker_whm_visa'
  );

-- Verify
SELECT
  sl.academy_metadata->>'version' AS version,
  jsonb_array_length(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) AS quiz_count,
  jsonb_array_length(COALESCE(sl.process_flow, '[]'::jsonb)) AS process_steps,
  (SELECT count(*) FROM service_library_checklist_files cf
     WHERE cf.library_id = sl.id AND cf.is_current AND cf.file_path LIKE '%.html') AS html_checklists,
  (SELECT count(*) FROM service_library_submission_checklist sc
     WHERE sc.library_id = sl.id AND sc.is_active) AS submission_items,
  (SELECT count(*) FROM service_library_countries c WHERE c.library_id = sl.id) AS country_mappings
FROM public.service_library sl
WHERE sl.id = 'b2000001-0001-4000-8000-000000000046'::uuid;
