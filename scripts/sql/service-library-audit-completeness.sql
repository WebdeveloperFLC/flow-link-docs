-- Service Library completeness audit (run in Supabase SQL Editor)
-- Or: node scripts/audit-service-library-completeness.mjs --live

WITH base AS (
  SELECT
    sl.id,
    sl.service_category,
    sl.service,
    sl.sub_service,
    sl.academy_metadata,
    sl.process_flow,
    sl.cost_summary_html,
    sl.checklist_text,
    COALESCE(
      (SELECT json_agg(c.country ORDER BY c.country)
       FROM public.service_library_countries c
       WHERE c.library_id = sl.id),
      '[]'::json
    ) AS countries,
    (SELECT count(*) FROM public.service_library_fee_items f WHERE f.library_id = sl.id) AS fee_items,
    (SELECT count(*) FROM public.service_library_submission_checklist s
       WHERE s.library_id = sl.id AND s.is_active = true) AS submission_items,
    (SELECT count(*) FROM public.service_library_visa_form_files v
       WHERE v.library_id = sl.id AND v.is_current = true) AS visa_forms,
    (SELECT count(*) FROM public.service_library_checklist_files cf
       WHERE cf.library_id = sl.id AND cf.is_current = true) AS checklist_files,
    (SELECT count(*) FROM public.service_library_overrides o WHERE o.library_id = sl.id) AS overrides
  FROM public.service_library sl
  WHERE sl.is_active = true
),
scored AS (
  SELECT
    b.*,
    b.academy_metadata->>'displayName' AS display_name,
    jsonb_array_length(COALESCE(b.academy_metadata->'faqs', '[]'::jsonb)) AS faq_count,
    jsonb_array_length(COALESCE(b.academy_metadata->'quiz', '[]'::jsonb)) AS quiz_count,
    jsonb_array_length(COALESCE(b.academy_metadata->'redFlags', '[]'::jsonb)) AS red_flag_count,
    jsonb_array_length(COALESCE(b.academy_metadata->'kpis', '[]'::jsonb)) AS kpi_count,
    jsonb_array_length(COALESCE(b.academy_metadata->'resources', '[]'::jsonb)) AS resource_count,
    jsonb_array_length(COALESCE(b.academy_metadata->'sampleDocs', '[]'::jsonb)) AS sample_doc_count,
    jsonb_array_length(COALESCE(b.academy_metadata->'timeline', '[]'::jsonb)) AS timeline_count,
    jsonb_array_length(COALESCE(b.academy_metadata->'fullCostBreakdown'->'sections', '[]'::jsonb)) AS cost_sections,
    CASE WHEN b.academy_metadata IS NULL OR b.academy_metadata = '{}'::jsonb THEN true ELSE false END AS metadata_empty,
    CASE WHEN b.academy_metadata->>'displayName' IS NULL OR btrim(b.academy_metadata->>'displayName') = '' THEN true ELSE false END AS missing_display_name,
    CASE WHEN b.academy_metadata->>'shortDescription' IS NULL OR btrim(b.academy_metadata->>'shortDescription') = '' THEN true ELSE false END AS missing_short_description,
    CASE WHEN jsonb_array_length(COALESCE(b.academy_metadata->'faqs', '[]'::jsonb)) < 30 THEN true ELSE false END AS faqs_below_30,
    CASE WHEN jsonb_array_length(COALESCE(b.academy_metadata->'quiz', '[]'::jsonb)) < 75 THEN true ELSE false END AS quiz_below_75,
    CASE WHEN jsonb_array_length(COALESCE(b.academy_metadata->'redFlags', '[]'::jsonb)) = 0 THEN true ELSE false END AS missing_red_flags,
    CASE WHEN b.fee_items = 0
      AND jsonb_array_length(COALESCE(b.academy_metadata->'feeBreakdown'->'items', '[]'::jsonb)) = 0
      AND jsonb_array_length(COALESCE(b.academy_metadata->'consultancyBreakdown'->'packages', '[]'::jsonb)) = 0
      THEN true ELSE false END AS missing_fees,
    CASE WHEN (b.process_flow IS NULL OR b.process_flow = '[]'::jsonb OR b.process_flow = 'null'::jsonb)
      AND jsonb_array_length(COALESCE(b.academy_metadata->'timeline', '[]'::jsonb)) < 4
      THEN true ELSE false END AS missing_process,
    CASE WHEN b.submission_items < 10 THEN true ELSE false END AS checklist_below_10,
    CASE WHEN b.service_category = 'visa_immigration' AND b.visa_forms = 0 THEN true ELSE false END AS missing_visa_forms,
    CASE WHEN b.service_category = 'visa_immigration' AND b.checklist_files = 0 THEN true ELSE false END AS missing_checklist_pdfs,
    CASE WHEN b.service_category = 'visa_immigration' AND jsonb_array_length(b.countries::jsonb) = 0 THEN true ELSE false END AS missing_countries,
    CASE WHEN b.academy_metadata->'feeBreakdown'->>'lastVerified' IS NULL
      AND jsonb_array_length(COALESCE(b.academy_metadata->'feeBreakdown'->'items', '[]'::jsonb)) > 0
      THEN true ELSE false END AS missing_fee_verified,
    CASE WHEN b.academy_metadata->'fullCostBreakdown'->>'lastVerified' IS NULL
      AND jsonb_array_length(COALESCE(b.academy_metadata->'fullCostBreakdown'->'sections', '[]'::jsonb)) > 0
      THEN true ELSE false END AS missing_cost_verified,
    CASE WHEN b.academy_metadata->'workingRights'->'applicant'->>'summary' IS NOT NULL
      AND b.academy_metadata->'workingRights'->'applicant'->>'lastVerified' IS NULL
      THEN true ELSE false END AS missing_applicant_rights_verified,
    CASE WHEN b.academy_metadata->'workingRights'->'spouse'->>'summary' IS NOT NULL
      AND b.academy_metadata->'workingRights'->'spouse'->>'lastVerified' IS NULL
      THEN true ELSE false END AS missing_spouse_rights_verified,
    CASE WHEN (b.academy_metadata->'policyAlert'->>'active')::boolean IS true
      AND b.academy_metadata->'policyAlert'->>'date' IS NULL
      THEN true ELSE false END AS missing_policy_date,
    CASE WHEN b.academy_metadata->>'updatedLabel' IS NULL OR btrim(b.academy_metadata->>'updatedLabel') = ''
      THEN true ELSE false END AS missing_updated_label
  FROM base b
)
SELECT
  id,
  display_name,
  service_category,
  service,
  sub_service,
  countries,
  faq_count,
  quiz_count,
  red_flag_count,
  fee_items,
  submission_items,
  visa_forms,
  checklist_files,
  overrides,
  (
    (CASE WHEN metadata_empty THEN 1 ELSE 0 END) +
    (CASE WHEN missing_display_name THEN 1 ELSE 0 END) +
    (CASE WHEN missing_short_description THEN 1 ELSE 0 END) +
    (CASE WHEN faqs_below_30 THEN 1 ELSE 0 END) +
    (CASE WHEN quiz_below_75 THEN 1 ELSE 0 END) +
    (CASE WHEN missing_red_flags THEN 1 ELSE 0 END) +
    (CASE WHEN missing_fees THEN 1 ELSE 0 END) +
    (CASE WHEN missing_process THEN 1 ELSE 0 END) +
    (CASE WHEN checklist_below_10 THEN 1 ELSE 0 END) +
    (CASE WHEN missing_visa_forms THEN 1 ELSE 0 END) +
    (CASE WHEN missing_checklist_pdfs THEN 1 ELSE 0 END) +
    (CASE WHEN missing_countries THEN 1 ELSE 0 END) +
    (CASE WHEN missing_fee_verified THEN 1 ELSE 0 END) +
    (CASE WHEN missing_cost_verified THEN 1 ELSE 0 END) +
    (CASE WHEN missing_applicant_rights_verified THEN 1 ELSE 0 END) +
    (CASE WHEN missing_spouse_rights_verified THEN 1 ELSE 0 END) +
    (CASE WHEN missing_policy_date THEN 1 ELSE 0 END) +
    (CASE WHEN missing_updated_label THEN 1 ELSE 0 END)
  ) AS issue_flags,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN metadata_empty THEN 'metadata_empty' END,
    CASE WHEN missing_display_name THEN 'missing_display_name' END,
    CASE WHEN missing_short_description THEN 'missing_short_description' END,
    CASE WHEN faqs_below_30 THEN 'faqs_below_30' END,
    CASE WHEN quiz_below_75 THEN 'quiz_below_75' END,
    CASE WHEN missing_red_flags THEN 'missing_red_flags' END,
    CASE WHEN missing_fees THEN 'missing_fees' END,
    CASE WHEN missing_process THEN 'missing_process' END,
    CASE WHEN checklist_below_10 THEN 'checklist_below_10' END,
    CASE WHEN missing_visa_forms THEN 'missing_visa_forms' END,
    CASE WHEN missing_checklist_pdfs THEN 'missing_checklist_pdfs' END,
    CASE WHEN missing_countries THEN 'missing_countries' END,
    CASE WHEN missing_fee_verified THEN 'missing_fee_verified' END,
    CASE WHEN missing_cost_verified THEN 'missing_cost_verified' END,
    CASE WHEN missing_applicant_rights_verified THEN 'missing_applicant_rights_verified' END,
    CASE WHEN missing_spouse_rights_verified THEN 'missing_spouse_rights_verified' END,
    CASE WHEN missing_policy_date THEN 'missing_policy_date' END,
    CASE WHEN missing_updated_label THEN 'missing_updated_label' END
  ], NULL) AS issues
FROM scored
ORDER BY issue_flags DESC, display_name;

-- Summary counts
SELECT
  COUNT(*) AS total_services,
  COUNT(*) FILTER (WHERE issue_flags = 0) AS fully_complete,
  COUNT(*) FILTER (WHERE metadata_empty) AS metadata_empty,
  COUNT(*) FILTER (WHERE faqs_below_30) AS faqs_below_30,
  COUNT(*) FILTER (WHERE quiz_below_75) AS quiz_below_75,
  COUNT(*) FILTER (WHERE missing_fees) AS missing_fees,
  COUNT(*) FILTER (WHERE missing_process) AS missing_process,
  COUNT(*) FILTER (WHERE checklist_below_10) AS checklist_below_10,
  COUNT(*) FILTER (WHERE missing_visa_forms) AS missing_visa_forms,
  COUNT(*) FILTER (WHERE missing_checklist_pdfs) AS missing_checklist_pdfs,
  COUNT(*) FILTER (WHERE missing_fee_verified OR missing_cost_verified
    OR missing_applicant_rights_verified OR missing_spouse_rights_verified
    OR missing_policy_date OR missing_updated_label) AS missing_any_verification_date
FROM scored;
