-- Graduate admissions coaching — GRE, GMAT, SAT (additive)
-- Regenerate: node scripts/generate-coaching-migrations.mjs

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-0000000000ca', 'coaching_services', 'GRE', 'Graduate Admissions', 300, true),
  ('b2000001-0001-4000-8000-0000000000cb', 'coaching_services', 'GMAT', 'Graduate Admissions', 310, true),
  ('b2000001-0001-4000-8000-0000000000cc', 'coaching_services', 'SAT', 'Graduate Admissions', 320, true)
ON CONFLICT (service_category, service, sub_service) DO UPDATE
SET display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

-- GRE
UPDATE public.service_library
SET academy_metadata = '{"displayName":"GRE","shortDescription":"ETS · Verbal, Quant, AWA · USA grad school admissions","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"GRE","policyAlert":{"active":true,"date":"June 2026","summary":"Verify GRE exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in GRE."},"tags":[{"label":"Active program","variant":"success"},{"label":"GRE","variant":"neutral"}],"chips":[{"label":"8–12 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"8–12 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured GRE preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"MS/PhD applicants to USA and other programs requiring GRE General Test."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Verify program variant — some batches include books, others are materials-light."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial GRE coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on GRE."}],"resources":[{"title":"GRE — Official","url":"https://www.ets.org/gre","description":"Registration, format"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for GRE:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"GRE coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in GRE, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for GRE is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for GRE should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE service_category = 'coaching_services' AND service = 'GRE' AND sub_service = 'Graduate Admissions';

-- GMAT
UPDATE public.service_library
SET academy_metadata = '{"displayName":"GMAT","shortDescription":"GMAC · Focus Edition · MBA admissions","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"GMAT","policyAlert":{"active":true,"date":"June 2026","summary":"Verify GMAT Focus exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in GMAT."},"tags":[{"label":"Active program","variant":"success"},{"label":"GMAT","variant":"neutral"}],"chips":[{"label":"8–12 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"8–12 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured GMAT preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"MBA and business master''s applicants requiring GMAT."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Verify program variant — some batches include books, others are materials-light."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial GMAT coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on GMAT."}],"resources":[{"title":"GMAT — Official","url":"https://www.mba.com/","description":"Registration, format"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for GMAT:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"GMAT coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in GMAT, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for GMAT is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for GMAT should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE service_category = 'coaching_services' AND service = 'GMAT' AND sub_service = 'Graduate Admissions';

-- SAT
UPDATE public.service_library
SET academy_metadata = '{"displayName":"SAT","shortDescription":"College Board · USA undergraduate admissions","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"SAT","policyAlert":{"active":true,"date":"June 2026","summary":"Verify SAT exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in SAT."},"tags":[{"label":"Active program","variant":"success"},{"label":"SAT","variant":"neutral"}],"chips":[{"label":"8–12 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"8–12 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured SAT preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"USA undergraduate applicants requiring SAT."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Verify program variant — some batches include books, others are materials-light."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial SAT coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on SAT."}],"resources":[{"title":"SAT — Official","url":"https://satsuite.collegeboard.org/","description":"Registration, format"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for SAT:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"SAT coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in SAT, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for SAT is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for SAT should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE service_category = 'coaching_services' AND service = 'SAT' AND sub_service = 'Graduate Admissions';

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GRE' AND sub_service = 'Graduate Admissions' LIMIT 1),
  'GRE — Enrollment Checklist.html',
  '/specimens/coaching/gre-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — GRE'
WHERE (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GRE' AND sub_service = 'Graduate Admissions' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GRE' AND sub_service = 'Graduate Admissions' LIMIT 1)
    AND cf.file_path = '/specimens/coaching/gre-checklist.html'
);

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GMAT' AND sub_service = 'Graduate Admissions' LIMIT 1),
  'GMAT — Enrollment Checklist.html',
  '/specimens/coaching/gmat-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — GMAT'
WHERE (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GMAT' AND sub_service = 'Graduate Admissions' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GMAT' AND sub_service = 'Graduate Admissions' LIMIT 1)
    AND cf.file_path = '/specimens/coaching/gmat-checklist.html'
);

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'SAT' AND sub_service = 'Graduate Admissions' LIMIT 1),
  'SAT — Enrollment Checklist.html',
  '/specimens/coaching/sat-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — SAT'
WHERE (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'SAT' AND sub_service = 'Graduate Admissions' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'SAT' AND sub_service = 'Graduate Admissions' LIMIT 1)
    AND cf.file_path = '/specimens/coaching/sat-checklist.html'
);

-- Submission checklist — GRE
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GRE' AND sub_service = 'Graduate Admissions' LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('diagnostic_completed', 'Diagnostic / level assessment completed', true, 1),
  ('enrollment_agreement_signed', 'Enrollment agreement signed', true, 2),
  ('course_fee_collected', 'Course fee collected; receipt issued', true, 3),
  ('batch_assigned', 'Batch assigned and schedule shared', true, 4),
  ('materials_issued', 'Books / materials issued and logged', true, 5),
  ('attendance_tracking_active', 'Attendance tracking active on file', true, 6),
  ('mock_tests_scheduled', 'Mock tests scheduled and tracked', true, 7),
  ('exam_registration_guidance', 'Exam registration guidance provided (if applicable)', false, 8),
  ('counselor_review_completed', 'Counselor progress review completed', true, 9),
  ('completion_or_handoff', 'Course completion / handoff documented', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GRE' AND sub_service = 'Graduate Admissions' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GRE' AND sub_service = 'Graduate Admissions' LIMIT 1) AND c.item_key = x.item_key
);

-- Submission checklist — GMAT
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GMAT' AND sub_service = 'Graduate Admissions' LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('diagnostic_completed', 'Diagnostic / level assessment completed', true, 1),
  ('enrollment_agreement_signed', 'Enrollment agreement signed', true, 2),
  ('course_fee_collected', 'Course fee collected; receipt issued', true, 3),
  ('batch_assigned', 'Batch assigned and schedule shared', true, 4),
  ('materials_issued', 'Books / materials issued and logged', true, 5),
  ('attendance_tracking_active', 'Attendance tracking active on file', true, 6),
  ('mock_tests_scheduled', 'Mock tests scheduled and tracked', true, 7),
  ('exam_registration_guidance', 'Exam registration guidance provided (if applicable)', false, 8),
  ('counselor_review_completed', 'Counselor progress review completed', true, 9),
  ('completion_or_handoff', 'Course completion / handoff documented', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GMAT' AND sub_service = 'Graduate Admissions' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'GMAT' AND sub_service = 'Graduate Admissions' LIMIT 1) AND c.item_key = x.item_key
);

-- Submission checklist — SAT
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'SAT' AND sub_service = 'Graduate Admissions' LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('diagnostic_completed', 'Diagnostic / level assessment completed', true, 1),
  ('enrollment_agreement_signed', 'Enrollment agreement signed', true, 2),
  ('course_fee_collected', 'Course fee collected; receipt issued', true, 3),
  ('batch_assigned', 'Batch assigned and schedule shared', true, 4),
  ('materials_issued', 'Books / materials issued and logged', true, 5),
  ('attendance_tracking_active', 'Attendance tracking active on file', true, 6),
  ('mock_tests_scheduled', 'Mock tests scheduled and tracked', true, 7),
  ('exam_registration_guidance', 'Exam registration guidance provided (if applicable)', false, 8),
  ('counselor_review_completed', 'Counselor progress review completed', true, 9),
  ('completion_or_handoff', 'Course completion / handoff documented', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'SAT' AND sub_service = 'Graduate Admissions' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE service_category = 'coaching_services' AND service = 'SAT' AND sub_service = 'Graduate Admissions' LIMIT 1) AND c.item_key = x.item_key
);
