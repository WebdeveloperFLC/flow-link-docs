-- Phase 1 completion: seed missing document_types for profile defaults + suggestions

INSERT INTO public.master_items (list_key, code, label, sort_order, is_active)
VALUES
  ('document_types', 'coe', 'Confirmation of Enrolment (CoE)', 230, true),
  ('document_types', 'cas_letter', 'CAS Letter (UK)', 240, true),
  ('document_types', 'oshc_policy', 'OSHC Policy Certificate', 250, true),
  ('document_types', 'relationship_proof', 'Relationship Evidence', 260, true),
  ('document_types', 'principal_status_document', 'Principal Applicant Status Document', 270, true),
  ('document_types', 'travel_itinerary', 'Travel Itinerary', 280, true),
  ('document_types', 'travel_history_record', 'Travel History Record', 290, true),
  ('document_types', 'visa_refusal_letter', 'Visa Refusal Letter', 300, true),
  ('document_types', 'business_registration', 'Business Registration', 310, true),
  ('document_types', 'itr_tax_returns', 'ITR / Tax Returns', 320, true),
  ('document_types', 'blocked_account_proof', 'Blocked Account / Sperrkonto Proof', 330, true),
  ('document_types', 'entrance_exam_scorecard', 'Entrance Exam Scorecard', 340, true),
  ('document_types', 'enrollment_agreement', 'Enrollment Agreement', 350, true),
  ('document_types', 'diagnostic_score_report', 'Diagnostic / Mock Test Score Report', 360, true),
  ('document_types', 'accommodation_proof', 'Accommodation Proof', 370, true)
ON CONFLICT (list_key, code) DO UPDATE SET
  label = EXCLUDED.label,
  is_active = true;

-- Category metadata for new codes
UPDATE public.master_items mi
SET metadata = COALESCE(mi.metadata, '{}'::jsonb) || jsonb_build_object('category', v.cat)
FROM (VALUES
  ('coe', 'academic'),
  ('cas_letter', 'academic'),
  ('oshc_policy', 'medical'),
  ('relationship_proof', 'relationship'),
  ('principal_status_document', 'relationship'),
  ('travel_itinerary', 'travel'),
  ('travel_history_record', 'travel'),
  ('visa_refusal_letter', 'travel'),
  ('business_registration', 'employment'),
  ('itr_tax_returns', 'financial'),
  ('blocked_account_proof', 'financial'),
  ('entrance_exam_scorecard', 'academic'),
  ('enrollment_agreement', 'forms'),
  ('diagnostic_score_report', 'academic'),
  ('accommodation_proof', 'travel')
) AS v(code, cat)
WHERE mi.list_key = 'document_types'
  AND mi.code = v.code;

-- Optional audit columns on service cases (profile resolved at activation)
ALTER TABLE public.client_service_cases
  ADD COLUMN IF NOT EXISTS document_profile_type text,
  ADD COLUMN IF NOT EXISTS destination_country text;

COMMENT ON COLUMN public.client_service_cases.document_profile_type IS
  'Visa profile id used to seed default document requirements (student_visa, spouse_dependent, etc.)';
COMMENT ON COLUMN public.client_service_cases.destination_country IS
  'Destination country parsed from service_code suffix (e.g. Canada from uuid::Canada)';
