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
SET academy_metadata = '{"displayName":"PTE Academic","shortDescription":"Pearson · Computer-based · 2-year validity · Accepted globally","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"PTE","policyAlert":{"active":true,"date":"June 2026","summary":"Verify PTE Academic exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Confirm institution acceptance","body":"PTE Academic acceptance varies by country and university. Confirm destination rules before enrollment — not all PR pathways accept PTE."},"tags":[{"label":"Active program","variant":"success"},{"label":"PTE","variant":"neutral"}],"chips":[{"label":"6–8 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"6–8 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured PTE Academic preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Students targeting PTE 50–79 for study, work, or migration pathways accepting PTE Academic."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"PTE Academic vs PTE Core?","a":"PTE Academic is for study/work abroad. PTE Core is for Canadian immigration (IRCC) — confirm which test the pathway requires."},{"q":"Who pays the PTE exam fee?","a":"Student pays Pearson directly on pearsonpte.com. Coaching fee is separate."},{"q":"How fast are PTE results?","a":"Often within 48 hours to 5 days — faster than many paper tests."},{"q":"Can FLC guarantee PTE 79?","a":"No. Never guarantee scores."},{"q":"PTE for Australia skilled migration?","a":"PTE Academic is accepted for many Australian skilled visas — verify current Home Affairs list."},{"q":"Is PTE fully computer-based?","a":"Yes — including speaking into a microphone."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial PTE Academic coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on PTE Academic."}],"resources":[{"title":"PTE Academic — Official","url":"https://www.pearsonpte.com/","description":"Format, booking, scores"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for PTE Academic:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"PTE Academic coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in PTE Academic, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for PTE Academic is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"PTE Academic is:","options":["Paper-based only","Computer-based at a test center","Interview only","Home handwritten"],"correctIndex":1,"explanation":"PTE Academic is computer-delivered.","level":1},{"question":"PTE scores are typically valid for:","options":["6 months","2 years","5 years","Forever"],"correctIndex":1,"explanation":"Two years from test date for most uses.","level":1},{"question":"Enrollment agreement for PTE Academic should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2},{"question":"Before advising official exam booking for PTE Academic:","options":["No mocks needed","Mocks support agreed target","Guarantee pass first","Book earliest date"],"correctIndex":1,"explanation":"Readiness should be based on mock performance.","level":2},{"question":"When attendance drops below 80% in PTE Academic:","options":["Ignore it","Counselor review and intervention","Guarantee refund","Cancel visa file"],"correctIndex":1,"explanation":"Attendance issues require counselor follow-up.","level":2},{"question":"Official score report for PTE Academic should be:","options":["Discarded","Logged on client file and shared with visa/admissions team","Kept secret","Only verbal update"],"correctIndex":1,"explanation":"Score reports must be documented and handed off when relevant.","level":2},{"question":"PTE Academic is accepted by IRCC for Canadian PR:","options":["Yes","No","Only Quebec","Only with PNP"],"correctIndex":1,"explanation":"Verify current IRCC accepted tests — PTE acceptance has specific rules.","level":2},{"question":"PTE coaching should separate:","options":["Nothing","Coaching fee from Pearson exam fee","Visa fee from tuition","Passport from TRF"],"correctIndex":1,"explanation":"Always quote coaching and exam fees separately.","level":2},{"question":"PTE Speaking uses:","options":["Face-to-face examiner","Computer microphone recording","Phone call","Written essay only"],"correctIndex":1,"explanation":"PTE is fully computer-based including speaking.","level":2},{"question":"PTE results are usually available within:","options":["6 months","48 hours to 5 days","Same day always","1 year"],"correctIndex":1,"explanation":"PTE typically returns scores quickly.","level":2},{"question":"A student with unrealistic target timeline for PTE Academic should:","options":["Enroll in crash anyway","Reset timeline or program variant","Guarantee score","Skip diagnostic"],"correctIndex":1,"explanation":"Unrealistic timelines must be corrected before enrollment.","level":3},{"question":"Sales promising a guaranteed band/score for PTE Academic is:","options":["Encouraged","A compliance violation","Required for conversion","Only for managers"],"correctIndex":1,"explanation":"Never guarantee exam outcomes.","level":3},{"question":"Retake planning for PTE Academic should be based on:","options":["Guesswork","Skill-gap analysis from official results","Social media tips","Random date"],"correctIndex":1,"explanation":"Retakes need structured gap analysis.","level":3},{"question":"Visa/admissions team handoff for PTE Academic happens when:","options":["Never","Target met and official report available","Before enrollment","Only if student asks"],"correctIndex":1,"explanation":"Hand off when target is met and documentation is on file.","level":3},{"question":"Before PTE exam booking, FLC tracks:","options":["Only attendance","Mocks and readiness against target score","Social media","Visa expiry only"],"correctIndex":1,"explanation":"Mock performance drives exam readiness.","level":3},{"question":"Unrealistic PTE target (e.g. 90 from diagnostic 40 in 2 weeks) requires:","options":["Guarantee","Timeline reset","Skip mocks","Hide diagnostic"],"correctIndex":1,"explanation":"Reset expectations before enrollment.","level":3}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic'));

-- TOEFL iBT
UPDATE public.service_library
SET academy_metadata = '{"displayName":"TOEFL iBT","shortDescription":"ETS · Internet-based · USA admissions focus · 2-year validity","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"TOEFL","policyAlert":{"active":true,"date":"June 2026","summary":"Verify TOEFL iBT exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"USA admissions focus — not Canada PR","body":"TOEFL iBT is widely used for USA F-1 and graduate admission. IRCC does not accept TOEFL for Canadian immigration — redirect PR leads to IELTS or CELPIP."},"tags":[{"label":"Active program","variant":"success"},{"label":"TOEFL","variant":"neutral"}],"chips":[{"label":"6–8 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"6–8 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured TOEFL iBT preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"USA F-1 and programs requiring TOEFL iBT. Confirm university minimum before enrollment."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"TOEFL for Canada PR?","a":"No. IRCC does not accept TOEFL for immigration."},{"q":"TOEFL iBT vs Essentials?","a":"iBT is the standard for most universities. Essentials has limited acceptance — confirm each institution."},{"q":"Who pays TOEFL fee?","a":"Student pays ETS directly. Coaching fee is separate."},{"q":"MyBest scores?","a":"ETS may combine best section scores from valid tests within 2 years — confirm university policy."},{"q":"Can FLC guarantee TOEFL 100?","a":"No. Never guarantee scores."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial TOEFL iBT coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on TOEFL iBT."}],"resources":[{"title":"TOEFL — Official","url":"https://www.ets.org/toefl","description":"Registration, format, scores"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for TOEFL iBT:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"TOEFL iBT coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in TOEFL iBT, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for TOEFL iBT is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"TOEFL iBT is most commonly required for:","options":["Canada PR","USA university admission","UK settlement only","Schengen tourist visa"],"correctIndex":1,"explanation":"TOEFL is widely used for US admissions.","level":1},{"question":"TOEFL iBT is accepted by IRCC for Canadian PR:","options":["Yes","No","Only Alberta","Only with job offer"],"correctIndex":1,"explanation":"IRCC does not accept TOEFL for immigration.","level":1},{"question":"Enrollment agreement for TOEFL iBT should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2},{"question":"Before advising official exam booking for TOEFL iBT:","options":["No mocks needed","Mocks support agreed target","Guarantee pass first","Book earliest date"],"correctIndex":1,"explanation":"Readiness should be based on mock performance.","level":2},{"question":"When attendance drops below 80% in TOEFL iBT:","options":["Ignore it","Counselor review and intervention","Guarantee refund","Cancel visa file"],"correctIndex":1,"explanation":"Attendance issues require counselor follow-up.","level":2},{"question":"Official score report for TOEFL iBT should be:","options":["Discarded","Logged on client file and shared with visa/admissions team","Kept secret","Only verbal update"],"correctIndex":1,"explanation":"Score reports must be documented and handed off when relevant.","level":2},{"question":"TOEFL iBT is delivered:","options":["Paper only in India","Internet-based at ETS centers","By post","Oral interview only"],"correctIndex":1,"explanation":"iBT is the standard internet-based format.","level":2},{"question":"TOEFL score validity is generally:","options":["6 months","2 years","10 years","Lifetime"],"correctIndex":1,"explanation":"Two years from test date.","level":2},{"question":"TOEFL coaching fee and ETS exam fee should be:","options":["Combined","Quoted separately","Hidden","Paid to FLC only"],"correctIndex":1,"explanation":"Separate fees on all quotes.","level":2},{"question":"A student with unrealistic target timeline for TOEFL iBT should:","options":["Enroll in crash anyway","Reset timeline or program variant","Guarantee score","Skip diagnostic"],"correctIndex":1,"explanation":"Unrealistic timelines must be corrected before enrollment.","level":3},{"question":"Sales promising a guaranteed band/score for TOEFL iBT is:","options":["Encouraged","A compliance violation","Required for conversion","Only for managers"],"correctIndex":1,"explanation":"Never guarantee exam outcomes.","level":3},{"question":"Retake planning for TOEFL iBT should be based on:","options":["Guesswork","Skill-gap analysis from official results","Social media tips","Random date"],"correctIndex":1,"explanation":"Retakes need structured gap analysis.","level":3},{"question":"Visa/admissions team handoff for TOEFL iBT happens when:","options":["Never","Target met and official report available","Before enrollment","Only if student asks"],"correctIndex":1,"explanation":"Hand off when target is met and documentation is on file.","level":3},{"question":"MyBest scores (TOEFL) allow:","options":["Combining best section scores from valid tests within 2 years","Lifetime best score","Replacing passport","Skipping Speaking"],"correctIndex":0,"explanation":"MyBest combines best section scores per ETS rules.","level":3},{"question":"A Canada PR lead should be directed to:","options":["TOEFL iBT Regular","IELTS GT or CELPIP-General","SAT","Spoken English only"],"correctIndex":1,"explanation":"IRCC does not accept TOEFL for PR.","level":3},{"question":"Before TOEFL booking, readiness is assessed via:","options":["No assessment","Mocks vs university minimum","Guaranteed score","Random date"],"correctIndex":1,"explanation":"University minimums vary — confirm before booking.","level":3}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT'));

-- CELPIP General
UPDATE public.service_library
SET academy_metadata = '{"displayName":"CELPIP General","shortDescription":"Canada IRCC · CLB scored · Express Entry & citizenship pathways","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"CELPIP","policyAlert":{"active":true,"date":"June 2026","summary":"Verify CELPIP-General exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"CELPIP-General for Canada only","body":"CELPIP-General is accepted by IRCC for Canadian immigration and citizenship — not for USA, UK, or Australia study visas. Confirm pathway before enrollment."},"tags":[{"label":"Active program","variant":"success"},{"label":"CELPIP","variant":"neutral"}],"chips":[{"label":"6–8 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"6–8 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured CELPIP General preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Canada PR, citizenship, and pathways accepting CELPIP-General (not Academic)."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"CELPIP vs IELTS for Canada PR?","a":"Both accepted by IRCC when taken in the correct format (CELPIP-General; IELTS GT or Academic per program). Choose based on student strength and seat availability."},{"q":"CELPIP-General vs CELPIP Academic?","a":"IRCC immigration uses CELPIP-General. Academic is for select professional designations — not standard Express Entry."},{"q":"How does CELPIP map to CLB?","a":"CELPIP levels map directly to CLB (e.g. CELPIP 7 = CLB 7 in each skill)."},{"q":"Who pays the CELPIP exam fee?","a":"Student pays Paragon/celpip.ca directly. FLC coaching fee is separate."},{"q":"Can Future Link guarantee CLB 9?","a":"No. Targets come from diagnostics and mocks — never guarantee scores."},{"q":"Is TOEFL accepted for Canada PR?","a":"No. IRCC accepts IELTS and CELPIP-General (and CELPIP per program rules) — not TOEFL."},{"q":"How long is CELPIP valid?","a":"Two years from test date for most IRCC purposes."},{"q":"Where is CELPIP taken?","a":"At Paragon test centers — verify celpip.ca for India/Canada availability."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Map every Canada lead to CLB before quoting timeline","Use CELPIP-General only — not Academic for standard PR","Track mocks per skill — CELPIP scores each skill separately","Link results to Express Entry file as soon as scores arrive"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial CELPIP General coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on CELPIP General."}],"resources":[{"title":"CELPIP — Official","url":"https://www.celpip.ca/","description":"General vs Academic, CLB mapping"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[{"title":"Enrollment checklist — CELPIP General","description":"Counselor enrollment and delivery checklist.","docKind":"enrollment","url":"/specimens/coaching/celpip-general-checklist.html","mimeType":"text/html"}],"quiz":[{"question":"Counselors must never for CELPIP General:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"CELPIP General coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in CELPIP General, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for CELPIP General is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"CELPIP-General is primarily used for:","options":["Canada immigration & citizenship","UK Student Route only","USA F-1 only","Driving licence"],"correctIndex":0,"explanation":"CELPIP-General is accepted by IRCC for Canadian immigration.","level":1},{"question":"Enrollment agreement for CELPIP General should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2},{"question":"Before advising official exam booking for CELPIP General:","options":["No mocks needed","Mocks support agreed target","Guarantee pass first","Book earliest date"],"correctIndex":1,"explanation":"Readiness should be based on mock performance.","level":2},{"question":"When attendance drops below 80% in CELPIP General:","options":["Ignore it","Counselor review and intervention","Guarantee refund","Cancel visa file"],"correctIndex":1,"explanation":"Attendance issues require counselor follow-up.","level":2},{"question":"Official score report for CELPIP General should be:","options":["Discarded","Logged on client file and shared with visa/admissions team","Kept secret","Only verbal update"],"correctIndex":1,"explanation":"Score reports must be documented and handed off when relevant.","level":2},{"question":"CELPIP level 7 equals approximately:","options":["CLB 5","CLB 7","CLB 9","No CLB mapping"],"correctIndex":1,"explanation":"CELPIP scores map 1:1 to CLB levels.","level":2},{"question":"For Canada Express Entry FSW, CLB 7 typically requires:","options":["CELPIP 5 each skill","CELPIP 7 each skill","CELPIP 12 each skill","No English test"],"correctIndex":1,"explanation":"CLB 7 = CELPIP 7 in each skill.","level":2},{"question":"TOEFL iBT is accepted by IRCC for Canadian PR:","options":["Yes","No","Only Ontario","Only with job offer"],"correctIndex":1,"explanation":"IRCC does not accept TOEFL for immigration.","level":2},{"question":"CELPIP score validity for immigration is generally:","options":["6 months","1 year","2 years","Lifetime"],"correctIndex":2,"explanation":"Two years from test date for most IRCC uses.","level":2},{"question":"A student with unrealistic target timeline for CELPIP General should:","options":["Enroll in crash anyway","Reset timeline or program variant","Guarantee score","Skip diagnostic"],"correctIndex":1,"explanation":"Unrealistic timelines must be corrected before enrollment.","level":3},{"question":"Sales promising a guaranteed band/score for CELPIP General is:","options":["Encouraged","A compliance violation","Required for conversion","Only for managers"],"correctIndex":1,"explanation":"Never guarantee exam outcomes.","level":3},{"question":"Retake planning for CELPIP General should be based on:","options":["Guesswork","Skill-gap analysis from official results","Social media tips","Random date"],"correctIndex":1,"explanation":"Retakes need structured gap analysis.","level":3},{"question":"Visa/admissions team handoff for CELPIP General happens when:","options":["Never","Target met and official report available","Before enrollment","Only if student asks"],"correctIndex":1,"explanation":"Hand off when target is met and documentation is on file.","level":3},{"question":"CELPIP Academic is suitable for most IRCC PR applications:","options":["Yes, always","No — IRCC accepts CELPIP-General for most PR","Only Quebec","Only with LMIA"],"correctIndex":1,"explanation":"IRCC immigration generally requires CELPIP-General, not Academic.","level":3},{"question":"CELPIP is administered by:","options":["IDP India","Paragon Testing / celpip.ca","British Council only","Pearson only"],"correctIndex":1,"explanation":"Paragon Testing Enterprises administers CELPIP in Canada.","level":3},{"question":"A student needing USA F-1 admission should typically consider:","options":["CELPIP only","TOEFL or IELTS Academic per university","CELPIP Academic for all US unis","No English test"],"correctIndex":1,"explanation":"US admissions rarely use CELPIP — confirm university list.","level":3}],"compare":{"columns":["Pathway","Accepted test","Minimum (typical)","Notes"],"rows":[{"label":"Canada — Express Entry (FSW)","values":["CELPIP-General","CLB 7 = 7 each","Same as IELTS CLB mapping"]},{"label":"Canada — Citizenship","values":["CELPIP-General","CLB 4","Lower threshold"]},{"label":"Canada — Study permit","values":["IELTS/PTE often","Varies","CELPIP less common for study"]},{"label":"NOT for Canada IRCC","values":["—","—","TOEFL, Duolingo for PR"]}]}}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General'));

-- Duolingo English Test
UPDATE public.service_library
SET academy_metadata = '{"displayName":"Duolingo English Test","shortDescription":"Online proctored · Fast results · Growing uni acceptance","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"Duolingo","policyAlert":{"active":true,"date":"June 2026","summary":"Verify Duolingo English Test exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score."},"alert":{"title":"Institution-specific acceptance","body":"Duolingo English Test is accepted by many universities but not by IRCC for Canadian PR. Confirm the student''s institution list before enrollment."},"tags":[{"label":"Active program","variant":"success"},{"label":"Duolingo English Test","variant":"neutral"}],"chips":[{"label":"4–6 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"4–6 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured Duolingo English Test preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Students with university acceptance listing DET; confirm institution and score minimum."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"DET for Canada PR?","a":"No. IRCC does not accept Duolingo for immigration."},{"q":"How is DET taken?","a":"Online proctored from home — verify system requirements on englishtest.duolingo.com."},{"q":"How fast are DET results?","a":"Typically within 48 hours."},{"q":"Can FLC guarantee DET 130?","a":"No. Never guarantee scores."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial Duolingo English Test coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on Duolingo English Test."}],"resources":[{"title":"Duolingo English Test","url":"https://englishtest.duolingo.com/","description":"Booking, format"}],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for Duolingo English Test:","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"Duolingo English Test coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in Duolingo English Test, FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for Duolingo English Test is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Duolingo English Test (DET) is:","options":["Online proctored from home","Paper at IDP center","In-person CELPIP","French DELF"],"correctIndex":0,"explanation":"DET is online proctored.","level":1},{"question":"Enrollment agreement for Duolingo English Test should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2},{"question":"Before advising official exam booking for Duolingo English Test:","options":["No mocks needed","Mocks support agreed target","Guarantee pass first","Book earliest date"],"correctIndex":1,"explanation":"Readiness should be based on mock performance.","level":2},{"question":"When attendance drops below 80% in Duolingo English Test:","options":["Ignore it","Counselor review and intervention","Guarantee refund","Cancel visa file"],"correctIndex":1,"explanation":"Attendance issues require counselor follow-up.","level":2},{"question":"Official score report for Duolingo English Test should be:","options":["Discarded","Logged on client file and shared with visa/admissions team","Kept secret","Only verbal update"],"correctIndex":1,"explanation":"Score reports must be documented and handed off when relevant.","level":2},{"question":"Before enrolling in DET prep, confirm:","options":["University accepts DET and minimum score","IRCC accepts DET for all PR","No score needed","DET replaces passport"],"correctIndex":0,"explanation":"Institution acceptance varies.","level":2},{"question":"DET results typically arrive within:","options":["48 hours","6 months","1 year","After visa grant"],"correctIndex":0,"explanation":"DET results are fast.","level":2},{"question":"A student with unrealistic target timeline for Duolingo English Test should:","options":["Enroll in crash anyway","Reset timeline or program variant","Guarantee score","Skip diagnostic"],"correctIndex":1,"explanation":"Unrealistic timelines must be corrected before enrollment.","level":3},{"question":"Sales promising a guaranteed band/score for Duolingo English Test is:","options":["Encouraged","A compliance violation","Required for conversion","Only for managers"],"correctIndex":1,"explanation":"Never guarantee exam outcomes.","level":3},{"question":"Retake planning for Duolingo English Test should be based on:","options":["Guesswork","Skill-gap analysis from official results","Social media tips","Random date"],"correctIndex":1,"explanation":"Retakes need structured gap analysis.","level":3},{"question":"Visa/admissions team handoff for Duolingo English Test happens when:","options":["Never","Target met and official report available","Before enrollment","Only if student asks"],"correctIndex":1,"explanation":"Hand off when target is met and documentation is on file.","level":3},{"question":"DET is accepted by IRCC for Express Entry:","options":["Always","No — verify IRCC list","Only Quebec","Only with LMIA"],"correctIndex":1,"explanation":"IRCC does not accept Duolingo for immigration.","level":3}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test'));

-- Spoken English (with books)
UPDATE public.service_library
SET academy_metadata = '{"displayName":"Spoken English (with books)","shortDescription":"Fluency & confidence · Workplace / interview focus · Books included","version":"v1.0","versionStatus":"Live","reviewStatus":"active","updatedLabel":"Updated June 2026","learningLevel":"Intermediate","learningMinutes":10,"navBucket":"coaching","testFamily":"Spoken English","policyAlert":{"active":true,"date":"June 2026","summary":"Spoken English builds fluency — not a substitute for IELTS/PTE for visa. Books included where stated."},"alert":{"title":"Not a visa substitute","body":"Spoken English builds fluency and interview skills — it does not replace IELTS, PTE, or CELPIP for visa or university English requirements."},"tags":[{"label":"Active program","variant":"success"},{"label":"Spoken English","variant":"neutral"}],"chips":[{"label":"8–10 weeks","variant":"neutral"},{"label":"Exam fee separate","variant":"warning"}],"kpis":[{"label":"Course duration","value":"8–10 weeks","sub":"Regular batch","tone":"primary"},{"label":"Target achievement","value":"—","sub":"Track on client file","tone":"success"},{"label":"Enrollment docs","value":"6+","sub":"Agreement + diagnostic","tone":"violet"}],"about":[{"label":"Description","value":"Structured Spoken English (with books) preparation with trainer-led classes, homework, and progress tracking."},{"label":"Ideal for","value":"Students needing confidence, interview prep, or foundation before formal test prep."},{"label":"Delivery","value":"Classroom or hybrid per branch schedule. Materials per program policy."},{"label":"After course","value":"Exam guidance, score tracking, retake recommendation, and handoff to admissions/visa team when target met."}],"eligibility":[{"criterion":"Diagnostic or prior score on file","met":true},{"criterion":"Realistic target vs current level","met":true},{"criterion":"Batch timing suits student schedule","met":true},{"criterion":"Enrollment agreement signed","met":true},{"criterion":"Course fee collected","met":true}],"redFlagsBanner":"If attendance drops or mocks stay far below target, pause exam booking and reset the study plan.","redFlags":[{"title":"Unrealistic target","description":"Large gap expected in very short timeline.","fix":"Reset timeline or recommend appropriate program","severity":"Very common"},{"title":"Chronic absenteeism","description":"Below 80% attendance.","fix":"Counselor call, batch change, or pause","severity":"Common"},{"title":"Guaranteed score promised","description":"Sales or counselor over-commitment.","fix":"Compliance issue — never guarantee scores","severity":"High"}],"faqs":[{"q":"Does Spoken English replace IELTS?","a":"No. Formal tests are required for visas and most university offers."},{"q":"Are books included?","a":"Yes for Spoken English (with books) — issue and log at enrollment."},{"q":"Ideal next step after Spoken English?","a":"Formal test prep (IELTS/PTE) once foundation is strong enough."}],"compliance":["Never guarantee exam scores or bands","Separate coaching fee from exam registration fee","Signed enrollment agreement before batch start","Record diagnostic and mock scores on client file"],"proTips":["Set target in writing at enrollment","Review mock trends weekly","Confirm correct test/module for student pathway","Book official exam only when mocks support readiness"],"postApproval":["Collect official score report when released","Update client record for admissions / visa team","Plan retake or booster if below target"],"performance":{"ourRate":80,"industryRate":65,"stats":[{"label":"Program enrollments","value":"—"}]},"approvalFactors":[{"label":"Attendance 80%+","ours":86,"benchmark":72},{"label":"Mock completion","ours":88,"benchmark":74}],"timeline":[{"weeks":"1","title":"Diagnostic, enrollment, batch allocation"},{"weeks":"2–8","title":"Classes, homework, skill drills"},{"weeks":"6–8","title":"Mocks and readiness review"},{"weeks":"8+","title":"Exam booking, test day prep, score follow-up"}],"relatedServices":[],"changelog":[{"version":"v1.0","date":"June 2026","author":"Service Library","summary":"Initial Spoken English (with books) coaching specimen."}],"staffNotes":[{"author":"Coaching team","date":"June 2026","text":"Use this specimen for counselor training on Spoken English (with books)."}],"resources":[],"donts":{"dos":["Run diagnostic before quoting timeline","Track attendance and mocks","Keep exam fee separate on quotes"],"donts":["Guarantee scores","Book exam before readiness","Skip enrollment agreement"],"mistakes":["Unrealistic target timeline","No mock before exam date","Visa team not updated when target met"]},"sampleDocs":[],"quiz":[{"question":"Counselors must never for Spoken English (with books):","options":["Track attendance","Guarantee exam scores","Issue materials","Run diagnostic"],"correctIndex":1,"explanation":"Score guarantees are prohibited for all coaching programs.","level":1},{"question":"Spoken English (with books) coaching fee and official exam fee should be:","options":["Combined on one line","Shown separately","Hidden from student","Included in visa fee"],"correctIndex":1,"explanation":"Coaching and exam fees must be quoted separately.","level":1},{"question":"Before enrollment in Spoken English (with books), FLC recommends:","options":["Skip diagnostic","Diagnostic and realistic target set","Guarantee top score","No agreement needed"],"correctIndex":1,"explanation":"Diagnostic and target alignment are required before batch start.","level":1},{"question":"Minimum attendance standard for Spoken English (with books) is typically:","options":["50%","80%","100%","Not tracked"],"correctIndex":1,"explanation":"Review attendance when it drops below 80%.","level":1},{"question":"Spoken English coaching is:","options":["Fluency and confidence building","IRCC-approved PR test","Replacement for IELTS on all visas","German B2 exam"],"correctIndex":0,"explanation":"Spoken English is not a visa test substitute.","level":1},{"question":"Enrollment agreement for Spoken English (with books) should be signed:","options":["After course ends","Before batch start","Never","Only on request"],"correctIndex":1,"explanation":"Signed agreement before classes begin.","level":2},{"question":"Before advising official exam booking for Spoken English (with books):","options":["No mocks needed","Mocks support agreed target","Guarantee pass first","Book earliest date"],"correctIndex":1,"explanation":"Readiness should be based on mock performance.","level":2},{"question":"When attendance drops below 80% in Spoken English (with books):","options":["Ignore it","Counselor review and intervention","Guarantee refund","Cancel visa file"],"correctIndex":1,"explanation":"Attendance issues require counselor follow-up.","level":2},{"question":"Official score report for Spoken English (with books) should be:","options":["Discarded","Logged on client file and shared with visa/admissions team","Kept secret","Only verbal update"],"correctIndex":1,"explanation":"Score reports must be documented and handed off when relevant.","level":2},{"question":"A student needing Canada PR should:","options":["Use Spoken English only","Take IELTS GT or CELPIP-General","Skip all tests","Book PTE for IRCC always"],"correctIndex":1,"explanation":"PR requires accepted language tests.","level":2},{"question":"Interview prep in Spoken English focuses on:","options":["Structure, fluency, and feedback","Memorized visa answers only","Guaranteed job offer","Skipping attendance"],"correctIndex":0,"explanation":"Interview modules emphasize structured practice.","level":2},{"question":"A student with unrealistic target timeline for Spoken English (with books) should:","options":["Enroll in crash anyway","Reset timeline or program variant","Guarantee score","Skip diagnostic"],"correctIndex":1,"explanation":"Unrealistic timelines must be corrected before enrollment.","level":3},{"question":"Sales promising a guaranteed band/score for Spoken English (with books) is:","options":["Encouraged","A compliance violation","Required for conversion","Only for managers"],"correctIndex":1,"explanation":"Never guarantee exam outcomes.","level":3},{"question":"Retake planning for Spoken English (with books) should be based on:","options":["Guesswork","Skill-gap analysis from official results","Social media tips","Random date"],"correctIndex":1,"explanation":"Retakes need structured gap analysis.","level":3},{"question":"Visa/admissions team handoff for Spoken English (with books) happens when:","options":["Never","Target met and official report available","Before enrollment","Only if student asks"],"correctIndex":1,"explanation":"Hand off when target is met and documentation is on file.","level":3},{"question":"Spoken English may pair with:","options":["Formal test prep once foundation is ready","Guaranteed band 8","No enrollment agreement","Visa filing without test"],"correctIndex":0,"explanation":"Foundation then formal prep is a common path.","level":3}]}'::jsonb, updated_at = now()
WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)'));

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1)
    AND cf.file_path = '/specimens/coaching/celpip-general-checklist.html'
);

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'Duolingo' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files cf
  WHERE cf.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE')
    OR (service_category = 'coaching_services' AND service = 'PTE Academic' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'PTE Academic')
    OR (service_category = 'coaching_services' AND service = 'PTE' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL')
    OR (service_category = 'coaching_services' AND service = 'TOEFL iBT' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'TOEFL iBT')
    OR (service_category = 'coaching_services' AND service = 'TOEFL' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'CELPIP General')
    OR (service_category = 'coaching_services' AND service = 'CELPIP' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'CELPIP General')) LIMIT 1) AND c.item_key = x.item_key
);

-- Submission checklist — Duolingo English Test
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'Duolingo' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo English Test' AND sub_service = 'Duolingo English Test')
    OR (service_category = 'coaching_services' AND service = 'Duolingo' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken' AND sub_service = 'English Proficiency')
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
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = (SELECT id FROM public.service_library WHERE ((service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'English Proficiency' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'Spoken English (with books)')
    OR (service_category = 'coaching_services' AND service = 'Spoken English' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken' AND sub_service = 'English Proficiency')
    OR (service_category = 'coaching_services' AND service = 'Spoken English (with books)')) LIMIT 1) AND c.item_key = x.item_key
);
