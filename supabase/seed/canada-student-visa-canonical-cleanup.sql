-- Canada Student Visa: keep content on ONE service_library row only.
-- Canonical: Study Permit (Undergraduate / Postgraduate / College)
-- Run in Supabase SQL Editor.

-- 1) Clear duplicate rows
UPDATE public.service_library
SET academy_metadata = '{}'::jsonb, updated_at = now()
WHERE id IN (
  'c87706af-bd1e-4a33-a3dd-fab701c1ed3f',
  '7811e0d2-348a-45ea-80fd-7c073ca66a63'
);

-- 2) Enrich canonical row: process + document notes + quick guide (tabs: Process, Checklist, Do's)
UPDATE public.service_library
SET
  process_flow = '[
    {"title": "Initial counseling & LOA review", "duration": "Week 1", "owner": "Counselor"},
    {"title": "Document collection & SOP", "duration": "Weeks 2–3", "owner": "Counselor"},
    {"title": "Financial proof & GIC (if SDS)", "duration": "Week 3", "owner": "Documentation"},
    {"title": "Quality review", "duration": "Week 4", "owner": "QA"},
    {"title": "IRCC online submission", "duration": "Week 4–5", "owner": "Documentation"},
    {"title": "Biometrics (if BIL issued)", "duration": "Within 30 days of BIL", "owner": "Client"},
    {"title": "Medical exam (if required)", "duration": "As instructed", "owner": "Client"},
    {"title": "IRCC processing", "duration": "8–12 weeks", "owner": "IRCC"}
  ]'::jsonb,
  checklist_text = '<p><strong>Document package</strong></p><ul><li>Valid passport</li><li>LOA from DLI</li><li>Proof of funds / GIC (SDS)</li><li>Language test results (SDS)</li><li>SOP and study plan</li><li>Academic transcripts</li><li>Sponsor documents (if applicable)</li><li>Digital photo per IRCC specs</li></ul><p>Confirm biometrics and medical instructions on IRCC portal after submission.</p>',
  quick_guide_what_to_do = 'Verify DLI on official list before fee collection.
Confirm SDS vs Non-SDS eligibility for country of residence.
Collect seasoned funds evidence (4–6 months) for Non-SDS.
Book biometrics within 30 days of BIL.
Track application status in IRCC account.',
  quick_guide_common_mistakes = 'Recent unexplained bank deposits.
Generic SOP not matching course or academics.
Expired or wrong LOA dates.
Missing sponsor ITR or employment proof.
Late biometrics after BIL.',
  quick_guide_escalation_rules = 'Prior Canada refusal — escalate to senior counselor before resubmit.
Funds gap over 20% — manager review.
Client wants misrepresentation — do not proceed.',
  quick_guide_important_reminders = 'Never guarantee approval.
Separate consultancy vs government vs GIC fees on invoice.
Client must sign checklist before submission.',
  updated_at = now()
WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';

-- 3) Canada-specific submission checklist (if missing)
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'c35e6051-f40f-47bf-9cac-0a386c47a336', x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('loa_valid', 'LOA from DLI verified', true, 1),
  ('funds_proof', 'Proof of funds / GIC (SDS) complete', true, 2),
  ('language_scores', 'Language scores valid (SDS if applicable)', true, 3),
  ('sop_final', 'SOP finalized and signed off', true, 4),
  ('forms_complete', 'IMM forms complete and signed', true, 5),
  ('fees_paid', 'Government & biometrics fees paid', true, 6),
  ('biometrics_done', 'Biometrics completed (if required)', true, 7),
  ('qa_signoff', 'Quality review sign-off', true, 8),
  ('ircc_submitted', 'Submitted in IRCC portal', true, 9),
  ('client_informed', 'Client informed of next steps', false, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336'
    AND c.item_key = x.item_key
);

-- 4) Verify
SELECT id, service, sub_service,
       academy_metadata->>'displayName' AS display_name,
       jsonb_array_length(COALESCE(process_flow, '[]'::jsonb)) AS process_steps,
       (SELECT count(*) FROM service_library_submission_checklist c WHERE c.library_id = sl.id AND c.is_active) AS checklist_items
FROM public.service_library sl
WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';
