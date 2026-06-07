-- New Zealand – Skilled Migrant Category (SMC) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000064'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('skilled_job_offer_or_current_skilled_employment_', 'Skilled job offer or current skilled employment in NZ', true, 1),
  ('points_meet_or_exceed_recent_selection_threshold', 'Points meet or exceed recent selection threshold', true, 2),
  ('age_under_55_for_maximum_points', 'Age under 55 (for maximum points)', true, 3),
  ('english_competency_ielts_6_5_avg_or_equivalent', 'English competency (IELTS 6.5 avg or equivalent)', true, 4),
  ('qualification_assessment_if_required', 'Qualification assessment (if required)', true, 5),
  ('eoi_submitted_and_selected', 'EOI submitted and selected', true, 6),
  ('health_and_character_clearances', 'Health and character clearances', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000064'::uuid AND c.item_key = x.item_key
);
