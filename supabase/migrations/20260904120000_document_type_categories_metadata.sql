-- Seed document_types metadata.category for Add Document relevance + reporting
-- Ranking order remains client-side (documentRelevance.ts); DB stores canonical category.

UPDATE public.master_items mi
SET metadata = COALESCE(mi.metadata, '{}'::jsonb) || jsonb_build_object('category', v.cat)
FROM (VALUES
  ('marksheet_10', 'academic'),
  ('marksheet_12', 'academic'),
  ('academic_transcripts', 'academic'),
  ('degree_certificate', 'academic'),
  ('ielts_language_test', 'academic'),
  ('offer_letter', 'academic'),
  ('passport', 'identity'),
  ('birth_certificate', 'identity'),
  ('photograph', 'relationship'),
  ('marriage_certificate', 'relationship'),
  ('relationship_proof', 'relationship'),
  ('divorce_certificate', 'relationship'),
  ('police_clearance', 'police'),
  ('bank_statement', 'financial'),
  ('financial_documents', 'financial'),
  ('gic_certificate', 'financial'),
  ('tuition_fee_receipt', 'financial'),
  ('affidavit_of_support', 'financial'),
  ('employment_letter', 'employment'),
  ('experience_letter', 'employment'),
  ('salary_slips', 'employment'),
  ('medical_report', 'medical'),
  ('visa_refusal', 'travel'),
  ('refusal_letter', 'travel'),
  ('travel_history', 'travel'),
  ('cover_letter', 'forms'),
  ('statement_of_purpose', 'forms'),
  ('visa_forms', 'forms')
) AS v(code, cat)
WHERE mi.list_key = 'document_types'
  AND mi.code = v.code;

-- Label heuristics still apply for codes not listed above.
