-- Canada – Spouse / Partner Sponsorship — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000012'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('sponsor_is_canadian_citizen_or_pr_aged_18', 'Sponsor is Canadian citizen or PR aged 18+', true, 1),
  ('legally_valid_marriage_or_qualifying_relationshi', 'Legally valid marriage or qualifying relationship', true, 2),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 3),
  ('sponsor_not_in_default_of_prior_sponsorship_unde', 'Sponsor not in default of prior sponsorship undertakings', true, 4),
  ('medical_exam_completed', 'Medical exam completed', true, 5),
  ('police_certificates_as_required', 'Police certificates as required', true, 6),
  ('biometrics_completed', 'Biometrics completed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000012'::uuid AND c.item_key = x.item_key
);
