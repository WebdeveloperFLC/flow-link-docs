-- Patch canonical Canada student row: resources + quiz (merge into existing academy_metadata).
-- Run after canada-student-visa-academy-metadata.sql if those fields are missing.

UPDATE public.service_library
SET academy_metadata = academy_metadata
  || jsonb_build_object(
    'resources', '[
      {"title":"IRCC — Study permit","url":"https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html","description":"Official requirements and how to apply"},
      {"title":"DLI list","url":"https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html","description":"Verify institution before LOA"},
      {"title":"Student Direct Stream (SDS)","url":"https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/student-direct-stream.html","description":"Eligibility by country of residence"},
      {"title":"Biometrics","url":"https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/biometrics/facts.html","description":"When required and booking after BIL"},
      {"title":"IRCC processing times","url":"https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html","description":"Current estimates"},
      {"title":"GIC participating banks","url":"https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/student-direct-stream/eligible-gic.html","description":"Approved institutions for SDS GIC"}
    ]'::jsonb,
    'quiz', '[
      {"question":"What must every study permit applicant have from their school?","options":["Job offer letter","Letter of acceptance from a DLI","Provincial nomination","LMIA"],"correctIndex":1,"explanation":"Valid LOA from a DLI is mandatory."},
      {"question":"When is SDS typically faster than Non-SDS?","options":["When client has no language test","When client meets SDS country, language, GIC, and tuition requirements","When applying at port of entry only","When funds shown for 1 week only"],"correctIndex":1,"explanation":"SDS has specific eligibility by country of residence."},
      {"question":"After a BIL is issued, counselors should urge the client to:","options":["Wait until approval","Book biometrics promptly (often within 30 days)","Skip biometrics if refused before","Mail passport without appointment"],"correctIndex":1,"explanation":"Late biometrics causes preventable delays."},
      {"question":"Which is a top red flag for study permit funds?","options":["6-month bank history","Large unexplained recent deposits","Sponsor ITR with employment letter","GIC from approved SDS bank"],"correctIndex":1,"explanation":"Unseasoned deposits weaken credibility."},
      {"question":"Before submission, firm policy requires:","options":["Guarantee of approval","Signed checklist and consent where required","Hiding prior refusals","Using expired LOA if tuition paid"],"correctIndex":1,"explanation":"Compliance: consent, checklist sign-off, honest disclosure."}
    ]'::jsonb
  ),
  updated_at = now()
WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';

SELECT jsonb_array_length(COALESCE(academy_metadata->'resources', '[]'::jsonb)) AS resource_count,
       jsonb_array_length(COALESCE(academy_metadata->'quiz', '[]'::jsonb)) AS quiz_count
FROM public.service_library
WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';
