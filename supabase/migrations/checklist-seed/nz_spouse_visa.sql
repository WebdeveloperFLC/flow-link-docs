-- New Zealand – Partner of a New Zealander Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000063'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('nz_citizen_or_resident_partner', 'NZ citizen or resident partner', true, 1),
  ('genuine_and_stable_relationship_12_months', 'Genuine and stable relationship 12+ months', true, 2),
  ('relationship_evidence_package', 'Relationship evidence package', true, 3),
  ('health_requirements', 'Health requirements', true, 4),
  ('character_requirements_police_certs', 'Character requirements (police certs)', true, 5),
  ('partner_support_declaration', 'Partner support declaration', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000063'::uuid AND c.item_key = x.item_key
);
