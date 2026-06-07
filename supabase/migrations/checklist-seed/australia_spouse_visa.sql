-- Australia – Partner Visa (Subclass 820/801 or 309/100) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000043'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('qualifying_relationship_marriage_or_12_months_de', 'Qualifying relationship (marriage or 12+ months de facto)', true, 1),
  ('sponsor_is_eligible_australian_citizen_pr_eligib', 'Sponsor is eligible Australian citizen/PR/eligible NZ citizen', true, 2),
  ('genuine_and_continuing_relationship_evidence', 'Genuine and continuing relationship evidence', true, 3),
  ('health_requirements_met', 'Health requirements met', true, 4),
  ('character_requirements_police_certs', 'Character requirements (police certs)', true, 5),
  ('sponsorship_obligations_understood', 'Sponsorship obligations understood', true, 6),
  ('correct_onshore_offshore_pathway', 'Correct onshore/offshore pathway', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000043'::uuid AND c.item_key = x.item_key
);
