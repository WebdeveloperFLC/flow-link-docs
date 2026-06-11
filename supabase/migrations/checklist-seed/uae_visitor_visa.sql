-- United Arab Emirates – Visitor Visa (Tourist / Short Stay) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d9'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_6_months', 'Valid passport (6+ months)', true, 1),
  ('passport_scan_and_photo_per_spec', 'Passport scan and photo per spec', true, 2),
  ('confirmed_duration_and_entry_type_30_60_90_singl', 'Confirmed duration and entry type (30/60/90, single/multiple)', true, 3),
  ('emirate_route_selected_dubai_sharjah_abu_dhabi', 'Emirate route selected (Dubai / Sharjah / Abu Dhabi)', true, 4),
  ('return_onward_travel_plan', 'Return/onward travel plan', true, 5),
  ('no_prior_uae_overstay_or_ban', 'No prior UAE overstay or ban', true, 6),
  ('sponsor_or_authorised_agent_engaged', 'Sponsor or authorised agent engaged', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d9'::uuid AND c.item_key = x.item_key
);
