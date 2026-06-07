-- Australia – Skilled Migration (Subclass 189/190/491) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000044'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('occupation_on_skilled_occupation_list', 'Occupation on skilled occupation list', true, 1),
  ('positive_skills_assessment', 'Positive skills assessment', true, 2),
  ('65_points_competitive_score', '65+ points (competitive score)', true, 3),
  ('age_under_45_at_invitation', 'Age under 45 at invitation', true, 4),
  ('competent_english_ielts_6_each_band_min', 'Competent English (IELTS 6 each band min)', true, 5),
  ('eoi_submitted_in_skillselect', 'EOI submitted in SkillSelect', true, 6),
  ('invitation_received', 'Invitation received', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000044'::uuid AND c.item_key = x.item_key
);
