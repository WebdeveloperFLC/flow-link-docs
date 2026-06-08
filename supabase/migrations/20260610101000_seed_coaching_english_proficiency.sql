-- English proficiency coaching — full academy packs (additive)
-- Regenerate: node scripts/generate-coaching-migrations.mjs

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-0000000000b5', 'coaching_services', 'PTE Academic', 'English Proficiency', 110, true),
  ('b2000001-0001-4000-8000-0000000000b6', 'coaching_services', 'TOEFL iBT', 'English Proficiency', 120, true),
  ('b2000001-0001-4000-8000-0000000000b7', 'coaching_services', 'CELPIP General', 'English Proficiency', 130, true),
  ('b2000001-0001-4000-8000-0000000000b8', 'coaching_services', 'Duolingo English Test', 'English Proficiency', 140, true),
  ('b2000001-0001-4000-8000-0000000000b9', 'coaching_services', 'Spoken English (with books)', 'English Proficiency', 150, true)
ON CONFLICT (service_category, service, sub_service) DO UPDATE
SET display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

-- PTE Academic
UPDATE public.service_library
SET academy_metadata = '{"displayName":"PTE Academic","shortDescription":"Pearson · Computer-based · 2-year validity · Accepted globally","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"PTE","policyAlert":{"active":true,"date":"June 2026","summary":"Verify PTE Academic exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in PTE Academic."},"tags":[{"label":"Active program","variant":"success"},{"label":"PTE","variant":"neutral"}],"chips":[{"label":"6–8 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"6–8 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured PTE Academic preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Students targeting PTE 50–79 for study, work, or migration pathways accepting PTE Academic."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Verify program variant — some batches include books, others are materials-light."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial PTE Academic coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on PTE Academic."}],"resources":[{"title":"PTE Academic — Official","url":"https://www.pearsonpte.com/","description":"Format, booking, scores"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for PTE Academic:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"PTE Academic coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in PTE Academic, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for PTE Academic is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for PTE Academic should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic'));

-- TOEFL iBT
UPDATE public.service_library
SET academy_metadata = '{"displayName":"TOEFL iBT","shortDescription":"ETS · Internet-based · USA admissions focus · 2-year validity","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"TOEFL","policyAlert":{"active":true,"date":"June 2026","summary":"Verify TOEFL iBT exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in TOEFL iBT."},"tags":[{"label":"Active program","variant":"success"},{"label":"TOEFL","variant":"neutral"}],"chips":[{"label":"6–8 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"6–8 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured TOEFL iBT preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"USA F-1 and programs requiring TOEFL iBT. Confirm university minimum before enrollment."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Verify program variant — some batches include books, others are materials-light."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial TOEFL iBT coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on TOEFL iBT."}],"resources":[{"title":"TOEFL — Official","url":"https://www.ets.org/toefl","description":"Registration, format, scores"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for TOEFL iBT:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"TOEFL iBT coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in TOEFL iBT, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for TOEFL iBT is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for TOEFL iBT should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT'));

-- CELPIP General
UPDATE public.service_library
SET academy_metadata = '{"displayName":"CELPIP General","shortDescription":"Canada IRCC · CLB scored · Express Entry & citizenship pathways","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"CELPIP","policyAlert":{"active":true,"date":"June 2026","summary":"Verify CELPIP-General exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in CELPIP General."},"tags":[{"label":"Active program","variant":"success"},{"label":"CELPIP","variant":"neutral"}],"chips":[{"label":"6–8 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"6–8 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured CELPIP General preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Canada PR, citizenship, and pathways accepting CELPIP-General (not Academic)."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Verify program variant — some batches include books, others are materials-light."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial CELPIP General coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on CELPIP General."}],"resources":[{"title":"CELPIP — Official","url":"https://www.celpip.ca/","description":"General vs Academic, CLB mapping"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for CELPIP General:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"CELPIP General coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in CELPIP General, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for CELPIP General is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for CELPIP General should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General'));

-- Duolingo English Test
UPDATE public.service_library
SET academy_metadata = '{"displayName":"Duolingo English Test","shortDescription":"Online proctored · Fast results · Growing uni acceptance","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"Duolingo","policyAlert":{"active":true,"date":"June 2026","summary":"Verify Duolingo English Test exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in Duolingo English Test."},"tags":[{"label":"Active program","variant":"success"},{"label":"Duolingo English Test","variant":"neutral"}],"chips":[{"label":"4–6 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"4–6 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured Duolingo English Test preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Students with university acceptance listing DET; confirm institution and score minimum."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Verify program variant — some batches include books, others are materials-light."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial Duolingo English Test coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on Duolingo English Test."}],"resources":[{"title":"Duolingo English Test","url":"https://englishtest.duolingo.com/","description":"Booking, format"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for Duolingo English Test:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"Duolingo English Test coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in Duolingo English Test, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for Duolingo English Test is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for Duolingo English Test should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test'));

-- Spoken English (with books)
UPDATE public.service_library
SET academy_metadata = '{"displayName":"Spoken English (with books)","shortDescription":"Fluency & confidence · Workplace / interview focus · Books included","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"Spoken English","policyAlert":{"active":true,"date":"June 2026","summary":"Spoken English builds fluency — not a substitute for IELTS/PTE for visa. Books included where stated."},"alert":{"title":"Confirm student goal before enrollment","body":"Verify pathway, target score/level, and timeline before enrolling in Spoken English (with books)."},"tags":[{"label":"Active program","variant":"success"},{"label":"Spoken English","variant":"neutral"}],"chips":[{"label":"8–10 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"8–10 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured Spoken English (with books) preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Students needing confidence, interview prep, or foundation before formal test prep."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Who pays the official exam fee?","a":"The student pays the test authority directly where applicable. FLC coaching fee is separate."},{"q":"Can Future Link guarantee the target score?","a":"No. We set targets from diagnostics and track progress — outcomes depend on student effort and attendance."},{"q":"Are books included?","a":"Yes — issue materials at enrollment and log on file."},{"q":"How many mock tests?","a":"Minimum per program policy — track mocks before advising exam booking."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial Spoken English (with books) coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on Spoken English (with books)."}],"resources":[],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for Spoken English (with books):","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"Spoken English (with books) coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in Spoken English (with books), FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for Spoken English (with books) is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Enrollment agreement for Spoken English (with books) should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)'));

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1),
  'PTE Academic — Enrollment Checklist.html',
  '/specimens/coaching/pte-academic-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — PTE Academic'
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1)
    AND cf.file_path = '/specimens/coaching/pte-academic-checklist.html'
);

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1),
  'TOEFL iBT — Enrollment Checklist.html',
  '/specimens/coaching/toefl-ibt-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — TOEFL iBT'
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1)
    AND cf.file_path = '/specimens/coaching/toefl-ibt-checklist.html'
);

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1),
  'CELPIP General — Enrollment Checklist.html',
  '/specimens/coaching/celpip-general-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — CELPIP General'
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1)
    AND cf.file_path = '/specimens/coaching/celpip-general-checklist.html'
);

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1),
  'Duolingo English Test — Enrollment Checklist.html',
  '/specimens/coaching/duolingo-english-test-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — Duolingo English Test'
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1)
    AND cf.file_path = '/specimens/coaching/duolingo-english-test-checklist.html'
);

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1),
  'Spoken English (with books) — Enrollment Checklist.html',
  '/specimens/coaching/spoken-english-checklist.html',
  'text/html',
  0,
  1,
  true,
  'Coaching enrollment checklist — Spoken English (with books)'
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1)
    AND cf.file_path = '/specimens/coaching/spoken-english-checklist.html'
);

-- Submission checklist — PTE Academic
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1) AND c.item_key = x.item_key
);

-- Submission checklist — TOEFL iBT
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1) AND c.item_key = x.item_key
);

-- Submission checklist — CELPIP General
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1) AND c.item_key = x.item_key
);

-- Submission checklist — Duolingo English Test
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1) AND c.item_key = x.item_key
);

-- Submission checklist — Spoken English (with books)
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1), x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
WHERE (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1) AND c.item_key = x.item_key
);
