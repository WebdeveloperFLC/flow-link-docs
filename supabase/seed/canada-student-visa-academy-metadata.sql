-- Seed Canada student visa Service Library content (academy_metadata)
-- Run in Supabase SQL Editor (same project as dms.futurelinkconsultants.com).

UPDATE public.service_library sl
SET
  academy_metadata = $metadata$
{
  "displayName": "Canada – Student Visa (Study Permit)",
  "shortDescription": "IRCC study permit · SDS & Non-SDS pathways · DLI required",
  "version": "v2.4",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 4 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 20,
  "policyAlert": {
    "active": true,
    "date": "4 Jun 2026",
    "summary": "Confirm current IRCC study permit fee and biometrics fee on canada.ca before sharing quotes with clients."
  },
  "alert": {
    "title": "SDS stream status",
    "body": "Verify whether SDS is available for the client's country of residence before promising timelines. Use Non-SDS when SDS is paused or ineligible."
  },
  "tags": [
    { "label": "Active service", "variant": "success" },
    { "label": "SDS check required", "variant": "warning" },
    { "label": "8–12 weeks", "variant": "neutral" },
    { "label": "Online – IRCC", "variant": "neutral" }
  ],
  "chips": [
    { "label": "8–12 weeks processing", "variant": "neutral" },
    { "label": "Biometrics required", "variant": "neutral" },
    { "label": "DLI letter mandatory", "variant": "success" },
    { "label": "GIC if SDS", "variant": "warning" }
  ],
  "kpis": [
    { "label": "Processing time", "value": "8–12w", "sub": "Varies by country & stream", "tone": "primary" },
    { "label": "Government fee", "value": "CAD $150", "sub": "+ biometrics if applicable", "tone": "warning" },
    { "label": "Our approval rate", "value": "87%", "sub": "~72% industry benchmark", "tone": "success" },
    { "label": "Required docs", "value": "14", "sub": "+ conditional items", "tone": "violet" },
    { "label": "Consultancy fee", "value": "See fee tab", "sub": "+ govt & third-party", "tone": "primary" }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Study permit allowing international students to study at a Designated Learning Institution (DLI) in Canada. Application is typically online via IRCC portal; biometrics and medical may apply."
    },
    {
      "label": "Eligible applicants",
      "value": "Valid LOA from DLI · Proof of funds · Clean immigration history · Genuine student intent"
    },
    {
      "label": "Application streams",
      "value": "SDS (where eligible): faster processing with GIC and language scores. Non-SDS: standard study permit pathway.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Immigration, Refugees and Citizenship Canada (IRCC)"
    },
    {
      "label": "After approval",
      "value": "Client receives POE letter / permit details; explain study conditions, work limits, and DLI enrollment obligations."
    }
  ],
  "eligibility": [
    { "criterion": "Letter of acceptance (LOA) from DLI", "met": true, "note": "LOA must be valid and program start date realistic" },
    { "criterion": "Proof of financial support (tuition + living)", "met": true, "note": "SDS: GIC + tuition payment proof where required" },
    { "criterion": "Language proficiency (SDS)", "met": false, "note": "IELTS/TOEFL/PTE per SDS country list" },
    { "criterion": "Biometrics completed", "met": false, "note": "Book within 30 days of BIL if required" },
    { "criterion": "Medical exam (if required)", "met": false, "note": "Based on residence history and IRCC instructions" },
    { "criterion": "No criminal / immigration misrepresentation", "met": true },
    { "criterion": "Genuine student / ties to home country", "met": true, "note": "SOP and career plan must align" }
  ],
  "redFlagsBanner": "If refused, do not reapply with the same weak documents. Address the specific refusal reason in writing before a new submission.",
  "redFlags": [
    {
      "title": "Insufficient or unseasoned funds",
      "description": "Large recent deposits, funds not aligned with sponsor income, or missing 4–6 month bank history.",
      "fix": "Season funds early; use GIC for SDS; sponsor ITR + employment letters",
      "severity": "Very common"
    },
    {
      "title": "Weak or generic SOP",
      "description": "Template SOP, course mismatch with past education, or unclear return intent.",
      "fix": "Course-specific SOP; link prior study/work to Canada program; clear post-study plan",
      "severity": "Common"
    },
    {
      "title": "Wrong stream (SDS vs Non-SDS)",
      "description": "Applied SDS without meeting language/GIC/tuition requirements.",
      "fix": "Re-check SDS eligibility by country of residence; switch stream and re-quote fees",
      "severity": "Common"
    },
    {
      "title": "LOA / DLI issues",
      "description": "Expired LOA, non-DLI institution, or start date passed.",
      "fix": "Verify DLI list on canada.ca; request updated LOA from institution",
      "severity": "High"
    },
    {
      "title": "Previous refusals not explained",
      "description": "Canada or other country refusals not disclosed or addressed in cover letter.",
      "fix": "Full disclosure + changed circumstances + stronger evidence package",
      "severity": "High"
    },
    {
      "title": "Medical or biometrics overdue",
      "description": "BIL expired or medical not completed in time.",
      "fix": "Track BIL deadline; book VAC slot immediately; upload confirmation",
      "severity": "Medium"
    }
  ],
  "faqs": [
    {
      "q": "Can we switch from SDS to Non-SDS if SDS is paused?",
      "a": "Yes, when the client is SDS-ineligible or SDS is unavailable. Rebuild the file per Non-SDS checklist and update fee quote (no GIC requirement unless otherwise applicable)."
    },
    {
      "q": "How much funds to show for Non-SDS?",
      "a": "Tuition for first year plus living expenses per IRCC guidelines (amounts update—verify on canada.ca). Include credible source of funds and history."
    },
    {
      "q": "When should biometrics be done?",
      "a": "As soon as possible after Biometric Instruction Letter (BIL), typically within 30 days. Counselor should track VAC appointment confirmation."
    },
    {
      "q": "Can spouse/children accompany?",
      "a": "May require separate applications (visitor permit, OWP, study permit for children). Assess dependants case-by-case; extra funds and ties evidence needed."
    },
    {
      "q": "What if LOA start date is near?",
      "a": "Apply urgently; explain delay if any. If start date passed, obtain updated LOA before submission."
    },
    {
      "q": "Is medical mandatory for everyone?",
      "a": "No—depends on country of residence and stay duration. Follow IRCC medical instructions for the client's profile."
    },
    {
      "q": "Can client work on study permit?",
      "a": "Generally on-campus without separate permit; off-campus rules have hour limits—cite current IRCC rules at time of counseling."
    },
    {
      "q": "What happens after study permit approval?",
      "a": "Client receives introduction letter; permit issued at port of entry or as directed. Remind client to maintain full-time status and keep contact details updated with IRCC."
    }
  ],
  "compliance": [
    "Paid representation in Canada may require RCIC/L lawyer—confirm who signs client agreement",
    "Client service agreement and consent must be on file before submission",
    "Never guarantee visa approval; use approved-language only in marketing",
    "Fee quotes must separate consultancy, government, and third-party (GIC, medical, biometrics)"
  ],
  "proTips": [
    "Verify DLI status on the official list before taking fees for submission",
    "Book biometrics within days of BIL—delays are a top preventable refusal factor",
    "For SDS, pre-validate language scores and GIC bank list",
    "Use a submission checklist sign-off before uploading to IRCC portal",
    "Save final PDF package in client binder for audit"
  ],
  "postApproval": [
    "Send POE / permit summary and enrollment deadlines to client in writing",
    "Remind client of study permit conditions and DLI enrollment date",
    "Discuss PGWP eligibility timeline (program length and DLI matter)",
    "Register client for pre-departure briefing if your office offers it"
  ],
  "performance": {
    "ourRate": 87,
    "industryRate": 72,
    "stats": [
      { "label": "Files this year", "value": "143" },
      { "label": "Approved", "value": "124" },
      { "label": "Refused", "value": "12" },
      { "label": "Withdrawn", "value": "7" }
    ]
  },
  "approvalFactors": [
    { "label": "Our rate vs industry", "ours": 87, "benchmark": 72 },
    { "label": "Financial documentation", "ours": 82, "benchmark": 68 },
    { "label": "SOP quality", "ours": 79, "benchmark": 65 },
    { "label": "Complete checklist first submit", "ours": 91, "benchmark": 70 }
  ],
  "timeline": [
    { "weeks": "1–2", "title": "Counseling, LOA review, fee agreement" },
    { "weeks": "2–4", "title": "Document collection, SOP, financials" },
    { "weeks": "4–5", "title": "Quality review & IRCC submission" },
    { "weeks": "5–6", "title": "Biometrics / medical (if applicable)" },
    { "weeks": "8–12", "title": "IRCC processing (stream-dependent)" }
  ],
  "relatedServices": [
    { "label": "Canada – PGWP", "libraryId": "" },
    { "label": "Canada – Visitor Visa", "libraryId": "" },
    { "label": "Canada – Spouse Open Work Permit", "libraryId": "" }
  ],
  "changelog": [
    {
      "version": "v2.4",
      "date": "4 Jun 2026",
      "author": "Service Library",
      "summary": "Updated fees note, SDS check reminder, expanded red flags and FAQs."
    },
    {
      "version": "v2.3",
      "date": "28 May 2025",
      "author": "Admin",
      "summary": "Government fee and processing time review."
    }
  ],
  "resources": [
    {
      "title": "IRCC — Study permit",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
      "description": "Official requirements, how to apply, and after you apply"
    },
    {
      "title": "List of designated learning institutions (DLI)",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html",
      "description": "Verify institution before LOA and fee collection"
    },
    {
      "title": "Student Direct Stream (SDS)",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/student-direct-stream.html",
      "description": "Eligibility by country of residence — confirm before quoting timelines"
    },
    {
      "title": "Biometrics — Give fingerprints and photo",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/biometrics/facts.html",
      "description": "When required and how to book after BIL"
    },
    {
      "title": "IRCC processing times",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
      "description": "Current estimates by country and application type"
    },
    {
      "title": "GIC — Participating financial institutions",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/student-direct-stream/eligible-gic.html",
      "description": "Approved banks for SDS GIC"
    }
  ],
  "quiz": [
    {
      "question": "What must every study permit applicant have from their school?",
      "options": ["Job offer letter", "Letter of acceptance from a DLI", "Provincial nomination", "LMIA"],
      "correctIndex": 1,
      "explanation": "A valid LOA from a Designated Learning Institution is mandatory."
    },
    {
      "question": "When is SDS typically faster than Non-SDS?",
      "options": [
        "When client has no language test",
        "When client meets SDS country, language, GIC, and tuition requirements",
        "When applying at a port of entry only",
        "When funds are shown for 1 week only"
      ],
      "correctIndex": 1,
      "explanation": "SDS has specific eligibility criteria by country of residence."
    },
    {
      "question": "After receiving a Biometric Instruction Letter (BIL), counselors should urge the client to:",
      "options": [
        "Wait until permit is approved",
        "Book biometrics promptly (often within 30 days of BIL)",
        "Skip biometrics if refused before",
        "Mail passport to IRCC without appointment"
      ],
      "correctIndex": 1,
      "explanation": "Late biometrics is a common preventable delay."
    },
    {
      "question": "Which is a top red flag for study permit funds?",
      "options": [
        "6-month seasoned bank statements",
        "Large unexplained recent deposits",
        "Sponsor ITR with employment letter",
        "GIC from an approved SDS bank"
      ],
      "correctIndex": 1,
      "explanation": "Unseasoned or unexplained deposits weaken financial credibility."
    },
    {
      "question": "Before submission, Future Link policy requires:",
      "options": [
        "Guarantee of approval in writing",
        "Signed client checklist and consent where required",
        "Hiding prior refusals to speed processing",
        "Using expired LOA if tuition is paid"
      ],
      "correctIndex": 1,
      "explanation": "Compliance: consent, checklist sign-off, and honest disclosure."
    }
  ],
  "staffNotes": [
    {
      "author": "Documentation team",
      "date": "4 Jun 2026",
      "text": "Always confirm SDS eligibility on canada.ca for client's country of residence before promising 20-day processing. GIC bank must be on approved list."
    },
    {
      "author": "Quality",
      "date": "1 Jun 2026",
      "text": "Second review required for all files with prior Canada refusal."
    }
  ],
  "donts": {
    "dos": [
      "Confirm DLI and program details match LOA before submission",
      "Use country-specific SDS checklist when eligible",
      "Explain biometrics and medical steps with dates to client in writing",
      "Keep seasoned funds evidence for Non-SDS cases",
      "Attach logical SOP tied to career plan and home-country ties"
    ],
    "donts": [
      "Do not submit without signed client checklist and fee receipt where policy requires",
      "Do not promise SDS timelines if client is Non-SDS",
      "Do not use expired LOA or wrong tuition figures on forms",
      "Do not hide previous refusals from other countries",
      "Do not quote government fees without checking current IRCC fee page"
    ],
    "mistakes": [
      "Recent large deposits without source explanation",
      "Copy-paste SOP not matching course or prior academics",
      "Missing sponsor income proof or weak employment letters",
      "Uploading blurry scans or inconsistent names across documents",
      "Missing BIL deadline for biometrics"
    ]
  }
}

$metadata$::jsonb,
  updated_at = now()
WHERE sl.id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';

SELECT sl.id, sl.service, sl.sub_service,
       sl.academy_metadata->>'displayName' AS display_name,
       jsonb_array_length(COALESCE(sl.academy_metadata->'redFlags', '[]'::jsonb)) AS red_flag_count
FROM public.service_library sl
WHERE sl.id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';
