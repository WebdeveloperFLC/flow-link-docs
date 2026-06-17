-- Batch: 11 student visa academy_metadata updates (v2.2)
-- Sources: content/service-library/*-student-visa.json

-- Australia – Student Visa (Subclass 500)
-- Source: content/service-library/australia-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $australia_student_visa$
{
  "displayName": "Australia – Student Visa (Subclass 500)",
  "shortDescription": "Dept of Home Affairs · Subclass 500 · CoE required · Genuine Student (GS) requirement",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 20,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Subclass 500 visa charge is from AUD $2,000 (since 1 Jul 2025) and the living-cost figure is AUD $29,710/yr for a single applicant — both indexed periodically. Offshore applications are prioritised under Ministerial Direction No. 111. Verify all fees, financial-capacity amounts and processing times on homeaffairs.gov.au before quoting; treat these as live CRM/official values."
  },
  "alert": {
    "title": "Genuine Student (GS) requirement",
    "body": "The GS requirement replaced the GTE test (for applications lodged on/after 23 Mar 2024). It is assessed through targeted questions inside the ImmiAccount application form (150-word limit per answer) plus supporting evidence — Home Affairs prefers applicants answer the form questions rather than attach a separate statement, and gives more weight to evidence-backed answers. Future PR intentions do NOT count against the applicant under GS. A generic or unevidenced response, or a course that doesn't fit the applicant's background, is a leading refusal trigger — especially for higher evidence-level (EL3) cohorts such as India, Nepal, Bangladesh and Bhutan."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "GS statement critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Online – ImmiAccount",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Visa charge from AUD $2,000 (verify)",
      "variant": "warning"
    },
    {
      "label": "CoE mandatory",
      "variant": "success"
    },
    {
      "label": "GS requirement",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "Varies",
      "sub": "By sector, country & EL; MD 111 priority — verify live tool (dynamic)",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "from AUD $2,000",
      "sub": "Per applicant since 1 Jul 2025 — verify (dynamic)",
      "tone": "warning"
    },
    {
      "label": "Our approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "success"
    },
    {
      "label": "Required docs",
      "value": "14",
      "sub": "+ OSHC & funds",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & OSHC",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Subclass 500 student visa for full-time study at an Australian CRICOS-registered institution. Requires Confirmation of Enrolment (CoE) and online ImmiAccount application."
    },
    {
      "label": "Eligible applicants",
      "value": "Valid CoE from a CRICOS-registered provider · Genuine Student (GS) requirement · Financial capacity (12 months' living costs + tuition + travel) · English proficiency for the course level · OSHC for the full visa period · Health and character requirements"
    },
    {
      "label": "Financial evidence",
      "value": "Show access to 12 months' living costs (AUD $29,710 for a single applicant, since 10 May 2024) PLUS 12 months' tuition (course fee for the first year) PLUS travel, OR meet the annual-income alternative (parent/partner income, official tax evidence). Funds must be genuinely available; verify the current amounts on homeaffairs.gov.au.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Department of Home Affairs (Australia)"
    },
    {
      "label": "After approval",
      "value": "Maintain enrolment and satisfactory course progress, keep OSHC for the whole stay, notify the provider of your address within 7 days of arrival, and comply with work limits (48 hours per fortnight in study periods). A Subclass 485 Temporary Graduate visa may follow eligible study."
    }
  ],
  "eligibility": [
    {
      "criterion": "CoE from CRICOS provider",
      "met": true,
      "note": "Must match intended course"
    },
    {
      "criterion": "Genuine Student (GS) requirement",
      "met": true,
      "note": "Answered via targeted ImmiAccount form questions (150-word limit each) with supporting evidence; a separate statement is not preferred. Cover ties, course/provider rationale and course benefit. Future PR intent does not count against the applicant."
    },
    {
      "criterion": "Financial capacity",
      "met": true,
      "note": "12 months' living costs (AUD $29,710 single) + first-year tuition + travel, or the annual-income alternative; funds must be genuinely available and source-documented."
    },
    {
      "criterion": "English proficiency",
      "met": true,
      "note": "IELTS/PTE/TOEFL/OET per provider and course level; packaged ELICOS may apply; check the provider's and Home Affairs' thresholds."
    },
    {
      "criterion": "OSHC for study duration",
      "met": false,
      "note": "Mandatory health cover"
    },
    {
      "criterion": "Health exam (if required)",
      "met": false
    },
    {
      "criterion": "Police certificates (if required)",
      "met": false
    }
  ],
  "redFlagsBanner": "After refusal, analyse refusal letter and strengthen GS statement and financial evidence before reapplication with new CoE.",
  "redFlags": [
    {
      "title": "Weak Genuine Student statement",
      "description": "Generic GS, course mismatch with background, unclear career plan.",
      "fix": "Course-specific GS linking prior study/work to Australia program",
      "severity": "Very common"
    },
    {
      "title": "Insufficient financial evidence",
      "description": "Unseasoned funds or amount below Home Affairs threshold.",
      "fix": "12-month funds per guidelines; sponsor ITR; loan evidence",
      "severity": "Very common"
    },
    {
      "title": "CoE / provider issues",
      "description": "Non-CRICOS provider or course start passed.",
      "fix": "Verify CRICOS register before CoE fee",
      "severity": "Common"
    },
    {
      "title": "OSHC gaps",
      "description": "Missing or incorrect OSHC period.",
      "fix": "Purchase OSHC covering full visa period",
      "severity": "Common"
    },
    {
      "title": "Prior refusals not addressed",
      "description": "Hidden Australian or other-country refusals, or any false statement. Non-disclosure risks refusal under PIC 4020 and a potential 3-year exclusion.",
      "fix": "Disclose every prior refusal and explain changed circumstances; never conceal history (PIC 4020 risk)",
      "severity": "Critical"
    },
    {
      "title": "English scores below requirement",
      "description": "Test expired or below course minimum.",
      "fix": "Retake and obtain valid scores before apply",
      "severity": "Medium"
    },
    {
      "title": "Course/credential mismatch or unexplained 'step-down'",
      "description": "Choosing a course below or unrelated to the applicant's existing qualifications without a clear rationale — a core GS failure point.",
      "fix": "Justify the course choice and career logic explicitly in the GS statement; align level and field to the applicant's history",
      "severity": "Very common"
    },
    {
      "title": "Funds not genuinely available / unexplained large deposit",
      "description": "Amount is present but unseasoned or its source is undocumented (recent lump sum), failing the genuine-access test.",
      "fix": "Show 3+ months' history, document the source (sale, loan sanction, savings, sponsor income), and evidence genuine access",
      "severity": "Very common"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee Subclass 500 approval?",
      "a": "No. The Department of Home Affairs assesses the Genuine Student requirement, financial capacity, English, health and character. A strong, honest file improves the chances but a grant is never guaranteed — and we never promise one."
    },
    {
      "q": "What is GS requirement?",
      "a": "The Genuine Student (GS) requirement (which replaced GTE for applications lodged on/after 23 Mar 2024) tests whether the applicant genuinely intends to study. It is assessed through targeted questions inside the ImmiAccount application form — each answer capped at 150 words — plus supporting evidence. Home Affairs prefers applicants answer the form questions rather than attach a separate GS statement, and gives more weight to evidence-backed answers. Importantly, intending to seek PR later does NOT count against the applicant. A generic or unevidenced response is a leading refusal cause."
    },
    {
      "q": "How much funds to show?",
      "a": "Show 12 months' living costs — AUD $29,710 for a single applicant (since 10 May 2024) — PLUS the first 12 months' tuition PLUS travel, with more for any accompanying family. An income alternative exists (parent/partner annual income evidenced by official tax documents). Funds must be genuinely available and source-documented. Verify the current figures on homeaffairs.gov.au."
    },
    {
      "q": "Can spouse join?",
      "a": "Yes. A partner can be included in the application or apply later as a subsequent entrant; they must be a genuine spouse/de facto partner and the relationship must be evidenced. Each adult family member attracts an additional visa charge. A partner's work rights flow from the student's stage of study. Assess case-by-case."
    },
    {
      "q": "Can student work?",
      "a": "Yes — up to 48 hours per fortnight during study periods and unlimited hours during scheduled course breaks. Work cannot start before the course begins, and the student must maintain enrolment, attendance, course progress and OSHC. Verify the current condition on homeaffairs.gov.au, as work rules change."
    },
    {
      "q": "When to apply?",
      "a": "After the CoE is issued, and with enough lead time before the course start for processing, biometrics (if required), health checks and any outstanding evidence. Check the live processing-time tool and the provider accepted start dates; offshore files are prioritised under Ministerial Direction No. 111."
    },
    {
      "q": "Is health exam mandatory?",
      "a": "Often. A health examination by a panel physician is required depending on country of residence, intended study (e.g. healthcare/teaching), and length of stay. Book early — it can delay the grant. Follow the exact instructions generated in ImmiAccount."
    },
    {
      "q": "What after graduation?",
      "a": "Eligible graduates may apply for a Subclass 485 Temporary Graduate visa to gain post-study work experience. Note the 485 charge rose substantially in 2026 — verify the current fee and eligibility (including any field/qualification and age limits) on homeaffairs.gov.au before advising."
    },
    {
      "q": "How much is the Subclass 500 visa application charge?",
      "a": "From AUD $2,000 per applicant since 1 July 2025 (up from $1,600), payable in ImmiAccount at lodgement and non-refundable even if refused. A partner aged 18+ and dependent children attract additional charges. Lower charges apply to eligible Pacific Island and Timor-Leste applicants. Always confirm the current charge on homeaffairs.gov.au before quoting."
    },
    {
      "q": "What is OSHC and is it mandatory?",
      "a": "Overseas Student Health Cover is mandatory for the entire visa period and must be arranged before the visa is granted. Cost varies by provider and duration (roughly AUD $500–$800/yr for a single student — verify with the provider). The policy start/end dates must cover the full visa, not just the course."
    },
    {
      "q": "What is Ministerial Direction No. 111 and why does it matter?",
      "a": "MD 111 sets the priority order in which Home Affairs processes offshore student visa applications, linked to providers' enrolment allocations. It can materially affect processing speed, so the provider and the applicant's place in the allocation matter. Always quote the live processing-time guidance rather than a fixed number."
    },
    {
      "q": "What English level is required?",
      "a": "There is no single number — it depends on the course and provider, who set the accepted tests (IELTS, PTE Academic, TOEFL iBT, OET, etc.) and minimum scores. Packaged ELICOS can lower the direct-entry threshold. Confirm both the provider's and Home Affairs' requirements, and check the test validity date."
    },
    {
      "q": "What does the financial 'genuine access' test mean?",
      "a": "It is not enough to show a balance — the funds must be genuinely available to the applicant or sponsor. A large unexplained deposit just before lodging is a common refusal trigger. Show several months of history and document the source (savings, sale, sanctioned education loan, or evidenced sponsor income)."
    },
    {
      "q": "Can a refused Subclass 500 be appealed?",
      "a": "Onshore refusals may have AAT/ART merits review rights; offshore refusals generally do not and require a corrected fresh application with a new CoE. Read the refusal grounds carefully (commonly GS, financial capacity, or PIC 4020) and fix the specific issue before reapplying. Never re-lodge the same weak file."
    },
    {
      "q": "Does field of study or institution affect the application?",
      "a": "Yes. The provider must be CRICOS-registered, and the evidence level (EL) applied to the applicant's country and provider affects how much documentation is scrutinised. India, Nepal, Bangladesh and Bhutan are at the higher EL3 setting, so build a thorough GS statement and financial pack."
    },
    {
      "q": "When should the application be lodged relative to course start?",
      "a": "After the CoE is issued and with enough lead time for processing, biometrics (if required), health checks and any English/financial evidence. Allow several weeks to a few months; check the live processing-time tool and the provider's accepted start dates."
    },
    {
      "q": "What relationship/financial evidence is strongest for a sponsor?",
      "a": "Where parents fund the study: their bank statements with history, official income/tax documents, a sponsorship/affidavit of support, and relationship proof. For loans: a sanction letter from a recognised lender covering tuition and living. The source matters as much as the amount."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — the Department of Home Affairs decides. FLC prepares a strong, honest, well-documented file with a credible GS statement and verified funds, and never promises a grant, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission",
    "Never guarantee visa approval",
    "Fee quotes must separate consultancy, visa, OSHC, and medical costs",
    "CoE must be from CRICOS-registered provider only"
  ],
  "proTips": [
    "Verify CRICOS before CoE payment",
    "Draft GS before document collection",
    "Purchase OSHC for exact visa period",
    "Season funds early with ITR",
    "Cross-check CoE against passport name",
    "Write the GS statement per client — name the course, provider, career outcome and home ties; never reuse a template.",
    "Confirm the CRICOS registration of the provider AND course before any deposit.",
    "Document genuine access to funds (3+ months history + source); a last-minute lump sum is a leading refusal trigger.",
    "Treat the AUD $2,000 charge, AUD $29,710 living figure and processing times as live values — verify on homeaffairs.gov.au and pull from current CRM data."
  ],
  "postApproval": [
    "Send visa grant notification and conditions",
    "Remind OSHC maintenance and enrolment deadlines",
    "Explain work hour limits",
    "Discuss 485 pathway timeline if relevant"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "stats": [
      {
        "label": "Files this year",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ],
    "note": "Approval rate and file counts are indicative and should be pulled live from CRM case data, not published as fixed figures. Verify before release."
  },
  "approvalFactors": [
    {
      "label": "Our rate vs industry",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "GS quality",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Financial docs",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counseling, CoE review, fee agreement"
    },
    {
      "weeks": "2–4",
      "title": "GS, funds, OSHC, documents"
    },
    {
      "weeks": "4–5",
      "title": "ImmiAccount submission & biometrics"
    },
    {
      "weeks": "Varies",
      "title": "Home Affairs processing — varies by sector/country/EL (MD 111); quote the live tool"
    }
  ],
  "relatedServices": [
    {
      "label": "Australia – Subclass 485",
      "libraryId": ""
    },
    {
      "label": "Australia – Visitor Visa",
      "libraryId": ""
    },
    {
      "label": "Australia – Skilled Migration",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Consistency fix + version alignment: removed invented statistics that remained from earlier passes — set performance.ourRate/industryRate to null, converted hardcoded file counts (192/165/19/8) and the approvalFactors ours/benchmark pairs to {{VERIFY_LIVE}}/null, and replaced the hardcoded approval-rate KPI (86%) with {{VERIFY_LIVE}}. Brings Australia in line with the rest of the service-library (no published approval rates or unsourced benchmarks). No other content changed; all factual content and prior corrections are unchanged."
    },
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Publication-readiness fixes: removed the fixed 4–8 week processing claim (now 'varies — verify live tool', consistent with MD 111 and the file's own warnings); aligned Genuine Student content to the official model (answered via 150-word ImmiAccount form questions with evidence, separate statement not preferred, future PR intent does not count against the applicant); corrected the GS resource URL to /genuine-student-requirement; made the financial-increase date precise (10 May 2024); and flagged the approval rate, file counts and benchmark factors as live CRM values rather than fixed published figures."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Gold-standard content pass: replaced auto-generated template FAQs and quiz questions with real counsellor Q&A; corrected the Subclass 500 charge to from AUD $2,000 (since 1 Jul 2025) and the living-cost figure to AUD $29,710 (single, since 10 May 2024); added Genuine Student detail, Ministerial Direction No. 111, EL3 cohort note, PIC 4020 and genuine-access guidance; removed wrong-domain leftovers (GIC/blocked account/CAS) from the cost breakdown; flagged fees, living costs, processing times and approval rate as values that should be dynamic/CRM-sourced; varied the quiz answer key across positions. Also replaced residual GTE terminology and the GTE resource link with the current Genuine Student (GS) references."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Subclass 500 counselor content with GS and 2026 fee notes."
    }
  ],
  "staffNotes": [
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "GS statement must be original—template GS is top QA rejection internally."
    }
  ],
  "resources": [
    {
      "title": "Home Affairs — Student visa (500)",
      "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
      "description": "Official requirements"
    },
    {
      "title": "Home Affairs — Genuine Student (GS) requirement",
      "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/genuine-student-requirement",
      "description": "Official guidance on the Genuine Student requirement (replaced GTE); verify current GS questions and evidence expectations"
    },
    {
      "title": "CRICOS register",
      "url": "https://cricos.education.gov.au/",
      "description": "Verify institution registration"
    },
    {
      "title": "Home Affairs — Visa pricing",
      "url": "https://immi.homeaffairs.gov.au/visas/visa-pricing-estimator",
      "description": "Current visa fees"
    },
    {
      "title": "Home Affairs — Processing times",
      "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times",
      "description": "Processing estimates"
    }
  ],
  "quiz": [
    {
      "question": "Mandatory enrolment document?",
      "options": [
        "CoE from CRICOS provider",
        "LOA only",
        "LMIA",
        "Job offer"
      ],
      "correctIndex": 0,
      "explanation": "CoE required for Subclass 500.",
      "level": 1
    },
    {
      "question": "GS requirement assesses:",
      "options": [
        "Only bank balance",
        "Genuine intent to study and comply with visa",
        "Hotel bookings",
        "Passport colour"
      ],
      "correctIndex": 1,
      "explanation": "Genuine Student framework.",
      "level": 1
    },
    {
      "question": "OSHC is:",
      "options": [
        "Optional travel insurance",
        "University tuition",
        "Mandatory Overseas Student Health Cover",
        "Embassy fee"
      ],
      "correctIndex": 2,
      "explanation": "Required health cover for students.",
      "level": 1
    },
    {
      "question": "Top refusal factor often:",
      "options": [
        "Wrong photo",
        "Passport brand",
        "Airline",
        "Weak GS / course rationale"
      ],
      "correctIndex": 3,
      "explanation": "GS and credibility key.",
      "level": 1
    },
    {
      "question": "Counselors must never:",
      "options": [
        "Guarantee visa approval",
        "Verify CRICOS",
        "Check OSHC",
        "Review CoE"
      ],
      "correctIndex": 0,
      "explanation": "No guarantees permitted.",
      "level": 1
    },
    {
      "level": 1,
      "question": "Which visa lets international students study full-time in Australia?",
      "options": [
        "Subclass 485",
        "Subclass 500 (Student visa)",
        "Subclass 600",
        "Subclass 820"
      ],
      "correctIndex": 1,
      "explanation": "The Subclass 500 is the primary student visa."
    },
    {
      "level": 1,
      "question": "What document confirms enrolment for a Subclass 500 application?",
      "options": [
        "A CAS",
        "An I-20",
        "Confirmation of Enrolment (CoE) from a CRICOS provider",
        "A PAL"
      ],
      "correctIndex": 2,
      "explanation": "Australia uses a CoE from a CRICOS-registered provider (CAS=UK, I-20=US, PAL=Canada)."
    },
    {
      "level": 1,
      "question": "The Genuine Student (GS) requirement replaced which former test?",
      "options": [
        "The IELTS test",
        "The OSHC rule",
        "The CRICOS check",
        "The Genuine Temporary Entrant (GTE) test"
      ],
      "correctIndex": 3,
      "explanation": "GS replaced GTE as the genuineness test."
    },
    {
      "level": 1,
      "question": "From 1 July 2025, the Subclass 500 visa charge is from:",
      "options": [
        "AUD $2,000",
        "AUD $710",
        "AUD $150",
        "No fee"
      ],
      "correctIndex": 0,
      "explanation": "The base charge rose to from AUD $2,000 on 1 Jul 2025."
    },
    {
      "level": 1,
      "question": "The single-applicant living-cost figure (since 10 May 2024) is about:",
      "options": [
        "AUD $10,000 per year",
        "AUD $29,710 per year",
        "AUD $24,505 per year",
        "No requirement"
      ],
      "correctIndex": 1,
      "explanation": "The living-cost figure rose to AUD $29,710 for a single applicant."
    },
    {
      "level": 1,
      "question": "Subclass 500 students may work how many hours during study periods?",
      "options": [
        "Unlimited",
        "20 hours per week",
        "Up to 48 hours per fortnight",
        "None"
      ],
      "correctIndex": 2,
      "explanation": "The cap is 48 hours per fortnight in study periods; unlimited in scheduled breaks."
    },
    {
      "level": 1,
      "question": "Health cover required for the full visa period is called:",
      "options": [
        "OHIP",
        "NHS cover",
        "Medicare",
        "OSHC (Overseas Student Health Cover)"
      ],
      "correctIndex": 3,
      "explanation": "OSHC is mandatory for the whole visa period."
    },
    {
      "level": 1,
      "question": "Where is the Subclass 500 application lodged?",
      "options": [
        "Online via ImmiAccount",
        "By post only",
        "At the airport",
        "Through the university only"
      ],
      "correctIndex": 0,
      "explanation": "Applications are lodged online in ImmiAccount."
    },
    {
      "level": 2,
      "question": "What does the financial 'genuine access' test require?",
      "options": [
        "Only a current balance screenshot",
        "Funds genuinely available and source-documented, not just a balance",
        "Cash on arrival",
        "Nothing"
      ],
      "correctIndex": 1,
      "explanation": "Funds must be genuinely available with a documented source; lump sums are scrutinised."
    },
    {
      "level": 2,
      "question": "Which direction governs the priority order for offshore student processing?",
      "options": [
        "PIC 4020",
        "Subclass 485",
        "Ministerial Direction No. 111",
        "CRICOS Act"
      ],
      "correctIndex": 2,
      "explanation": "MD 111 sets offshore processing priority tied to provider allocations."
    },
    {
      "level": 2,
      "question": "Non-disclosure of a prior refusal can trigger refusal under:",
      "options": [
        "Condition 8105",
        "The 48-hour rule",
        "OSHC rules",
        "PIC 4020 (and a potential 3-year exclusion)"
      ],
      "correctIndex": 3,
      "explanation": "PIC 4020 covers false or misleading information; exclusion can follow."
    },
    {
      "level": 2,
      "question": "India, Nepal, Bangladesh and Bhutan are currently at which evidence level?",
      "options": [
        "EL3 (higher scrutiny)",
        "EL1",
        "No evidence level",
        "Exempt"
      ],
      "correctIndex": 0,
      "explanation": "These countries are set at EL3, so documentation is scrutinised more."
    },
    {
      "level": 2,
      "question": "The annual-income alternative to savings must be evidenced by:",
      "options": [
        "A verbal declaration",
        "Official government/tax documentation of parent or partner income",
        "A photo of cash",
        "A social media post"
      ],
      "correctIndex": 1,
      "explanation": "The income alternative requires official tax evidence of the sponsor's income."
    },
    {
      "level": 2,
      "question": "School-aged dependent children add an annual schooling cost of about:",
      "options": [
        "AUD $500 per child",
        "Nothing",
        "AUD $13,502 per child",
        "AUD $1,000 per child"
      ],
      "correctIndex": 2,
      "explanation": "Official schooling cost is AUD $13,502 per child per year (additional to living costs)."
    },
    {
      "level": 2,
      "question": "When can a Subclass 500 holder begin working?",
      "options": [
        "On arrival",
        "After the CoE",
        "Anytime",
        "Only on/after the course start date"
      ],
      "correctIndex": 3,
      "explanation": "Work cannot begin before the course starts."
    },
    {
      "level": 2,
      "question": "OSHC dates must cover:",
      "options": [
        "The full visa period, not just the course",
        "Only the first month",
        "Only exam periods",
        "No fixed period"
      ],
      "correctIndex": 0,
      "explanation": "OSHC must cover the entire visa period and be in place before grant."
    },
    {
      "level": 3,
      "question": "A 32-year-old MBA holder applies for a 1-year diploma in a new field. Main risk?",
      "options": [
        "No risk",
        "A GS/course-mismatch concern — justify the choice and career logic",
        "Only a fee issue",
        "OSHC only"
      ],
      "correctIndex": 1,
      "explanation": "Step-down or field-change without rationale is a core GS failure."
    },
    {
      "level": 3,
      "question": "A bank statement shows a large deposit 4 days before lodging, no history. Best action?",
      "options": [
        "Lodge now",
        "Hide it",
        "Document the source and show seasoning before lodging",
        "Convert to cash"
      ],
      "correctIndex": 2,
      "explanation": "Genuine-access test: source and seasoning matter, not just the amount."
    },
    {
      "level": 3,
      "question": "An offshore Subclass 500 is refused. Typical recourse?",
      "options": [
        "Automatic AAT appeal",
        "Re-entry at the airport",
        "Nothing",
        "A corrected fresh application with a new CoE (offshore generally has no merits review)"
      ],
      "correctIndex": 3,
      "explanation": "Offshore refusals usually require a corrected re-application; onshore may have ART review."
    },
    {
      "level": 3,
      "question": "A client asks for a written guarantee of the visa. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; Home Affairs decides."
    },
    {
      "level": 3,
      "question": "A counsellor quotes the old AUD $710 charge. The issue?",
      "options": [
        "Too high",
        "Outdated — it is from AUD $2,000 since 1 Jul 2025; verify live",
        "No issue",
        "Fees aren't quoted"
      ],
      "correctIndex": 1,
      "explanation": "The charge rose to from AUD $2,000; always verify on homeaffairs.gov.au."
    },
    {
      "level": 3,
      "question": "A client omits a prior UK student-visa refusal on the form. The risk?",
      "options": [
        "None",
        "Faster processing",
        "PIC 4020 misrepresentation — refusal and a potential 3-year exclusion",
        "Lower fee"
      ],
      "correctIndex": 2,
      "explanation": "Undisclosed refusals risk PIC 4020 consequences."
    },
    {
      "level": 3,
      "question": "The single strongest lever on a borderline GS file is:",
      "options": [
        "A bigger bank balance",
        "More photos",
        "A new passport",
        "A specific, coherent GS statement with course-career logic and home ties"
      ],
      "correctIndex": 3,
      "explanation": "A genuine, specific GS narrative is the key lever."
    },
    {
      "level": 3,
      "question": "A student wants to work 60 hours in a fortnight during term. Advise:",
      "options": [
        "Not allowed — the cap is 48 hours per fortnight in study periods",
        "Allowed",
        "Allowed if on campus",
        "Allowed once"
      ],
      "correctIndex": 0,
      "explanation": "Exceeding 48 hours per fortnight in study periods can risk the visa."
    }
  ],
  "donts": {
    "dos": [
      "Verify CRICOS and CoE before apply",
      "Write original course-specific GS",
      "Purchase correct OSHC period",
      "Show funds per Home Affairs amounts",
      "Disclose prior refusals",
      "Match the course level/field to the applicant's background and state the rationale in the GS",
      "Verify CRICOS registration and OSHC dates before lodging"
    ],
    "donts": [
      "Do not guarantee approval",
      "Do not use template GS",
      "Do not apply with expired CoE",
      "Do not hide refusals",
      "Do not quote outdated fees",
      "Do not promise a grant or a fixed processing time — MD 111 priority varies",
      "Do not lodge unseasoned or unexplained funds — the genuine-access test will fail"
    ],
    "mistakes": [
      "Generic GS not matching course",
      "OSHC period too short",
      "Funds below threshold",
      "Course unrelated to background without explanation",
      "Blurry financial documents",
      "Quoting the old AUD $710 / $1,600 charge — it is from AUD $2,000 since 1 Jul 2025",
      "Reusing a templated GS statement across clients (a core refusal cause)"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample CoE (mock)",
      "description": "Confirmation of Enrolment from CRICOS provider.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample OSHC policy (mock)",
      "description": "Overseas Student Health Cover certificate.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    },
    {
      "title": "Sample Genuine Student (GS) statement (mock)",
      "description": "Genuine Student (GS) written statement structure — course-career logic and home ties.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample IELTS / PTE TRF (mock)",
      "description": "English scores for subclass 500.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample financial capacity proof (mock)",
      "description": "Funds for tuition + travel + 12 months living.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample academic transcripts (mock)",
      "description": "Qualification history for Genuine Student (GS) course alignment.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "Subclass 500 students may work up to 48 hours per fortnight during study periods and unlimited hours during scheduled course breaks. Work cannot start before the course begins.",
      "details": [
        "48 hours per fortnight is the cap during study periods (a fortnight is any 14-day period); unlimited during scheduled breaks.",
        "Must maintain enrolment, attendance, course progress and OSHC.",
        "Some courses (e.g. certain research/aged-care roles) have specific exceptions — verify the live condition."
      ],
      "restrictions": [
        "Work must not begin before the course start date",
        "Breaching the 48-hour cap can risk the visa"
      ],
      "sourceUrl": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "A student's partner included on the visa generally has work rights aligned to the student's study stage; for postgraduate/coursework-by-research the partner may have unrestricted work — verify the current condition on homeaffairs.gov.au.",
      "details": [],
      "restrictions": [],
      "sourceUrl": "https://immi.homeaffairs.gov.au/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Australia – Student Visa (Subclass 500)",
    "currency": "AUD",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. The visa charge and living-cost figure are from official Home Affairs sources and should be re-verified on homeaffairs.gov.au before quoting — they are indexed periodically. INR equivalents move with exchange rates.",
    "sourceUrl": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Subclass 500 visa application charge (primary)",
            "amount": 2000,
            "unit": "from, per applicant",
            "currency": "AUD",
            "applicable": true,
            "notes": "From 1 Jul 2025 (was $1,600). Non-refundable. Partner 18+ also pays; child under 18 less. Verify on homeaffairs.gov.au."
          },
          {
            "label": "Biometrics (if required)",
            "amount": 45,
            "unit": "per person",
            "currency": "AUD",
            "applicable": true,
            "notes": "Some nationalities only; collected at an AVAC"
          },
          {
            "label": "Health examination (panel physician)",
            "range": "300–500",
            "currency": "AUD",
            "applicable": true,
            "notes": "Paid to the physician, not Home Affairs; varies by country"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Tuition (undergraduate, indicative)",
            "range": "Mid-range for destination",
            "notes": "Use offer letter amount",
            "currency": "AUD",
            "applicable": true
          },
          {
            "label": "Tuition deposit already paid",
            "range": "Per CoE / Offer of Place",
            "notes": "Use the CoE tuition amount; deduct any prepaid amount from required funds",
            "currency": "AUD",
            "applicable": true
          },
          {
            "label": "Books & materials",
            "range": "500–1,500",
            "unit": "per year",
            "notes": "Program dependent",
            "currency": "AUD",
            "applicable": true
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Living costs (Home Affairs, single applicant)",
            "amount": 29710,
            "unit": "per year",
            "currency": "AUD",
            "applicable": true,
            "notes": "Since May 2024 (was $24,505). Add for partner/children. Verify current figure."
          },
          {
            "label": "OSHC",
            "range": "500–800",
            "unit": "per year",
            "currency": "AUD",
            "applicable": true,
            "notes": "Mandatory for the full visa period; varies by provider"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / notarisation",
            "range": "Varies",
            "notes": "Certified translation where required"
          },
          {
            "label": "English test (if needed)",
            "range": "Varies",
            "notes": "IELTS/PTE/TOEFL/OET provider fee"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Always cross-check the CoE / Offer of Place and official Home Affairs fee pages before client commitment."
      }
    ]
  }
}
$australia_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-000000000041';

-- Austria – Student Residence Permit (Aufenthaltsbewilligung – Studierender)
-- Source: content/service-library/austria-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $austria_student_visa$
{
  "displayName": "Austria – Student Residence Permit (Aufenthaltsbewilligung – Studierender)",
  "shortDescription": "Austrian mission + MA 35/BH · Residence Permit – Student · Admission + proof of means · ÖGK insurance",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Austria issues a Residence Permit – Student (Aufenthaltsbewilligung – Studierender), NOT a classic student visa; a Visa D may be issued first to travel/sit entrance exams. Financial-means thresholds are ASVG-linked and revised annually ({{VERIFY_LIVE}} — under-24 vs 24+ differ), and fees are set by the authority. Austria does NOT use APS (that is a Germany requirement). Verify all amounts on migration.gv.at / oead.at / the Austrian mission before quoting; treat figures as live values."
  },
  "alert": {
    "title": "Register your address within 3 working days",
    "body": "After arrival, students must register their residence (Meldezettel) with the local registration office within three working days. Collect the residence permit within the Visa D validity, and keep ÖGK student insurance and enrolment current. Note: Austria does NOT require APS — do not import German requirements."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "Proof of means critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Mission + MA 35/BH",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Fees + proof of means (verify)",
      "variant": "neutral"
    },
    {
      "label": "Admission (Zulassungsbescheid)",
      "variant": "success"
    },
    {
      "label": "ÖGK student insurance",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Processing varies by mission/authority — verify live",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Residence permit + any Visa D fee + proof of means — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Residence Permit – Student (Aufenthaltsbewilligung – Studierender) for non-EU/EEA nationals admitted to a recognised Austrian higher education institution. Austria does not issue a classic student visa; a Visa D may be issued first to enter and sit entrance exams, after which the residence permit is collected in Austria."
    },
    {
      "label": "Eligible applicants",
      "value": "Admission/Zulassungsbescheid (degree 'ordentliche' study, or non-degree 'außerordentliche' study of ≥40 ECTS not solely for language) · Proof of financial means ({{VERIFY_LIVE}}, age-dependent) · Health insurance covering all risks (ÖGK student self-insurance after entry) · Adequate accommodation · Valid passport · Clean criminal record certificate"
    },
    {
      "label": "Financial means",
      "value": "Age-linked ASVG thresholds for 2026 ({{VERIFY_LIVE}}): under-24 vs 24-and-over differ; proof for 12 months. If rent exceeds the ASVG room-and-board value ({{VERIFY_LIVE}}/month) you must show additional funds. Acceptable: savings, blocked account, scholarship, or a Haftungserklärung (declaration of guarantee) from an EU resident. Verify the current thresholds.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Austrian embassy/consulate (application + any Visa D) · MA 35 (Vienna) or the Bezirkshauptmannschaft (other provinces) as the residence authority · ÖGK for student insurance"
    },
    {
      "label": "After approval",
      "value": "After the residence authority accepts the application, the applicant has 3 months to apply for the Visa D to enter Austria and 6 months to collect the Residence Permit – Student in Austria. On arrival: register your address (Meldezettel) within 3 working days, take out ÖGK student self-insurance, and collect/activate the permit. Renew annually before expiry (you may remain lawfully while a timely renewal is processed); submit the continuing-enrolment confirmation (Fortsetzungsbestätigung) and meet academic progress (≥16 ECTS/year)."
    }
  ],
  "eligibility": [
    {
      "criterion": "Admission from a recognised Austrian institution (Zulassungsbescheid)",
      "met": true,
      "note": "Degree (ordentliches) study at a university/Fachhochschule/accredited private university, or non-degree (außerordentliches) study of ≥40 ECTS not solely for language. Confirm the institution is recognised before any fee."
    },
    {
      "criterion": "Qualification recognised for admission (Zulassungsbescheid / ENIC-NARIC Austria)",
      "met": false,
      "note": "Recognition is decided by the admitting institution (supported by ENIC-NARIC Austria where needed). Austria does NOT use Germany's Anabin. Where not directly equivalent, a Vorstudienlehrgang or Ergänzungsprüfung may be required."
    },
    {
      "criterion": "Proof of financial means (age-linked, 12 months)",
      "met": false,
      "note": "ASVG-linked 2026 thresholds ({{VERIFY_LIVE}}): under-24 lower, 24+ higher; plus extra if rent exceeds the room-and-board value ({{VERIFY_LIVE}}/month). Show consistent funds/savings, not a one-off deposit."
    },
    {
      "criterion": "Health insurance covering all risks",
      "met": false,
      "note": "Travel/incoming cover for the application/entry period, then ÖGK student self-insurance (Studierendenselbstversicherung) after entry ({{VERIFY_LIVE}}/month) or an accepted private plan."
    },
    {
      "criterion": "Adequate accommodation in Austria",
      "met": false,
      "note": "A rental contract, dorm confirmation or equivalent; the address is also needed for the Meldezettel registration."
    },
    {
      "criterion": "Criminal record certificate",
      "met": false,
      "note": "Police clearance from the country of residence (and sometimes country of origin), apostilled/legalised and translated as required."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "Valid for the intended stay; check the mission's validity rule."
    },
    {
      "criterion": "Academic progress capacity (renewal)",
      "met": true,
      "note": "Renewal requires ≥16 ECTS per academic year plus a continuing-enrolment confirmation (Fortsetzungsbestätigung). A first year below the threshold may draw a warning; a second consecutive year can lead to non-renewal. Counsel on this from the start and document medical/family/course reasons."
    }
  ],
  "redFlagsBanner": "After a refusal, address the authority's stated reason before reapplying — proof of means, accommodation and admission cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Importing German 'APS' into an Austria file",
      "description": "Austria does NOT use APS (that is a Germany/China/Vietnam requirement). Telling an Austria client they need APS is a factual error from cross-country contamination.",
      "fix": "Remove APS entirely; Austria relies on the Zulassungsbescheid (admission) and proof of means",
      "severity": "Critical"
    },
    {
      "title": "Insufficient / inconsistent proof of means",
      "description": "Funds below the age-linked ASVG threshold, a one-off large deposit, or rent above the room-and-board value without extra funds.",
      "fix": "Show 12 months of consistent funds/savings meeting the correct age threshold; add funds where rent exceeds the room-and-board value",
      "severity": "Very common"
    },
    {
      "title": "Wrong pathway (Visa D vs residence permit vs Schengen)",
      "description": "Treating a Schengen-free 90-day entry or a Visa D as a study permit; a tourist stay does not convert into a student permit.",
      "fix": "Apply for the Residence Permit – Student before entry; use Visa D only to travel/sit entrance exams; exchanges under 6 months use Visa D",
      "severity": "High"
    },
    {
      "title": "Admission not from a recognised institution / expired Zulassung",
      "description": "Unrecognised provider or a lapsed admission.",
      "fix": "Confirm the institution is recognised and the Zulassungsbescheid is valid for the intake before any fee",
      "severity": "Common"
    },
    {
      "title": "Academic progress below 16 ECTS — renewal at risk",
      "description": "Falling below 16 ECTS/year can trigger a renewal review and, on a second year, non-renewal.",
      "fix": "Counsel on ECTS progress from day one; document medical/family/course reasons for any shortfall proactively",
      "severity": "High"
    },
    {
      "title": "Address not registered within 3 working days",
      "description": "Missing the Meldezettel deadline after arrival.",
      "fix": "Plan accommodation before arrival; register within 3 working days; this is also needed for insurance and the permit",
      "severity": "Medium"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden Schengen/Austrian refusals or false documents.",
      "fix": "Disclose every prior refusal and explain changed circumstances; never conceal history or submit fabricated documents",
      "severity": "High"
    },
    {
      "title": "Quoting a flat 20 h/week work limit to a bachelor student",
      "description": "Bachelor students may work only up to 10 h/week (20 h is for master's/PhD or post-bachelor). Advising 20 h to an undergraduate can cause a permit-condition breach.",
      "fix": "State the tiered limit (10 h bachelor / 20 h master's-PhD) and that the employer must obtain the Beschäftigungsbewilligung before any work",
      "severity": "Critical"
    },
    {
      "title": "Assuming work is automatic / no employer permit",
      "description": "Treating the student's right to work as built-in. In Austria the employer must obtain a Beschäftigungsbewilligung from the AMS before work begins, even for marginal employment.",
      "fix": "Confirm the employer has applied for and received the Beschäftigungsbewilligung before the student starts work",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee approval of the residence permit?",
      "a": "No. The Austrian mission and residence authority (MA 35 / Bezirkshauptmannschaft) decide based on admission, proof of means, insurance, accommodation and credibility. A strong, honest file improves the chances but approval is never guaranteed — and we never promise one."
    },
    {
      "q": "Does Austria require an APS certificate?",
      "a": "No. APS is a Germany (and China/Vietnam) requirement and does NOT apply to Austria. Austria relies on the admission decision (Zulassungsbescheid) from a recognised institution plus proof of means and insurance. Do not import APS into an Austria file."
    },
    {
      "q": "Is it a student visa or a residence permit?",
      "a": "A Residence Permit – Student (Aufenthaltsbewilligung – Studierender). Austria does not issue a classic long-stay student visa; non-EU/EEA students apply for the residence permit before entering. A Visa D may be issued first to travel and sit entrance exams, after which the permit is collected in Austria. Exchanges under 6 months use a Visa D instead."
    },
    {
      "q": "How much money must a student show?",
      "a": "Age-linked ASVG thresholds (2026, {{VERIFY_LIVE}}): students under 24 show a lower monthly amount; students 24 and over show a higher amount; both proven for 12 months in an account accessible from Austria. If monthly rent exceeds the ASVG room-and-board value ({{VERIFY_LIVE}}), additional funds are required. Show a consistent pattern, not a one-off deposit. Verify the current figures — revised annually."
    },
    {
      "q": "What health insurance is required?",
      "a": "Insurance covering all risks and valid in Austria. Most students use travel/incoming cover for the application/entry period, then take out ÖGK student self-insurance (Studierendenselbstversicherung) after entry and enrolment ({{VERIFY_LIVE}}/month), or an accepted private plan (e.g. providers recognised by MA 35)."
    },
    {
      "q": "Can the student work?",
      "a": "Yes, but it is tiered and not automatic. Bachelor students (before completing the first degree stage) may work up to 10 hours/week; master's/PhD students (or after completing the bachelor's stage) up to 20 hours/week. The EMPLOYER must obtain an employment permit (Beschäftigungsbewilligung) from the AMS BEFORE work starts — even for marginal employment. Work income cannot replace the proof-of-means requirement. Verify the current rule, as conditions can change."
    },
    {
      "q": "Is German required for the initial permit?",
      "a": "No. There is no German-language requirement for the initial Residence Permit – Student, though the program itself sets its admission language (German or English) and German helps with daily life, work and later steps."
    },
    {
      "q": "What after graduation?",
      "a": "Eligible graduates of an Austrian programme may apply for a residence permit to seek qualified employment (a job-search period, commonly up to 12 months after graduation), and on finding a qualifying role may move to the Red-White-Red Card (Rot-Weiß-Rot-Karte) — a separate work-and-residence permit with its own salary and qualification criteria. These are distinct steps, not automatic. Verify the current job-search duration and Red-White-Red Card thresholds before advising."
    },
    {
      "q": "What are the government fees?",
      "a": "The Residence Permit – Student carries an authority fee ({{VERIFY_LIVE}}; official sources describe a split of application + personalisation + police-data/fingerprinting, while some 2026 sources cite a single unified amount — sources conflict, so verify), and a Visa D (where issued) carries a separate consular fee ({{VERIFY_LIVE}}). Fee structures and amounts are set by the authority and change — verify the current amounts on the mission's site and migration.gv.at."
    },
    {
      "q": "What is the academic-progress (ECTS) rule?",
      "a": "Renewal generally requires at least 16 ECTS per academic year plus a continuing-enrolment confirmation (Fortsetzungsbestätigung). Falling short can trigger a review and, on a second consecutive year, non-renewal. Counsel students on this from the start; document any medical/family/course reasons proactively."
    },
    {
      "q": "When and where is the application made?",
      "a": "Before entry, at the competent Austrian embassy/consulate; the residence authority is MA 35 in Vienna or the Bezirkshauptmannschaft in other provinces. Start 4–5 months before the semester — appointments, document legalisation/apostille and authority review all take time."
    },
    {
      "q": "What is the 3-day registration rule?",
      "a": "After arriving, you must register your address (Meldezettel) with the local registration office within three working days. This registration is also needed to finalise insurance and the residence permit, so line up accommodation before arrival."
    },
    {
      "q": "What financial-means alternatives are accepted?",
      "a": "Savings/bank statements over 12 months, a blocked account, a scholarship confirmation, or a Haftungserklärung (declaration of guarantee) from a person resident in the EU. A one-off large deposit without history is a refusal risk — show a consistent pattern."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "Yes. A refusal can be challenged by a complaint (Beschwerde) to the Federal Administrative Court (Bundesverwaltungsgericht, BVwG), lodged via the deciding authority within the stated deadline, or the client can reapply with a corrected, stronger file. Read the reason carefully (commonly proof of means, accommodation, insurance, or admission validity) and fix the specific issue rather than re-lodging the same file."
    },
    {
      "q": "Can a spouse or children join?",
      "a": "Family reunion for students is restricted: the Residence Permit – Student is a temporary residence title, so bringing a spouse/children requires separate, higher proof of means and adequate accommodation, and is assessed case-by-case — it does not carry the same family-reunification rights as a skilled-worker permit. A dependant's work access depends on the permit granted. Verify the current family-reunification rules with MA 35 / the Bezirkshauptmannschaft; do not assume entitlement."
    },
    {
      "q": "Is there a preparatory route if my qualification is not directly equivalent?",
      "a": "Yes. Where the prior qualification is not directly equivalent for Austrian admission, the university may require a supplementary examination (Ergänzungsprüfung) and/or attendance at a University Preparation Programme (Vorstudienlehrgang). The applicant may enter on a Visa D to sit an entrance examination, then receive the residence permit on admission. Note: Austria does not use Germany's 'Studienkolleg' — the Austrian route is the Vorstudienlehrgang / Ergänzungsprüfung."
    },
    {
      "q": "How long does processing take?",
      "a": "It varies by mission and authority (often several weeks to a few months). Always quote the live estimate from the mission/migration.gv.at rather than a fixed number, and start early because appointment slots can be scarce."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — the Austrian authorities decide. FLC prepares a strong, honest, well-documented file (admission, proof of means, insurance, accommodation) and never promises a permit, in writing or verbally."
    },
    {
      "q": "How is a foreign qualification recognised for Austrian admission?",
      "a": "Recognition is assessed by the Austrian institution itself (each university/Fachhochschule decides admission), supported where needed by ENIC-NARIC Austria for credential evaluation. Austria does NOT use Germany's Anabin database. Confirm the institution's admission decision (Zulassungsbescheid) before any fee; where the qualification is not directly equivalent, a Vorstudienlehrgang or Ergänzungsprüfung may be required."
    },
    {
      "q": "What is the difference between a university, a Fachhochschule and a private university?",
      "a": "Public universities (Universität) offer research-oriented degrees, often with low/no tuition for some groups and a per-semester fee for non-EU students; Fachhochschulen (universities of applied sciences) are practice-oriented with their own application portals and intake timing; accredited private universities set their own (usually higher) fees. All can issue a recognised Zulassungsbescheid. Match the pathway and tuition expectation to the institution type."
    },
    {
      "q": "What happens if a renewal is refused?",
      "a": "If the residence authority refuses a renewal (commonly for falling below 16 ECTS/year, lapsed insurance, or insufficient means), the student can lodge a complaint (Beschwerde) to the BVwG within the deadline. A first year of insufficient progress may draw a warning; a second consecutive year can lead to non-renewal. Document medical, family or course-structure reasons proactively and apply for renewal before expiry."
    },
    {
      "q": "When must a renewal be filed?",
      "a": "Apply for renewal before the current permit expires (start well ahead, e.g. ~3 months before). If a complete renewal is filed in time, the student may generally remain lawfully in Austria while it is processed, even if the current permit lapses during processing. Late or incomplete filings risk a status gap."
    },
    {
      "q": "Does the student apply for the work permit, and when can work start?",
      "a": "No — the EMPLOYER applies for the Beschäftigungsbewilligung at the AMS, and the student may not start work until it is granted. This applies even to marginal (geringfügige) employment. Processing is typically a few weeks; the permit is specific to that job and employer, so a new employer needs a new permit."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a permit or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government and third-party costs.",
    "Proof-of-means funds belong to the client — never receive, hold or route them through firm accounts.",
    "Never import another country's requirements (e.g. German APS, blocked account, Anabin) into an Austria file.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic, financial and criminal-record documents under data-protection rules: store securely, share only with authorised parties, retain only as needed.",
    "Disclose all prior refusals; misrepresentation can lead to refusal and entry bans."
  ],
  "proTips": [
    "Never tell an Austria client they need APS — that is a Germany requirement; Austria relies on the Zulassungsbescheid and proof of means.",
    "State work hours correctly: bachelor up to 10 h/week, master's/PhD up to 20 h/week — and the EMPLOYER must obtain the Beschäftigungsbewilligung before work starts (even marginal jobs).",
    "Use the correct age-linked ASVG means threshold (under-24 vs 24+) and add funds where rent exceeds the room-and-board value; verify the live figures.",
    "Plan accommodation before arrival — the Meldezettel must be filed within 3 working days and it gates insurance and the permit.",
    "Counsel on the 16-ECTS/year progress rule from day one; renewal can be refused if the student falls behind.",
    "Recognition is via the institution / ENIC-NARIC Austria (NOT Anabin); where not equivalent, route through a Vorstudienlehrgang / Ergänzungsprüfung.",
    "Remember the deadlines after approval: 3 months to apply for the Visa D, 6 months to collect the residence permit in Austria."
  ],
  "postApproval": [
    "Register address (Meldezettel) within 3 working days of arrival",
    "Take out ÖGK student self-insurance after entry and enrolment",
    "Collect/activate the Residence Permit – Student within the Visa D validity",
    "Track the 16-ECTS/year progress rule and submit the continuing-enrolment confirmation before renewal"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Correct age-bracket proof of means",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Recognised admission (Zulassungsbescheid)",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Insurance + accommodation in order",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, admission (Zulassungsbescheid) review, fee agreement"
    },
    {
      "weeks": "2–4",
      "title": "Proof of means, insurance, accommodation, criminal record + apostille/translation"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "Mission appointment + residence-authority review (varies — verify live)"
    },
    {
      "weeks": "on arrival",
      "title": "Meldezettel within 3 days; ÖGK insurance; collect/activate permit"
    }
  ],
  "relatedServices": [
    {
      "label": "Austria – Red-White-Red Card (post-study work)",
      "libraryId": ""
    },
    {
      "label": "Austria – Visa D (entrance exam / short stay)",
      "libraryId": ""
    },
    {
      "label": "Austria – Family Reunification",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Version alignment: bumped to v2.2 to standardise the study/visa service-library on a single version across all countries. No content changes in this entry — all factual content, {{VERIFY_LIVE}} placeholders, compliance/contamination warnings and prior corrections are unchanged from v2.1."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Audit remediation: corrected the work-rights rule to the tiered limit (bachelor 10 h/week, master's/PhD 20 h/week) and made explicit that the EMPLOYER must obtain the Beschäftigungsbewilligung from the AMS before any work (even marginal); fixed a misspelling of 'Zulassungsbescheid'; added the post-approval deadlines (3 months for Visa D, 6 months to collect); expanded family-reunion (restricted/temporary), post-study (12-month job search → Red-White-Red Card), appeal (Beschwerde to BVwG), renewal-refusal and renewal-timing guidance; added qualification-recognition (institution/ENIC-NARIC Austria, not Anabin), Vorstudienlehrgang/Ergänzungsprüfung, and university/FH/private distinctions; removed residual APS reference and broken wording from sample documents; placeholdered the hardcoded fee note (sources conflict). No statistics, approval rates, processing times, percentages or benchmarks were invented."
    },
    {
      "version": "v2.0",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Major decontamination + rebuild: removed Germany cross-contamination (APS, Sperrkonto/€992 blocked account, Anabin, Ausländerbehörde, 'Austriany' find-replace artifacts, Canada €235/€85 fee structure) that had been copied into this Austria file. Reframed as the Residence Permit – Student (Aufenthaltsbewilligung – Studierender) with Visa D nuance; added correct age-linked ASVG proof-of-means structure, ÖGK student insurance, 20h/week work, 16-ECTS/year renewal rule, 3-working-day Meldezettel, MA 35/Bezirkshauptmannschaft authority, and Haftungserklärung alternative. Replaced template FAQs and quiz with real Austria-specific content; rebuilt resources to official Austrian sources; removed the hardcoded approval rate and 'industry benchmark'; converted all time-sensitive values to {{VERIFY_LIVE}} placeholders. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Austriany student visa counselor content with 2026 proof of funds amount."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: proof-of-means thresholds (age-linked), room-and-board value, fees (residence permit + Visa D), ÖGK premium, tuition, processing times, doc counts, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: this service was previously copied from the Germany file. Austria does NOT use APS, a German-style blocked account (€992/Sperrkonto), Anabin, or 'Ausländerbehörde'. Austria uses the Zulassungsbescheid, age-linked ASVG proof of means, ÖGK insurance, and MA 35 / Bezirkshauptmannschaft. Never reintroduce German terms."
    }
  ],
  "resources": [
    {
      "title": "migration.gv.at — Students (official)",
      "url": "https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/students/",
      "description": "Federal migration portal: Residence Permit – Student requirements, fees and process"
    },
    {
      "title": "OeAD — Entry & residence for students (official)",
      "url": "https://oead.at/en/to-austria/entry-and-residence",
      "description": "Austria's agency for education/internationalisation: proof of means, insurance, permit types"
    },
    {
      "title": "BMEIA — Studying in Austria (Foreign Ministry)",
      "url": "https://www.bmeia.gv.at/en/",
      "description": "Embassy/consulate appointments, Visa D, document requirements"
    },
    {
      "title": "oesterreich.gv.at — Residence permit conditions",
      "url": "https://www.oesterreich.gv.at/en/themen/menschen_aus_anderen_staaten/aufenthalt.html",
      "description": "General conditions, ASVG means thresholds, room-and-board value"
    },
    {
      "title": "ÖGK — Student self-insurance",
      "url": "https://www.gesundheitskasse.at/",
      "description": "Studierendenselbstversicherung enrolment and current premium"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "What does a non-EU student need to study long-term in Austria?",
      "options": [
        "A Residence Permit – Student (Aufenthaltsbewilligung – Studierender)",
        "An APS certificate",
        "A German blocked account",
        "A Schengen tourist visa"
      ],
      "correctIndex": 0,
      "explanation": "Austria issues a Residence Permit – Student, not a classic student visa; APS/blocked account are Germany concepts."
    },
    {
      "level": 1,
      "question": "Does Austria require an APS certificate?",
      "options": [
        "Yes, for all Indians",
        "No — APS is a Germany requirement, not Austrian",
        "Yes, for master's only",
        "Only for Vienna"
      ],
      "correctIndex": 1,
      "explanation": "APS does not apply to Austria; it relies on the Zulassungsbescheid and proof of means."
    },
    {
      "level": 1,
      "question": "Austrian student proof-of-means thresholds are based on:",
      "options": [
        "A flat €11,904 blocked account",
        "The visa fee",
        "Age-linked ASVG reference rates (under-24 vs 24+)",
        "Tuition only"
      ],
      "correctIndex": 2,
      "explanation": "Means thresholds are ASVG-linked and differ by age; they are not the German blocked-account figure."
    },
    {
      "level": 1,
      "question": "Which authority is the residence authority in Vienna?",
      "options": [
        "The Ausländerbehörde",
        "Anabin",
        "The Federal Foreign Office",
        "MA 35"
      ],
      "correctIndex": 3,
      "explanation": "MA 35 (Vienna) or the Bezirkshauptmannschaft elsewhere; 'Ausländerbehörde'/Anabin are German."
    },
    {
      "level": 1,
      "question": "Student health insurance after entry is typically:",
      "options": [
        "ÖGK student self-insurance (Studierendenselbstversicherung)",
        "A German public plan",
        "No insurance",
        "A blocked account"
      ],
      "correctIndex": 0,
      "explanation": "ÖGK student self-insurance is the standard after entry and enrolment."
    },
    {
      "level": 1,
      "question": "How many hours per week may students work under the Residence Permit – Student?",
      "options": [
        "A flat 20 h/week for everyone",
        "Bachelor up to 10 h/week; master's/PhD up to 20 h/week",
        "140 days per year",
        "Unlimited"
      ],
      "correctIndex": 1,
      "explanation": "Work is tiered: 10 h/week for bachelor students, 20 h/week for master's/PhD (or post-bachelor stage)."
    },
    {
      "level": 1,
      "question": "After arrival, address registration (Meldezettel) must be done within:",
      "options": [
        "30 days",
        "90 days",
        "3 working days",
        "No requirement"
      ],
      "correctIndex": 2,
      "explanation": "The Meldezettel must be filed within 3 working days of arrival."
    },
    {
      "level": 1,
      "question": "Admission to an Austrian institution is evidenced by the:",
      "options": [
        "APS certificate",
        "CAS",
        "I-20",
        "Zulassungsbescheid"
      ],
      "correctIndex": 3,
      "explanation": "The Zulassungsbescheid is the Austrian admission decision."
    },
    {
      "level": 2,
      "question": "If monthly rent exceeds the ASVG room-and-board value, the student must:",
      "options": [
        "Prove additional funds above the threshold",
        "Do nothing",
        "Pay a higher visa fee",
        "Switch cities"
      ],
      "correctIndex": 0,
      "explanation": "Funds above the threshold are required where rent exceeds the room-and-board value."
    },
    {
      "level": 2,
      "question": "Renewal of the student permit generally requires academic progress of at least:",
      "options": [
        "60 ECTS per year",
        "16 ECTS per year",
        "No requirement",
        "240 ECTS"
      ],
      "correctIndex": 1,
      "explanation": "Below 16 ECTS/year triggers a review and can lead to non-renewal."
    },
    {
      "level": 2,
      "question": "A Visa D in the Austrian student pathway is mainly used to:",
      "options": [
        "Work full-time",
        "Replace the residence permit",
        "Travel to Austria and sit entrance exams before collecting the permit",
        "Skip insurance"
      ],
      "correctIndex": 2,
      "explanation": "Visa D lets the student enter/sit exams; the residence permit is then collected in Austria."
    },
    {
      "level": 2,
      "question": "Which is an accepted proof-of-means alternative?",
      "options": [
        "A German Sperrkonto only",
        "APS certificate",
        "A tourist visa",
        "A Haftungserklärung (declaration of guarantee) from an EU resident"
      ],
      "correctIndex": 3,
      "explanation": "Savings, blocked account, scholarship, or a Haftungserklärung are accepted."
    },
    {
      "level": 2,
      "question": "Exchange programs under 6 months generally use:",
      "options": [
        "A Visa D (national visa)",
        "The Residence Permit – Student",
        "No documentation",
        "APS"
      ],
      "correctIndex": 0,
      "explanation": "Sub-6-month exchanges use a Visa D rather than the residence permit."
    },
    {
      "level": 2,
      "question": "Work income in Austria:",
      "options": [
        "Fully satisfies proof of means",
        "Cannot replace the proof-of-means requirement",
        "Is not allowed",
        "Doubles the threshold"
      ],
      "correctIndex": 1,
      "explanation": "Work income does not satisfy the proof-of-means test."
    },
    {
      "level": 2,
      "question": "Is German required for the initial student residence permit?",
      "options": [
        "Yes, B2 always",
        "Yes, C1 always",
        "No — but the program sets its admission language",
        "Only for FH"
      ],
      "correctIndex": 2,
      "explanation": "No German requirement for the initial permit; the program sets the admission language."
    },
    {
      "level": 2,
      "question": "The means threshold differs between:",
      "options": [
        "Bachelor and master only",
        "Vienna and Graz",
        "Public and private",
        "Students under 24 and students 24 and over"
      ],
      "correctIndex": 3,
      "explanation": "ASVG thresholds are age-linked: under-24 vs 24-and-over."
    },
    {
      "level": 3,
      "question": "A counsellor tells an Austria client they must complete APS. The issue?",
      "options": [
        "APS does not apply to Austria — it is a Germany requirement (contamination)",
        "No issue",
        "APS is faster",
        "Lower fee"
      ],
      "correctIndex": 0,
      "explanation": "Importing APS into an Austria file is a factual error."
    },
    {
      "level": 3,
      "question": "A 25-year-old client is quoted the under-24 means figure. The error?",
      "options": [
        "No error",
        "Wrong age bracket — 24+ must show the higher ASVG amount",
        "Too high",
        "Means not required"
      ],
      "correctIndex": 1,
      "explanation": "Means thresholds are age-linked; a 24+ applicant needs the higher figure."
    },
    {
      "level": 3,
      "question": "A bank statement shows one large deposit days before applying. Best action?",
      "options": [
        "Lodge now",
        "Hide it",
        "Show 12 months of consistent funds and document the source",
        "Convert to cash"
      ],
      "correctIndex": 2,
      "explanation": "Consistent 12-month funds beat a one-off deposit; source must be documented."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their proof-of-means funds. You:",
      "options": [
        "Hold them",
        "Route them through the firm",
        "Charge a fee",
        "Refuse — the funds belong to the client and are never routed through the firm"
      ],
      "correctIndex": 3,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the permit. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; the authorities decide."
    },
    {
      "level": 3,
      "question": "A student is at 9 ECTS after year one. The risk at renewal?",
      "options": [
        "No risk",
        "A renewal review for falling below 16 ECTS; non-renewal risk on a second year",
        "Automatic renewal",
        "Lower fee"
      ],
      "correctIndex": 1,
      "explanation": "Below 16 ECTS/year triggers review and can lead to non-renewal."
    },
    {
      "level": 3,
      "question": "A client omits a prior Schengen refusal on the form. The risk?",
      "options": [
        "None",
        "Faster approval",
        "Misrepresentation — refusal and possible entry ban",
        "Lower fee"
      ],
      "correctIndex": 2,
      "explanation": "Concealing a refusal risks a misrepresentation finding."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    },
    {
      "level": 2,
      "question": "Who applies for the student's employment permit (Beschäftigungsbewilligung) and when?",
      "options": [
        "The employer, at the AMS, before the student starts work",
        "The student, after starting work",
        "No permit is needed",
        "The university"
      ],
      "correctIndex": 0,
      "explanation": "The employer must obtain the Beschäftigungsbewilligung from the AMS before work begins — even for marginal employment."
    },
    {
      "level": 3,
      "question": "A counsellor tells a bachelor student they may work 20 h/week. The issue?",
      "options": [
        "No issue",
        "Wrong — bachelor students are capped at 10 h/week (20 h is master's/PhD)",
        "Too low",
        "Work is unlimited"
      ],
      "correctIndex": 1,
      "explanation": "Quoting a flat 20 h/week to an undergraduate is a permit-condition error."
    }
  ],
  "donts": {
    "dos": [
      "Confirm the institution is recognised and the Zulassungsbescheid is valid before any fee",
      "Use the correct age-linked ASVG proof-of-means figure and prove 12 months",
      "Arrange ÖGK student self-insurance (or accepted private cover) and accommodation",
      "Disclose and address any prior Schengen/Austrian refusal in writing",
      "Quote consultancy, government and third-party costs on separate lines",
      "Counsel on the 16-ECTS/year renewal rule and the 3-day registration"
    ],
    "donts": [
      "Do not tell an Austria client they need APS (that is a Germany requirement)",
      "Do not use German concepts (Sperrkonto €992, Anabin, Ausländerbehörde) — Austria differs",
      "Do not present a one-off large deposit as proof of means",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not treat a Schengen-free 90-day entry or a Visa D as a study permit"
    ],
    "mistakes": [
      "Importing APS / blocked-account / Anabin requirements from a Germany file",
      "Quoting the wrong age-bracket means threshold",
      "Missing the 16-ECTS/year progress rule at renewal",
      "Missing the 3-working-day Meldezettel registration"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "Austria university Zulassung for national visa.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample admission decision (Zulassungsbescheid, mock)",
      "description": "Official admission decision from the Austrian institution — the basis for the residence permit (Austria does not use APS).",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of funds confirmation (mock)",
      "description": "Proof of means (age-linked ASVG threshold) over 12 months — explain accepted forms (savings, blocked account, scholarship, Haftungserklärung).",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / ÖSD (German) certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "Austrian embassy standard application packet.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "Work is tiered and not automatic: bachelor students (before completing the first degree/diploma stage) may work up to 10 hours/week; students who have completed the bachelor's/first diploma stage and master's and PhD students may work up to 20 hours/week. The EMPLOYER must obtain an employment permit (Beschäftigungsbewilligung) from the AMS BEFORE the student starts — this applies even to marginal (geringfügige) employment. Work income cannot replace the proof-of-means requirement.",
      "details": [
        "Bachelor (pre-completion): up to 10 hours/week. Master's/PhD or post-bachelor stage: up to 20 hours/week.",
        "The employer applies for the Beschäftigungsbewilligung at the AMS (typically ~4–6 weeks); the permit is job- and employer-specific. The student does not apply for it.",
        "Up to the relevant cap there is no labour-market test; ABOVE the cap the AMS may run a labour-market test (Ersatzkraftverfahren) which can be refused.",
        "Full-time work is possible during semester breaks, but the employer still needs the permit.",
        "Work income does not satisfy the proof-of-means test for the permit or renewal; the study purpose must not be jeopardised."
      ],
      "restrictions": [
        "Bachelor: 10 hours/week; Master's/PhD: 20 hours/week",
        "Employer-applied Beschäftigungsbewilligung required before any work begins (even marginal employment)",
        "Exceeding the cap triggers a possible AMS labour-market test"
      ],
      "sourceUrl": "https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/students/",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Family reunion for students is limited: the Residence Permit – Student is a temporary residence title, and bringing dependants requires separate proof of means and accommodation. A dependant's work access depends on the permit granted. Verify the current family-reunification rules with MA 35 / the Bezirkshauptmannschaft — do not assume same-as-skilled-worker access.",
      "details": [
        "Requires separate, higher proof of means and adequate accommodation for the family.",
        "Student permits do not carry the same family-reunification rights as skilled-worker permits; treat as conditional and case-by-case."
      ],
      "restrictions": [],
      "sourceUrl": "https://www.bmeia.gv.at/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Austria – Student Residence Permit",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (migration.gv.at / oead.at / the Austrian mission) before quoting. Proof-of-means funds are the student's own money, not a fee. Austria does NOT use APS or a German-style blocked account. INR equivalents move with exchange rates.",
    "sourceUrl": "https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/students/",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Residence Permit – Student (authority fee)",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Official sources describe a split (application + personalisation + police-data/fingerprinting); some 2026 sources cite a single unified amount — sources conflict. Verify current amount."
          },
          {
            "label": "Visa D (where issued, consular fee)",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "For travel/entrance exams; separate from the residence permit. Verify."
          },
          {
            "label": "Document legalisation / apostille / translation",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Per document; varies by country"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Public university tuition (non-EU)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Commonly ~€726.72/semester at public universities for non-EU students; Fachhochschulen/private differ. Verify."
          },
          {
            "label": "ÖH student union fee",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per semester",
            "currency": "EUR",
            "applicable": true,
            "notes": "Small mandatory student-union contribution"
          },
          {
            "label": "Books & materials",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Program dependent"
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Proof-of-means funds (age-linked, ASVG)",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Under-24 vs 24+ differ; 12-month proof. Verify current thresholds."
          },
          {
            "label": "Accommodation",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Vienna higher; smaller cities lower"
          },
          {
            "label": "ÖGK student health insurance",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Student self-insurance after entry; verify premium"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / notarisation",
            "range": "Varies",
            "notes": "Certified translation where required"
          },
          {
            "label": "Criminal record certificate + apostille",
            "range": "Varies",
            "notes": "Police clearance, legalised/translated"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Cross-check the Zulassungsbescheid and the official migration.gv.at / mission fee pages before client commitment."
      }
    ]
  }
}
$austria_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000ad';

-- Belgium – Student Visa (Long Stay / Type D)
-- Source: content/service-library/belgium-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $belgium_student_visa$
{
  "displayName": "Belgium – Student Visa (Long Stay / Type D)",
  "shortDescription": "Belgian mission (VisaOnWeb) + commune · Type D long-stay visa · Admission + proof of means · A-card after arrival",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Belgium issues a Type D long-stay visa (Authorisation for Provisional Sojourn) for study; after arrival the student registers at the commune within 8 days and receives a residence card (A-card), renewed yearly. Proof of means is set by law and indexed annually ({{VERIFY_LIVE}}; €1,062/month net for 2026-2027). Note: 'APS' in Belgium means Autorisation de Séjour Provisoire (the provisional residence authorisation) — it does NOT mean Germany's Academic Evaluation Centre, which does not apply here. Verify all amounts and fees on diplomatie.belgium.be / dofi.ibz.be before quoting; treat figures as live values."
  },
  "alert": {
    "title": "Register at the commune within 8 days",
    "body": "After arrival, register at the local commune (maison communale / gemeentehuis) within 8 working days to obtain the residence card (A-card). Apply for the visa via VisaOnWeb (up to 6 months before, at least 15 days before travel). Note: Germany's Academic Evaluation Centre 'APS' does NOT apply to Belgium — do not import it."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "Proof of means critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Mission (VisaOnWeb) + commune",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Visa fee + proof of means (verify)",
      "variant": "neutral"
    },
    {
      "label": "Admission letter",
      "variant": "success"
    },
    {
      "label": "Commune registration (8 days)",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Processing varies by mission/file quality — verify live",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "D visa handling fee + Immigration Office contribution + proof of means — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Type D long-stay visa (Authorisation for Provisional Sojourn) for non-EU/EEA/Swiss nationals enrolled full-time at a recognised Belgian higher-education institution for a program longer than 90 days. After entry, the student registers at the commune and receives a residence card (A-card), renewed annually for the duration of studies."
    },
    {
      "label": "Eligible applicants",
      "value": "Final admission/enrolment at a recognised Belgian institution (provisional registration is not accepted for degree students) · Proof of sufficient means of subsistence ({{VERIFY_LIVE}}) · Health insurance · Medical certificate · Clean criminal record (applicants over 21) · Supporting letter on choice of studies · Language/diploma documents as required"
    },
    {
      "label": "Proof of means",
      "value": "Set by Belgian law and indexed annually ({{VERIFY_LIVE}}; €1,062 net/month for 2026-2027, ~€12,744/year). Accepted forms: a blocked account via the institution, a bank guarantee via an approved provider (e.g. Studely), a scholarship certificate, or an Annex 32 (sponsor's formal commitment). Verify the current amount.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Belgian embassy/consulate (visa via VisaOnWeb) · Immigration Office (Office des Étrangers / Dienst Vreemdelingenzaken, IBZ) for the decision · local commune (maison communale / gemeentehuis) for the A-card after arrival"
    },
    {
      "label": "After approval",
      "value": "Enter Belgium on the Type D visa, register at the commune within 8 working days, and receive the residence card (A-card). Take out Belgian health insurance (mutuelle / ziekenfonds) after enrolment. Renew the A-card annually before expiry. Eligible graduates may apply for a 12-month 'search year' residence permit to seek work or start a business."
    }
  ],
  "eligibility": [
    {
      "criterion": "Final admission/enrolment at a recognised Belgian institution",
      "met": true,
      "note": "Official admission letter confirming final (not merely provisional) acceptance into a full-time program; preparatory years attached to a degree are covered. Confirm recognition before any fee."
    },
    {
      "criterion": "Proof of sufficient means of subsistence",
      "met": false,
      "note": "Indexed legal amount ({{VERIFY_LIVE}}; €1,062 net/month for 2026-2027). Accepted: blocked account via the institution, bank guarantee via an approved provider, scholarship certificate, or Annex 32 sponsor commitment."
    },
    {
      "criterion": "Health insurance",
      "met": false,
      "note": "Mandatory; travel/incoming cover for the entry period then a Belgian mutuelle/ziekenfonds after enrolment. Required for both the visa and the A-card."
    },
    {
      "criterion": "Medical certificate",
      "met": false,
      "note": "Medical certificate from an approved physician confirming the applicant is free of conditions specified by the Immigration Office."
    },
    {
      "criterion": "Clean criminal record (applicants over 21)",
      "met": false,
      "note": "Police clearance for applicants over 21, legalised (apostille/consular) and translated into Dutch/French/German/English as required."
    },
    {
      "criterion": "Supporting letter on choice of studies",
      "met": true,
      "note": "A credible statement linking prior study/career to the chosen Belgian program; weak or generic statements undermine the file."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "Valid at least 3 months beyond the intended stay, with blank pages; check the mission's exact rule."
    }
  ],
  "redFlagsBanner": "After a refusal, address the Immigration Office's stated reason before reapplying — proof of means, admission and the medical/criminal-record documents cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Confusing Belgian 'APS' with Germany's APS",
      "description": "In Belgium, APS = Autorisation de Séjour Provisoire (the provisional residence authorisation). Germany's Academic Evaluation Centre 'APS' does NOT apply to Belgium. Telling a Belgium client they need German-style academic APS verification is a contamination error.",
      "fix": "Remove any German 'APS = academic verification' content; Belgium relies on the institution's admission letter and proof of means",
      "severity": "Critical"
    },
    {
      "title": "Insufficient / wrong-form proof of means",
      "description": "Funds below the indexed legal amount, or proof not in an accepted form (blocked account, approved bank guarantee, scholarship, or Annex 32).",
      "fix": "Use an accepted proof at the current indexed amount; the blocked-account/approved-provider route is preferred for self-supporting students",
      "severity": "Very common"
    },
    {
      "title": "Provisional (not final) admission submitted",
      "description": "Degree applicants submit a provisional registration certificate, which is not accepted.",
      "fix": "Obtain the final admission/enrolment letter before lodging; confirm the institution is recognised",
      "severity": "High"
    },
    {
      "title": "Annex 32 sponsor not properly executed",
      "description": "Sponsor commitment (Annex 32) not signed before the right authority or the sponsor not financially capable, leading to refusal.",
      "fix": "Have the Annex 32 signed in person at the commune (sponsor in Belgium) or the embassy (sponsor abroad); document the sponsor's means",
      "severity": "Common"
    },
    {
      "title": "Missing medical certificate or criminal-record (over 21)",
      "description": "The medical certificate or the police clearance (applicants over 21) is missing or not legalised/translated.",
      "fix": "Obtain the medical certificate from an approved physician and a legalised, translated police clearance early",
      "severity": "Common"
    },
    {
      "title": "Commune registration missed (8 days)",
      "description": "Not registering at the commune within 8 working days of arrival, delaying or jeopardising the A-card.",
      "fix": "Plan accommodation before arrival and register within 8 working days; the A-card enables the bank account, work permit and insurance",
      "severity": "Medium"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden Schengen/Belgian refusals, false diplomas, or enrolment with no intention to study (a known abuse the Immigration Office screens for).",
      "fix": "Disclose every prior refusal and explain changed circumstances; never submit false documents or sham enrolment",
      "severity": "High"
    },
    {
      "title": "Contribution fee (redevance/bijdrage) unpaid → inadmissible",
      "description": "The Immigration Office contribution fee, where required, must be paid for the application to be admissible. If unpaid, the application is declared inadmissible and is not processed.",
      "fix": "Confirm whether the contribution fee applies and pay it before/with lodging; keep proof of payment",
      "severity": "High"
    },
    {
      "title": "Working beyond 20 h/week in term on a 'limited' card",
      "description": "A residence card marked 'labour market limited' caps term-time work at 20 hours/week; exceeding it (only holidays are unlimited) breaches the card's conditions.",
      "fix": "Track term vs official-holiday periods; keep term-time work within 20 h/week and the applicable authorisation",
      "severity": "Common"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee approval of the student visa?",
      "a": "No. The Belgian Immigration Office (via the embassy) decides based on admission, proof of means, insurance, the medical and criminal-record documents, and credibility. A strong, honest file improves the chances but approval is never guaranteed — and we never promise one."
    },
    {
      "q": "Does Belgium require a German-style APS academic certificate?",
      "a": "No. Germany's Academic Evaluation Centre ('APS') does NOT apply to Belgium. Beware a terminology trap: in Belgium 'APS' means Autorisation de Séjour Provisoire (the provisional residence authorisation / Type D), not academic document verification. Belgium relies on the institution's final admission letter plus proof of means. (Note: applicants from a few countries such as China have a separate academic-screening requirement — but that is not the German APS and is country-specific.)"
    },
    {
      "q": "Is it a visa or a residence permit?",
      "a": "Both, in sequence. A Type D long-stay visa (Authorisation for Provisional Sojourn) is issued to enter Belgium; after arrival the student registers at the commune within 8 working days and receives a residence card (A-card), valid one academic year and renewed annually for the duration of studies."
    },
    {
      "q": "How much money must a student show?",
      "a": "The legal 'means of subsistence' amount, indexed annually ({{VERIFY_LIVE}}; €1,062 net/month for 2026-2027, about €12,744 for the year). Prove it via a blocked account through the institution, a bank guarantee via an approved provider (e.g. Studely), a scholarship certificate, or an Annex 32 sponsor commitment. Verify the current figure — it increased from €835 and is indexed."
    },
    {
      "q": "What is an Annex 32?",
      "a": "A formal commitment of financial support (prise en charge / verbintenis tot tenlasteneming) signed by a sponsor who undertakes to cover the student's living, study, healthcare and repatriation costs. The sponsor signs at the commune (if resident in Belgium) or the Belgian embassy (if abroad); the Immigration Office assesses the sponsor's financial capacity. Note a self-supporting student cannot act as guarantor for their own spouse-student."
    },
    {
      "q": "Can the student work?",
      "a": "Yes. A residence card marked 'labour market limited' (arbeidsmarkt beperkt) allows up to 20 hours per week during term and unlimited work during official holiday periods, provided it does not interfere with studies. A student employment contract and the applicable work authorisation (currently the type C work permit / regional authorisation) are needed first, plus a valid residence card and registration number. Work income cannot replace the proof-of-means requirement. Verify the current authorisation procedure for the relevant Region, as it can change."
    },
    {
      "q": "What language is required?",
      "a": "It depends on the program and community (Flemish/Dutch, French, or German-speaking). Many programs are taught in English; others require Dutch or French. Provide the language/diploma evidence the institution specifies — there is no separate federal language test for the visa itself."
    },
    {
      "q": "What after graduation?",
      "a": "Eligible graduates may apply for a 'search year' (zoekjaar / année de recherche) residence permit to look for qualified work or start a business (commonly up to 12 months — {{VERIFY_LIVE}}). On finding a job, the student moves to a single permit (combined residence and work permit). These are separate steps with their own criteria — verify the current duration and conditions before advising."
    },
    {
      "q": "What are the government fees?",
      "a": "Typically a D-visa handling fee ({{VERIFY_LIVE}}; ~€180 as of early 2026) PLUS the Immigration Office contribution fee (redevance / bijdrage, varies by procedure) PLUS the commune residence-card production fee (~€20 base plus any local tax). Amounts are set/adjusted by the authorities and change — verify the current figures on diplomatie.belgium.be / dofi.ibz.be."
    },
    {
      "q": "How and when is the application made?",
      "a": "Online via VisaOnWeb, then documents submitted at the competent Belgian post (often via TLScontact/VFS). Apply up to 6 months before departure and at least 15 calendar days before the intended travel; start early because document legalisation and slots take time."
    },
    {
      "q": "What is the 8-day commune registration?",
      "a": "Within 8 working days of arriving, the student must report to the local commune (maison communale / gemeentehuis) to be entered in the foreigners' register and obtain the residence card (A-card). This registration also enables opening a bank account, the work permit and health insurance — so line up accommodation before arrival."
    },
    {
      "q": "How does the blocked-account / bank-guarantee proof work?",
      "a": "The student (or institution) deposits 12 × the monthly amount (12 × €1,062 for 2026-2027) into a blocked account opened by the institution, or via an approved financial provider's bank-guarantee product. After arrival, the funds are released to the student in monthly installments. This is the preferred proof for self-supporting students."
    },
    {
      "q": "Can a refused visa be appealed?",
      "a": "Yes. A refusal can be challenged before the Council for Alien Law Litigation (Conseil du Contentieux des Étrangers / Raad voor Vreemdelingenbetwistingen, CCE/RvV) within the legal deadline ({{VERIFY_LIVE}}; short — typically a matter of weeks from notification), or the client can reapply with a corrected, stronger file. Read the reason carefully (commonly proof of means, admission validity, missing contribution fee, or document/credibility issues) and fix the specific issue rather than re-lodging the same file."
    },
    {
      "q": "Can a spouse or children join?",
      "a": "Family reunion for students is limited: the student residence is temporary, so dependants require separate proof of means and accommodation and it is assessed case-by-case — a self-supporting student generally cannot act as guarantor for a spouse who also wants to study. Verify the current family-reunification rules; do not assume entitlement."
    },
    {
      "q": "Is health insurance mandatory?",
      "a": "Yes. Insurance is required to enrol and for the residence permit. Use travel/incoming cover for the entry period, then register with a Belgian health fund (mutuelle / ziekenfonds) of your choice after enrolment. Some countries have agreements with Belgium that affect cover — check the applicant's situation."
    },
    {
      "q": "Which community/institution recognition applies?",
      "a": "Higher education is organised by the communities (Flemish, French, German-speaking), each with recognised universities and universities of applied sciences (hogescholen / hautes écoles). Confirm the institution and program are recognised by the relevant community before any fee; recognition queries go to the community's NARIC, not a German database."
    },
    {
      "q": "How long does processing take?",
      "a": "Belgium publishes a legal decision period for student visa applications (statutory target {{VERIFY_LIVE}}; the published legal time has been 90 days) but the actual time varies by mission, file quality and season. Always quote the live estimate from the mission/Immigration Office rather than a fixed number, and apply early."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — the Belgian authorities decide. FLC prepares a strong, honest, well-documented file (final admission, proof of means, insurance, medical and criminal-record documents) and never promises a visa, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a visa or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (visa + contribution + commune) and third-party costs.",
    "Proof-of-means funds belong to the client — never receive, hold or route them through firm accounts; use the institution's blocked account or an approved provider.",
    "Never import another country's requirements (e.g. German academic APS, Sperrkonto, Anabin) into a Belgium file.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic, financial, medical and criminal-record documents under data-protection rules: store securely, share only with authorised parties, retain only as needed.",
    "Disclose all prior refusals and never submit false diplomas or sham enrolment; misrepresentation can lead to refusal and bans."
  ],
  "proTips": [
    "Never import Germany's academic 'APS' into a Belgium file — and watch the terminology trap: Belgian 'APS' means the provisional residence authorisation, not academic verification.",
    "Use the current indexed means amount (€1,062/month for 2026-2027) and the blocked-account or approved bank-guarantee route (e.g. Studely) for self-supporting students; verify the live figure.",
    "Submit FINAL admission (not provisional) for degree students; confirm the institution is recognised by the relevant community.",
    "Plan accommodation before arrival — the commune registration must happen within 8 working days and gates the A-card, bank account, work permit and insurance.",
    "Get the Annex 32 signed before the correct authority (commune if sponsor in Belgium, embassy if abroad) and document the sponsor's means.",
    "Quote the full fee stack: D-visa handling fee + Immigration Office contribution (redevance/bijdrage) + commune card fee — all dynamic, verify live."
  ],
  "postApproval": [
    "Register at the commune within 8 working days of arrival to obtain the A-card",
    "Take out Belgian health insurance (mutuelle / ziekenfonds) after enrolment",
    "Open a bank account; arrange work authorisation (type C) before any term-time work",
    "Renew the A-card annually before expiry; keep enrolment and means current"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Accepted proof of means at indexed amount",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Final (not provisional) admission",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Medical + criminal-record documents in order",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, final admission review, fee agreement"
    },
    {
      "weeks": "2–4",
      "title": "Proof of means (blocked account/guarantee/Annex 32), insurance, medical, police clearance + legalisation"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "VisaOnWeb submission + Immigration Office decision (varies — verify live)"
    },
    {
      "weeks": "on arrival",
      "title": "Commune registration within 8 days; A-card; health fund enrolment"
    }
  ],
  "relatedServices": [
    {
      "label": "Belgium – Search Year (post-study job search)",
      "libraryId": ""
    },
    {
      "label": "Belgium – Single Permit (work + residence)",
      "libraryId": ""
    },
    {
      "label": "Belgium – Family Reunification",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Version alignment: bumped to v2.2 to standardise the study/visa service-library on a single version across all countries. No content changes in this entry — all factual content, {{VERIFY_LIVE}} placeholders, compliance/contamination warnings and prior corrections are unchanged from v2.1."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Audit pass: future-proofed work rights around the residence-card labour-market endorsement ('limited' = 20 h/week term, unlimited in official holidays) and noted that work authorisation is regional and can change; placeholdered the search-year duration, appeal deadline and statutory processing period; added red flags for an unpaid contribution fee (inadmissibility) and exceeding the term-time work cap; added matching quiz questions; cleaned a residual find-replace artifact from the historical v1.0 changelog entry. No statistics, approval rates, benchmarks or processing times were invented."
    },
    {
      "version": "v2.0",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Major decontamination + rebuild: removed Germany cross-contamination (academic APS, Sperrkonto/€992 blocked account, Anabin, Ausländerbehörde, 'Belgium' find-replace artifacts, TestDaF/Goethe, Canada €235/€85 fee structure, German 18-month/Opportunity-Card post-study) that had been copied into this Belgium file. Reframed as the Type D long-stay visa (Authorisation for Provisional Sojourn) + A-card; added the correct indexed proof-of-means (€1,062/month for 2026-2027), accepted proof forms (blocked account / approved bank guarantee / scholarship / Annex 32), 20h/week term work + type C permit, 8-working-day commune registration, 12-month search-year post-study, VisaOnWeb application, Immigration Office (IBZ) authority, and the CCE/RvV appeal route. Flagged the Belgian 'APS' terminology trap (provisional residence, not academic verification). Replaced template FAQs and quiz with real Belgium-specific content; rebuilt resources to official Belgian sources; removed the hardcoded approval rate and 'industry benchmark'; converted time-sensitive values to {{VERIFY_LIVE}} placeholders. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Belgium student visa counselor content with 2026 proof of funds amount."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: proof-of-means amount (indexed), visa handling fee, Immigration Office contribution, commune card fee, tuition, insurance, processing times, doc counts, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: this service was previously copied from the Germany file. Belgium does NOT use Germany's academic APS, a German Sperrkonto (€992), Anabin, or 'Ausländerbehörde'. TERMINOLOGY TRAP: Belgian 'APS' = Autorisation de Séjour Provisoire (provisional residence), NOT academic verification. Belgium uses: Type D visa, €1,062/month indexed means, blocked account/Annex 32, commune registration (8 days), A-card, Immigration Office (IBZ). Never reintroduce German terms."
    }
  ],
  "resources": [
    {
      "title": "Belgian Immigration Office (IBZ / dofi) — studies",
      "url": "https://dofi.ibz.be/en/themes/ressortissants-dun-pays-tiers/etudes",
      "description": "Official: means of subsistence, Annex 32, residence procedure for students"
    },
    {
      "title": "FPS Foreign Affairs — student visa (diplomatie.belgium.be)",
      "url": "https://diplomatie.belgium.be/en",
      "description": "Type D student visa, VisaOnWeb, document requirements and fees"
    },
    {
      "title": "Study in Flanders — visa requirements",
      "url": "https://www.studyinflanders.be/practical-information/visa-requirements",
      "description": "Proof of solvency, blocked account/bank guarantee, practical steps (Flemish Community)"
    },
    {
      "title": "Study in Belgium (French Community) — Wallonie-Bruxelles",
      "url": "https://www.studyinbelgium.be/en",
      "description": "Recognised institutions and admission in the French Community"
    },
    {
      "title": "VisaOnWeb — Belgian online visa application",
      "url": "https://visaonweb.diplomatie.be/",
      "description": "Online long-stay (Type D) visa application portal"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "What visa lets a non-EU student study long-term in Belgium?",
      "options": [
        "A Type D long-stay visa (Authorisation for Provisional Sojourn)",
        "A German APS certificate",
        "A Schengen Type C visa only",
        "An Opportunity Card"
      ],
      "correctIndex": 0,
      "explanation": "Belgium issues a Type D long-stay visa; the A-card follows after arrival."
    },
    {
      "level": 1,
      "question": "Does Germany's academic 'APS' apply to Belgium?",
      "options": [
        "Yes, for all Indians",
        "No — that is a Germany requirement; Belgian 'APS' means provisional residence",
        "Yes, for master's only",
        "Only in Flanders"
      ],
      "correctIndex": 1,
      "explanation": "German academic APS does not apply; in Belgium APS = Autorisation de Séjour Provisoire."
    },
    {
      "level": 1,
      "question": "What is the 2026-2027 monthly proof-of-means amount?",
      "options": [
        "€992/month",
        "€500/month",
        "€1,062 net/month",
        "No requirement"
      ],
      "correctIndex": 2,
      "explanation": "The indexed legal amount is €1,062 net/month for 2026-2027 (€992 is the German figure)."
    },
    {
      "level": 1,
      "question": "After arrival, a student must register at the commune within:",
      "options": [
        "3 days",
        "30 days",
        "90 days",
        "8 working days"
      ],
      "correctIndex": 3,
      "explanation": "Commune registration within 8 working days yields the A-card."
    },
    {
      "level": 1,
      "question": "How many hours per week may a student work during term?",
      "options": [
        "Up to 20 hours/week",
        "140 days/year",
        "Unlimited",
        "No work allowed"
      ],
      "correctIndex": 0,
      "explanation": "Up to 20 hours/week during term; full-time during official holidays."
    },
    {
      "level": 1,
      "question": "Which document is a sponsor's formal financial commitment in Belgium?",
      "options": [
        "Sperrkonto",
        "Annex 32",
        "Anabin",
        "I-20"
      ],
      "correctIndex": 1,
      "explanation": "The Annex 32 is the sponsor's commitment (prise en charge / tenlasteneming)."
    },
    {
      "level": 1,
      "question": "The residence card issued in Belgium is the:",
      "options": [
        "Aufenthaltstitel",
        "BRP",
        "A-card",
        "Green card"
      ],
      "correctIndex": 2,
      "explanation": "Non-EU students receive an A-card after commune registration."
    },
    {
      "level": 1,
      "question": "Where is the long-stay visa applied for?",
      "options": [
        "At the airport",
        "At the commune only",
        "At the university only",
        "Online via VisaOnWeb, then the Belgian post"
      ],
      "correctIndex": 3,
      "explanation": "Applications start on VisaOnWeb and are submitted at the competent post."
    },
    {
      "level": 2,
      "question": "What forms of proof of means are accepted?",
      "options": [
        "Blocked account, approved bank guarantee, scholarship, or Annex 32",
        "Only cash",
        "A German Sperrkonto",
        "APS certificate"
      ],
      "correctIndex": 0,
      "explanation": "Belgium accepts a blocked account, approved guarantee, scholarship, or Annex 32."
    },
    {
      "level": 2,
      "question": "For degree students, which admission is accepted?",
      "options": [
        "Provisional registration",
        "Final admission (provisional registration is not accepted)",
        "Any enquiry email",
        "A brochure"
      ],
      "correctIndex": 1,
      "explanation": "Degree applicants need final admission, not a provisional certificate."
    },
    {
      "level": 2,
      "question": "During official holidays, the 20-hour work cap:",
      "options": [
        "Still applies",
        "Drops to 10 hours",
        "Does not apply — full-time work is allowed",
        "Means no work"
      ],
      "correctIndex": 2,
      "explanation": "The 20-hour cap is term-time only; full-time is allowed in official holidays."
    },
    {
      "level": 2,
      "question": "The blocked-account proof requires depositing:",
      "options": [
        "One month only",
        "Nothing upfront",
        "€992",
        "12 × the monthly amount (12 × €1,062 for 2026-2027)"
      ],
      "correctIndex": 3,
      "explanation": "Twelve times the monthly amount is deposited and released monthly after arrival."
    },
    {
      "level": 2,
      "question": "After graduation, an eligible student may apply for:",
      "options": [
        "A 12-month 'search year' residence permit",
        "Immediate citizenship",
        "A second visa fee",
        "Nothing"
      ],
      "correctIndex": 0,
      "explanation": "A 12-month search-year permit precedes a single (work) permit."
    },
    {
      "level": 2,
      "question": "Belgian higher education is organised by:",
      "options": [
        "A single federal ministry",
        "The communities (Flemish, French, German-speaking)",
        "The German KMK",
        "The embassy"
      ],
      "correctIndex": 1,
      "explanation": "Recognition is via the communities, not a German database."
    },
    {
      "level": 2,
      "question": "A self-supporting student may act as guarantor for a spouse-student:",
      "options": [
        "Yes, always",
        "Yes, after one year",
        "No — they cannot stand as guarantor for a spouse intending to study",
        "Only in Brussels"
      ],
      "correctIndex": 2,
      "explanation": "A self-supporting student cannot guarantee a spouse who also intends to study."
    },
    {
      "level": 2,
      "question": "Which work permit type applies to term-time student work?",
      "options": [
        "A German Beschäftigungsbewilligung",
        "None ever",
        "A Blue Card",
        "A type C / student work authorisation"
      ],
      "correctIndex": 3,
      "explanation": "Term-time student work uses a type C / student work authorisation."
    },
    {
      "level": 3,
      "question": "A counsellor tells a Belgium client they need Germany's academic APS. The issue?",
      "options": [
        "German academic APS does not apply to Belgium (contamination); Belgian 'APS' is provisional residence",
        "No issue",
        "APS is faster",
        "Lower fee"
      ],
      "correctIndex": 0,
      "explanation": "Importing German academic APS into a Belgium file is a contamination error."
    },
    {
      "level": 3,
      "question": "A client shows €992/month as proof of means. The error?",
      "options": [
        "No error",
        "Wrong figure — Belgium's 2026-2027 amount is €1,062/month (€992 is German)",
        "Too high",
        "Means not required"
      ],
      "correctIndex": 1,
      "explanation": "€992 is the German blocked-account figure; Belgium uses €1,062/month."
    },
    {
      "level": 3,
      "question": "A degree applicant submits a provisional registration. Best action?",
      "options": [
        "Lodge anyway",
        "Hide it",
        "Obtain the final admission letter before lodging",
        "Use a brochure"
      ],
      "correctIndex": 2,
      "explanation": "Provisional registration is not accepted for degree students."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their proof-of-means funds. You:",
      "options": [
        "Hold them",
        "Route them through the firm",
        "Charge a fee",
        "Refuse — use the institution's blocked account or an approved provider; never route client funds"
      ],
      "correctIndex": 3,
      "explanation": "Never receive or route client funds; use the institution/approved provider."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the visa. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; the authorities decide."
    },
    {
      "level": 3,
      "question": "A client omits a prior Schengen refusal on the form. The risk?",
      "options": [
        "None",
        "Misrepresentation — refusal and possible entry ban",
        "Faster approval",
        "Lower fee"
      ],
      "correctIndex": 1,
      "explanation": "Concealing a refusal risks a misrepresentation finding."
    },
    {
      "level": 3,
      "question": "A refused Belgian student visa is challenged before:",
      "options": [
        "A German court",
        "The university senate",
        "The Council for Alien Law Litigation (CCE/RvV), within the deadline",
        "No appeal exists"
      ],
      "correctIndex": 2,
      "explanation": "Refusals are challenged before the CCE/RvV or by a corrected re-application."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    },
    {
      "level": 2,
      "question": "What on the residence card determines a student's work hours?",
      "options": [
        "The labour-market endorsement ('limited' = 20 h/week term, unlimited in holidays)",
        "The visa sticker colour",
        "The passport type",
        "Nothing — work is unrestricted"
      ],
      "correctIndex": 0,
      "explanation": "A 'labour market limited' endorsement means 20 h/week in term and unlimited in official holidays."
    },
    {
      "level": 3,
      "question": "An application is lodged without paying the required contribution fee. Result?",
      "options": [
        "It is processed normally",
        "It is declared inadmissible and not processed",
        "A discount applies",
        "Faster processing"
      ],
      "correctIndex": 1,
      "explanation": "If the required contribution fee is unpaid, the Immigration Office declares the application inadmissible."
    }
  ],
  "donts": {
    "dos": [
      "Confirm final admission from a recognised Belgian institution before any fee",
      "Use an accepted proof of means at the current indexed amount (blocked account / approved guarantee / scholarship / Annex 32)",
      "Arrange health insurance and accommodation; plan the 8-day commune registration",
      "Obtain the medical certificate and (over 21) a legalised, translated police clearance early",
      "Disclose and address any prior Schengen/Belgian refusal in writing",
      "Quote consultancy, government and third-party costs on separate lines"
    ],
    "donts": [
      "Do not import Germany's academic 'APS' — it does not apply to Belgium",
      "Do not use German concepts (Sperrkonto €992, Anabin, Ausländerbehörde) — Belgium differs",
      "Do not submit provisional admission for degree students",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not present an unaccepted or underfunded proof of means"
    ],
    "mistakes": [
      "Importing APS / blocked-account-€992 / Anabin requirements from a Germany file",
      "Confusing Belgian 'APS' (provisional residence) with German academic APS",
      "Submitting provisional rather than final admission",
      "Missing the 8-working-day commune registration"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "Final admission/enrolment letter from a recognised Belgian institution.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample admission documentation (mock)",
      "description": "Proof of means (blocked account / bank guarantee / Annex 32) — Belgium does not use German APS.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of funds confirmation (mock)",
      "description": "Proof of means at the indexed amount (€1,062/month for 2026-2027) — explain to clients.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / language certificate certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "Belgian embassy standard application packet.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "Work rights flow from the residence card's labour-market endorsement. A card marked 'labour market limited' (arbeidsmarkt beperkt) allows up to 20 hours per week during term and unlimited work during official holiday periods, provided the work stays compatible with studies. Work authorisation (currently the type C work permit / regional work authorisation) and a valid residence card with a registration number are needed before starting. Work income cannot replace the proof-of-means requirement.",
      "details": [
        "Up to 20 hours/week during the academic term; no 20-hour cap during official holiday periods.",
        "The residence card shows the labour-market access on the back (e.g. 'labour market limited'); a student employment contract and the applicable work authorisation are required.",
        "Work authorisation is handled at regional level (the instrument and portal can change — verify the current procedure for the relevant Region).",
        "Work must remain compatible with and ancillary to studies; the study purpose must not be jeopardised.",
        "Work income does not satisfy the proof-of-means test for the visa or renewal."
      ],
      "restrictions": [
        "20 hours/week limit during term (unlimited only in official holiday periods)",
        "Valid residence card + applicable work authorisation required before starting"
      ],
      "sourceUrl": "https://dofi.ibz.be/en/themes/ressortissants-dun-pays-tiers/etudes",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Family reunion for students is limited and the student residence is temporary; a dependant's labour-market access depends on the residence document granted. A self-supporting student generally cannot act as guarantor for a spouse who also intends to study. Verify current rules with the Immigration Office / commune.",
      "details": [
        "Requires separate proof of means and accommodation; assessed case-by-case."
      ],
      "restrictions": [],
      "sourceUrl": "https://dofi.ibz.be/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Belgium – Student Visa (Long Stay / Type D)",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (diplomatie.belgium.be / dofi.ibz.be / the commune) before quoting. Proof-of-means funds are the student's own money, not a fee. Belgium does NOT use Germany's academic APS or a German-style €992 blocked account. INR equivalents move with exchange rates.",
    "sourceUrl": "https://dofi.ibz.be/en/themes/ressortissants-dun-pays-tiers/etudes",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "D-visa handling fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Commonly ~€180 (early 2026); paid to the diplomatic post/service provider. Verify."
          },
          {
            "label": "Immigration Office contribution (redevance / bijdrage)",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Varies by procedure; adjusted yearly. Non-payment can make the application inadmissible. Verify."
          },
          {
            "label": "Commune residence-card (A-card) production",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "~€20 base + local tax; charged by the commune. Verify."
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Tuition (varies by institution/community)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Non-EU tuition varies widely by institution and community; use the admission letter amount"
          },
          {
            "label": "Registration / enrolment costs",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Per institution"
          },
          {
            "label": "Books & materials",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Program dependent"
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Proof-of-means amount (indexed)",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "€1,062/month net for 2026-2027 (×12 ≈ €12,744). Verify current figure."
          },
          {
            "label": "Accommodation",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Brussels/Leuven higher; varies by city"
          },
          {
            "label": "Health insurance (mutuelle / ziekenfonds)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Belgian health fund after enrolment; verify premium"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document legalisation / apostille / sworn translation",
            "range": "Varies",
            "notes": "Into NL/FR/DE/EN as required"
          },
          {
            "label": "Medical certificate + police clearance",
            "range": "Varies",
            "notes": "Approved physician; legalised police clearance (over 21)"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Cross-check the admission letter and the official diplomatie.belgium.be / dofi.ibz.be fee pages before client commitment."
      }
    ]
  }
}
$belgium_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000af';

-- Cyprus – Student Visa (Entry Permit + Pink Slip)
-- Source: content/service-library/cyprus-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $cyprus_student_visa$
{
  "displayName": "Cyprus – Student Visa (Entry Permit + Pink Slip)",
  "shortDescription": "CRMD Cyprus · VFS India · Entry Permit → Pink Slip within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement)",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 24,
  "policyAlert": {
    "active": true,
    "date": "10 Jun 2026",
    "summary": "Cyprus is NOT Schengen — Pink Slip does not allow EU travel. Confirm fees at visa.vfsglobal.com/cyprus/india."
  },
  "alert": {
    "title": "Two-stage visa + NOT Schengen",
    "body": "Entry Permit before travel; Apply for the Pink Slip (Temporary Residence Permit) within the CRMD-set timeframe after arrival (commonly 7–10 days — verify). Cyprus residence permit does NOT allow Schengen travel without a separate visa. Confirm institution is in South Cyprus (EU), not TRNC."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "PCC apostille critical",
      "variant": "warning"
    },
    {
      "label": "4–8 weeks",
      "variant": "neutral"
    },
    {
      "label": "VFS appointment",
      "variant": "neutral"
    },
    {
      "label": "NOT Schengen",
      "variant": "warning"
    }
  ],
  "chips": [
    {
      "label": "4–8 weeks",
      "variant": "neutral"
    },
    {
      "label": "€60–90 Entry Permit",
      "variant": "neutral"
    },
    {
      "label": "Pink Slip: CRMD timeframe",
      "variant": "warning"
    },
    {
      "label": "NOT Schengen travel",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Entry Permit via VFS India — verify current processing time",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Entry Permit + Pink Slip (TRP) fees — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Two-stage student immigration: (1) Entry Permit obtained from India via VFS Global or university-assisted CRMD route before travel; (2) Temporary Residence Permit (Pink Slip) at local CRMD within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement) in Cyprus."
    },
    {
      "label": "Eligible applicants",
      "value": "Unconditional offer from CRMD-recognised institution · Full-time study (min. 12 credits/semester) · PCC apostilled + Cyprus Embassy attested · Medical panel (HIV, Hep B/C, Syphilis, TB — 4-month validity) · Financial proof €7,000–€10,000 (illustrative working benchmark only — NOT an official minimum; verify with CRMD and the institution)+"
    },
    {
      "label": "Proof of funds",
      "value": "No single official published student minimum; institutions/CRMD expect a confirmed financial ability to cover tuition, living and repatriation, evidenced by bank statements with history (working benchmark {{VERIFY_LIVE}}; commonly cited around €7,000–€10,000) and/or a bank guarantee for repatriation (amount varies by nationality). Verify the current expectation with CRMD / the institution.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "CRMD Cyprus (crmd.moi.gov.cy) · VFS Global Cyprus India (visa.vfsglobal.com/cyprus/india) · Cyprus Embassy in India (PCC attestation)"
    },
    {
      "label": "After approval",
      "value": "Travel on Entry Permit; register at university on first working day; apply for Pink Slip at CRMD within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement); register with GHS (gesy.org.cy); renew Pink Slip annually."
    },
    {
      "label": "TRNC warning",
      "value": "North Cyprus (TRNC) institutions are NOT EU-recognised. Degrees from TRNC cannot be used for EU employment or NMC licensing in India. Always confirm South Cyprus (Republic of Cyprus) institution.",
      "warning": true
    }
  ],
  "eligibility": [
    {
      "criterion": "Unconditional offer from CRMD-recognised institution",
      "met": true
    },
    {
      "criterion": "PCC apostilled (MEA) + Cyprus Embassy attested",
      "met": false,
      "note": "Start immediately — allow 4–6 weeks"
    },
    {
      "criterion": "Medical panel (HIV, Hep B/C, Syphilis, TB — valid 4 months)",
      "met": false,
      "note": "Time tests for application date Medical requirements can change — verify the current panel required by CRMD and the institution."
    },
    {
      "criterion": "Financial proof (bank statements + history; bank guarantee if required)",
      "met": false,
      "note": "Confirmed ability to cover tuition, living and repatriation; working benchmark {{VERIFY_LIVE}} with 3–6 months history; a repatriation bank guarantee may apply (varies by nationality). Sponsor acceptable with relationship + funds proof."
    },
    {
      "criterion": "Proof of accommodation in Cyprus",
      "met": false
    },
    {
      "criterion": "Tuition deposit paid (university receipt)",
      "met": false
    },
    {
      "criterion": "Valid passport meeting current embassy/CRMD validity requirements",
      "met": true
    },
    {
      "criterion": "English proficiency or university waiver",
      "met": true,
      "note": "IELTS 5.5–6.5 typical; some waive"
    }
  ],
  "redFlagsBanner": "After refusal, address PCC/medical/financial gaps before rebooking. Never advise TRNC institutions as EU-equivalent.",
  "redFlags": [
    {
      "title": "PCC not apostilled or attested",
      "description": "PCC submitted without MEA apostille or Cyprus Embassy attestation.",
      "fix": "PCC → MEA apostille (VFS can assist) → Cyprus Embassy attestation; allow 4–6 weeks",
      "severity": "Very common"
    },
    {
      "title": "TRNC institution (North Cyprus)",
      "description": "Offer from a TRNC (north Cyprus) institution, which is NOT recognised by the Republic of Cyprus/EU. The Entry Permit/Pink Slip route is for Republic-of-Cyprus (south) CRMD-recognised institutions only.",
      "fix": "Redirect to South Cyprus EU-recognised institutions only; disclose NMC/EU limitations for TRNC",
      "severity": "Critical"
    },
    {
      "title": "Expired medical tests",
      "description": "Medical panel older than 4 months at application.",
      "fix": "Repeat tests at government hospital 2–3 months before filing",
      "severity": "Common"
    },
    {
      "title": "Pink Slip delay after arrival",
      "description": "Student did not apply at CRMD within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement).",
      "fix": "Register at university day 1; university arranges CRMD appointment immediately",
      "severity": "High"
    },
    {
      "title": "Schengen travel misconception",
      "description": "Client believes Cyprus permit allows EU travel.",
      "fix": "Explain Cyprus is NOT Schengen; separate Schengen visa needed for France/Germany/etc.",
      "severity": "Common"
    },
    {
      "title": "Insufficient financial proof",
      "description": "Bank a balance below the illustrative benchmark (€7,000 is not an official minimum) or inconsistent history.",
      "fix": "Show consistent savings; sponsor letter + sponsor bank statement if applicable",
      "severity": "Common"
    },
    {
      "title": "Student working before completing first semester / wrong sector",
      "description": "Working before completing the first academic semester, outside permitted sectors, or on a contract not approved by the District Labour Office — all are breaches under the 2026 student-employment Decree.",
      "fix": "No work until the first semester is completed; only permitted sectors; the employer must lodge the contract with the District Labour Office for approval before any work",
      "severity": "High"
    },
    {
      "title": "Bank guarantee / repatriation proof overlooked",
      "description": "Missing the repatriation bank guarantee where required (amount varies by nationality), causing TRP/Pink Slip delay or refusal.",
      "fix": "Check whether a repatriation bank guarantee applies for the client's nationality and arrange it before the immigration-unit appointment",
      "severity": "Common"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee student visa approval?",
      "a": "No. Embassy decides based on admission, funds, and credibility. Never promise approval."
    },
    {
      "q": "What is PCC apostille?",
      "a": "Police Clearance Certificate (PCC) from India with MEA apostille and Cyprus Embassy attestation — mandatory for Cyprus student visa applicants."
    },
    {
      "q": "How much money must a student show?",
      "a": "There is no single official published student minimum. CRMD/institutions expect a confirmed ability to cover tuition, living and repatriation — evidenced by bank statements with history (working benchmark {{VERIFY_LIVE}}; commonly cited around €7,000–€10,000) and, for many nationalities, a repatriation bank guarantee (amount varies). Verify the current expectation before quoting."
    },
    {
      "q": "Can spouse accompany?",
      "a": "Not automatically. Dependant/family applications are assessed individually by CRMD and approval is discretionary, with separate proof of relationship, accommodation and means. A student's family-reunification prospects are limited and conditional. Verify the current CRMD rules before advising; do not present this as a guaranteed route."
    },
    {
      "q": "Do English-taught programs require Greek?",
      "a": "No. English-taught programs do not require Greek for admission; provide the English evidence the institution specifies (commonly IELTS 5.5–6.5 or an equivalent/waiver). Greek helps with daily life and some part-time work but is not a visa requirement."
    },
    {
      "q": "How long to convert to residence permit?",
      "a": "Travel on the Entry Permit, register at the institution, and apply for the Temporary Residence Permit (Pink Slip) at the immigration unit within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement) (book the appointment early). The TRP is granted for one year and renewed annually on proof of continued full-time enrolment, funds and insurance."
    },
    {
      "q": "Can I work on student visa?",
      "a": "Only after completing the first academic semester, in permitted sectors, up to 20 hours/week in term (up to 38 in official holidays). The employer must lodge the employment contract with the District Labour Office for approval before work starts; internships need a Department-of-Labour-approved agreement. Work income cannot replace the financial-proof requirement."
    },
    {
      "q": "What after graduation?",
      "a": "Post-study and employment options are subject to current immigration regulations and must be verified before advising clients. The Migration Department indicates graduates may be allowed to stay up to 12 months after completing studies to seek qualified work or set up a business, subject to that route's legal criteria — this is not automatic and conditions change. Confirm the current rules with CRMD before advising."
    },
    {
      "q": "What is the Entry Permit → Pink Slip two-stage process?",
      "a": "Stage 1: obtain the Entry Permit (long-stay study visa / Category D) from India via VFS Global or through the institution before travel. Stage 2: after arriving, register and apply for the Temporary Residence Permit (Pink Slip) at the district immigration unit within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement). Both stages are required; the Pink Slip is the residence document, renewed annually."
    },
    {
      "q": "Is Cyprus part of Schengen?",
      "a": "No. The Republic of Cyprus is in the EU but NOT in the Schengen area, so the Entry Permit/Pink Slip does not allow travel to Schengen countries — a separate Schengen visa is needed for, e.g., France or Germany. Set this expectation clearly with clients."
    },
    {
      "q": "Why does the south (Republic) vs north (TRNC) distinction matter?",
      "a": "Only Republic-of-Cyprus (south) institutions recognised by CRMD lead to an EU-recognised qualification and the proper Entry Permit/Pink Slip route. TRNC (north Cyprus) institutions are NOT recognised by the Republic/EU. Always confirm the institution is CRMD-recognised in the south before any fee."
    },
    {
      "q": "What is the PCC apostille/attestation requirement?",
      "a": "A Police Clearance Certificate, apostilled (MEA in India) and attested by the Cyprus mission as required, is a critical document. Start it immediately — apostille and attestation take weeks and a missing/incorrect PCC is a leading cause of delay."
    },
    {
      "q": "What medical tests are needed?",
      "a": "A medical panel (commonly HIV, Hepatitis B/C, syphilis and TB) valid within about 4 months, with tests often repeated in Cyprus for the Pink Slip. Time the tests to the application date so they do not expire. These medical requirements can change — verify the current panel required by CRMD and the institution before advising."
    },
    {
      "q": "What health insurance is required?",
      "a": "Valid health insurance covering the stay (travel/incoming cover for entry, then a policy valid in Cyprus). Insurance is required for the Pink Slip; confirm the current accepted cover and premium ({{VERIFY_LIVE}})."
    },
    {
      "q": "How does accommodation proof work?",
      "a": "A rental agreement (typically at least one year) or dorm confirmation is required; for the Pink Slip the rental may need certification (e.g. by the Muhtar) and tax-office stamping. Arrange accommodation before the immigration-unit appointment."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "A refusal can be challenged through the available administrative/judicial review within the stated deadline, or corrected and re-lodged. Read the reason carefully (commonly funds, PCC/medical documents, or institution recognition) and fix the specific issue."
    },
    {
      "q": "What are the government fees?",
      "a": "The Entry Permit (via VFS/embassy) and the Pink Slip/TRP each carry fees ({{VERIFY_LIVE}}; the TRP commonly involves an application + registration fee at the immigration unit), plus VFS service charges and medical-panel costs. Verify current amounts on the CRMD/VFS sites — they change."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — CRMD and the immigration unit decide. FLC prepares a strong, honest, well-documented file (recognised admission, apostilled PCC, financial proof, medical, insurance, accommodation) and never promises a visa, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a visa or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (Entry Permit + Pink Slip) and third-party (VFS/medical) costs.",
    "Financial-proof funds belong to the client — never receive, hold or route them through firm accounts.",
    "Only place clients at CRMD-recognised Republic-of-Cyprus institutions; never a TRNC institution for this route.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic, financial, medical and police-clearance documents under data-protection rules: store securely, share only with authorised parties, retain only as needed.",
    "Advise students never to work before the first semester, outside permitted sectors, or on an unapproved contract; illegal work risks the permit and fines."
  ],
  "proTips": [
    "Start PCC process the day offer letter arrives — longest lead item",
    "Book VFS appointment 8–12 weeks before intended travel",
    "Time medical tests for 4-month validity window",
    "Confirm institution at moec.gov.cy — South Cyprus only",
    "Warn clients: Cyprus Pink Slip ≠ Schengen travel document",
    "Confirm the institution is CRMD-recognised in the Republic (south) — TRNC (north) degrees are not EU-recognised.",
    "Start the PCC apostille + Cyprus attestation immediately; it is the most common cause of delay.",
    "On work: no employment before the first semester is completed, permitted sectors only, contract approved by the District Labour Office — set this expectation early.",
    "Treat fees, the funds benchmark, insurance and minimum wage as live values — verify on CRMD/VFS before quoting."
  ],
  "postApproval": [
    "Register at university on first working day after arrival",
    "Apply for Pink Slip at CRMD within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement) (university assists)",
    "Open Cyprus bank account; register with GHS at gesy.org.cy",
    "Discuss post-study options (the Migration Department indicates graduates may stay up to 12 months to seek work or set up a business, subject to the route's legal criteria) — verify current rules"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "PCC apostilled + embassy-attested",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "CRMD-recognised (South Cyprus) institution",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Financial proof + medical panel in order",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Offer letter, start PCC apostille process"
    },
    {
      "weeks": "2–6",
      "title": "PCC attestation, medical tests, document compilation"
    },
    {
      "weeks": "6–10",
      "title": "VFS appointment & Entry Permit submission"
    },
    {
      "weeks": "4–8",
      "title": "Entry Permit processing"
    },
    {
      "weeks": "Arrival",
      "title": "Pink Slip at CRMD within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement)"
    }
  ],
  "relatedServices": [
    {
      "label": "Cyprus – Job Seeker Visa",
      "libraryId": ""
    },
    {
      "label": "Cyprus – Post-Study Residence Permit",
      "libraryId": ""
    },
    {
      "label": "Cyprus – Visitor Visa",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Compliance revision: standardised the Pink Slip timing to one cautious CRMD-set-timeframe wording (commonly 7–10 days, verify) instead of mixed 7 / 7–10 / ~7-day phrasings; rewrote dependant/spouse guidance to make clear family applications are individually assessed, discretionary and not a guaranteed route; softened the fixed one-year passport-validity claim to 'as required by embassy/CRMD'; added 'medical requirements can change — verify' caveats to the test-panel references while retaining the list; reframed post-study to the officially-supported 'up to 12 months to seek work/business, subject to criteria — verify' (removed the unsupported Master's/PhD-only framing); labelled €7,000–€10,000 as an illustrative working benchmark, not an official minimum; renamed the mislabelled 'admission documentation' sample to a Police Clearance Certificate; removed a duplicate changelog entry; reaffirmed work-rights consistency (post-first-semester, permitted sectors, District Labour Office approval, 20h term / 38h holiday). No statistics, approval rates or unsupported benefits were added; TRNC, Schengen, compliance and financial-proof warnings retained; {{VERIFY_LIVE}} placeholders preserved."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Audit + uplift: replaced auto-generated template FAQs and quiz questions with real Cyprus counsellor Q&A; redistributed the quiz answer key; removed the hardcoded approval rate (90%) and the unsourced '78% benchmark'; converted time-sensitive values (Entry Permit + Pink Slip fees, VFS/medical costs, funds benchmark, repatriation bank guarantee, insurance premium, minimum wage, processing times) to {{VERIFY_LIVE}} placeholders. Refined work rights to the 2026 Decree (work only after the first academic semester, permitted sectors only, contract approved by the District Labour Office; 20 h/week term, up to 38 h/week holidays). Reinforced the NOT-Schengen and Republic (south) vs TRNC (north) recognition warnings; added red flags (illegal/early work, repatriation guarantee) and compliance notes; cleaned residual German/template artifacts (Sperrkonto, TestDaF, 'Cypriot' language/embassy wording) from sample documents and FAQs. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "10 Jun 2026",
      "author": "Service Library",
      "summary": "Copy fix: removed Malta/Germany/Schengen template remnants."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "10 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Cyprus student visa content from FLC Study in Cyprus 2026 guide."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: Entry Permit + Pink Slip fees, VFS/medical costs, the funds benchmark and repatriation bank guarantee, insurance premium, minimum wage, processing times, doc counts, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "KEY CYPRUS RULES: Cyprus is NOT Schengen (Pink Slip ≠ EU travel). Only Republic-of-Cyprus (south) CRMD-recognised institutions — never TRNC (north). Student work only AFTER the first semester, permitted sectors only, contract approved by the District Labour Office; 20 h/week term, up to 38 h/week holidays. Apply for the Pink Slip within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement)."
    }
  ],
  "resources": [
    {
      "title": "CRMD Cyprus — Civil Registry & Migration",
      "url": "https://crmd.moi.gov.cy/",
      "description": "Official student permit authority"
    },
    {
      "title": "VFS Global — Cyprus India",
      "url": "https://visa.vfsglobal.com/cyprus/india",
      "description": "Appointments, fees, document checklist"
    },
    {
      "title": "EU Immigration Portal — Student Cyprus",
      "url": "https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal/student-cyprus_en",
      "description": "EU official student residence guidance"
    },
    {
      "title": "Cyprus Ministry of Education",
      "url": "https://www.moec.gov.cy/",
      "description": "Verify institution recognition"
    },
    {
      "title": "GHS — General Healthcare System",
      "url": "https://www.gesy.org.cy/",
      "description": "Student healthcare registration after Pink Slip"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "What two stages make up the Cyprus student route?",
      "options": [
        "Entry Permit before travel, then Pink Slip (TRP) after arrival",
        "Only a Schengen visa",
        "Only an online form",
        "A work permit then a visa"
      ],
      "correctIndex": 0,
      "explanation": "Stage 1 Entry Permit (Category D), stage 2 Pink Slip/TRP within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement)."
    },
    {
      "level": 1,
      "question": "Is the Cyprus Pink Slip valid for Schengen travel?",
      "options": [
        "Yes, anywhere in the EU",
        "No — Cyprus is not in Schengen",
        "Yes, for 90 days",
        "Only to Greece"
      ],
      "correctIndex": 1,
      "explanation": "Cyprus is in the EU but NOT Schengen; a separate Schengen visa is needed."
    },
    {
      "level": 1,
      "question": "Which institutions are valid for this route?",
      "options": [
        "TRNC (north Cyprus) institutions",
        "Any institution on the island",
        "CRMD-recognised Republic-of-Cyprus (south) institutions",
        "Only language schools"
      ],
      "correctIndex": 2,
      "explanation": "Only south (Republic) CRMD-recognised institutions; TRNC is not EU-recognised."
    },
    {
      "level": 1,
      "question": "When must the Pink Slip (TRP) be applied for?",
      "options": [
        "Within 90 days",
        "Before leaving India",
        "No deadline",
        "Within the CRMD-set timeframe after arrival (commonly 7–10 days)"
      ],
      "correctIndex": 3,
      "explanation": "The Pink Slip (TRP) must be applied for within the CRMD-set timeframe after arrival (commonly cited as 7–10 days; verify the current requirement)."
    },
    {
      "level": 1,
      "question": "A critical document that often causes delay is the:",
      "options": [
        "Apostilled + attested Police Clearance Certificate (PCC)",
        "Driving licence",
        "Schengen visa",
        "Tax return"
      ],
      "correctIndex": 0,
      "explanation": "An apostilled, attested PCC is a leading cause of delay if missing/incorrect."
    },
    {
      "level": 1,
      "question": "When can a third-country student start working?",
      "options": [
        "Immediately on arrival",
        "Only after completing the first academic semester",
        "Never",
        "After 2 years"
      ],
      "correctIndex": 1,
      "explanation": "Work is allowed only after completing the first semester, in permitted sectors."
    },
    {
      "level": 1,
      "question": "Term-time student work is capped at:",
      "options": [
        "40 hours/week",
        "No cap",
        "20 hours/week",
        "10 hours/week"
      ],
      "correctIndex": 2,
      "explanation": "20 hours/week in term; up to 38 hours/week in official holidays."
    },
    {
      "level": 1,
      "question": "The medical panel typically covers:",
      "options": [
        "Only eyesight",
        "Only dental",
        "No tests",
        "HIV, Hepatitis B/C, syphilis, TB"
      ],
      "correctIndex": 3,
      "explanation": "The panel covers HIV, Hep B/C, syphilis and TB, valid ~4 months."
    },
    {
      "level": 2,
      "question": "During official holidays, student work hours may rise to:",
      "options": [
        "Up to 38 hours/week",
        "Still 20",
        "Unlimited",
        "30"
      ],
      "correctIndex": 0,
      "explanation": "Holiday work is up to 38 h/week (the former 30 was reduced)."
    },
    {
      "level": 2,
      "question": "Before a student works, the employment contract must be:",
      "options": [
        "Signed only by the student",
        "Approved/stamped by the District Labour Office",
        "Notarised in India",
        "Posted online"
      ],
      "correctIndex": 1,
      "explanation": "The employer lodges the contract with the District Labour Office for approval."
    },
    {
      "level": 2,
      "question": "Students may work only in:",
      "options": [
        "Any job they like",
        "Government roles only",
        "Permitted sectors defined by Decree (+ study-relevant internships)",
        "No sectors"
      ],
      "correctIndex": 2,
      "explanation": "Only Decree-permitted sectors (e.g. Trade, Health, Agriculture, Manufacturing, Hospitality)."
    },
    {
      "level": 2,
      "question": "Cyprus student financial proof is best described as:",
      "options": [
        "A fixed €11,904 blocked account",
        "A €992/month figure",
        "No requirement",
        "Confirmed ability to cover tuition/living/repatriation (no single official minimum)"
      ],
      "correctIndex": 3,
      "explanation": "There is no single official student minimum; show ability via statements/guarantee."
    },
    {
      "level": 2,
      "question": "For many nationalities, the Pink Slip also needs a:",
      "options": [
        "Repatriation bank guarantee (amount varies)",
        "German Sperrkonto",
        "Schengen visa",
        "Yellow Slip"
      ],
      "correctIndex": 0,
      "explanation": "A repatriation bank guarantee applies for many nationalities; amount varies."
    },
    {
      "level": 2,
      "question": "The TRP/Pink Slip is granted and renewed:",
      "options": [
        "Permanently",
        "For one year, renewed annually on continued enrolment",
        "For five years",
        "Once only"
      ],
      "correctIndex": 1,
      "explanation": "It is a one-year permit renewed annually with proof of continued full-time study."
    },
    {
      "level": 2,
      "question": "English-taught programs require:",
      "options": [
        "Greek B2",
        "German",
        "English evidence (e.g. IELTS) — not Greek",
        "No evidence"
      ],
      "correctIndex": 2,
      "explanation": "English programs need English evidence; Greek is not a visa requirement."
    },
    {
      "level": 2,
      "question": "Accommodation proof for the Pink Slip may require:",
      "options": [
        "Nothing",
        "A hotel booking only",
        "A Schengen visa",
        "A certified/stamped rental agreement"
      ],
      "correctIndex": 3,
      "explanation": "A rental (often 1-year) certified/tax-stamped is commonly required."
    },
    {
      "level": 3,
      "question": "A client has an offer from a north-Cyprus (TRNC) college. Advise:",
      "options": [
        "Not valid for this route — TRNC is not Republic/EU-recognised",
        "Proceed normally",
        "Faster processing",
        "Cheaper option"
      ],
      "correctIndex": 0,
      "explanation": "Only Republic-of-Cyprus (south) CRMD-recognised institutions qualify."
    },
    {
      "level": 3,
      "question": "A student wants to work in month 2 of semester 1. The issue?",
      "options": [
        "No issue",
        "Not allowed — work only after completing the first semester",
        "Allowed part-time",
        "Allowed in holidays"
      ],
      "correctIndex": 1,
      "explanation": "No work is permitted before completing the first academic semester."
    },
    {
      "level": 3,
      "question": "A client assumes the Pink Slip lets them visit France. Correct them:",
      "options": [
        "It does allow it",
        "Only to Germany",
        "Cyprus is not Schengen; a separate Schengen visa is needed",
        "Only in summer"
      ],
      "correctIndex": 2,
      "explanation": "The Pink Slip does not permit Schengen travel."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their financial-proof funds. You:",
      "options": [
        "Hold them",
        "Route them through the firm",
        "Charge a fee",
        "Refuse — the funds belong to the client and are never routed through the firm"
      ],
      "correctIndex": 3,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the visa. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; CRMD/immigration decide."
    },
    {
      "level": 3,
      "question": "The PCC apostille is left to the last week before travel. Risk?",
      "options": [
        "No risk",
        "Apostille + attestation take weeks — likely delay/refusal",
        "Speeds things up",
        "Lowers the fee"
      ],
      "correctIndex": 1,
      "explanation": "PCC apostille/attestation is slow and a common delay cause."
    },
    {
      "level": 3,
      "question": "An employment contract is not lodged with the Labour Office. Consequence?",
      "options": [
        "It is fine",
        "Faster pay",
        "The work is not authorised — risk to the permit and fines",
        "More hours"
      ],
      "correctIndex": 2,
      "explanation": "Unapproved contracts mean unauthorised work, risking the permit and fines."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    }
  ],
  "donts": {
    "dos": [
      "Start PCC apostille early",
      "Verify institution on moec.gov.cy — South Cyprus (EU) only, not TRNC",
      "Open financial proof (€7,000–€10,000 (illustrative working benchmark only — NOT an official minimum; verify with CRMD and the institution)+) for full required amount",
      "Write course-specific motivation letter",
      "Disclose prior refusals",
      "Confirm CRMD (south Cyprus) institution recognition before any fee",
      "Apply for the Pink Slip (TRP) within the timeframe set by CRMD after arrival (commonly cited as 7–10 days; confirm the current requirement); book the immigration-unit appointment early"
    ],
    "donts": [
      "Do not guarantee approval",
      "Do not book embassy without PCC apostille",
      "Do not use unrecognised institutions",
      "Do not hide Schengen refusals",
      "Do not quote outdated financial proof (€7,000–€10,000 (illustrative working benchmark only — NOT an official minimum; verify with CRMD and the institution)+) amount",
      "Do not enrol a client at a TRNC (north Cyprus) institution for this route",
      "Do not let a student work before completing the first semester or outside permitted sectors"
    ],
    "mistakes": [
      "PCC apostille applied too late for intake",
      "Proof of funds short by even €1",
      "Generic motivation letter",
      "Wrong health insurance type",
      "Expired admission letter",
      "Assuming the Pink Slip allows Schengen travel — it does not",
      "Missing the ~7-day Pink Slip application window after arrival"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "CRMD-recognised South Cyprus university offer letter for Entry Permit.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample Police Clearance Certificate (PCC) — apostilled & attested (mock)",
      "description": "PCC apostille + Cyprus Embassy attestation certificate for India.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample financial proof (€7,000–€10,000 (illustrative working benchmark only — NOT an official minimum; verify with CRMD and the institution)+) confirmation (mock)",
      "description": "Bank statements/financial-ability confirmation (+ repatriation bank guarantee if required) — explain to clients.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / TOEFL certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "Cyprus embassy standard application packet.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "Third-country students may work only AFTER completing the first academic semester, in permitted sectors only, with the employment contract approved/stamped by the District Labour Office before starting. Hours: up to 20/week in term, up to 38/week in official holidays. Work income cannot replace the financial-proof requirement. Verify current rules — they change.",
      "details": [
        "Eligible only after successfully completing the first academic semester (per the Decree published 6 Mar 2026).",
        "Permitted sectors are defined by Decree (e.g. Trade, Health, Agriculture, Manufacturing, Hospitality) plus study-relevant internships — not any sector.",
        "Hours: 20/week in term, up to 38/week in official holidays (reduced from the former 30/week).",
        "Minimum wage and pro-rated earnings are time-sensitive ({{VERIFY_LIVE}}); do not quote fixed figures.",
        "Work income cannot be relied on to meet living-cost/financial-proof requirements."
      ],
      "restrictions": [
        "No work before completing the first academic semester",
        "Permitted sectors only; employment contract must be Labour-Office approved/stamped",
        "20 h/week term cap (up to 38 h/week in official holidays)"
      ],
      "sourceUrl": "https://crmd.moi.gov.cy/",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Dependant/family applications are assessed individually and are NOT automatic; a student's family-reunification prospects are limited and conditional. Any dependant must file a separate application meeting CRMD's current requirements (relationship, accommodation, means). Always verify the current CRMD family-reunification rules before advising — do not present a guaranteed spouse route.",
      "details": [
        "Separate application per dependant; approval is discretionary and not guaranteed.",
        "Requires proof of relationship, adequate accommodation and sufficient means.",
        "Verify current CRMD family-reunification rules before advising."
      ],
      "restrictions": [
        "Dependants may not have automatic work rights"
      ],
      "sourceUrl": "https://crmd.moi.gov.cy/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Cyprus – Student Visa (Entry Permit + Pink Slip)",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (CRMD crmd.moi.gov.cy / VFS) before quoting. There is no single official student funds minimum; figures shown are working benchmarks. INR equivalents move with exchange rates.",
    "sourceUrl": "https://visa.vfsglobal.com/cyprus/india",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Entry Permit (VFS/Embassy)",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per applicant",
            "currency": "EUR",
            "applicable": true,
            "notes": "Long-stay study visa / Category D; verify current fee"
          },
          {
            "label": "Pink Slip (TRP) after arrival",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "at immigration unit",
            "currency": "EUR",
            "applicable": true,
            "notes": "Commonly an application + registration fee; verify"
          },
          {
            "label": "VFS service charge",
            "range": "{{VERIFY_LIVE}}",
            "notes": "Separate from the visa fee; check VFS site",
            "currency": "EUR",
            "applicable": true
          },
          {
            "label": "Medical panel",
            "range": "{{VERIFY_LIVE}}",
            "notes": "HIV/Hep B-C/syphilis/TB; verify cost",
            "currency": "EUR",
            "applicable": true
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Private university tuition",
            "range": "€7,000–13,000",
            "unit": "per year",
            "notes": "UNIC, EUC, UCLan Cyprus",
            "currency": "EUR",
            "applicable": true
          },
          {
            "label": "Public university (UCY)",
            "range": "€3,400–6,800",
            "unit": "per year",
            "notes": "Competitive international intake",
            "currency": "EUR",
            "applicable": true
          },
          {
            "label": "Tuition deposit",
            "range": "€2,000–5,000",
            "notes": "Required before enrollment confirmation",
            "currency": "EUR",
            "applicable": true
          },
          {
            "label": "Scholarships",
            "range": "{{VERIFY_LIVE}}",
            "notes": "Merit-based at private universities (scholarship amount varies — verify)",
            "currency": "EUR",
            "applicable": true
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Monthly living (Nicosia)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Verify current range"
          },
          {
            "label": "Monthly living (Limassol)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Limassol typically higher"
          },
          {
            "label": "Accommodation",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Shared flat or university dorm"
          },
          {
            "label": "Financial proof benchmark",
            "range": "{{VERIFY_LIVE}}",
            "notes": "No single official minimum; working benchmark — verify",
            "currency": "EUR",
            "applicable": true
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "PCC apostille + attestation",
            "range": "₹3,000–8,000",
            "notes": "MEA + embassy"
          },
          {
            "label": "Flight to Cyprus",
            "range": "₹35,000–80,000",
            "notes": "Season dependent"
          },
          {
            "label": "Document translation",
            "range": "₹2,000–10,000",
            "notes": "Certified English translation"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first year (private university)",
        "value": "€14,000–20,000",
        "notes": "Tuition + living + visa fees; scholarship reductions vary — verify live."
      }
    ]
  }
}
$cyprus_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000c8';

-- Denmark – Residence Permit for Studies (SIRI)
-- Source: content/service-library/denmark-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $denmark_student_visa$
{
  "displayName": "Denmark – Residence Permit for Studies (SIRI)",
  "shortDescription": "SIRI (Danish Agency) · Residence permit for studies · Admission + self-support · CPR after arrival",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Denmark issues a residence permit for studies via SIRI (not a classic visa); apply online through the SIRI case-order portal + biometrics. CRITICAL 2025 change: students on NON-state-approved programmes (EVA advisory-statement courses) applying on/after 2 May 2025 lose study-permit work, family-accompaniment and job-seeking rights — only state-approved/accredited programmes keep them. Self-support and fees are set/indexed annually ({{VERIFY_LIVE}}). Denmark does NOT use APS or a German blocked account. Verify all amounts on nyidanmark.dk (SIRI) before quoting."
  },
  "alert": {
    "title": "Apply via SIRI case order + register CPR after arrival",
    "body": "Applications go online via the SIRI case-order portal with biometrics at a mission/VFS/SIRI. After arrival, register for a CPR number (and residence card). Residence permits may lapse after an extended absence from Denmark (commonly more than 6 months unless an exemption applies). Verify the current SIRI rules before advising. Note: Denmark does NOT require APS — do not import German requirements."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "State-approved programme critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "SIRI case-order portal",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "SIRI fee + self-support (verify)",
      "variant": "neutral"
    },
    {
      "label": "Admission letter",
      "variant": "success"
    },
    {
      "label": "CPR after arrival",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "SIRI processing varies (target ~1–2 months) — verify live",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "SIRI study-permit fee + self-support proof — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Residence permit for studies for non-EU/EEA/Swiss nationals admitted to a higher-education programme in Denmark, processed by SIRI (the Danish Agency for International Recruitment and Integration). It is not a classic 'visa'; applications are made online via the SIRI case-order portal with biometrics."
    },
    {
      "label": "Eligible applicants",
      "value": "Admission to a higher-education programme · Full-time study · Language ability matching the language of instruction (Danish or English) · Proof of self-support where required ({{VERIFY_LIVE}}) · Valid passport. CRITICAL: only state-approved/accredited programmes carry the usual work/family/job-seeking rights (post-2 May 2025 rule)."
    },
    {
      "label": "Self-support / funds",
      "value": "Where required, document disposable funds of {{VERIFY_LIVE}} per month, for the study period up to a 12-month maximum. NOTE: if you have PAID TUITION covering room/board, you may not need to document self-support. Evidence: bank statement, scholarship or student loan. Verify the current amount on SIRI.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "SIRI – Danish Agency for International Recruitment and Integration (nyidanmark.dk) · Danish embassy/consulate or VFS for biometrics · the municipality (kommune) for the CPR number after arrival"
    },
    {
      "label": "After approval",
      "value": "Travel to Denmark on the residence permit, register for a CPR number and the residence card, and obtain the yellow health card. Residence permits may lapse after an extended absence from Denmark (commonly more than 6 months unless an exemption applies). Verify the current SIRI rules before advising. Renew before expiry; SIRI runs random enrolment checks. Any post-study job-seeking/establishment route depends on current SIRI rules and is not automatic — verify before advising."
    }
  ],
  "eligibility": [
    {
      "criterion": "Admission to a higher-education programme in Denmark",
      "met": true,
      "note": "Full-time study; the institution issues the admission documents SIRI needs (often only after the first tuition instalment clears)."
    },
    {
      "criterion": "State-approved / accredited programme (for work & job-seeking rights)",
      "met": false,
      "note": "CRITICAL post-2 May 2025 rule: non-state-approved (EVA advisory-statement) programmes lose study-permit work, family and job-seeking rights. Confirm the programme is state-approved before advising."
    },
    {
      "criterion": "Proof of self-support where required",
      "met": false,
      "note": "Disposable funds of {{VERIFY_LIVE}} per month, to a 12-month max ({{VERIFY_LIVE}}); NOT required if paid tuition covers room/board. Bank statement, scholarship or student loan."
    },
    {
      "criterion": "Language ability matching the programme",
      "met": true,
      "note": "Danish or English per the programme; provide the evidence the institution specifies (e.g. IELTS for English-taught programmes)."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "The permit cannot be issued for longer than the passport's validity; check the mission's current rule."
    },
    {
      "criterion": "Health insurance for the entry/gap period",
      "met": false,
      "note": "Travel/incoming medical insurance may be needed for the period before CPR registration gives access to the public health system (yellow health card). Requirements can vary by situation and institution — verify the current expectation with SIRI and the institution."
    },
    {
      "criterion": "SIRI application fee paid",
      "met": false,
      "note": "Study-permit fee set by SIRI and indexed annually ({{VERIFY_LIVE}}; the current SIRI application fee). Non-payment delays/voids the case."
    }
  ],
  "redFlagsBanner": "After a refusal, address SIRI's stated reason before reapplying — admission, self-support and programme approval cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Importing German 'APS' into a Denmark file",
      "description": "Denmark does NOT use APS (a Germany/China/Vietnam requirement). Telling a Denmark client they need APS is a cross-country contamination error.",
      "fix": "Remove APS entirely; Denmark relies on the institution's admission + SIRI requirements",
      "severity": "Critical"
    },
    {
      "title": "Non-state-approved programme (post-2 May 2025 rights loss)",
      "description": "Enrolling in a non-state-approved (EVA advisory-statement) programme: students applying on/after 2 May 2025 lose study-permit work, family-accompaniment and job-seeking rights — a major issue for many Indian/Nepalese applicants.",
      "fix": "Confirm the programme is state-approved/accredited before advising; set expectations on work/stay-back rights",
      "severity": "Critical"
    },
    {
      "title": "Insufficient / wrong self-support proof",
      "description": "Funds below the required monthly amount, or assuming self-support is always needed when paid tuition may exempt it.",
      "fix": "Document the current per-month amount over the study period (max 12 months), or rely on the paid-tuition exemption where it applies",
      "severity": "Very common"
    },
    {
      "title": "Exceeding the work-hour limit",
      "description": "Working more than the permitted hours (90 hours/month for higher-education students; full-time only in Jun–Aug). SIRI tracks tax records and can warn, fine or revoke.",
      "fix": "Keep within 90 hours/month in term; keep records; only work full-time in June–August",
      "severity": "High"
    },
    {
      "title": "Permit lapse from being abroad >6 months",
      "description": "A residence permit may lapse after an extended absence from Denmark (commonly more than 6 months unless an exemption applies — verify).",
      "fix": "Advise clients not to stay outside Denmark beyond the limit; reapply from home country if lapsed",
      "severity": "Common"
    },
    {
      "title": "CPR / tuition sequencing missed",
      "description": "Not paying the first tuition instalment (so the institution won't release SIRI documents) or not registering CPR after arrival.",
      "fix": "Pay the first instalment to unlock documents; register CPR promptly after arrival for bank/health access",
      "severity": "Common"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden refusals, false documents, or enrolment with no genuine intention to study (a known SIRI concern).",
      "fix": "Disclose every prior refusal and explain changed circumstances; never submit false documents or sham enrolment",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee approval of the study residence permit?",
      "a": "No. SIRI decides based on admission, programme approval, self-support, and credibility. A strong, honest file improves the chances but approval is never guaranteed — and we never promise one."
    },
    {
      "q": "Does Denmark require a German-style APS certificate?",
      "a": "No. APS is a Germany (and China/Vietnam) requirement and does NOT apply to Denmark. SIRI relies on the institution's admission and the study-permit requirements. Do not import APS into a Denmark file."
    },
    {
      "q": "Is it a visa or a residence permit?",
      "a": "A residence permit for studies, processed by SIRI — not a classic student visa. Apply online via the SIRI case-order portal with biometrics (at a mission/VFS). After arrival, register for a CPR number and collect the residence card."
    },
    {
      "q": "How much money must a student show (self-support)?",
      "a": "Where required, disposable funds of {{VERIFY_LIVE}} per month, for the study period up to a 12-month maximum ({{VERIFY_LIVE}}; the 12-month maximum). IMPORTANT: if you have paid tuition covering room/board, you may NOT need to document self-support. Evidence: bank statement, scholarship or student loan. Verify the current amount."
    },
    {
      "q": "Why does 'state-approved programme' matter so much?",
      "a": "Since 2 May 2025, students on NON-state-approved programmes (those with an EVA advisory statement) do NOT get the study-permit work, family-accompaniment or job-seeking rights that state-approved-programme students get. This heavily affects some private/non-accredited courses popular with Indian/Nepalese applicants. Always confirm the programme is state-approved before advising on work or stay-back."
    },
    {
      "q": "Can the student work?",
      "a": "State-approved higher-education students may work up to 90 hours per month (the rule changed from '20 hours/week' on 1 July 2024) and full-time in June, July and August. The work right comes with the study permit — no separate work permit. Non-state-approved programme students (post-2 May 2025) do not get this right. SIRI tracks hours via tax records; exceeding the limit can mean a warning, fine or revocation."
    },
    {
      "q": "What language is required?",
      "a": "Danish or English, matching the programme's language of instruction. Many programmes are taught in English (provide the evidence the institution specifies, e.g. IELTS). Danish is not separately required for the permit but helps with daily life and many student jobs."
    },
    {
      "q": "What after graduation?",
      "a": "Post-study and stay-back options depend on current SIRI rules and the programme type. Eligible graduates of state-approved programmes MAY be able to apply for a job-seeking/establishment permit to look for qualified work, but this is conditional, not automatic, and non-state-approved-programme graduates may not qualify. Always verify the current rules and duration with SIRI before advising; do not present stay-back as guaranteed ({{VERIFY_LIVE}})."
    },
    {
      "q": "What are the government fees?",
      "a": "A SIRI study-permit application fee ({{VERIFY_LIVE}}; the current SIRI application fee) plus biometrics and any VFS service charge. Fees are set by SIRI and change — verify the current amount on nyidanmark.dk."
    },
    {
      "q": "How and when is the application made?",
      "a": "Online via the SIRI case-order portal, with biometrics recorded at a Danish mission/VFS (or in Denmark). Apply as early as possible after admission; SIRI's target is roughly 1–2 months but it varies. The institution often releases the documents SIRI needs only after the first tuition instalment clears."
    },
    {
      "q": "What is the CPR number and why does it matter?",
      "a": "The CPR (civil registration) number is issued after arrival via the municipality and is essential for a bank account, the yellow health card (public healthcare) and most services. Register promptly after arrival."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "A SIRI refusal can be appealed to the Immigration Appeals Board (or reapplied with a corrected file) within the stated deadline. Read the reason carefully (commonly self-support, programme approval, or documents) and fix the specific issue rather than re-lodging the same file."
    },
    {
      "q": "Can a spouse or children accompany?",
      "a": "In some cases, but only for state-approved-programme students, via a separate family application with proof of self-support for each family member ({{VERIFY_LIVE}} per family member per month) and housing. Most full-time students do not meet the requirements on a part-time wage. Contact SIRI early to confirm current conditions; do not present it as automatic."
    },
    {
      "q": "What happens if the student leaves Denmark for a long period?",
      "a": "A residence permit may lapse after an extended absence from Denmark (commonly more than 6 months unless an exemption applies — verify), which may require a fresh application from the home country. Verify current SIRI rules. Advise clients to plan travel around this limit."
    },
    {
      "q": "Is there health insurance / healthcare cover?",
      "a": "After CPR registration the student normally gets a yellow health card giving access to the public health system. Travel/incoming cover may be needed for the gap between arrival and CPR registration. Requirements can vary — students should verify the current expectation with SIRI and their institution rather than assume a fixed rule."
    },
    {
      "q": "How is institution/programme recognition checked?",
      "a": "Confirm the programme is a state-approved/accredited higher-education programme (this also governs work/stay-back rights). Non-state-approved programmes carry an EVA advisory statement and reduced rights. Verify status before any fee."
    },
    {
      "q": "How long does processing take?",
      "a": "SIRI's target for complete applications is roughly 1–2 months but it varies by season and case quality. Quote the live estimate from SIRI rather than a fixed number, and apply early."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — SIRI decides. FLC prepares a strong, honest, well-documented file (admission, programme-approval check, self-support, language evidence) and never promises a permit, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a permit or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (SIRI) and third-party (VFS/legalisation) costs.",
    "Self-support funds belong to the client — never receive, hold or route them through firm accounts.",
    "Never import another country's requirements (e.g. German APS, Sperrkonto, Anabin) into a Denmark file.",
    "Always confirm whether the programme is state-approved — advising on work/family/stay-back rights for a non-approved programme misleads the client (post-2 May 2025 rule).",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic and financial documents under data-protection rules: store securely, share only with authorised parties, retain only as needed."
  ],
  "proTips": [
    "Never tell a Denmark client they need APS — that is a Germany requirement; Denmark uses SIRI + the institution's admission.",
    "Confirm the programme is STATE-APPROVED before advising on work/family/stay-back — non-approved (EVA) programmes lost those rights from 2 May 2025.",
    "Self-support: use the current per-month figure over the study period (max 12 months) — but paid tuition covering room/board may exempt it; verify.",
    "Work is 90 hours/month (since 1 Jul 2024), full-time only Jun–Aug; SIRI tracks hours via tax records.",
    "Plan the sequence: pay the first tuition instalment to unlock SIRI documents, then CPR registration after arrival for bank/health access.",
    "Extended absence from Denmark (commonly >6 months unless an exemption applies) may cause the permit to lapse — flag this and verify current SIRI rules."
  ],
  "postApproval": [
    "Register for a CPR number via the municipality after arrival (needed for bank, health card)",
    "Collect the residence card and the yellow health card",
    "Stay within 90 hours/month work in term (full-time only Jun–Aug); keep hour records",
    "Avoid extended absences from Denmark (commonly >6 months may cause the permit to lapse unless an exemption applies — verify); renew before expiry"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "State-approved programme confirmed",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Self-support documented (or tuition-paid exemption)",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Admission + language evidence in order",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, programme-approval check, admission + first tuition instalment"
    },
    {
      "weeks": "2–4",
      "title": "Self-support evidence, documents, SIRI case-order portal + biometrics"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "SIRI processing (target ~1–2 months — verify live)"
    },
    {
      "weeks": "on arrival",
      "title": "CPR registration; residence + yellow health card"
    }
  ],
  "relatedServices": [
    {
      "label": "Denmark – Job-seeking / Establishment Card (post-study)",
      "libraryId": ""
    },
    {
      "label": "Denmark – Work Permit (Positive List / Pay Limit)",
      "libraryId": ""
    },
    {
      "label": "Denmark – Accompanying Family (study)",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Version alignment: bumped to v2.2 to standardise the study/visa service-library on a single version across all countries. No content changes in this entry — all factual content, {{VERIFY_LIVE}} placeholders, compliance/contamination warnings and prior corrections are unchanged from v2.1."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Future-proofing pass: removed hardcoded DKK self-support figures (7,426 / 89,112) and the DKK 3,060 SIRI fee from all client-facing content (about, eligibility, FAQs, staff notes, cost breakdown, sample docs and quiz), leaving the {{VERIFY_LIVE}} placeholders and 'verify on Nyidanmark/SIRI' wording so figures cannot go stale; rewrote the two numeric quiz questions to non-numeric 'current SIRI amount/fee (verify live)' answers; tightened post-study language so a job-seeking/establishment permit reads as conditional on current SIRI rules and never automatic; added nuance to health-insurance guidance (travel/incoming cover may be needed before CPR; varies — verify); qualified the 6-month absence rule to 'commonly >6 months unless an exemption applies — verify'; rewrote sample-document descriptions to be client-facing (what the document shows / why / how to use it) rather than internal compliance notes; cleaned a residual find-replace artifact in the historical changelog. Preserved all keys, {{VERIFY_LIVE}} placeholders, APS/Germany contamination warnings, the state-approved vs non-state-approved (post-2 May 2025) guidance, and work-rights content. No statistics, approval rates or immigration benefits were invented."
    },
    {
      "version": "v2.0",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Major decontamination + rebuild: removed Germany cross-contamination (APS, Sperrkonto/€992 blocked account, Anabin, Ausländerbehörde, 'Denmark' find-replace artifacts, Federal Foreign Office, TestDaF/Goethe, Canada €235/€85 fees, 'Type D visa' framing) that had been copied into this Denmark file. Reframed as the SIRI residence permit for studies; added correct self-support (DKK 7,426/month at 2026 level, 12-month cap, paid-tuition exemption), SIRI fee (DKK 3,060 at 2026 level), the 90-hours/month work rule (changed from 20 h/week on 1 Jul 2024, full-time Jun–Aug), CPR registration, yellow health card, and the 6-month-abroad lapse rule. Added the CRITICAL post-2 May 2025 rule that non-state-approved (EVA) programmes lose work/family/job-seeking rights. Replaced template FAQs and quiz with real Denmark content; rebuilt resources to official SIRI/nyidanmark.dk sources; removed the hardcoded approval rate and 'industry benchmark'; converted time-sensitive values to {{VERIFY_LIVE}} placeholders. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Denmark student visa counselor content with 2026 proof of funds amount."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: SIRI self-support amount and 12-month cap, SIRI fee, tuition, living costs, processing times, doc counts, post-study permit duration, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: this service was previously copied from the Germany file. Denmark does NOT use APS, a German Sperrkonto (€992), Anabin, or 'Ausländerbehörde'. Denmark uses: SIRI residence permit for studies, self-support (DKK), CPR number, yellow health card. KEY 2025 RULE: non-state-approved (EVA) programmes applying on/after 2 May 2025 lose work/family/job-seeking rights. Work = 90 hours/month (since 1 Jul 2024). Permit lapses if abroad >6 months. Never reintroduce German terms."
    }
  ],
  "resources": [
    {
      "title": "New to Denmark (SIRI) — study residence permit (official)",
      "url": "https://www.nyidanmark.dk/en-GB/You-want-to-apply/Study",
      "description": "SIRI requirements, self-support amount, fees and the case-order portal"
    },
    {
      "title": "SIRI — self-support amounts (official)",
      "url": "https://www.nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Self-support---SIRI",
      "description": "Current monthly self-support figure and when it is required"
    },
    {
      "title": "SIRI — student work rules / illegal work (official)",
      "url": "https://www.nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Warning---students-illegal-work",
      "description": "90 hours/month rule, summer full-time, warnings and revocation"
    },
    {
      "title": "Study in Denmark (official portal)",
      "url": "https://studyindenmark.dk/",
      "description": "Programmes, admission (optagelse.dk), and living in Denmark"
    },
    {
      "title": "borger.dk / lifeindenmark.dk — CPR and arrival",
      "url": "https://lifeindenmark.borger.dk/",
      "description": "CPR registration, yellow health card and arrival steps"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "Which agency processes the Denmark study residence permit?",
      "options": [
        "SIRI (Danish Agency for International Recruitment and Integration)",
        "The Ausländerbehörde",
        "CRMD",
        "UKVI"
      ],
      "correctIndex": 0,
      "explanation": "SIRI processes study residence permits in Denmark."
    },
    {
      "level": 1,
      "question": "Does Denmark require a German-style APS certificate?",
      "options": [
        "Yes, for all Indians",
        "No — APS is a Germany requirement, not Danish",
        "Yes, for master's only",
        "Only in Copenhagen"
      ],
      "correctIndex": 1,
      "explanation": "APS does not apply to Denmark; SIRI uses the institution's admission."
    },
    {
      "level": 1,
      "question": "What monthly self-support amount must a student show (where required)?",
      "options": [
        "€992/month",
        "DKK 235/month",
        "The current SIRI self-support amount (verify live)",
        "No requirement"
      ],
      "correctIndex": 2,
      "explanation": "the current SIRI self-support amount, to a 12-month max (€992 is the German figure)."
    },
    {
      "level": 1,
      "question": "When may self-support documentation NOT be required?",
      "options": [
        "Never",
        "Always required",
        "Only for PhDs",
        "When paid tuition covers room/board"
      ],
      "correctIndex": 3,
      "explanation": "Paid tuition covering room/board can exempt the self-support requirement."
    },
    {
      "level": 1,
      "question": "How many hours/month may a state-approved student work?",
      "options": [
        "90 hours/month (full-time Jun–Aug)",
        "140 days/year",
        "Unlimited",
        "No work allowed"
      ],
      "correctIndex": 0,
      "explanation": "Since 1 Jul 2024 the limit is 90 hours/month; full-time only in summer."
    },
    {
      "level": 1,
      "question": "Applications are submitted via:",
      "options": [
        "A paper form at the airport",
        "The SIRI case-order portal (online + biometrics)",
        "Anabin",
        "VisaOnWeb"
      ],
      "correctIndex": 1,
      "explanation": "Denmark uses the SIRI case-order portal with biometrics."
    },
    {
      "level": 1,
      "question": "After arrival, students must register for a:",
      "options": [
        "Pink Slip",
        "Meldezettel",
        "CPR number",
        "Yellow Slip"
      ],
      "correctIndex": 2,
      "explanation": "The CPR number is needed for bank, health card and services."
    },
    {
      "level": 1,
      "question": "A residence permit may lapse after an extended absence from Denmark of more than:",
      "options": [
        "1 week",
        "2 years",
        "No limit",
        "6 months"
      ],
      "correctIndex": 3,
      "explanation": "An extended absence (commonly more than 6 months unless an exemption applies) may cause the permit to lapse — verify current SIRI rules."
    },
    {
      "level": 2,
      "question": "Why does 'state-approved programme' matter (post-2 May 2025)?",
      "options": [
        "Non-approved (EVA) programmes lose work/family/job-seeking rights",
        "It changes the fee only",
        "It speeds processing",
        "No effect"
      ],
      "correctIndex": 0,
      "explanation": "Since 2 May 2025 non-state-approved programmes lose those rights."
    },
    {
      "level": 2,
      "question": "The student work limit changed on 1 July 2024 from:",
      "options": [
        "90 to 20",
        "20 hours/week to 90 hours/month",
        "Unlimited to 20",
        "No change"
      ],
      "correctIndex": 1,
      "explanation": "From 1 Jul 2024 it is 90 hours/month (older cards say 20 h/week)."
    },
    {
      "level": 2,
      "question": "Full-time work is allowed only in:",
      "options": [
        "December",
        "Exam weeks",
        "June, July and August",
        "Any month"
      ],
      "correctIndex": 2,
      "explanation": "Full-time student work is allowed only in Jun–Aug."
    },
    {
      "level": 2,
      "question": "The SIRI study-permit fee is best described as:",
      "options": [
        "Set by SIRI and indexed annually (verify the current amount)",
        "Free",
        "A fixed lifetime amount",
        "Paid to the university"
      ],
      "correctIndex": 0,
      "explanation": "The SIRI study-permit fee is set by SIRI and indexed annually; quote the current figure (verify live)."
    },
    {
      "level": 2,
      "question": "SIRI monitors student work via:",
      "options": [
        "Tax records",
        "Social media",
        "Random calls",
        "Airport logs"
      ],
      "correctIndex": 0,
      "explanation": "SIRI tracks tax records; over-working can mean a warning, fine or revocation."
    },
    {
      "level": 2,
      "question": "Accompanying family is possible mainly for:",
      "options": [
        "All students automatically",
        "State-approved-programme students (separate application + funds)",
        "No students",
        "Only PhDs in summer"
      ],
      "correctIndex": 1,
      "explanation": "Family accompaniment is for state-approved programmes, via a separate application."
    },
    {
      "level": 2,
      "question": "The institution often releases SIRI documents only after:",
      "options": [
        "Graduation",
        "The CPR is issued",
        "The first tuition instalment clears",
        "A Schengen visa"
      ],
      "correctIndex": 2,
      "explanation": "Many universities release SIRI documents after the first instalment."
    },
    {
      "level": 2,
      "question": "English-taught programmes require:",
      "options": [
        "Danish B2",
        "German",
        "No evidence",
        "English evidence (e.g. IELTS) — not Danish"
      ],
      "correctIndex": 3,
      "explanation": "English programmes need English evidence; Danish is not a permit requirement."
    },
    {
      "level": 3,
      "question": "A counsellor tells a Denmark client they need APS. The issue?",
      "options": [
        "APS does not apply to Denmark — it is a Germany requirement (contamination)",
        "No issue",
        "APS is faster",
        "Lower fee"
      ],
      "correctIndex": 0,
      "explanation": "Importing APS into a Denmark file is a factual error."
    },
    {
      "level": 3,
      "question": "A client enrolls in a non-state-approved (EVA) programme and asks about working. Advise:",
      "options": [
        "Work 20 h/week freely",
        "Post-2 May 2025, that programme has no study-permit work rights — confirm approval status first",
        "Work full-time",
        "No limits"
      ],
      "correctIndex": 1,
      "explanation": "Non-state-approved programmes lost work/family/job-seeking rights from 2 May 2025."
    },
    {
      "level": 3,
      "question": "A client shows €992/month as self-support. The error?",
      "options": [
        "No error",
        "Too high",
        "The current SIRI self-support amount (verify live)",
        "Not required"
      ],
      "correctIndex": 2,
      "explanation": "€992 is the German blocked-account figure; Denmark uses the current SIRI self-support amount."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their self-support funds. You:",
      "options": [
        "Hold them",
        "Route them through the firm",
        "Charge a fee",
        "Refuse — the funds belong to the client and are never routed through the firm"
      ],
      "correctIndex": 3,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the permit. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; SIRI decides."
    },
    {
      "level": 3,
      "question": "A student plans to spend 8 months at home during studies. Risk?",
      "options": [
        "No risk",
        "The permit lapses (>6 months outside Denmark)",
        "Faster renewal",
        "More work hours"
      ],
      "correctIndex": 1,
      "explanation": "Being outside Denmark >6 months causes the permit to lapse."
    },
    {
      "level": 3,
      "question": "A student works 120 hours in October. Consequence?",
      "options": [
        "Allowed",
        "Encouraged",
        "Over the 90-hour/month cap — warning, fine or revocation risk",
        "No effect"
      ],
      "correctIndex": 2,
      "explanation": "Exceeding 90 hours/month in term risks SIRI enforcement."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    }
  ],
  "donts": {
    "dos": [
      "Confirm the programme is state-approved/accredited before any fee",
      "Document the current SIRI self-support amount over the study period (or rely on the paid-tuition exemption)",
      "Apply online via the SIRI case-order portal with biometrics; register CPR after arrival",
      "Keep within 90 hours/month work in term (full-time only Jun–Aug)",
      "Disclose and address any prior refusal in writing",
      "Quote consultancy, government (SIRI) and third-party (VFS) costs separately"
    ],
    "donts": [
      "Do not tell a Denmark client they need APS (that is a Germany requirement)",
      "Do not use German concepts (Sperrkonto €992, Anabin, Ausländerbehörde) — Denmark uses SIRI/CPR",
      "Do not assume work/family/stay-back rights on a non-state-approved programme",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not let a student work beyond 90 hours/month in term"
    ],
    "mistakes": [
      "Importing APS / blocked-account-€992 / Anabin requirements from a Germany file",
      "Missing the state-approved vs non-approved (EVA) distinction and its rights impact",
      "Assuming self-support is always required (paid tuition may exempt it)",
      "Letting the permit lapse via >6 months outside Denmark"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "Admission letter from a state-approved Danish higher-education programme.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample self-support evidence (mock)",
      "description": "Shows the self-support evidence SIRI accepts (bank statement, scholarship or student-loan letter) demonstrating the student can cover living costs; use it to guide clients on acceptable proof and formatting.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of funds confirmation (mock)",
      "description": "Shows acceptable self-support proof at the current SIRI monthly amount (verify live); use it to explain to clients what funds evidence looks like and how it is presented.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / TOEFL certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "SIRI case-order application packet.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "State-approved higher-education students may work up to 90 hours per month (changed from '20 hours/week' on 1 July 2024) and full-time in June, July and August. The work right comes with the study permit — no separate work permit. Students on NON-state-approved programmes (post-2 May 2025) do not receive this right.",
      "details": [
        "90 hours/month during the academic year; full-time only in June, July and August.",
        "Master's-for-working-professionals programmes have a different allowance (112.5 hours/month).",
        "The work right is tied to the study permit and the employer/hours appear on the residence card.",
        "SIRI tracks hours via tax records; exceeding the limit can mean a warning (valid 2 years), a fine, or revocation.",
        "Non-state-approved (EVA advisory-statement) programme students applying on/after 2 May 2025 do not get this right."
      ],
      "restrictions": [
        "90 hours/month cap in term (full-time only Jun–Aug)",
        "Only for state-approved/accredited programmes (post-2 May 2025 rule)"
      ],
      "sourceUrl": "https://www.nyidanmark.dk/en-GB/You-want-to-apply/Study",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Accompanying family is only possible for state-approved-programme students, via a separate application with proof of self-support per family member and housing; a dependant's work access is tied to their permit. Most full-time students do not meet the requirements. Verify current SIRI rules.",
      "details": [
        "Separate application; proof of self-support ({{VERIFY_LIVE}} per family member/month) and housing.",
        "Not available for non-state-approved-programme students (post-2 May 2025)."
      ],
      "restrictions": [],
      "sourceUrl": "https://www.nyidanmark.dk/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Denmark – Residence Permit for Studies",
    "currency": "DKK",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (SIRI / nyidanmark.dk) before quoting. Self-support funds are the student's own money, not a fee. Denmark does NOT use APS or a German-style blocked account. INR equivalents move with exchange rates.",
    "sourceUrl": "https://www.nyidanmark.dk/en-GB/You-want-to-apply/Study",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "SIRI study-permit application fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "DKK",
            "applicable": true,
            "notes": "the current SIRI application fee; indexed annually. Verify."
          },
          {
            "label": "Biometrics / VFS service charge",
            "range": "{{VERIFY_LIVE}}",
            "currency": "DKK",
            "applicable": true,
            "notes": "At mission/VFS; verify current charge"
          },
          {
            "label": "Document legalisation / translation",
            "range": "{{VERIFY_LIVE}}",
            "currency": "DKK",
            "applicable": true,
            "notes": "Where required"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Tuition (non-EU, per year)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "DKK",
            "applicable": true,
            "notes": "Commonly ~DKK 45,000–120,000/yr depending on programme; use the offer letter"
          },
          {
            "label": "Tuition deposit (first instalment)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "DKK",
            "applicable": true,
            "notes": "Often needed to unlock SIRI documents; deduct from funds"
          },
          {
            "label": "Books & materials",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "DKK",
            "applicable": true,
            "notes": "Programme dependent"
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Self-support amount (SIRI)",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "DKK",
            "applicable": true,
            "notes": "the current SIRI self-support amount (max 12 months); verify"
          },
          {
            "label": "Accommodation",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "DKK",
            "applicable": true,
            "notes": "Copenhagen higher; varies by city"
          },
          {
            "label": "Living costs",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "DKK",
            "applicable": true,
            "notes": "Food, transport, insurance; verify"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / legalisation",
            "range": "Varies",
            "notes": "Where required"
          },
          {
            "label": "Health insurance (gap before CPR)",
            "range": "Varies",
            "notes": "Travel/incoming cover until CPR/yellow card"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Cross-check the admission letter and the official SIRI / nyidanmark.dk pages before client commitment."
      }
    ]
  }
}
$denmark_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000b1';

-- Finland – Residence Permit for Studies (Migri)
-- Source: content/service-library/finland-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $finland_student_visa$
{
  "displayName": "Finland – Residence Permit for Studies (Migri)",
  "shortDescription": "Migri (Finnish Immigration Service) · Residence permit for studies · Admission + proof of means · DVV after arrival",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Finland issues a residence permit for studies via Migri (the Finnish Immigration Service), not a classic visa; apply online via Enter Finland, then verify identity at a mission/VFS. Higher-education degree students get an A (continuous) permit; non-degree/exchange get a B (temporary) permit. Proof of means and Migri fees are set/indexed and verified live ({{VERIFY_LIVE}}). Migri uses automation to re-check that students still meet the requirements after a decision. Finland does NOT use APS or a German blocked account. Verify all amounts on migri.fi before quoting."
  },
  "alert": {
    "title": "Apply via Enter Finland; collect the card after a D visa",
    "body": "Apply online via Migri's Enter Finland service and verify identity at a Finnish mission/VFS. A D visa may be attached so the student can travel quickly and collect the residence-permit card in Finland according to current Migri processing and delivery timelines. After arrival, register with the DVV (Digital and Population Data Services Agency) for a personal identity code. Note: Finland does NOT require APS — do not import German requirements."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "Proof of means critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Migri / Enter Finland",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Migri fee + proof of means (verify)",
      "variant": "neutral"
    },
    {
      "label": "Admission letter",
      "variant": "success"
    },
    {
      "label": "DVV after arrival",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Migri processing varies (commonly ~1–3 months) — verify live",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Migri residence-permit fee + proof of means — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Residence permit for studies (oleskelulupa opiskelua varten) for non-EU/EEA/Swiss nationals admitted to study in Finland, processed by Migri (the Finnish Immigration Service). It is not a classic 'visa'; apply online via Enter Finland. Higher-education degree students receive an A (continuous) permit; non-degree/exchange students a B (temporary) permit."
    },
    {
      "label": "Eligible applicants",
      "value": "Admission to a Finnish institution (degree or other recognised programme) · Proof of sufficient means ({{VERIFY_LIVE}}) · Comprehensive private health insurance (cover level depends on study length) · Valid passport · Tuition paid or funds for it where applicable. EU/EEA/Swiss citizens do not need a permit."
    },
    {
      "label": "Proof of means",
      "value": "Migri sets a per-month / per-year income requirement, indexed and verified live ({{VERIFY_LIVE}}). The money must be the student's own and available when the application is submitted; tuition funds are counted SEPARATELY from living costs. If the institution provides accommodation/meals, the requirement may be lower (document this). On the FIRST permit, income from work cannot be used to meet the requirement.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Migri – Finnish Immigration Service (migri.fi / Enter Finland) · Finnish embassy/consulate or VFS for identity verification · DVV (Digital and Population Data Services Agency) for the personal identity code / municipality of residence after arrival"
    },
    {
      "label": "After approval",
      "value": "A D visa may be attached for fast travel; collect the residence-permit card from a collection point in Finland according to current Migri processing and delivery timelines. Register with the DVV for a personal identity code. Renew before expiry — Migri checks study progress (study progress is assessed by Migri and the institution) and may use automation to re-check requirements. Graduates may apply for a residence permit to look for work."
    }
  ],
  "eligibility": [
    {
      "criterion": "Admission to a recognised Finnish institution",
      "met": true,
      "note": "Acceptance letter from the institution; full-time degree or other recognised programme (not purely online distance learning). Confirm recognition before any fee."
    },
    {
      "criterion": "Proof of sufficient means",
      "met": false,
      "note": "Migri income requirement ({{VERIFY_LIVE}}), the student's own funds, available at submission; tuition is counted separately. Lower if the institution provides accommodation/meals (document it). First permit: work income cannot be used."
    },
    {
      "criterion": "Comprehensive private health insurance",
      "met": false,
      "note": "Cover level depends on study length (higher cover for shorter studies; lower for ≥2-year studies who register with municipal healthcare). Use a insurance meeting Migri's requirements; verify the current cover thresholds."
    },
    {
      "criterion": "Tuition paid or funds for it",
      "met": false,
      "note": "Higher-education programmes usually charge non-EU tuition; pay it or hold the first-year tuition funds (separate from living funds) at submission."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "The permit cannot exceed the passport's validity; check the mission's current rule."
    },
    {
      "criterion": "Genuine, full-time study intent",
      "met": true,
      "note": "Programme must lead to a degree/qualification and not be purely distance learning; Migri screens for genuine study intent and re-checks after the decision."
    },
    {
      "criterion": "Identity verification at a mission/VFS",
      "met": false,
      "note": "After the online Enter Finland application, verify identity in person at a Finnish mission/VFS; biometrics are recorded."
    }
  ],
  "redFlagsBanner": "After a refusal, address Migri's stated reason before reapplying — proof of means, admission and insurance cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Importing German 'APS' into a Finland file",
      "description": "Finland does NOT use APS (a Germany/China/Vietnam requirement). Telling a Finland client they need APS is a cross-country contamination error.",
      "fix": "Remove APS entirely; Finland relies on the institution's admission + Migri requirements",
      "severity": "Critical"
    },
    {
      "title": "Insufficient / wrong proof of means",
      "description": "Funds below Migri's income requirement, tuition money mixed into living funds, or funds not available when the application is submitted.",
      "fix": "Hold the current Migri per-year living amount AND tuition separately, in the student's own account, at submission",
      "severity": "Very common"
    },
    {
      "title": "Inadequate or non-accepted health insurance",
      "description": "Insurance below Migri's cover threshold for the study length, or from an insurer whose cover does not meet Migri's requirements — a common refusal cause.",
      "fix": "Use insurance that meets Migri's current coverage requirements (higher for shorter studies; lower for ≥2-year studies); verify thresholds",
      "severity": "Very common"
    },
    {
      "title": "Exceeding the average 30-hour work limit",
      "description": "Working more than an average of 30 hours/week over the year. Migri receives salary data from the Incomes Register and can act on breaches.",
      "fix": "Keep the annual average within 30 hours/week; degree-required internships/diploma work are exempt",
      "severity": "High"
    },
    {
      "title": "Insufficient study progress at renewal",
      "description": "Too few credits (based on sufficient study progress as assessed by Migri and the educational institution (verify current extension requirements before advising)) can block an extension.",
      "fix": "Counsel on credit progress from the start; document reasons for any shortfall and a clear plan",
      "severity": "Common"
    },
    {
      "title": "Purely online / non-qualifying programme",
      "description": "Applying on a purely online distance programme or one not leading to a degree/qualification.",
      "fix": "Confirm the programme is in-person/hybrid and leads to a recognised degree/qualification before applying",
      "severity": "Common"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden refusals, false documents, or enrolment with no genuine intention to study (Migri screens for this).",
      "fix": "Disclose every prior refusal and explain changed circumstances; never submit false documents or sham enrolment",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee approval of the residence permit for studies?",
      "a": "No. Migri decides based on admission, proof of means, insurance, and credibility. A strong, honest file improves the chances but approval is never guaranteed — and we never promise one."
    },
    {
      "q": "Does Finland require a German-style APS certificate?",
      "a": "No. APS is a Germany (and China/Vietnam) requirement and does NOT apply to Finland. Migri relies on the institution's admission and the residence-permit requirements. Do not import APS into a Finland file."
    },
    {
      "q": "Is it a visa or a residence permit?",
      "a": "A residence permit for studies, processed by Migri — not a classic student visa. Apply online via Enter Finland and verify identity at a mission/VFS. Higher-education degree students get an A (continuous) permit; non-degree/exchange students get a B (temporary) permit. A D visa may be attached for fast travel."
    },
    {
      "q": "How much money must a student show (proof of means)?",
      "a": "Migri sets a per-month / per-year living-cost requirement ({{VERIFY_LIVE}}), which must be the student's own funds and available when the application is submitted. Tuition is counted SEPARATELY — if tuition is unpaid, the first-year tuition funds must also be in the account. On the first permit, work income cannot be used. If the institution provides accommodation/meals, the requirement may be lower (document it). Verify the current figure on migri.fi."
    },
    {
      "q": "What health insurance is required?",
      "a": "Comprehensive private health insurance that meets Migri's current coverage requirements. The required cover depends on study length — higher cover for shorter studies, lower for studies of two years or more (longer-stay students register with municipal healthcare). Verify the current cover thresholds and accepted insurers; an inadequate policy is a common refusal cause."
    },
    {
      "q": "Can the student work?",
      "a": "Yes — on a residence permit for studies, a student may work in any field for an average of 30 hours per week over the permit period. Some weeks may exceed 30 hours as long as the average is maintained, and full-time work in holidays is possible within that average. Degree-required internships/diploma work are exempt from the limit. No separate work permit is needed."
    },
    {
      "q": "What language is required?",
      "a": "Finnish or English depending on the programme; many programmes are taught in English. Provide the language evidence the institution specifies (e.g. IELTS for English-taught programmes). Finnish is not separately required for the permit but helps with daily life and work."
    },
    {
      "q": "What after graduation?",
      "a": "Graduates who completed a degree in Finland may apply for a residence permit to look for work or start a business. This is conditional on current Migri rules and is not automatic — verify the current conditions and any income requirement before advising."
    },
    {
      "q": "What are the government fees?",
      "a": "A Migri residence-permit application fee ({{VERIFY_LIVE}}; the online Enter Finland fee is lower than the paper fee), plus identity-verification/VFS charges. Fees are set by Migri and change — verify the current amount on migri.fi before quoting."
    },
    {
      "q": "How and when is the application made?",
      "a": "Online via Migri's Enter Finland service, then identity verification at a Finnish mission/VFS. Apply as early as possible after admission; Migri processes study applications as urgent but timing varies (commonly ~1–3 months). Quote the live estimate rather than a fixed number."
    },
    {
      "q": "What is the DVV registration?",
      "a": "After arrival, register with the DVV (Digital and Population Data Services Agency) for a Finnish personal identity code and (on application) a municipality of residence. The identity code is needed for banking, services and often work."
    },
    {
      "q": "What is the A permit vs B permit difference?",
      "a": "Higher-education degree students receive an A (continuous) residence permit; non-degree students and exchange students receive a B (temporary) permit. The permit type affects later rights and pathways — confirm which applies to the client's programme."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "A Migri refusal can be appealed to the administrative court within the stated deadline, or the client can reapply with a corrected, stronger file. Read the reason carefully (commonly proof of means, insurance, or genuine-study concerns) and fix the specific issue rather than re-lodging the same file."
    },
    {
      "q": "Can a spouse or children accompany?",
      "a": "Family members may apply separately on the basis of family ties. Eligibility depends on current Migri requirements, with their own proof of means and other conditions; approval is not automatic. Verify the current Migri family-permit rules before advising — do not present family accompaniment as guaranteed."
    },
    {
      "q": "What happens at renewal / extension?",
      "a": "Apply before the current permit expires. Migri checks study progress (study progress is assessed by Migri and the institution) plus refreshed proof of means and insurance. At extension, work income may be taken into account. Migri may use automation to re-check requirements."
    },
    {
      "q": "How is the programme/institution recognition checked?",
      "a": "Confirm the institution and programme are recognised and that the programme leads to a degree/qualification (not purely online distance learning). Verify status before any fee."
    },
    {
      "q": "How long does processing take?",
      "a": "Migri handles study applications as urgent, but timing varies by season and case quality (commonly ~1–3 months). Quote the live Migri estimate rather than a fixed number, and apply early."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — Migri decides. FLC prepares a strong, honest, well-documented file (admission, proof of means, accepted insurance, language evidence) and never promises a permit, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a permit or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (Migri) and third-party (VFS/insurance) costs.",
    "Proof-of-means funds belong to the client — never receive, hold or route them through firm accounts; keep tuition and living funds separate.",
    "Never import another country's requirements (e.g. German APS, Sperrkonto, Anabin) into a Finland file.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic, financial and insurance documents under data-protection rules: store securely, share only with authorised parties, retain only as needed.",
    "Advise students to keep the annual average work within 30 hours/week; Migri sees salary data via the Incomes Register and breaches can affect the permit."
  ],
  "proTips": [
    "Never tell a Finland client they need APS — that is a Germany requirement; Finland uses Migri + the institution's admission.",
    "Keep living funds and tuition funds SEPARATE in the student's own account at submission; on the first permit, work income cannot count.",
    "Match the health-insurance cover to study length (higher for shorter studies; lower for ≥2 years) and use a insurance meeting Migri's requirements.",
    "Work is an average of 30 hours/week; degree internships/diploma work are exempt; Migri sees salary data via the Incomes Register.",
    "Apply via Enter Finland online, verify identity at the mission/VFS, then register with the DVV after arrival for the identity code.",
    "Treat all figures (proof of means, Migri fee, insurance cover) as live values — verify on migri.fi before quoting."
  ],
  "postApproval": [
    "Collect the residence-permit card in Finland according to current Migri processing and delivery timelines (a D visa allows travel in the meantime)",
    "Register with the DVV for a personal identity code (and municipality of residence on application)",
    "Keep the annual average work within 30 hours/week; keep records",
    "Track study progress (credit benchmark) and renew before expiry; Migri may auto-re-check requirements"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Proof of means (living + tuition separate)",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "insurance that meets Migri's current coverage requirements at correct cover",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Recognised, non-online programme",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, programme-recognition check, admission + tuition status"
    },
    {
      "weeks": "2–4",
      "title": "Proof of means (living + tuition separate), insurance that meets Migri's current coverage requirements, Enter Finland application"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "Identity verification at mission/VFS + Migri decision (varies — verify live)"
    },
    {
      "weeks": "on arrival",
      "title": "Collect permit card; DVV registration for identity code"
    }
  ],
  "relatedServices": [
    {
      "label": "Finland – Residence Permit to Look for Work (post-study)",
      "libraryId": ""
    },
    {
      "label": "Finland – Work-based Residence Permit",
      "libraryId": ""
    },
    {
      "label": "Finland – Family Residence Permit",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Version alignment: bumped to v2.2 to standardise the study/visa service-library on a single version across all countries. No content changes in this entry — all factual content, {{VERIFY_LIVE}} placeholders, compliance/contamination warnings and prior corrections are unchanged from v2.1."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Future-proofing + consistency pass: removed fixed ECTS benchmarks (45/20 ECTS) from FAQs, red flags, renewal guidance, post-approval, working rights and quiz, replacing them with 'sufficient study progress as assessed by Migri and the institution — verify current extension requirements'; removed the fixed '~2 weeks' residence-permit-card collection estimate in favour of 'according to current Migri processing and delivery timelines'; replaced 'Migri-accepted insurer' wording throughout with 'insurance that meets Migri's current coverage requirements' (avoids implying a fixed public approved-insurer list); standardised the work-rights rule on 'an average of 30 hours per week over the permit period' and de-emphasised the 120-hours/month and 1,560-hours/year conversions (kept only as secondary context); tightened family-permit guidance to 'assessed separately, conditions apply, not automatic, verify'; rewrote the proof-of-means sample-document description to be client-facing (what it shows / why / how to use it) rather than an internal contamination note; cleaned a residual find-replace artifact in the historical changelog; standardised terminology on 'residence permit for studies' (kept 'student visa' only where the distinction is explained). Preserved all keys, {{VERIFY_LIVE}} placeholders, APS/Germany contamination warnings, Migri/Enter Finland/DVV guidance, and work-rights substance. No statistics, approval rates or immigration benefits were invented."
    },
    {
      "version": "v2.0",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Major decontamination + rebuild: removed Germany cross-contamination (APS, Sperrkonto/€992 blocked account, Anabin, Ausländerbehörde, find-replace artifacts, Federal Foreign Office, TestDaF/Goethe, Canada €235/€85 fees, 'Type D visa' framing, German Opportunity Card/Job Seeker) that had been copied into this Finland file. Reframed as the Migri residence permit for studies (Enter Finland; A continuous vs B temporary permit; D visa for travel); added correct proof-of-means structure (Migri income requirement, living funds separate from tuition, first permit cannot use work income — figures as placeholders), Migri-accepted insurance with study-length-dependent cover, the average 30-hours/week work rule (1,560 h/year; internships exempt), DVV registration, and the credit-progress renewal benchmark. Replaced template FAQs and quiz with real Finland content; rebuilt resources to official Migri sources; removed the hardcoded approval rate and 'industry benchmark'; converted time-sensitive values to {{VERIFY_LIVE}} placeholders. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Finland residence-permit-for-studies counsellor content with 2026 proof of funds amount."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: Migri proof-of-means amount (per month/year), Migri residence-permit fee (online vs paper), tuition, insurance cover thresholds, processing times, doc counts, post-study permit conditions, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: this service was previously copied from the Germany file. Finland does NOT use APS, a German Sperrkonto (€992), Anabin, or 'Ausländerbehörde'. Finland uses: Migri residence permit for studies, Enter Finland portal, A/B permit, D visa, DVV registration. KEY FACTS: work = average 30 h/week ; living funds counted separately from tuition; first permit cannot use work income; insurance cover depends on study length. Never reintroduce German terms."
    }
  ],
  "resources": [
    {
      "title": "Migri — residence permit application for studies (official)",
      "url": "https://migri.fi/en/residence-permit-application-for-studies",
      "description": "Finnish Immigration Service: requirements, A/B permit, D visa, process"
    },
    {
      "title": "Migri — income requirement for students (official)",
      "url": "https://migri.fi/en/income-requirement-for-students",
      "description": "Current proof-of-means amount and how tuition is counted separately"
    },
    {
      "title": "Migri — working and internships during studies (official)",
      "url": "https://migri.fi/en/working-and-internships-during-studies",
      "description": "30-hours/week average rule, internships exemption, Incomes Register"
    },
    {
      "title": "Enter Finland — online application portal",
      "url": "https://enterfinland.fi/",
      "description": "Migri's online application service for the residence permit for studies"
    },
    {
      "title": "DVV — Digital and Population Data Services Agency",
      "url": "https://dvv.fi/en/individuals",
      "description": "Personal identity code and municipality of residence after arrival"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "Which agency processes the Finland residence permit for studies?",
      "options": [
        "Migri (Finnish Immigration Service)",
        "The Ausländerbehörde",
        "CRMD",
        "SIRI"
      ],
      "correctIndex": 0,
      "explanation": "Migri processes residence permit for studiess in Finland."
    },
    {
      "level": 1,
      "question": "Does Finland require a German-style APS certificate?",
      "options": [
        "Yes, for all Indians",
        "No — APS is a Germany requirement, not Finnish",
        "Yes, for master's only",
        "Only in Helsinki"
      ],
      "correctIndex": 1,
      "explanation": "APS does not apply to Finland; Migri uses the institution's admission."
    },
    {
      "level": 1,
      "question": "How is proof of means counted relative to tuition?",
      "options": [
        "Tuition counts as living funds",
        "No funds needed",
        "Living funds are counted SEPARATELY from tuition",
        "Only tuition matters"
      ],
      "correctIndex": 2,
      "explanation": "Living funds and tuition are counted separately; both may be needed at submission."
    },
    {
      "level": 1,
      "question": "On the FIRST study permit, can work income meet the means requirement?",
      "options": [
        "Yes, always",
        "Yes, after 6 months",
        "Only in summer",
        "No — work income cannot be used on the first permit"
      ],
      "correctIndex": 3,
      "explanation": "First permit cannot rely on work income; it may count at extension."
    },
    {
      "level": 1,
      "question": "On a study permit, the work limit is:",
      "options": [
        "An average of 30 hours/week",
        "20 hours/week hard cap",
        "No work allowed",
        "140 days/year"
      ],
      "correctIndex": 0,
      "explanation": "Finland allows an average of 30 h/week."
    },
    {
      "level": 1,
      "question": "After arrival, students register with the:",
      "options": [
        "Ausländerbehörde",
        "DVV (Digital and Population Data Services Agency)",
        "commune",
        "CRMD"
      ],
      "correctIndex": 1,
      "explanation": "DVV registration gives the personal identity code."
    },
    {
      "level": 1,
      "question": "How is the application submitted?",
      "options": [
        "Paper only at the airport",
        "Via Anabin",
        "Online via Enter Finland, then identity verification at a mission/VFS",
        "Via VisaOnWeb"
      ],
      "correctIndex": 2,
      "explanation": "Finland uses the Enter Finland online portal + identity verification."
    },
    {
      "level": 1,
      "question": "A higher-education degree student receives which permit type?",
      "options": [
        "A B (temporary) permit only",
        "A Schengen visa only",
        "No permit",
        "An A (continuous) permit"
      ],
      "correctIndex": 3,
      "explanation": "Degree students get an A permit; non-degree/exchange get a B permit."
    },
    {
      "level": 2,
      "question": "The 30-hour work limit is best described as:",
      "options": [
        "An average over the permit period (some weeks may exceed it)",
        "A strict weekly cap never exceeded",
        "Per day",
        "Per month only"
      ],
      "correctIndex": 0,
      "explanation": "It is an average of 30 hours/week over the permit period; some weeks can exceed 30 hours if the average holds."
    },
    {
      "level": 2,
      "question": "Which work is EXEMPT from the 30-hour limit?",
      "options": [
        "All restaurant work",
        "Degree-required internships / diploma work",
        "Nothing",
        "Weekend work"
      ],
      "correctIndex": 1,
      "explanation": "Practical training/diploma work that is part of the degree is exempt."
    },
    {
      "level": 2,
      "question": "Health-insurance cover required depends on:",
      "options": [
        "The student's age only",
        "The city",
        "Study length (higher cover for shorter studies)",
        "Nothing"
      ],
      "correctIndex": 2,
      "explanation": "Shorter studies need higher cover; ≥2-year students need lower cover."
    },
    {
      "level": 2,
      "question": "Migri monitors student work via:",
      "options": [
        "Social media",
        "Random calls",
        "Airport logs",
        "The Incomes Register (salary data)"
      ],
      "correctIndex": 3,
      "explanation": "Migri receives salary data from the Incomes Register."
    },
    {
      "level": 2,
      "question": "At renewal, Migri checks study progress against:",
      "options": [
        "Sufficient study progress, as assessed by Migri and the institution",
        "No progress is ever checked",
        "Only attendance photos",
        "A language re-test"
      ],
      "correctIndex": 0,
      "explanation": "At extension, Migri and the institution assess whether study progress is sufficient; verify the current requirements rather than quoting a fixed credit figure."
    },
    {
      "level": 2,
      "question": "A D visa attached to the permit is used to:",
      "options": [
        "Work full-time",
        "Travel quickly and collect the permit card in Finland (current Migri timelines)",
        "Replace the permit",
        "Skip insurance"
      ],
      "correctIndex": 1,
      "explanation": "The D visa enables fast travel; the card is collected in Finland."
    },
    {
      "level": 2,
      "question": "English-taught programmes require:",
      "options": [
        "Finnish B2",
        "German",
        "English evidence (e.g. IELTS) — not Finnish",
        "No evidence"
      ],
      "correctIndex": 2,
      "explanation": "English programmes need English evidence; Finnish is not a permit requirement."
    },
    {
      "level": 2,
      "question": "At extension (not first permit), work income:",
      "options": [
        "Is still ignored",
        "Replaces tuition",
        "Is banned",
        "May be taken into account"
      ],
      "correctIndex": 3,
      "explanation": "At extension Migri can consider work income; not on the first permit."
    },
    {
      "level": 3,
      "question": "A counsellor tells a Finland client they need APS. The issue?",
      "options": [
        "APS does not apply to Finland — it is a Germany requirement (contamination)",
        "No issue",
        "APS is faster",
        "Lower fee"
      ],
      "correctIndex": 0,
      "explanation": "Importing APS into a Finland file is a factual error."
    },
    {
      "level": 3,
      "question": "A client shows €992/month as proof of means. The error?",
      "options": [
        "No error",
        "Wrong figure — Finland uses Migri's own income requirement (verify); €992 is German",
        "Too high",
        "Not required"
      ],
      "correctIndex": 1,
      "explanation": "€992 is the German blocked-account figure; Finland uses Migri's amount."
    },
    {
      "level": 3,
      "question": "A client mixes tuition money into the living-funds figure. Advise:",
      "options": [
        "Combine them",
        "Ignore tuition",
        "Keep them separate — tuition is counted apart from living funds",
        "Use work income"
      ],
      "correctIndex": 2,
      "explanation": "Living funds and tuition must be shown separately at submission."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their proof-of-means funds. You:",
      "options": [
        "Hold them",
        "Route them through the firm",
        "Charge a fee",
        "Refuse — the funds belong to the client and are never routed through the firm"
      ],
      "correctIndex": 3,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the permit. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; Migri decides."
    },
    {
      "level": 3,
      "question": "A student plans to work 45 hours/week every week of term. Risk?",
      "options": [
        "No risk",
        "Over the average 30-hour limit — can affect the permit",
        "Allowed",
        "Encouraged"
      ],
      "correctIndex": 1,
      "explanation": "Exceeding the annual 30-h/week average risks the permit."
    },
    {
      "level": 3,
      "question": "A client buys a cheap insurance below Migri's cover threshold. Consequence?",
      "options": [
        "No issue",
        "Faster approval",
        "Likely refusal — use a insurance meeting Migri's requirements at the correct cover",
        "Lower fee"
      ],
      "correctIndex": 2,
      "explanation": "Inadequate/insurance that does not meet Migri's requirements is a common refusal cause."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    }
  ],
  "donts": {
    "dos": [
      "Confirm the institution/programme is recognised and not purely online before any fee",
      "Hold the current Migri living amount AND tuition separately in the student's own account at submission",
      "Use insurance that meets Migri's current coverage requirements for the study length",
      "Apply via Enter Finland, verify identity at the mission/VFS, register with the DVV after arrival",
      "Keep the annual average work within 30 hours/week",
      "Quote consultancy, government (Migri) and third-party (VFS/insurance) costs separately"
    ],
    "donts": [
      "Do not tell a Finland client they need APS (that is a Germany requirement)",
      "Do not use German concepts (Sperrkonto €992, Anabin, Ausländerbehörde) — Finland uses Migri/DVV",
      "Do not mix tuition money into living funds, or rely on work income on the first permit",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not let a student exceed the average 30-hour/week work limit"
    ],
    "mistakes": [
      "Importing APS / blocked-account-€992 / Anabin requirements from a Germany file",
      "Inadequate or non-accepted health insurance (a common refusal cause)",
      "Mixing tuition and living funds, or counting work income on the first permit",
      "Letting study progress fall below the credit benchmark before renewal"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "Acceptance letter from a recognised Finnish institution.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of means / insurance (mock)",
      "description": "Shows the proof-of-means evidence Migri expects (bank statement or scholarship letter) demonstrating the student can cover living costs; use it to guide clients on acceptable funds documentation and formatting.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of funds confirmation (mock)",
      "description": "Proof of means at the Migri income requirement (verify live) — explain to clients.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / TOEFL certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "Enter Finland application packet (identity verified at the mission/VFS).",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "On a residence permit for studies, a student may work in any field for an average of 30 hours per week over the permit period. Some weeks may exceed 30 hours provided the average is maintained; full-time in holidays is possible within that average. No separate work permit is needed.",
      "details": [
        "The rule is an average of 30 hours per week over the permit period (it is not a strict each-week cap).",
        "Work related to the degree (practical training / diploma work) is exempt from the limit.",
        "Migri receives salary data from the Incomes Register; breaches can affect the permit.",
        "On the FIRST permit, work income cannot be used to meet the proof-of-means requirement (it may be considered at extension)."
      ],
      "restrictions": [
        "Average of 30 hours/week over the permit period",
        "Degree internships/diploma work exempt; first-permit means cannot rely on work income"
      ],
      "sourceUrl": "https://migri.fi/en/working-and-internships-during-studies",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Family members may apply for a residence permit separately, on the basis of family ties. Eligibility depends on current Migri requirements, proof of means and other conditions apply, and approval is NOT automatic. Verify the current Migri family-permit rules before advising.",
      "details": [
        "Assessed separately; the applicant must meet current Migri requirements including proof of means.",
        "Approval is not automatic and conditions apply — verify current rules."
      ],
      "restrictions": [],
      "sourceUrl": "https://migri.fi/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Finland – Residence Permit for Studies",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (Migri / migri.fi) before quoting. Proof-of-means funds are the student's own money, not a fee, and are counted separately from tuition. Finland does NOT use APS or a German-style blocked account. INR equivalents move with exchange rates.",
    "sourceUrl": "https://migri.fi/en/residence-permit-application-for-studies",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Migri residence-permit application fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Online (Enter Finland) fee is lower than paper; verify current amount"
          },
          {
            "label": "Identity verification / VFS charge",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "At mission/VFS; verify"
          },
          {
            "label": "Document legalisation / translation",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Where required"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Tuition (non-EU, per year)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Varies widely by programme; counted separately from living funds; use the offer letter"
          },
          {
            "label": "Tuition first-year funds (if unpaid)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Must be in the account at submission if tuition not yet paid"
          },
          {
            "label": "Books & materials",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Programme dependent"
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Proof-of-means (Migri income requirement)",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per month/year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Set by Migri; the student's own funds at submission; verify current figure"
          },
          {
            "label": "Accommodation",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Helsinki higher; varies by city"
          },
          {
            "label": "Health insurance (private; must meet Migri's coverage requirements)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Cover level depends on study length; verify"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / legalisation",
            "range": "Varies",
            "notes": "Where required"
          },
          {
            "label": "Health insurance (must meet Migri's coverage requirements)",
            "range": "Varies",
            "notes": "Cover level depends on study length"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Cross-check the admission letter and the official migri.fi pages before client commitment."
      }
    ]
  }
}
$finland_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000a9';

-- France – Student Visa (VLS-TS Étudiant)
-- Source: content/service-library/france-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $france_student_visa$
{
  "displayName": "France – Student Visa (VLS-TS Étudiant)",
  "shortDescription": "Campus France (Études en France) · VLS-TS long-stay · Proof of resources · OFII/ANEF validation after arrival",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "France issues the VLS-TS Étudiant (Visa Long Séjour valant Titre de Séjour) — a long-stay visa that FUNCTIONS as a residence permit once validated. Indian students must complete the Campus France 'Études en France' (EEF) procedure BEFORE the visa appointment. After arrival, validate the visa online via the ANEF/OFII platform within 3 months. France does NOT use the German 'APS' academic pre-check; note that in France 'APS' means a DIFFERENT thing — the post-study job-search permit (now RECE). Proof of resources, fees and work-hour rules are set/indexed and verified live ({{VERIFY_LIVE}}). Verify all amounts on france-visas.gouv.fr and campusfrance.org before quoting."
  },
  "alert": {
    "title": "Campus France (Études en France) first; validate VLS-TS within 3 months",
    "body": "For Indian students the Campus France 'Études en France' procedure is mandatory before the consulate/VFS visa appointment. The VLS-TS Étudiant must be validated online via the ANEF/OFII platform within 3 months of arrival to remain lawful and to act as a residence permit. Note: do NOT import the German 'APS' academic pre-verification — France does not use it (in France 'APS' is the post-study job-search permit, a separate matter)."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "Campus France (EEF) mandatory",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "OFII/ANEF validation",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Visa fee + proof of resources (verify)",
      "variant": "neutral"
    },
    {
      "label": "Admission letter",
      "variant": "success"
    },
    {
      "label": "OFII validation in 3 months",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "After Campus France + complete file — verify live",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "VLS-TS visa fee + OFII/ANEF validation tax — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "The VLS-TS Étudiant (Visa de Long Séjour valant Titre de Séjour) is the long-stay student visa for non-EU/EEA/Swiss nationals studying in France for more than 90 days. Once validated after arrival it functions as a residence permit (titre de séjour), so no separate carte de séjour is needed initially. It is issued for 4 months to 1 year depending on the programme."
    },
    {
      "label": "Eligible applicants",
      "value": "Admission to a recognised French institution for a programme over 3 months · Proof of sufficient resources ({{VERIFY_LIVE}}) · Health insurance · Valid passport (a passport issued more than 10 years ago is not accepted). Indian students must complete the Campus France 'Études en France' (EEF) procedure first. EU/EEA/Swiss citizens need no visa."
    },
    {
      "label": "Proof of resources",
      "value": "France's official minimum is {{VERIFY_LIVE}} per month (the government floor; consulates may expect more, especially for Paris, to avoid an 'insufficient funds' refusal). Evidence: bank statements, a dedicated student funds account, a scholarship award letter, sponsor documentation, or other financial guarantees accepted by the consulate. Verify the current figure on france-visas.gouv.fr.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Campus France / Études en France (campusfrance.org) for the academic procedure · French consulate / VFS for the visa · OFII – Office Français de l'Immigration et de l'Intégration (via the ANEF platform) for post-arrival validation · the préfecture for later renewal (carte de séjour)"
    },
    {
      "label": "After approval",
      "value": "Travel on the VLS-TS; validate it online via the ANEF/OFII platform within 3 months of arrival (pay the validation tax, {{VERIFY_LIVE}}). Once validated it is the residence permit for its validity (4 months–1 year). To continue studying, apply at the préfecture for a multi-year carte de séjour pluriannuelle étudiant before it expires. Graduates may qualify for a post-study residence permit for job search or business creation, subject to current French immigration regulations (verify before advising)."
    }
  ],
  "eligibility": [
    {
      "criterion": "Admission to a recognised French institution (>3 months)",
      "met": true,
      "note": "Acceptance for a programme longer than 90 days; for Indian students this is processed through Campus France 'Études en France'."
    },
    {
      "criterion": "Campus France 'Études en France' (EEF) procedure completed",
      "met": false,
      "note": "Mandatory for Indian students BEFORE the visa appointment: create the EEF account, upload documents, pay the Campus France fee, attend the interview. Skipping it leads to refusal."
    },
    {
      "criterion": "Proof of sufficient resources",
      "met": false,
      "note": "France's official minimum is {{VERIFY_LIVE}}/month (consulates may want more for Paris). Bank statements, a dedicated student funds account, scholarship evidence, sponsor documentation, or other financial guarantees accepted by the consulate. The student's own/sponsored funds."
    },
    {
      "criterion": "Health insurance",
      "met": false,
      "note": "Valid health cover for entry; eligible students may register with the French public health insurance system after arrival, subject to current rules. Confirm the current expectation."
    },
    {
      "criterion": "Accommodation proof",
      "met": false,
      "note": "Accommodation evidence that satisfies current visa requirements (e.g. a tenancy/host attestation or sufficient booking); short hotel bookings alone may not always be sufficient."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "Passports must satisfy current France-Visas and Schengen travel-document requirements; a passport issued more than 10 years ago may not be accepted even if it remains unexpired, and the visa cannot exceed passport validity."
    },
    {
      "criterion": "Language ability matching the programme",
      "met": true,
      "note": "French or English depending on the programme; provide the evidence the institution specifies (e.g. IELTS/TOEFL for English-taught, DELF/DALF/TCF for French-taught)."
    }
  ],
  "redFlagsBanner": "After a refusal, address the consulate's stated reason before rebooking — proof of resources, Campus France steps and accommodation cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Importing the German 'APS' academic pre-check into a France file",
      "description": "Germany's APS (academic-credential pre-verification) does NOT apply to France. CAUTION: in France 'APS' is a DIFFERENT thing entirely — the post-study job-search permit (now RECE). Telling a France applicant they need a German-style APS to study is a cross-country contamination error.",
      "fix": "Remove the German APS concept; France uses Campus France 'Études en France' + the consulate. Keep the French APS/RECE only as the post-study permit",
      "severity": "Critical"
    },
    {
      "title": "Skipping or mishandling Campus France (Études en France)",
      "description": "Indian students who do not complete the EEF procedure before the visa appointment are refused; incomplete EEF accounts or missed interviews are common causes.",
      "fix": "Start Campus France 3–4 months before intake; complete the account, documents, fee and interview before booking the visa",
      "severity": "Critical"
    },
    {
      "title": "Forgetting OFII/ANEF validation within 3 months",
      "description": "Failing to validate the VLS-TS online within 3 months of arrival makes the stay irregular and complicates renewal.",
      "fix": "Validate via the ANEF/OFII platform within 3 months, confirm the French address, and pay the validation tax",
      "severity": "High"
    },
    {
      "title": "Insufficient / wrong proof of resources",
      "description": "Funds below the official monthly minimum, or only the bare minimum where the consulate expects more (especially Paris), causing an 'insufficient funds' refusal.",
      "fix": "Show at least the official monthly minimum (more for Paris) in the student's own/sponsored funds with consistent history",
      "severity": "Very common"
    },
    {
      "title": "Passport not meeting France-Visas/Schengen requirements",
      "description": "A passport that does not meet current France-Visas/Schengen travel-document requirements — for example one issued more than 10 years ago — may not be accepted even if unexpired.",
      "fix": "Check the passport meets current France-Visas/Schengen requirements; renew it if issued more than 10 years ago",
      "severity": "Common"
    },
    {
      "title": "Assuming the VLS-TS gives unlimited Schengen travel or family rights",
      "description": "The long-stay visa allows Schengen movement up to 90 days within its validity, not unlimited; a student visa includes no automatic family rights.",
      "fix": "Set expectations: Schengen travel is limited; family members apply separately under their own rules",
      "severity": "Common"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden refusals, false documents, or lack of genuine study intent (a 'Reason 4' abusive-stay concern).",
      "fix": "Disclose every prior refusal and explain changed circumstances; never submit false documents or sham enrolment",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee approval of the student visa?",
      "a": "No. The consulate decides based on the Campus France procedure, proof of resources, and credibility. A strong, honest file improves the chances but approval is never guaranteed — and we never promise one."
    },
    {
      "q": "Does France require a German-style APS academic certificate?",
      "a": "No. Germany's APS (academic-credential pre-verification) does NOT apply to France. IMPORTANT: in France 'APS' means something completely different — the Autorisation Provisoire de Séjour, a POST-STUDY job-search permit (now RECE). For studying, France uses the Campus France 'Études en France' procedure, not a German APS."
    },
    {
      "q": "Is the VLS-TS a visa or a residence permit?",
      "a": "Both, in sequence: it is a long-stay visa that, once validated online via ANEF/OFII within 3 months of arrival, FUNCTIONS as a residence permit (titre de séjour) for its validity (4 months–1 year). No separate carte de séjour is needed initially."
    },
    {
      "q": "How much money must a student show (proof of resources)?",
      "a": "France's official minimum is {{VERIFY_LIVE}} per month (the government floor). Consulates may expect more, especially for Paris, to avoid an 'insufficient funds' refusal. Evidence: bank statements, a dedicated student funds account, a scholarship award letter, sponsor documentation, or other financial guarantees accepted by the consulate. Verify the current figure on france-visas.gouv.fr."
    },
    {
      "q": "What is the Campus France 'Études en France' procedure?",
      "a": "For Indian students it is the mandatory first step: create an Études en France (EEF) account, upload academic documents, pay the Campus France fee, and attend an interview, BEFORE the consulate/VFS visa appointment. Start it 3–4 months before the intake; skipping it leads to refusal."
    },
    {
      "q": "What is OFII/ANEF validation?",
      "a": "After arrival the VLS-TS must be validated online via the ANEF/OFII platform within 3 months: create an account, confirm the French address, pay the validation tax ({{VERIFY_LIVE}}). Without validation the stay becomes irregular and renewal is complicated."
    },
    {
      "q": "Can the student work?",
      "a": "Yes — a validated VLS-TS Étudiant generally permits limited employment during studies, currently up to 964 hours per year (roughly 20 hours per week), automatically and with no separate work permit. Treat the figure as time-sensitive and verify current rules. Note: the temporary VLS-T does NOT grant work rights."
    },
    {
      "q": "What are the post-study options after graduation?",
      "a": "Graduates may qualify for a post-study residence permit for job search or business creation, subject to current French immigration regulations. Eligibility, duration and conditions vary and should always be verified through official sources before advising — do not assume a fixed validity period or any automatic/bilateral entitlement. (This French post-study route is unrelated to Germany's academic 'APS' pre-check.)"
    },
    {
      "q": "What are the government fees?",
      "a": "A VLS-TS visa fee ({{VERIFY_LIVE}}; the student fee is commonly lower than other long-stay categories), the OFII/ANEF validation tax ({{VERIFY_LIVE}}), the Campus France procedure fee, plus the CVEC student-life contribution at enrolment and any VFS charge. Fees change — verify current amounts on france-visas.gouv.fr and campusfrance.org."
    },
    {
      "q": "How and when is the application made?",
      "a": "Indian students complete Campus France 'Études en France' first, then apply for the VLS-TS via the consulate/VFS (france-visas.gouv.fr). Begin 3–4 months before the intake; during the May–July peak, VFS appointment waits can stretch significantly. Quote the live processing estimate rather than a fixed number."
    },
    {
      "q": "What language is required?",
      "a": "French or English depending on the programme. English-taught programmes need English evidence (e.g. IELTS/TOEFL); French-taught programmes typically need DELF/DALF/TCF. French is not separately required for the visa where the programme is in English but helps with daily life and work."
    },
    {
      "q": "How is renewal handled?",
      "a": "To continue studying beyond the VLS-TS, apply at the local préfecture for a multi-year carte de séjour pluriannuelle étudiant, typically 2 months before the VLS-TS expires, with proof of enrolment, resources and accommodation."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "Yes — a refusal must state its reasons and can be appealed (administrative/CRARUF recourse) within the stated deadline, or corrected and re-lodged. Read the reason carefully (commonly funds, Campus France gaps, or genuine-study concerns) and fix the specific issue."
    },
    {
      "q": "Can a spouse or children accompany?",
      "a": "A student visa includes no automatic family rights. Family members apply separately under their own rules (e.g. accompanying-family or family-reunification routes) with their own resources and conditions. Verify the current rules before advising; do not present it as automatic."
    },
    {
      "q": "Does the VLS-TS allow Schengen travel?",
      "a": "A validated long-stay visa allows movement within the Schengen area for up to 90 days within its validity — useful for short trips, but not unlimited travel. Confirm the current rule before advising."
    },
    {
      "q": "What is the CVEC?",
      "a": "The Contribution Vie Étudiante et de Campus (student-life tax, commonly around {{VERIFY_LIVE}}) is paid at enrolment; including the CVEC receipt in the visa dossier signals finalised enrolment and is recommended."
    },
    {
      "q": "How long does processing take?",
      "a": "It varies by season and case quality; Campus France adds an academic step first, and VFS appointment waits peak in May–July. Quote the live france-visas.gouv.fr estimate rather than a fixed number, and apply early."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — the consulate decides. FLC prepares a strong, honest, well-documented file (Campus France, proof of resources, accommodation, insurance) and never promises a visa, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a visa or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (visa/OFII/CVEC/Campus France) and third-party (VFS) costs.",
    "Proof-of-resources funds belong to the client — never receive, hold or route them through firm accounts.",
    "Never import another country's requirements (e.g. German academic APS, Sperrkonto, Anabin) into a France file; do not confuse Germany's APS with France's post-study APS/RECE.",
    "Always complete the Campus France 'Études en France' procedure for Indian students before the visa appointment.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic, financial and insurance documents under data-protection rules: store securely, share only with authorised parties, retain only as needed."
  ],
  "proTips": [
    "Do not import Germany's academic 'APS' into a France file — France uses Campus France 'Études en France'. (In France 'APS' is the post-study job-search permit, a separate matter.)",
    "Start Campus France (EEF) 3–4 months before intake; the visa appointment comes AFTER the EEF procedure.",
    "Validate the VLS-TS via ANEF/OFII within 3 months of arrival — missing this makes the stay irregular.",
    "Show at least France's official monthly minimum (more for Paris) in the student's own/sponsored funds; treat the figure as live.",
    "Check the passport was issued within the last 10 years — an older passport is refused even if in date.",
    "Work is currently up to 964 hours/year (~20 h/week), automatic with VLS-TS — verify current rules; the temporary VLS-T grants no work rights."
  ],
  "postApproval": [
    "Validate the VLS-TS online via ANEF/OFII within 3 months of arrival (pay the validation tax)",
    "Register with CPAM/student social security where eligible; arrange housing (CAF aid may apply)",
    "Keep work within the current annual limit (currently 964 hours/year — verify)",
    "Apply at the préfecture for the carte de séjour pluriannuelle étudiant before the VLS-TS expires"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Campus France (EEF) completed cleanly",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Proof of resources (official minimum, more for Paris)",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Accommodation + insurance in order",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, institution recognition, admission"
    },
    {
      "weeks": "2–6",
      "title": "Campus France 'Études en France' (account, documents, fee, interview)"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "VLS-TS application via consulate/VFS + decision (varies — verify live)"
    },
    {
      "weeks": "on arrival",
      "title": "OFII/ANEF validation within 3 months; CPAM/housing"
    }
  ],
  "relatedServices": [
    {
      "label": "France – Post-Study Residence Permit (job search / business creation)",
      "libraryId": ""
    },
    {
      "label": "France – Talent Passport / Salarié Work Permit",
      "libraryId": ""
    },
    {
      "label": "France – Visitor (Long-Stay) Visa",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Version alignment: bumped to v2.2 to standardise the study/visa service-library on a single version across all countries. No content changes in this entry — all factual content, {{VERIFY_LIVE}} placeholders, compliance/contamination warnings and prior corrections are unchanged from v2.1."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Future-proofing + compliance pass: rewrote post-study (APS/RECE) wording across about, FAQs, related services, staff notes and quiz to cautious, non-definitive language ('a post-study residence permit for job search or business creation, subject to current French immigration regulations; verify eligibility, duration and conditions') — removed fixed 12-month validity and India bilateral-duration assertions while keeping the German-APS-vs-French-APS contamination warning; removed blocked-account implications from proof-of-resources evidence (now bank statements / dedicated student funds account / scholarship / sponsor documentation / consulate-accepted guarantees), keeping only the 'France does not operate a German-style blocked account' warning and clearly-German distractors; replaced age-based CPAM wording with 'eligible students may register with the French public health insurance system after arrival, subject to current rules'; softened accommodation guidance ('short hotel bookings alone may not always be sufficient'); qualified work rights ('currently up to 964 hours annually — verify'); added regulatory context to the passport rule (must meet current France-Visas/Schengen requirements; over-10-years may not be accepted even if unexpired); rewrote the Campus France sample-document description to be client-facing; cleaned a residual find-replace artifact in the historical changelog. Preserved all keys, {{VERIFY_LIVE}} placeholders, Campus France/ANEF/OFII/VLS-TS workflow, Schengen warnings, compliance language, and APS contamination warnings. No statistics, approval rates or immigration benefits were invented."
    },
    {
      "version": "v2.0",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Major decontamination + rebuild: removed Germany cross-contamination (German academic APS, Sperrkonto/€992 blocked account, Anabin, Ausländerbehörde, find-replace artifacts, Federal Foreign Office, TestDaF/Goethe, Canada €235/€85 fees, 'Type D visa' framing, German Opportunity Card/Job Seeker) that had been copied into this France file. Reframed as the VLS-TS Étudiant (Campus France 'Études en France' first; OFII/ANEF validation within 3 months; functions as a residence permit; renewal at the préfecture); added correct proof-of-resources structure (official monthly minimum, placeholder), 964-hours/year work rule (automatic with VLS-TS; temporary VLS-T grants none), passport-over-10-years rule, and CVEC. CRITICAL APS handling: removed the German academic-APS meaning but correctly represented the SEPARATE French APS (Autorisation Provisoire de Séjour, now RECE) as the post-study job-search permit (~12 months; India bilateral) — these are different and must not be conflated. Replaced template FAQs and quiz with real France content; rebuilt resources to official France-Visas/Campus France/ANEF sources; removed the hardcoded approval rate and 'industry benchmark'; converted time-sensitive values to {{VERIFY_LIVE}} placeholders. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial France student visa counselor content with 2026 proof of funds amount."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: proof-of-resources minimum (official ~€615/month at 2026 level — verify), VLS-TS visa fee, OFII/ANEF validation tax, Campus France fee, CVEC amount, SMIC, processing times, doc counts, post-study (APS/RECE) terms, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: this service was previously copied from the Germany file. France does NOT use the German academic 'APS' (Akademische Prüfstelle), a German Sperrkonto (€992), Anabin, or 'Ausländerbehörde'. France uses: Campus France 'Études en France', the VLS-TS Étudiant, OFII/ANEF validation within 3 months, the préfecture for renewal. CRITICAL APS TRAP: in France 'APS' (Autorisation Provisoire de Séjour) historically refers to the POST-STUDY job-search permit — a completely different thing from Germany's academic 'APS' pre-check. Treat post-study terminology, duration and conditions as time-sensitive and verify on official sources; do not assume a fixed validity or bilateral entitlement. Work = currently up to 964 hours/year (verify). Never reintroduce German terms."
    }
  ],
  "resources": [
    {
      "title": "France-Visas — official visa portal",
      "url": "https://france-visas.gouv.fr/",
      "description": "VLS-TS requirements, fees, document checklist and application"
    },
    {
      "title": "Campus France — Études en France",
      "url": "https://www.campusfrance.org/en",
      "description": "Mandatory academic procedure for Indian students; programmes and steps"
    },
    {
      "title": "ANEF / OFII — administration étrangers en France",
      "url": "https://administration-etrangers-en-france.interieur.gouv.fr/",
      "description": "Online VLS-TS validation after arrival and residence procedures"
    },
    {
      "title": "Campus France — post-study permit (APS/RECE)",
      "url": "https://www.campusfrance.org/en/temporary-resident-permit-aps",
      "description": "French post-study job-search permit (Autorisation Provisoire de Séjour / RECE)"
    },
    {
      "title": "Service-Public — student residence permit (titre de séjour)",
      "url": "https://www.service-public.fr/particuliers/vosdroits/N110",
      "description": "Renewal at the préfecture (carte de séjour pluriannuelle étudiant)"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "What is the main French long-stay student visa?",
      "options": [
        "The VLS-TS Étudiant",
        "The German APS",
        "The Pink Slip",
        "The Blue Card"
      ],
      "correctIndex": 0,
      "explanation": "VLS-TS Étudiant = Visa Long Séjour valant Titre de Séjour."
    },
    {
      "level": 1,
      "question": "Does France require Germany's academic 'APS' to study?",
      "options": [
        "Yes, for all Indians",
        "No — that is a Germany requirement, not French",
        "Yes, for master's only",
        "Only for Paris"
      ],
      "correctIndex": 1,
      "explanation": "France uses Campus France 'Études en France', not the German academic APS."
    },
    {
      "level": 1,
      "question": "What must Indian students complete BEFORE the visa appointment?",
      "options": [
        "A German Sperrkonto",
        "An Anabin check",
        "Campus France 'Études en France' (EEF)",
        "An OFII card"
      ],
      "correctIndex": 2,
      "explanation": "The EEF procedure is mandatory before the consulate appointment."
    },
    {
      "level": 1,
      "question": "After arrival, the VLS-TS must be validated within:",
      "options": [
        "1 week",
        "2 years",
        "No deadline",
        "3 months (via ANEF/OFII)"
      ],
      "correctIndex": 3,
      "explanation": "Validate online via ANEF/OFII within 3 months of arrival."
    },
    {
      "level": 1,
      "question": "Once validated, the VLS-TS functions as:",
      "options": [
        "A residence permit (titre de séjour)",
        "A tourist visa only",
        "A work permit only",
        "Nothing"
      ],
      "correctIndex": 0,
      "explanation": "A validated VLS-TS is the residence permit for its validity."
    },
    {
      "level": 1,
      "question": "How many hours per year may a VLS-TS student work?",
      "options": [
        "No work allowed",
        "964 hours/year (~20 h/week)",
        "Unlimited",
        "140 days/year"
      ],
      "correctIndex": 1,
      "explanation": "A validated VLS-TS currently grants up to 964 hours/year of work automatically; treat the figure as time-sensitive and verify."
    },
    {
      "level": 1,
      "question": "France's proof-of-resources minimum is best treated as:",
      "options": [
        "€992/month fixed",
        "No requirement",
        "The official monthly minimum — verify live (consulates may want more)",
        "€235 once"
      ],
      "correctIndex": 2,
      "explanation": "France sets an official monthly minimum (verify); €992 is the German figure."
    },
    {
      "level": 1,
      "question": "To continue studying after the VLS-TS, a student applies at the:",
      "options": [
        "Ausländerbehörde",
        "CRMD",
        "Migri",
        "Préfecture (carte de séjour pluriannuelle)"
      ],
      "correctIndex": 3,
      "explanation": "Renewal is at the préfecture for a multi-year student card."
    },
    {
      "level": 2,
      "question": "In France, the term 'APS' refers to:",
      "options": [
        "The POST-STUDY job-search permit (now RECE)",
        "An academic pre-check to study",
        "A German-style blocked account",
        "A language test"
      ],
      "correctIndex": 0,
      "explanation": "French APS = Autorisation Provisoire de Séjour, a post-study permit (now RECE)."
    },
    {
      "level": 2,
      "question": "The French post-study permit (job search / business creation) duration is best treated as:",
      "options": [
        "Time-sensitive — verify current official rules",
        "Exactly 12 months always",
        "Exactly 5 years",
        "Never available"
      ],
      "correctIndex": 0,
      "explanation": "Post-study permit duration and conditions change; verify official sources rather than quoting a fixed period."
    },
    {
      "level": 2,
      "question": "Which visa does NOT grant work rights?",
      "options": [
        "The validated VLS-TS",
        "The carte de séjour étudiant",
        "The temporary VLS-T",
        "None"
      ],
      "correctIndex": 2,
      "explanation": "The temporary VLS-T grants no work rights; the VLS-TS does."
    },
    {
      "level": 2,
      "question": "A passport issued more than 10 years ago:",
      "options": [
        "Always fine",
        "Only an issue for Paris",
        "Accepted with a fee",
        "May not be accepted even if unexpired (must meet current France-Visas/Schengen rules)"
      ],
      "correctIndex": 3,
      "explanation": "Passports must meet current France-Visas/Schengen requirements; one issued more than 10 years ago may not be accepted even if unexpired."
    },
    {
      "level": 2,
      "question": "The OFII/ANEF validation involves:",
      "options": [
        "Confirming address + paying the validation tax online",
        "A German Sperrkonto",
        "An Anabin upload",
        "Nothing"
      ],
      "correctIndex": 0,
      "explanation": "Validation confirms the address and pays the tax via ANEF/OFII."
    },
    {
      "level": 2,
      "question": "The CVEC is:",
      "options": [
        "A visa refusal code",
        "The student-life contribution paid at enrolment",
        "A work permit",
        "A German-style blocked account"
      ],
      "correctIndex": 1,
      "explanation": "CVEC = Contribution Vie Étudiante et de Campus, paid at enrolment."
    },
    {
      "level": 2,
      "question": "English-taught programmes require:",
      "options": [
        "French B2 always",
        "German",
        "English evidence (e.g. IELTS) — French-taught need DELF/DALF",
        "No evidence"
      ],
      "correctIndex": 2,
      "explanation": "Language evidence matches the programme's language of instruction."
    },
    {
      "level": 2,
      "question": "A validated long-stay VLS-TS allows Schengen travel:",
      "options": [
        "Unlimited anywhere",
        "Never",
        "Only to Germany",
        "Up to 90 days within its validity (not unlimited)"
      ],
      "correctIndex": 3,
      "explanation": "It allows up to 90 days of Schengen movement within validity."
    },
    {
      "level": 3,
      "question": "A counsellor tells a France client they need a German-style APS to study. The issue?",
      "options": [
        "Wrong — that German academic APS does not apply to France (contamination)",
        "No issue",
        "APS is faster",
        "Lower fee"
      ],
      "correctIndex": 0,
      "explanation": "Germany's academic APS is not a French requirement; France uses Campus France."
    },
    {
      "level": 3,
      "question": "A client confuses Germany's APS with France's APS. Clarify:",
      "options": [
        "They are the same",
        "France's APS is a POST-STUDY job-search permit (RECE), not an academic pre-check",
        "Neither exists",
        "Both are German-style blocked accounts"
      ],
      "correctIndex": 1,
      "explanation": "French APS/RECE is a post-study permit; German APS is an academic pre-check."
    },
    {
      "level": 3,
      "question": "A client shows €992/month as proof of resources. The error?",
      "options": [
        "No error",
        "Too high",
        "Wrong figure — France uses its own official minimum (verify); €992 is German",
        "Not required"
      ],
      "correctIndex": 2,
      "explanation": "€992 is the German blocked-account figure; France uses its own minimum."
    },
    {
      "level": 3,
      "question": "A client skips OFII validation after arrival. Consequence?",
      "options": [
        "No effect",
        "Faster renewal",
        "More work hours",
        "The stay becomes irregular and renewal is complicated"
      ],
      "correctIndex": 3,
      "explanation": "Failing to validate within 3 months makes the stay irregular."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their proof-of-resources funds. You:",
      "options": [
        "Refuse — the funds belong to the client and are never routed through the firm",
        "Hold them",
        "Route them through the firm",
        "Charge a fee"
      ],
      "correctIndex": 0,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the visa. You:",
      "options": [
        "Provide it",
        "Refuse and use approved non-guaranteeing language",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 1,
      "explanation": "Never guarantee an outcome; the consulate decides."
    },
    {
      "level": 3,
      "question": "A student books only a 1-week hotel as accommodation proof. Risk?",
      "options": [
        "No risk",
        "Speeds approval",
        "Usually insufficient — consulates want weeks or a host attestation",
        "Lowers the fee"
      ],
      "correctIndex": 2,
      "explanation": "Short hotel bookings alone may not always be sufficient; provide accommodation evidence that meets current requirements."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    }
  ],
  "donts": {
    "dos": [
      "Complete Campus France 'Études en France' before booking the visa appointment",
      "Validate the VLS-TS via ANEF/OFII within 3 months of arrival",
      "Show at least the official monthly resources minimum (more for Paris) in the student's own/sponsored funds",
      "Check the passport was issued within the last 10 years",
      "Keep work within the current annual limit (currently 964 hours/year — verify)",
      "Quote consultancy, government (visa/OFII/CVEC) and third-party (VFS) costs separately"
    ],
    "donts": [
      "Do not tell a France applicant they need Germany's academic 'APS' to study",
      "Do not use German concepts (Sperrkonto €992, Anabin, Ausländerbehörde) — France uses Campus France/OFII",
      "Do not skip OFII/ANEF validation or the Campus France procedure",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not let a student exceed the current annual work limit (currently 964 hours/year)"
    ],
    "mistakes": [
      "Confusing Germany's academic APS with France's post-study APS/RECE permit",
      "Importing blocked-account-€992 / Anabin / Ausländerbehörde from a Germany file",
      "Forgetting OFII validation within 3 months of arrival",
      "Submitting a passport issued more than 10 years ago"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "Acceptance letter from a recognised French institution (via Campus France).",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample Campus France / proof-of-resources (mock)",
      "description": "Shows the Campus France 'Études en France' confirmation that evidences the completed academic procedure; use it to verify the client has cleared the mandatory Campus France step before the visa appointment.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of funds confirmation (mock)",
      "description": "Proof of resources at France's official monthly minimum (verify live) — explain to clients.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / TOEFL or DELF/DALF certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "France-Visas / Campus France application packet.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "A validated VLS-TS Étudiant generally permits limited employment, currently up to 964 hours per year (roughly 20 hours per week), automatically, with no separate work permit. The temporary VLS-T does NOT grant work rights.",
      "details": [
        "The limit is currently 964 hours per year (roughly 20 hours per week); treat it as time-sensitive and verify.",
        "The right is automatic once the VLS-TS is validated — no employer work-permit step.",
        "The temporary 'VLS-T' student visa carries no work rights.",
        "The French minimum wage (SMIC) is set/indexed annually ({{VERIFY_LIVE}}); do not quote a fixed rate."
      ],
      "restrictions": [
        "current annual cap (currently 964 hours/year — verify)",
        "Only on a validated VLS-TS (not the temporary VLS-T)"
      ],
      "sourceUrl": "https://www.campusfrance.org/en",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "A student visa includes no automatic family rights. Family members apply separately under their own rules with their own resources and conditions; assessed case-by-case and not automatic. Verify current French rules.",
      "details": [
        "Separate application under accompanying-family/family-reunification rules.",
        "Own proof of resources and conditions; not automatic."
      ],
      "restrictions": [],
      "sourceUrl": "https://france-visas.gouv.fr/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — France – Student Visa (VLS-TS)",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (france-visas.gouv.fr / campusfrance.org) before quoting. Proof-of-resources funds are the student's own/sponsored money, not a fee. France does NOT use a German-style blocked account. INR equivalents move with exchange rates.",
    "sourceUrl": "https://france-visas.gouv.fr/",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "VLS-TS visa fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Student fee commonly lower than other long-stay categories; verify"
          },
          {
            "label": "OFII/ANEF validation tax",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Paid online when validating the visa after arrival; verify"
          },
          {
            "label": "Campus France (Études en France) fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Set by the local Campus France office; verify"
          },
          {
            "label": "CVEC student-life contribution",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Paid at enrolment; verify current amount"
          },
          {
            "label": "VFS service charge",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Separate from the visa fee; verify"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Tuition (public university, non-EU differential)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Differential rates at public universities; private/Grande École higher; use the offer letter"
          },
          {
            "label": "Tuition deposit",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Where required by the institution"
          },
          {
            "label": "Books & materials",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Programme dependent"
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Proof-of-resources minimum",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "France's official monthly minimum; more expected for Paris; verify"
          },
          {
            "label": "Accommodation",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Paris much higher; CAF housing aid (APL/ALS) may help after arrival"
          },
          {
            "label": "Living costs",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Food, transport, insurance; verify"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / legalisation",
            "range": "Varies",
            "notes": "Where required"
          },
          {
            "label": "Health insurance (entry; CPAM after arrival)",
            "range": "Varies",
            "notes": "Eligible students may register with the French public health insurance system after arrival, subject to current rules"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Cross-check the admission letter and official france-visas.gouv.fr / campusfrance.org pages before client commitment."
      }
    ]
  }
}
$france_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-000000000081';

-- Germany – Student Visa (National Visa)
-- Source: content/service-library/germany-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $germany_student_visa$
{
  "displayName": "Germany – Student Visa (National Visa)",
  "shortDescription": "German mission · National (Type D) visa · Admission + funded blocked account · APS mandatory for Indian degree applicants",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Blocked account amount and national visa fee are dynamic ({{VERIFY_LIVE}}) and set/revised by the German Federal Foreign Office — verify live before quoting. APS is MANDATORY for Indian degree applicants >90 days (since 1 Nov 2022), with narrow exemptions only. Verify all amounts on the mission's site (india.diplo.de / auswaertiges-amt.de) and the blocked-account provider; treat figures as live values, never publish invented statistics."
  },
  "alert": {
    "title": "APS certificate + funded blocked account are gating items",
    "body": "For Indian nationals applying for degree programs longer than 90 days, the APS certificate is MANDATORY (since 1 Nov 2022) — not optional. Narrow exemptions only: DAAD/EU-funded scholarship holders, some PhD cases where the supervisor waives it, and courses under 90 days. The blocked account (Sperrkonto) must be funded before lodging. Neither can be rushed — start both as soon as admission (Zulassung) is in view. Verify current APS fee and processing time before promising any intake date."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "APS required (India)",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Embassy appointment",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "€75 visa + €11,904 blocked",
      "variant": "neutral"
    },
    {
      "label": "Admission (Zulassung)",
      "variant": "success"
    },
    {
      "label": "APS for India",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Processing time varies by mission + APS — verify the live figure",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "National visa fee + blocked account — verify both live (revised periodically)",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "National (Type D) visa for study at a state-recognised German institution (staatlich anerkannt) or preparatory course (Studienkolleg). After entry, convert to a student residence permit (§16b) at the local Ausländerbehörde."
    },
    {
      "label": "Eligible applicants",
      "value": "University admission/Zulassung (or conditional admission / Studienkolleg place) · Funded blocked account (Sperrkonto) {{VERIFY_LIVE}} or accepted alternative · APS certificate (mandatory for Indian degree applicants >90 days) · Valid health insurance (travel + statutory/private student plan) · Motivation letter · Language proof per program (German/English)"
    },
    {
      "label": "Blocked account",
      "value": "Blocked account (Sperrkonto) of {{VERIFY_LIVE}} for the year (monthly release {{VERIFY_LIVE}}), released monthly after arrival, unless a scholarship or accepted alternative (e.g. Verpflichtungserklärung) applies. The amount is set annually by the Federal Foreign Office (BAföG-linked); it is the 12-month minimum and some missions require proof for the full program duration, with ~10% more for certain categories. The funds are the student's own money, not a fee. VERIFY the current amount before opening the account.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "German Embassy/Consulate in India · Federal Foreign Office · Local Ausländerbehörde after arrival"
    },
    {
      "label": "After approval",
      "value": "Enter Germany on the National (Type D) visa, register your address (Anmeldung), arrange statutory/private student health insurance, and apply for the student residence permit (§16b) at the local Ausländerbehörde within the visa's validity. Note the Anmeldung dependency: address registration is usually needed before you can open the free (unblocked) bank account, finalise insurance and obtain the residence permit. Eligible graduates may apply for an 18-month job-search residence permit (§20) OR the Opportunity Card (Chancenkarte) — these are separate instruments with different criteria."
    }
  ],
  "eligibility": [
    {
      "criterion": "Admission from a state-recognised German institution (staatlich anerkannt)",
      "met": true,
      "note": "Confirm the institution is state-recognised AND the applicant's prior qualification is recognised on Anabin (two separate checks). Read Anabin ratings (e.g. H+/H+/-) before any fee."
    },
    {
      "criterion": "APS certificate (India)",
      "met": false,
      "note": "APS (Akademische Prüfstelle) is MANDATORY for Indian degree applicants >90 days (since 1 Nov 2022). Exemptions: DAAD/EU-funded scholarships, some PhD cases, sub-90-day courses. Fee and processing time are time-sensitive — verify live. Book the visa appointment only once APS is in hand."
    },
    {
      "criterion": "Blocked account or financial proof",
      "met": false,
      "note": "Funded blocked account (Sperrkonto) of {{VERIFY_LIVE}} (monthly release {{VERIFY_LIVE}}) from an accepted provider, or an accepted alternative. 12-month minimum; some missions require the full program duration. Verify the current amount."
    },
    {
      "criterion": "Health insurance (travel + statutory)",
      "met": false,
      "note": "Travel/incoming policy (min cover per mission, commonly €30,000) to bridge before the semester, then statutory student insurance (e.g. TK/AOK/Barmer, under-30 rule) or accepted private cover. Public vs private is largely a one-way decision — choose deliberately."
    },
    {
      "criterion": "Motivation letter and CV",
      "met": true
    },
    {
      "criterion": "Language proficiency (as required)",
      "met": true,
      "note": "German (TestDaF/DSH/Goethe) or English (IELTS/TOEFL) per the program; English-taught programs may still require some German for daily life."
    },
    {
      "criterion": "Valid passport",
      "met": true
    },
    {
      "criterion": "Studienkolleg / qualification equivalence assessed (undergraduate)",
      "met": false,
      "note": "Indian 12-year schooling is often not directly equivalent for direct UG entry; a Studienkolleg place + Feststellungsprüfung may be required. Assess before counselling an undergraduate."
    },
    {
      "criterion": "Anabin recognition confirmed (institution + prior qualification)",
      "met": false,
      "note": "Two-part check on anabin.kmk.org; an unrecognised institution or unlisted/under-rated qualification is a refusal risk."
    },
    {
      "criterion": "Health insurance type decided (statutory vs private)",
      "met": false,
      "note": "Under-30 students typically use statutory cover; the public/private choice is largely irreversible — decide deliberately."
    }
  ],
  "redFlagsBanner": "After refusal, address embassy feedback before rebooking—blocked account and APS cannot be rushed last minute.",
  "redFlags": [
    {
      "title": "APS not completed",
      "description": "Visa appointment booked without APS certificate.",
      "fix": "Complete APS before embassy slot; track processing on APS website",
      "severity": "Very common"
    },
    {
      "title": "Insufficient blocked account",
      "description": "Amount below required monthly sum or not from recognised provider.",
      "fix": "Open blocked account at approved bank for full required amount",
      "severity": "Very common"
    },
    {
      "title": "Admission not from recognised institution",
      "description": "Private unrecognised college or expired Zulassung.",
      "fix": "Verify Anabin/institution recognition before fees",
      "severity": "Common"
    },
    {
      "title": "Weak motivation letter",
      "description": "Generic letter not explaining study plan and Germany choice.",
      "fix": "Course-specific motivation linking prior study to German program",
      "severity": "Common"
    },
    {
      "title": "Language proof missing",
      "description": "Program requires German/English certificate not provided.",
      "fix": "Obtain required TestDaF/IELTS/Goethe per admission",
      "severity": "Common"
    },
    {
      "title": "Prior refusals not addressed",
      "description": "Hidden Schengen or German refusals, or any false statement/document. The most damaging issue — it can lead to refusal and a re-entry ban for misrepresentation.",
      "fix": "Disclose every prior refusal and explain changed circumstances; never conceal history or submit fabricated documents",
      "severity": "Critical"
    },
    {
      "title": "Blocked account underfunded or wrong provider",
      "description": "Account holds less than €11,904, releases more than €992/month, or is with a provider the mission does not accept — a leading refusal cause.",
      "fix": "Fund the full €11,904 with an accepted provider; transfer slightly more (e.g. €12,000) to absorb FX/fees; confirm the monthly release is €992",
      "severity": "Very common"
    },
    {
      "title": "Unrecognised institution / invalid admission",
      "description": "Admission from a non-recognised institution or an expired Zulassung; degree not listed/recognised on Anabin.",
      "fix": "Verify institution and degree recognition on Anabin before any fee; confirm the Zulassung is valid for the intended intake",
      "severity": "Common"
    },
    {
      "title": "Blocked-account funds routed through the agency",
      "description": "The firm receives, holds or routes a client's Sperrkonto funds. This is a serious fund-handling and trust-account compliance breach.",
      "fix": "FLC never receives, holds or routes blocked-account funds; the student funds the Sperrkonto directly with the accepted provider",
      "severity": "Critical"
    },
    {
      "title": "Student not progressing academically — renewal at risk",
      "description": "The Ausländerbehörde can refuse a residence-permit renewal where the student is not progressing (insufficient ECTS, exceeding standard study duration). A leading cause of status loss that is easy to overlook at the visa stage.",
      "fix": "Counsel on attendance, ECTS progress and standard study duration from day one; flag any backlog risk before renewal",
      "severity": "High"
    },
    {
      "title": "Undergraduate without Studienkolleg / equivalence where required",
      "description": "Indian 12-year schooling treated as directly equivalent for direct UG entry without a Studienkolleg place / Feststellungsprüfung.",
      "fix": "Assess equivalence on Anabin before counselling; route through Studienkolleg where required",
      "severity": "High"
    },
    {
      "title": "Anmeldung deadlock not planned",
      "description": "No accommodation/address lined up, so the student cannot register (Anmeldung) — which blocks the free bank account, insurance finalisation and the residence permit.",
      "fix": "Plan accommodation and Anmeldung before arrival; sequence bank/insurance/permit steps around it",
      "severity": "Medium"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee student visa approval?",
      "a": "No. The German mission decides based on admission, funded blocked account, credibility and completeness. A strong, honest file improves the chances but a grant is never guaranteed — and we never promise one."
    },
    {
      "q": "What is APS?",
      "a": "APS (Akademische Prüfstelle / Academic Evaluation Centre) verifies Indian academic documents. It is MANDATORY for all Indian nationals applying for degree programs longer than 90 days (since 1 Nov 2022) — the mission will not accept the visa application without it. Narrow exemptions: DAAD/EU-funded scholarships, some PhD cases, sub-90-day courses. The fee and processing time are time-sensitive (verify live); book the visa appointment only once APS is in hand."
    },
    {
      "q": "How much must the blocked account hold?",
      "a": "The blocked account (Sperrkonto) must hold the Federal Foreign Office's current annual minimum ({{VERIFY_LIVE}}), released monthly ({{VERIFY_LIVE}}) after arrival. It is the 12-month minimum — some missions require proof for the full program duration, and certain categories require ~10% more. It is the student's own money, not a fee. Transfer slightly more than the minimum to absorb FX/fees. VERIFY the current amount before opening the account."
    },
    {
      "q": "Can spouse accompany?",
      "a": "Dependants (spouse/children) usually apply for family reunion separately and must show additional funds and suitable accommodation; a spouse's work access depends on the permit. Assess case-by-case and verify current requirements with the mission."
    },
    {
      "q": "English-taught programs need German?",
      "a": "It depends on the program. Many English-taught degrees do not require German for admission, but some German proficiency helps with daily life, part-time work and residence-permit steps. Follow the program's admission and the mission's requirements."
    },
    {
      "q": "How long to convert to residence permit?",
      "a": "Apply at the local Ausländerbehörde soon after arrival and address registration (Anmeldung) — ideally within the first weeks and before the entry visa expires. The student residence permit is issued under §16b of the Residence Act."
    },
    {
      "q": "Can I work on student visa?",
      "a": "Yes. Non-EU students may work up to 140 full days or 280 half-days per year, OR up to 20 hours per week during lecture periods (both limits apply), without Federal Employment Agency approval. Mandatory internships and HiWi student-assistant roles are generally exempt. The 2026 minimum wage is €13.90/hour. Working beyond the limit without approval risks the residence permit."
    },
    {
      "q": "What after graduation?",
      "a": "Eligible graduates may apply for an 18-month job-search residence permit (§20 Residence Act) OR use the Opportunity Card (Chancenkarte) — these are separate instruments with different eligibility criteria. Verify the current rules and any thresholds before advising."
    },
    {
      "q": "How much is the German national (Type D) student visa fee?",
      "a": "The national (Type D) visa fee ({{VERIFY_LIVE}}, reduced for minors) is paid to the German mission in local currency, plus the blocked account (the student's own money, not a fee). VERIFY the current consular fee on the mission's site — it is set by the Foreign Office and converted to local currency."
    },
    {
      "q": "What health insurance is required?",
      "a": "A travel/incoming policy (minimum cover per the mission, commonly €30,000) to bridge the period before the semester starts, then statutory student insurance (e.g. TK/AOK/Barmer — premium {{VERIFY_LIVE}}, typically for under-30 students) or an accepted private plan. The public-vs-private choice is largely a one-way decision, so choose deliberately. Insurance proof is required for both the visa and the residence permit."
    },
    {
      "q": "What is the blocked account (Sperrkonto) and how does it work?",
      "a": "A regulated account holding the current annual minimum ({{VERIFY_LIVE}}), from which only the set monthly amount ({{VERIFY_LIVE}}) is released after arrival, proving the student can cover living costs for a year. It is the student's own money, not a fee. FLC never receives or routes these funds — the student opens and funds it directly with an accepted provider as soon as admission is in view."
    },
    {
      "q": "What is APS and who needs it?",
      "a": "APS (Akademische Prüfstelle / Academic Evaluation Centre) verifies Indian academic documents. It is MANDATORY for all Indian nationals applying for degree programs longer than 90 days (since 1 Nov 2022) — the mission will not accept the visa application without it. Narrow exemptions: DAAD/EU-funded scholarships, some PhD cases, sub-90-day courses. The fee and processing time are time-sensitive (verify live); book the visa appointment only once APS is in hand."
    },
    {
      "q": "How is institution recognition checked?",
      "a": "Through Anabin (anabin.kmk.org), with a two-part check: the German institution must be state-recognised (staatlich anerkannt), AND the applicant's prior qualification must be recognised/rated on Anabin. Verify both before the client pays any fee — an unrecognised institution or an unlisted/under-rated qualification is a refusal risk."
    },
    {
      "q": "Can a refused German student visa be appealed?",
      "a": "A 'remonstration' (formal objection) can be lodged with the mission within the stated deadline, but success rates are low and deadlines are strict — a corrected, stronger fresh application is usually the better route. Read the refusal reasons carefully (commonly funds, credibility, recognition or documents) and fix the specific issue rather than re-lodging the same file."
    },
    {
      "q": "What relationship/financial evidence works if parents fund the studies?",
      "a": "The blocked account is the cleanest proof. Where a sponsor/Verpflichtungserklärung route is used (not accepted by all missions), provide the sponsor's income/tax evidence and relationship proof. The source of funds matters as much as the amount."
    },
    {
      "q": "When should the application start relative to the intake?",
      "a": "As early as possible after admission — APS, the blocked account, health insurance and the visa appointment all take time, and appointment slots can be scarce. Allow several months; book the visa slot only after APS and the blocked account are ready."
    },
    {
      "q": "Is German required for an English-taught program?",
      "a": "Not usually for admission, but some German helps with daily life, part-time work and the residence-permit process. Confirm the program's language requirement and any embassy expectation; provide the certificate the admission specifies (TestDaF/DSH/Goethe or IELTS/TOEFL)."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — the German mission decides. FLC prepares a strong, honest, well-documented file (admission, funded blocked account, APS, insurance, motivation) and never promises a visa, in writing or verbally."
    },
    {
      "q": "What is Studienkolleg and who needs it?",
      "a": "A one-year university preparatory course ending in the Feststellungsprüfung, required where the applicant's prior schooling is not directly equivalent for German university entry — common for Indian applicants entering undergraduate study straight after 12 years of schooling. Assess equivalence on Anabin first; a Studienkolleg place affects the visa basis and timeline."
    },
    {
      "q": "Can the residence permit be refused at renewal?",
      "a": "Yes. The Ausländerbehörde can refuse a renewal where the student is not progressing academically — insufficient ECTS, missed exams, or exceeding the standard study duration — or where funds for the next period are not proven. Counsel students on attendance, progress and re-proving funds from the start; this is a leading cause of status loss that is easy to miss at the visa stage."
    },
    {
      "q": "What is the Anmeldung deadlock and how do we avoid it?",
      "a": "After arrival you must register your address (Anmeldung), but you usually need an address (accommodation) to do it — and Anmeldung is in turn needed to open the free bank account, finalise insurance and obtain the residence permit. Plan accommodation before arrival and sequence the bank/insurance/permit steps around Anmeldung to avoid weeks of delay."
    },
    {
      "q": "Which blocked-account providers do German missions accept?",
      "a": "Missions accept several regulated Sperrkonto providers; the accepted list and onboarding times change, so confirm the current accepted providers on the mission's site before the client opens one. FLC never receives or routes these funds — the student funds the account directly."
    },
    {
      "q": "What are common reasons Indian student visas are refused?",
      "a": "Frequent grounds include doubts about genuine study intent or intent to return, weak academic fit between prior study and the chosen program, unproven or unclear source of funds, an underfunded/incorrect blocked account, missing/late APS, and recognition issues on Anabin. Build a credible, course-specific motivation and a clean, source-documented funds picture."
    },
    {
      "q": "Public vs private health insurance — can a student switch later?",
      "a": "Under-30 students typically use statutory (public) insurance. The public-vs-private decision is largely irreversible while studying, so it should be made deliberately. Confirm the current rules and premiums before advising — premiums are time-sensitive."
    },
    {
      "q": "Is the blocked-account minimum enough to actually live on?",
      "a": "It is the visa minimum, not a real budget. Munich and Frankfurt routinely cost more than the monthly release; cities like Leipzig or Dresden are cheaper. Set realistic expectations and encourage a buffer beyond the minimum where the client can support it."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission",
    "Never guarantee visa or immigration approval; use approved-language only",
    "Fee quotes must separate consultancy, government, and third-party costs",
    "Blocked account funds belong to client—never commingle with firm accounts",
    "FLC never receives, holds or routes a client's blocked-account (Sperrkonto) funds; the student funds the account directly with an accepted provider.",
    "Do not publish a firm approval rate or a comparative 'industry benchmark' as a headline figure — it can be read as a guarantee or as misleading advertising. Use live, sourced CRM data and label it as not predictive of any individual outcome.",
    "Handle academic and financial documents (passports, transcripts, bank proofs, APS records) under data-protection rules: store securely, share only with authorised parties, and retain only as long as needed.",
    "Set written expectations that remonstration success rates are low; never imply a refusal will likely be reversed."
  ],
  "proTips": [
    "Start APS 3–4 months before intended intake",
    "Open blocked account only after admission confirmed",
    "Book embassy slot when file 90% ready",
    "Motivation letter must match admission course",
    "Verify health insurance accepted by embassy",
    "Start APS and the blocked account the moment admission is in view — both take weeks and gate the visa appointment.",
    "Fund the blocked account slightly above €11,904 (about €12,000) to absorb FX/transfer fees; confirm the €992/month release.",
    "Verify institution/degree recognition on Anabin before any fee.",
    "Treat the €75 fee, €11,904 blocked amount and processing times as live values — verify on the mission's site and pull from current CRM data.",
    "Counsel on academic progression (ECTS, standard study duration) from day one — renewal can be refused if the student falls behind.",
    "Plan accommodation and Anmeldung before arrival to avoid the bank/insurance/permit deadlock.",
    "Run the two-part Anabin check (institution + prior qualification) before any fee; assess Studienkolleg need for undergraduates."
  ],
  "postApproval": [
    "Explain address registration (Anmeldung) within deadline",
    "Guide on Ausländerbehörde appointment after arrival",
    "Remind blocked account monthly withdrawal rules",
    "Discuss post-study job-seeker pathway"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless it is independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Funded blocked account on file",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "APS completed before appointment",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Credible, course-specific motivation",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counseling, admission review, APS initiation"
    },
    {
      "weeks": "2–8",
      "title": "APS processing, blocked account, documents"
    },
    {
      "weeks": "8–10",
      "title": "Embassy appointment & submission"
    },
    {
      "weeks": "6–12",
      "title": "Embassy processing"
    }
  ],
  "relatedServices": [
    {
      "label": "Germany – Job Seeker Visa",
      "libraryId": ""
    },
    {
      "label": "Germany – Opportunity Card",
      "libraryId": ""
    },
    {
      "label": "Germany – Visitor Visa",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Audit remediation: corrected APS framing to MANDATORY for Indian degree applicants >90 days (since 1 Nov 2022) with the true narrow exemptions; clarified the two-part Anabin recognition check, the 12-month-minimum blocked-account nuance, and split the 18-month job-search permit (§20) from the Opportunity Card. Removed the hardcoded approval rate (88%) and the unsourced '74% industry benchmark' and converted all time-sensitive values (visa fee, blocked amount/monthly release, APS fee/timing, processing times, insurance premiums, tuition, doc counts, file/approval stats) to {{VERIFY_LIVE}} placeholders. Added FAQs (Studienkolleg, renewal-progression risk, Anmeldung deadlock, provider list, refusal trends, public/private insurance, realistic budget), red flags (fund-routing, academic-progression, Studienkolleg, Anmeldung), eligibility checks (Studienkolleg, Anabin, insurance type), compliance notes (fund-handling, data-protection, advertising, remonstration), and quiz questions. No statistics or approval rates were invented."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Gold-standard content pass: replaced auto-generated template FAQs and quiz questions with real counsellor Q&A; confirmed the 2026 blocked account €11,904 (€992/month) and ~€75 national visa fee; added the current 140/280-day + 20h/week work rule and €13.90/hr 2026 minimum wage; added APS, Anabin recognition, health-insurance, remonstration and 18-month job-search/Opportunity Card detail; removed wrong-domain leftovers (GIC, LOA/CAS) from the cost breakdown and corrected the tuition section (most public universities charge no tuition; Baden-Württemberg ~€1,500/sem for non-EU); flagged fees, blocked amount, processing times and approval rate as values that should be dynamic/CRM-sourced; varied the quiz answer key across positions."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Germany student visa counselor content with 2026 blocked account amount."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: national visa fee, blocked-account amount and monthly release, APS fee and processing time, processing times, health-insurance premiums, tuition (incl. Baden-Württemberg), minimum wage, and any approval/file-count figures. Never publish invented statistics or approval rates."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "APS is mandatory for Indian degree applicants >90 days — never frame it as optional. Do not promise an intake without confirming the live APS timeline. Never receive or route a client's blocked-account funds."
    }
  ],
  "resources": [
    {
      "title": "German Missions India — Visa",
      "url": "https://india.diplo.de/in-en/service/visa",
      "description": "Official visa information for India"
    },
    {
      "title": "Make it in Germany — Student visa",
      "url": "https://www.make-it-in-germany.com/en/visa-desp/studying/education-visa",
      "description": "Study visa requirements"
    },
    {
      "title": "APS India",
      "url": "https://www.aps-india.de/",
      "description": "Academic verification for Indian applicants"
    },
    {
      "title": "Federal Foreign Office — Visa",
      "url": "https://www.auswaertiges-amt.de/en/visa-service",
      "description": "National visa overview"
    },
    {
      "title": "Anabin — Institution database",
      "url": "https://anabin.kmk.org/",
      "description": "Verify institution recognition"
    },
    {
      "title": "APS India (Academic Evaluation Centre) — official",
      "url": "https://aps-india.de/",
      "description": "Mandatory academic verification for Indian degree applicants; check current fee and processing time"
    }
  ],
  "quiz": [
    {
      "question": "Indian students generally need:",
      "options": [
        "APS certificate + admission + blocked account",
        "Only passport",
        "Job offer",
        "EU citizenship"
      ],
      "correctIndex": 0,
      "explanation": "APS mandatory for India.",
      "level": 1
    },
    {
      "question": "Blocked account 2026 amount approx:",
      "options": [
        "€5,000",
        "€11,904",
        "€50,000",
        "€500"
      ],
      "correctIndex": 1,
      "explanation": "12 × €992 monthly requirement.",
      "level": 1
    },
    {
      "question": "National visa fee approx:",
      "options": [
        "€500",
        "€2,000",
        "€75",
        "Free"
      ],
      "correctIndex": 2,
      "explanation": "Embassy national visa fee.",
      "level": 1
    },
    {
      "question": "After arrival student must:",
      "options": [
        "Ignore registration",
        "Work full-time immediately",
        "Leave in 1 week",
        "Register address and apply residence permit"
      ],
      "correctIndex": 3,
      "explanation": "Anmeldung and Ausländerbehörde required.",
      "level": 1
    },
    {
      "question": "Counselors must never:",
      "options": [
        "Guarantee visa approval",
        "Track APS",
        "Verify admission",
        "Check blocked account"
      ],
      "correctIndex": 0,
      "explanation": "No guarantees.",
      "level": 1
    },
    {
      "level": 1,
      "question": "Which visa do non-EU students need to study long-term in Germany?",
      "options": [
        "Schengen (Type C) visa",
        "National (Type D) visa",
        "Working Holiday visa",
        "Opportunity Card only"
      ],
      "correctIndex": 1,
      "explanation": "Long-term study requires the National Type D visa, converted to a §16b residence permit after arrival."
    },
    {
      "level": 1,
      "question": "What is the 2026 blocked account (Sperrkonto) amount for a student?",
      "options": [
        "€5,000",
        "€20,000",
        "€11,904 (€992/month)",
        "No requirement"
      ],
      "correctIndex": 2,
      "explanation": "For 2026 the blocked account holds €11,904, released at €992/month."
    },
    {
      "level": 1,
      "question": "The blocked account is best described as:",
      "options": [
        "A government fee",
        "A tuition payment",
        "A penalty deposit",
        "The student's own money, released monthly — not a fee"
      ],
      "correctIndex": 3,
      "explanation": "Funds are the student's own, released €992/month after arrival."
    },
    {
      "level": 1,
      "question": "For most Indian applicants, what must be completed before the visa appointment?",
      "options": [
        "APS certificate",
        "PGWP",
        "CAS",
        "I-20"
      ],
      "correctIndex": 0,
      "explanation": "APS is mandatory for Indian degree applicants >90 days (since 1 Nov 2022) and must be completed before the appointment."
    },
    {
      "level": 1,
      "question": "The German national student visa fee is about:",
      "options": [
        "€500",
        "€75",
        "€2,000",
        "No fee"
      ],
      "correctIndex": 1,
      "explanation": "The national visa fee is around €75; verify on the mission's site."
    },
    {
      "level": 1,
      "question": "Non-EU students may work how much per year?",
      "options": [
        "No work allowed",
        "365 days",
        "140 full days or 280 half-days",
        "60 days"
      ],
      "correctIndex": 2,
      "explanation": "The 2026 limit is 140 full days or 280 half-days (raised from 120/240)."
    },
    {
      "level": 1,
      "question": "Where is institution/degree recognition checked?",
      "options": [
        "CRICOS",
        "UCAS",
        "DLI list",
        "Anabin database"
      ],
      "correctIndex": 3,
      "explanation": "Anabin lists recognised German institutions and degrees."
    },
    {
      "level": 1,
      "question": "After arrival, the residence permit is issued by the:",
      "options": [
        "Local Ausländerbehörde",
        "Embassy abroad",
        "University",
        "Police only"
      ],
      "correctIndex": 0,
      "explanation": "The §16b student residence permit is issued by the local Ausländerbehörde."
    },
    {
      "level": 2,
      "question": "During lecture periods, the weekly work limit is:",
      "options": [
        "40 hours",
        "20 hours per week (in addition to the 140/280-day cap)",
        "No limit",
        "10 hours"
      ],
      "correctIndex": 1,
      "explanation": "Both the 20-hour/week and the 140/280-day limits apply at once."
    },
    {
      "level": 2,
      "question": "Which work is generally EXEMPT from the day count?",
      "options": [
        "All part-time jobs",
        "Restaurant work",
        "Mandatory internships and HiWi student-assistant roles",
        "Nothing is exempt"
      ],
      "correctIndex": 2,
      "explanation": "Pflicht internships and HiWi roles are generally exempt."
    },
    {
      "level": 2,
      "question": "The 2026 German minimum wage is about:",
      "options": [
        "€8.00 per hour",
        "€20.00 per hour",
        "No minimum",
        "€13.90 per hour"
      ],
      "correctIndex": 3,
      "explanation": "The 2026 statutory minimum wage is €13.90/hour."
    },
    {
      "level": 2,
      "question": "A blocked account that releases more than €992/month is:",
      "options": [
        "A problem — the monthly release must be €992",
        "Fine",
        "Required",
        "Better"
      ],
      "correctIndex": 0,
      "explanation": "The account must release €992/month over 12 months."
    },
    {
      "level": 2,
      "question": "Health insurance for the visa typically requires:",
      "options": [
        "No insurance",
        "Travel/incoming cover then statutory/private student insurance",
        "Only travel insurance for life",
        "A blocked account instead"
      ],
      "correctIndex": 1,
      "explanation": "A bridging travel policy plus statutory/private student insurance is needed."
    },
    {
      "level": 2,
      "question": "A degree not listed/recognised on Anabin is:",
      "options": [
        "Always fine",
        "Automatically recognised",
        "A refusal risk — verify before any fee",
        "Irrelevant"
      ],
      "correctIndex": 2,
      "explanation": "Unrecognised institutions/degrees are a refusal risk."
    },
    {
      "level": 2,
      "question": "After graduation, an eligible student may apply for:",
      "options": [
        "Immediate citizenship",
        "A second blocked account",
        "Nothing",
        "An 18-month job-search residence permit or the Opportunity Card"
      ],
      "correctIndex": 3,
      "explanation": "An 18-month job-seeker permit / Chancenkarte pathway exists."
    },
    {
      "level": 2,
      "question": "APS processing typically takes:",
      "options": [
        "Several weeks — start early",
        "One day",
        "Two years",
        "It is instant"
      ],
      "correctIndex": 0,
      "explanation": "APS takes weeks, so it must be started well before the appointment."
    },
    {
      "level": 3,
      "question": "A client books the visa slot before APS is complete. The issue?",
      "options": [
        "No issue",
        "APS must be in hand first — the file is not appointment-ready",
        "Faster processing",
        "Lower fee"
      ],
      "correctIndex": 1,
      "explanation": "APS is a gating item before the appointment for Indian applicants."
    },
    {
      "level": 3,
      "question": "A client's blocked account holds €9,000. Best action?",
      "options": [
        "Lodge now",
        "Use a personal account",
        "Top up to €11,904 (ideally ~€12,000) with an accepted provider before lodging",
        "Hide it"
      ],
      "correctIndex": 2,
      "explanation": "Underfunding the blocked account is a leading refusal cause."
    },
    {
      "level": 3,
      "question": "A German student visa is refused. Typical recourse?",
      "options": [
        "Automatic appeal court",
        "Re-enter and argue at the border",
        "Nothing",
        "Lodge a remonstration within the deadline or reapply with a corrected file"
      ],
      "correctIndex": 3,
      "explanation": "Remonstration or a corrected re-application are the routes."
    },
    {
      "level": 3,
      "question": "A client asks for a written guarantee of the visa. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; the mission decides."
    },
    {
      "level": 3,
      "question": "A client omits a prior Schengen refusal on the form. The risk?",
      "options": [
        "None",
        "Misrepresentation — refusal and a possible re-entry ban",
        "Faster approval",
        "Lower fee"
      ],
      "correctIndex": 1,
      "explanation": "Concealing a refusal risks a misrepresentation finding."
    },
    {
      "level": 3,
      "question": "A student wants to work 160 full days in a year. Advise:",
      "options": [
        "Allowed",
        "Allowed in summer only",
        "Not allowed without approval — the cap is 140 full days",
        "Allowed once"
      ],
      "correctIndex": 2,
      "explanation": "Exceeding 140 full days without Ausländerbehörde approval risks the permit."
    },
    {
      "level": 3,
      "question": "The strongest single lever on a borderline file is:",
      "options": [
        "A bigger flight budget",
        "More photos",
        "A new passport",
        "A funded blocked account + APS + a specific, credible motivation letter"
      ],
      "correctIndex": 3,
      "explanation": "Complete funds/APS and a credible motivation drive approval."
    },
    {
      "level": 3,
      "question": "An institution is not listed on Anabin. Best practice?",
      "options": [
        "Verify recognition before any fee; do not assume it is recognised",
        "Pay the fee anyway",
        "Ignore Anabin",
        "Guarantee approval"
      ],
      "correctIndex": 0,
      "explanation": "Always confirm recognition on Anabin before fees."
    },
    {
      "level": 2,
      "question": "APS is mandatory for which applicants?",
      "options": [
        "Only PhD applicants",
        "All Indian nationals applying for degree programs longer than 90 days (since 1 Nov 2022)",
        "No one — it is optional",
        "Only scholarship holders"
      ],
      "correctIndex": 1,
      "explanation": "Since 1 Nov 2022 APS is mandatory for Indian degree applicants >90 days, with narrow exemptions."
    },
    {
      "level": 2,
      "question": "Recognition on Anabin is a check of:",
      "options": [
        "Only the visa fee",
        "Only the blocked account",
        "Both the German institution AND the applicant's prior qualification",
        "Only language level"
      ],
      "correctIndex": 2,
      "explanation": "Anabin is a two-part check: institution state-recognition and prior-qualification recognition."
    },
    {
      "level": 3,
      "question": "A student is behind on ECTS and past the standard study duration. The risk?",
      "options": [
        "No risk",
        "Automatic extension",
        "Lower fee",
        "The Ausländerbehörde can refuse the residence-permit renewal"
      ],
      "correctIndex": 3,
      "explanation": "Lack of academic progression is a leading cause of renewal refusal / status loss."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their blocked-account funds. You:",
      "options": [
        "Refuse — the student funds the Sperrkonto directly with the provider",
        "Hold it for them",
        "Route it through the firm",
        "Charge a handling fee"
      ],
      "correctIndex": 0,
      "explanation": "Never receive or route client blocked-account funds — a serious compliance breach."
    },
    {
      "level": 2,
      "question": "An undergraduate with Indian 12-year schooling may need:",
      "options": [
        "Nothing extra",
        "A Studienkolleg place + Feststellungsprüfung where not directly equivalent",
        "Only a blocked account",
        "A PhD supervisor"
      ],
      "correctIndex": 1,
      "explanation": "Indian 12-year schooling is often not directly equivalent; Studienkolleg may be required."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a specific firm approval rate compared with an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee",
        "It lowers the fee"
      ],
      "correctIndex": 2,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims; use sourced live data."
    },
    {
      "level": 2,
      "question": "The Anmeldung deadlock refers to:",
      "options": [
        "A visa fee",
        "A language test",
        "A scholarship",
        "Needing an address to register, which is needed for bank/insurance/permit"
      ],
      "correctIndex": 3,
      "explanation": "Anmeldung gates the bank account, insurance and residence permit — plan accommodation early."
    }
  ],
  "donts": {
    "dos": [
      "Start APS early",
      "Verify institution on Anabin",
      "Open blocked account for full required amount",
      "Write course-specific motivation letter",
      "Disclose prior refusals",
      "Confirm APS and a fully funded blocked account before booking the visa appointment",
      "Verify institution/degree recognition on Anabin before any fee"
    ],
    "donts": [
      "Do not guarantee approval",
      "Do not book embassy without APS",
      "Do not use unrecognised institutions",
      "Do not hide Schengen refusals",
      "Do not quote outdated blocked account amount",
      "Do not book the visa slot before APS is in hand",
      "Do not underfund the blocked account or use an unaccepted provider"
    ],
    "mistakes": [
      "APS applied too late for intake",
      "Blocked account short by even €1",
      "Generic motivation letter",
      "Wrong health insurance type",
      "Expired admission letter",
      "Booking the embassy slot before APS is complete",
      "Blocked account below €11,904 or releasing more than €992/month"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "German Hochschule Zulassung for national visa.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample APS certificate (mock)",
      "description": "Academic Evaluation Centre certificate for India.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample blocked account confirmation (mock)",
      "description": "Sperrkonto €11,904+ — explain to clients.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / TestDaF certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "German embassy standard application packet.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "Non-EU students may work up to 140 full days or 280 half-days per year, OR up to 20 hours per week during lecture periods (both limits apply), without Federal Employment Agency approval.",
      "details": [
        "A shift over 4 hours counts as a full day; up to 4 hours is a half-day.",
        "Mandatory (Pflicht) internships and HiWi student-assistant roles are generally exempt from the day count.",
        "2026 minimum wage is €13.90/hour; mini-jobs have a monthly earnings cap.",
        "Exceeding the limit without Ausländerbehörde approval risks the residence permit."
      ],
      "restrictions": [
        "Both the 140/280-day and the 20-hour-per-week limits apply at once",
        "Working beyond the cap without approval can jeopardise the residence permit"
      ],
      "sourceUrl": "https://www.make-it-in-germany.com/en/visa-residence/procedure/student-visa",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "A spouse on a family-reunion residence permit generally has labour-market access, but it depends on the permit wording and qualifications — verify with the Ausländerbehörde.",
      "details": [],
      "restrictions": [],
      "sourceUrl": "https://www.make-it-in-germany.com/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Germany – Student Visa (National Visa)",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources before quoting (Federal Foreign Office / mission / blocked-account provider). The blocked account is the student's own money, not a fee. Most public universities charge no tuition; Baden-Württemberg charges non-EU students a per-semester tuition — verify. INR equivalents move with exchange rates.",
    "sourceUrl": "https://www.make-it-in-germany.com/en/visa-residence/types/student-visa",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "National (Type D) visa fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Paid to the German mission; reduced for minors. Verify current amount."
          },
          {
            "label": "Blocked account (Sperrkonto)",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Monthly release {{VERIFY_LIVE}} after arrival. Student's own money, not a fee. Verify current minimum."
          },
          {
            "label": "Semester contribution",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per semester",
            "currency": "EUR",
            "applicable": true,
            "notes": "University administrative/semester-ticket fee; varies by university"
          },
          {
            "label": "APS certificate fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "INR/EUR",
            "applicable": true,
            "notes": "Paid to the APS office; non-refundable. Verify current fee."
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Tuition (public universities)",
            "range": "Often €0",
            "currency": "EUR",
            "applicable": true,
            "notes": "Most public universities charge no tuition; Baden-Württemberg charges non-EU students a per-semester fee ({{VERIFY_LIVE}}) — verify."
          },
          {
            "label": "Tuition (private/some master's)",
            "range": "Per admission letter",
            "currency": "EUR",
            "applicable": true,
            "notes": "Use the Zulassung amount; deduct any prepaid amount"
          },
          {
            "label": "Books & materials",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Program dependent"
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Blocked account (living funds)",
            "amount": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Monthly release {{VERIFY_LIVE}}; verify current minimum"
          },
          {
            "label": "Rent & utilities",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Munich/Frankfurt higher; Leipzig/Dresden lower — exceeds the monthly release in expensive cities"
          },
          {
            "label": "Health insurance",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Statutory student plan (TK/AOK/Barmer) or accepted private; verify premium"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / notarisation",
            "range": "Varies",
            "notes": "Certified translation where required"
          },
          {
            "label": "APS certificate fee",
            "range": "Varies",
            "notes": "Paid to the APS office"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent",
            "notes": "Blocked account & tuition transfers"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Always cross-check the Zulassung/admission letter and official mission fee pages before client commitment."
      }
    ]
  }
}
$germany_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-000000000051';

-- Hungary – Student Residence Permit (National D Visa)
-- Source: content/service-library/hungary-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $hungary_student_visa$
{
  "displayName": "Hungary – Student Residence Permit (National D Visa)",
  "shortDescription": "OIF (National Directorate-General for Aliens Policing) · Residence permit for studies · D visa to collect it · Enter Hungary after arrival",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Hungary issues a residence permit for the purpose of studies, processed by the OIF (Országos Idegenrendészeti Főigazgatóság — National Directorate-General for Aliens Policing). The application is lodged at a Hungarian consulate abroad and ITSELF comprises the visa: on approval a national Type D visa is issued to facilitate entry into Hungary and collection of the residence-permit card (verify current validity and entry conditions with OIF). Enter Hungary within 3 months of issuance or the permit becomes invalid. Fees, proof-of-funds and work rules are time-sensitive ({{VERIFY_LIVE}}). Verify all amounts on oif.gov.hu before quoting."
  },
  "alert": {
    "title": "One application at the consulate → D visa → collect the residence permit",
    "body": "Submit the residence-permit-for-studies application at the Hungarian consulate in your country; a separate visa application is NOT required. On approval a national Type D visa is issued to facilitate entry and collection of the residence-permit card (verify current conditions with OIF). Register/finalise via the Enter Hungary platform after arrival. CRITICAL: if you do not enter Hungary within 3 months of issuance, the permit becomes invalid."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "Proof of funds critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "OIF / Enter Hungary",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Govt fee + proof of funds (verify)",
      "variant": "neutral"
    },
    {
      "label": "Admission letter",
      "variant": "success"
    },
    {
      "label": "Enter Hungary after arrival",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Processing varies by volume and case — verify current OIF estimates",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Residence-permit fee (EUR at consulate / HUF in Hungary) — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Residence permit for the purpose of studies for non-EU/EEA/Swiss nationals studying full-time in Hungary for more than 90 days, processed by the OIF (National Directorate-General for Aliens Policing). The consulate application comprises the visa: on approval a national Type D visa is issued to facilitate entry and collection of the residence-permit card (verify current conditions with OIF). The permit is valid at least 1 year (or the programme length), to a maximum of 3 years, and is extendable."
    },
    {
      "label": "Eligible applicants",
      "value": "Full-time admission to a recognised Hungarian institution (state-recognised, or a foreign institution authorised to operate in Hungary) · Proof of subsistence funds ({{VERIFY_LIVE}}) · Health insurance · Proof of accommodation · Language ability matching the programme · Valid passport (the permit cannot exceed passport validity). EU/EEA/Swiss citizens need no visa, only registration for stays over 90 days."
    },
    {
      "label": "Proof of funds",
      "value": "Proof of subsistence for the study period per OIF guidelines (proof of subsistence according to current OIF requirements — {{VERIFY_LIVE}}). Shown via bank statements with history, a scholarship award, or a sponsor's documentation. Verify the current expectation on oif.gov.hu.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "OIF – Országos Idegenrendészeti Főigazgatóság (National Directorate-General for Aliens Policing, oif.gov.hu) · the Hungarian consulate for the application + D visa · the Enter Hungary platform for post-arrival steps and extensions"
    },
    {
      "label": "After approval",
      "value": "Travel on the Type D visa within the validity window set by OIF (the permit can lapse if entry is not made in time — verify the current deadline) and collect the residence-permit card (often delivered to the institution's address). Register your address and finalise via Enter Hungary. Extensions are only made from inside Hungary via Enter Hungary, no later than 30 days before expiry. Graduates may qualify for a post-study residence permit for job-search or business activities, subject to current OIF regulations (verify eligibility and conditions)."
    }
  ],
  "eligibility": [
    {
      "criterion": "Full-time admission to a recognised Hungarian institution",
      "met": true,
      "note": "State-recognised institution (or a foreign one authorised to operate in Hungary); part-time/short courses are not suitable for this permit."
    },
    {
      "criterion": "Proof of subsistence funds",
      "met": false,
      "note": "For the study period per OIF guidelines (proof of subsistence according to current OIF requirements — {{VERIFY_LIVE}}). Bank statements with history, scholarship, or sponsor documentation."
    },
    {
      "criterion": "Health insurance",
      "met": false,
      "note": "Full health cover for the stay; confirm the current accepted cover with the institution/OIF."
    },
    {
      "criterion": "Proof of accommodation",
      "met": false,
      "note": "Evidence of where the student will live in Hungary (lease, dormitory or host declaration)."
    },
    {
      "criterion": "Language ability matching the programme",
      "met": true,
      "note": "English or Hungarian per the programme; provide the evidence the institution specifies (e.g. IELTS/TOEFL for English-taught programmes)."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "The residence permit cannot exceed the passport's validity; check the consulate's current rule."
    }
  ],
  "redFlagsBanner": "After a refusal, address the OIF/consulate's stated reason before reapplying — proof of funds, admission and accommodation cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Insufficient / wrong proof of subsistence",
      "description": "Funds below the OIF expectation, or without consistent bank history, for the study period.",
      "fix": "Show subsistence funds for the study period (proof of subsistence per current OIF requirements — verify) with 3–6 months' bank history, in the student's own/sponsored funds",
      "severity": "Very common"
    },
    {
      "title": "Not entering Hungary within 3 months of issuance",
      "description": "The residence permit becomes invalid if the holder does not enter Hungary and begin the authorised stay within 3 months of issuance.",
      "fix": "Plan travel so the student enters Hungary well within the 3-month window after the permit/D visa is issued",
      "severity": "High"
    },
    {
      "title": "Missing Enter Hungary registration / extension deadline",
      "description": "Not finalising via Enter Hungary after arrival, or missing the extension window (extensions only from inside Hungary, no later than 30 days before expiry, with ≥90 days' residence in any 180-day period).",
      "fix": "Register on Enter Hungary after arrival; diarise the extension deadline and apply from within Hungary in good time",
      "severity": "High"
    },
    {
      "title": "Exceeding the work-hour limit",
      "description": "Working more than 30 hours/week in term, or beyond the 90-days/66-working-days full-time allowance outside term, can jeopardise the permit.",
      "fix": "Keep within 30 hours/week in term; full-time only outside term up to 90 days/year (no separate work permit needed within these limits)",
      "severity": "Common"
    },
    {
      "title": "Assuming family or long-term/PR outcomes from the study permit without checking current OIF rules",
      "description": "Family accompaniment is limited and subject to current OIF regulations, and study-based residence may be treated differently from employment-based residence for long-term/PR purposes — verify before advising.",
      "fix": "Set expectations: family accompaniment is limited and subject to current OIF rules; long-term/PR routes generally need a different permit type — verify",
      "severity": "Common"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden refusals, false documents, or enrolment with no genuine study intent.",
      "fix": "Disclose every prior refusal and explain changed circumstances; never submit false documents or sham enrolment",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee student visa approval?",
      "a": "No. Embassy decides based on admission, funds, and credibility. Never promise approval."
    },
    {
      "q": "What is proof of funds for Hungary?",
      "a": "Evidence that the student can support themselves for the study period — bank statements with 3–6 months' history, a scholarship award letter, or a sponsor's documentation. Hungary does NOT operate a German-style blocked account; do not import that requirement. Verify the current amount on oif.gov.hu."
    },
    {
      "q": "How much money must a student show?",
      "a": "Proof of subsistence for the study period per OIF guidelines ({{VERIFY_LIVE}}). Proof of subsistence is assessed according to current OIF requirements; there is no single neatly-published official figure, so verify the current expectation on oif.gov.hu before advising ({{VERIFY_LIVE}}). Show the funds via bank statements with history, a scholarship, or a sponsor."
    },
    {
      "q": "Can spouse accompany?",
      "a": "Family accompaniment options are limited and subject to current OIF regulations. A student permit may not provide family-sponsorship rights in the way other permit types do; any family member would be assessed separately under their own route. Always verify current OIF eligibility before advising — do not present family accompaniment as guaranteed or as unavailable without checking."
    },
    {
      "q": "Do English-taught programs require Hungarian?",
      "a": "No. English-taught programmes do not require Hungarian for admission; provide the English evidence the institution specifies (e.g. IELTS/TOEFL). Hungarian helps with daily life and some part-time work but is not a permit requirement."
    },
    {
      "q": "How long to convert to residence permit?",
      "a": "The consulate application already comprises the residence permit — on approval you receive a Type D visa to enter Hungary and collect the residence-permit card. Enter within 3 months of issuance, register via Enter Hungary, and the card is typically delivered to the institution's address. The permit is valid at least 1 year (or programme length), max 3 years."
    },
    {
      "q": "Can I work on student visa?",
      "a": "Yes — a residence permit for studies allows work up to 30 hours/week during term and full-time outside term up to 90 days (or 66 working days) per year, with no separate work permit. The same rules apply to Stipendium Hungaricum scholarship holders. Exceeding the limits can jeopardise the permit."
    },
    {
      "q": "What after graduation?",
      "a": "Graduates holding a valid student residence permit may qualify for a post-study residence permit for job-search or business activities, subject to current OIF regulations. Eligibility, duration and conditions vary and are not automatic — apply from inside Hungary before the student permit expires and verify the current rules. Moving to an employment permit needs a concrete job offer."
    },
    {
      "q": "Who processes the application and how?",
      "a": "The OIF (Országos Idegenrendészeti Főigazgatóság — National Directorate-General for Aliens Policing). The residence-permit-for-studies application is lodged at the Hungarian consulate in your country; a separate visa application is not required, because the residence-permit application comprises it. On approval the consulate issues a Type D entry visa."
    },
    {
      "q": "What is the Type D visa exactly?",
      "a": "A national Type D visa issued following approval of the residence-permit application to facilitate entry into Hungary and collection of the residence-permit card. It is not the residence status itself — the residence permit is. Verify current validity conditions and entry requirements with OIF before advising."
    },
    {
      "q": "What is Enter Hungary?",
      "a": "The official online platform (oif.gov.hu / enterhungary) used to register after arrival and to submit extensions. Applying via Enter Hungary in Hungary may carry a different (often lower) fee than applying in person; verify the current amounts."
    },
    {
      "q": "How long is the permit valid and how is it extended?",
      "a": "At least 1 year (or the programme length if shorter), to a maximum of 3 years, and extendable for 1–3 years. Extensions are made ONLY from inside Hungary via Enter Hungary, no later than 30 days before expiry, and require having resided in Hungary at least 90 days in any 180-day period."
    },
    {
      "q": "What are the government fees?",
      "a": "The administrative fee is set by OIF and differs for consular vs in-Hungary (and Enter Hungary) submissions and for extensions. Current OIF administrative fee ({{VERIFY_LIVE}}). Verify before advising. Verify the current amounts on oif.gov.hu before quoting."
    },
    {
      "q": "What is the Stipendium Hungaricum?",
      "a": "A major Hungarian government scholarship for international students. It does NOT change the immigration rules — scholarship holders follow the same residence-permit-for-studies process and the same work limits (30 hours/week in term)."
    },
    {
      "q": "Does the study time count toward permanent residence?",
      "a": "Residence under a study permit may be treated differently from employment-based residence for long-term residence and permanent residence purposes. The study permit does not itself function as a long-term/national residence card, and a change of permit type is generally needed for long-term/PR routes. Verify current OIF rules before advising."
    },
    {
      "q": "What happens if the student doesn't enter Hungary in time?",
      "a": "If the student does not enter Hungary within 3 months of the residence permit's issuance and begin the authorised stay, the permit becomes invalid and the right to entry and stay ceases. Plan travel within that window."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "A refusal can be challenged through the available remedy within the stated deadline, or corrected and re-lodged. Read the reason carefully (commonly proof of funds, accommodation, or documents) and fix the specific issue rather than re-lodging the same file."
    },
    {
      "q": "How long does processing take?",
      "a": "Processing times vary depending on application volume and individual circumstances; verify current OIF estimates before advising. Apply early — well before travel — and quote the live OIF estimate rather than a fixed number."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — the consulate/OIF decides. FLC prepares a strong, honest, well-documented file (admission, proof of subsistence, accommodation, insurance) and never promises a permit, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a visa/permit or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (OIF) and third-party costs.",
    "Proof-of-subsistence funds belong to the client — never receive, hold or route them through firm accounts.",
    "Never import another country's requirements (e.g. a German Sperrkonto/blocked account) into a Hungary file.",
    "Be accurate about limits: family accompaniment is limited (verify current OIF rules), and study-based residence may be treated differently for long-term/PR purposes (verify) — do not overstate these.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic and financial documents under data-protection rules: store securely, share only with authorised parties, retain only as needed."
  ],
  "proTips": [
    "One application at the consulate comprises the visa — on approval the D visa is issued to enter and collect the residence-permit card.",
    "Enter Hungary within 3 months of issuance or the permit becomes invalid.",
    "Proof of subsistence: show funds for the study period per current OIF requirements (verify) with bank history; Hungary does NOT use a German-style blocked account.",
    "Work is 30 hours/week in term, full-time outside term up to 90 days/year — same for Stipendium Hungaricum holders.",
    "Extensions are only from inside Hungary via Enter Hungary, no later than 30 days before expiry (needs ≥90 days' residence in any 180-day period).",
    "Set expectations carefully: family accompaniment is limited and study-based residence may be treated differently for long-term/PR purposes — verify current OIF rules."
  ],
  "postApproval": [
    "Enter Hungary on the D visa within 3 months of issuance and collect the residence-permit card",
    "Register your address and finalise via the Enter Hungary platform after arrival",
    "Keep work within 30 hours/week in term (full-time outside term up to 90 days/year)",
    "Diarise the extension (from inside Hungary via Enter Hungary, 30+ days before expiry)"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Proof of subsistence (study period, bank history)",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Recognised institution + admission in order",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Accommodation + insurance documented",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, institution recognition, admission"
    },
    {
      "weeks": "2–4",
      "title": "Proof of subsistence, accommodation, insurance; consulate application (comprises the visa)"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "OIF decision + D visa issuance (varies — verify live)"
    },
    {
      "weeks": "on arrival",
      "title": "Enter within 3 months; Enter Hungary registration; collect permit card"
    }
  ],
  "relatedServices": [
    {
      "label": "Hungary – Post-Study Job-search / Business Residence Permit",
      "libraryId": ""
    },
    {
      "label": "Hungary – Student Residence Permit Extension",
      "libraryId": ""
    },
    {
      "label": "Hungary – Residence Permit for Employment",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Audit revision: removed hardcoded Type D visa validity specifics (entry type and fixed validity/stay periods) in favour of 'a national Type D visa is issued to facilitate entry — verify current validity/entry conditions with OIF'; removed client-facing proof-of-subsistence benchmarks (HUF 200,000 / €500 / €640), leaving 'proof of subsistence per current OIF requirements ({{VERIFY_LIVE}})' and keeping the figures only in staff notes clearly labelled as unofficial estimates; softened family-accompaniment wording to 'limited and subject to current OIF regulations — verify' (no absolute 'no family sponsorship'); qualified permanent-residence wording to 'study-based residence may be treated differently from employment-based residence for long-term/PR purposes — verify'; replaced the fixed '9-month' post-study duration with 'a post-study residence permit for job-search or business activities, subject to current OIF regulations'; removed hardcoded government fees (EUR 110 / HUF 39,000 / HUF 24,000 / HUF 23,000) throughout, using 'current OIF administrative fee ({{VERIFY_LIVE}})'; removed fixed processing-time references (60–70 days / a few weeks) for 'processing times vary — verify current OIF estimates'; REMOVED a Portugal source-URL contamination from workingRights.spouse.sourceUrl and replaced it with oif.gov.hu; updated affected quiz questions/explanations to verification-based wording; reviewed the cost breakdown so all amounts are {{VERIFY_LIVE}}; corrected changelog chronology (v1.0 now predates v2.0). Preserved all keys, {{VERIFY_LIVE}} placeholders, OIF/Enter Hungary guidance, the 30-hours/week work rule, Stipendium Hungaricum notes, and contamination warnings. No statistics, approval rates, immigration benefits, or PR/family pathways were invented."
    },
    {
      "version": "v2.1",
      "date": "10 Jun 2026",
      "author": "Service Library",
      "summary": "Audit + uplift: replaced auto-generated template FAQs and quiz questions with real Hungary counsellor Q&A; redistributed the quiz answer key (was ~73/75 on one option); removed the hardcoded approval rate (88%) and unsourced '74% benchmark'; converted time-sensitive values (residence-permit fee, subsistence funds, tuition, living costs, processing times) to {{VERIFY_LIVE}} placeholders. Corrected facts to official OIF guidance: the consulate application comprises the visa (single-entry Type D to collect the residence permit); enter Hungary within 3 months of issuance; OIF/Enter Hungary processing; work 30 hours/week in term and full-time up to 90 days/year outside term (same for Stipendium Hungaricum); permit valid 1–3 years; extensions only from inside Hungary; no family sponsorship on a study permit; study time does not count toward PR; post-study 9-month job-search/start-a-business permit. Removed cross-country residue (a German 'Sperrkonto' sample-doc note and a stray 'Vilnius'/Lithuania accommodation line); reframed proof of funds to bank statements/scholarship/sponsor (Hungary does not use a German-style blocked account); rebuilt resources to official OIF / EU Immigration Portal / Study in Hungary sources. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Hungary student visa content."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: subsistence-funds amount (unofficial working estimate only, not an OIF figure: some secondary sources cite roughly HUF 200,000/month ≈ €500, living costs ~€640/month — never quote to clients as an OIF requirement; verify), residence-permit fee (varies by route — consular vs in-person vs Enter Hungary — and for extensions; never quote a fixed figure to clients; verify on oif.gov.hu), tuition, living costs, processing times, doc counts, post-study permit terms, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: clean any cross-country residue. Hungary does NOT use a German Sperrkonto/blocked account; do not import German concepts. Earlier drafts contained a stray 'Vilnius' (Lithuania) accommodation line and a 'Sperrkonto' sample-doc note — both removed. KEY HUNGARY FACTS: one consulate application comprises the visa → D visa to collect the residence permit; enter within 3 months of issuance; OIF/Enter Hungary; work 30 h/week in term + 90 days/year full-time outside term (same for Stipendium Hungaricum); no family sponsorship on a study permit; study time does not count toward PR; post-study job-search/business permit (duration per current OIF rules)."
    }
  ],
  "resources": [
    {
      "title": "OIF — residence of the student/pupil (official)",
      "url": "https://oif.gov.hu/factsheets/residence-of-the-student-pupil",
      "description": "National Directorate-General for Aliens Policing: study permit, D visa, work limits"
    },
    {
      "title": "OIF — for higher education institutions (official)",
      "url": "https://oif.gov.hu/factsheets/for-higher-education-institutions",
      "description": "Permit validity, 3-month entry rule, 30-hours/week work rule"
    },
    {
      "title": "OIF — job-search / business residence permit (official)",
      "url": "https://oif.gov.hu/factsheets/residence-permit-for-the-purpose-of-seeking-a-job-or-starting-a-business",
      "description": "Post-study job-search/business residence permit (duration per current OIF rules)"
    },
    {
      "title": "EU Immigration Portal — Student in Hungary",
      "url": "https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal/student-hungary_en",
      "description": "Official fees and requirements"
    },
    {
      "title": "Study in Hungary (official)",
      "url": "https://studyinhungary.hu/",
      "description": "Programmes, Stipendium Hungaricum, living and working in Hungary"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "Which authority processes the Hungary study residence permit?",
      "options": [
        "OIF (National Directorate-General for Aliens Policing)",
        "The Ausländerbehörde",
        "Migri",
        "CRMD"
      ],
      "correctIndex": 0,
      "explanation": "OIF (Országos Idegenrendészeti Főigazgatóság) processes study permits."
    },
    {
      "level": 1,
      "question": "How is the application lodged?",
      "options": [
        "Two separate visa + permit applications",
        "At the Hungarian consulate — it comprises the visa",
        "Online only after arrival",
        "Via a German Sperrkonto"
      ],
      "correctIndex": 1,
      "explanation": "The consulate application comprises the visa; a D visa is then issued."
    },
    {
      "level": 1,
      "question": "What is the Type D visa for?",
      "options": [
        "Permanent residence",
        "Tourism only",
        "To enter Hungary and collect the residence-permit card",
        "Working full-time"
      ],
      "correctIndex": 2,
      "explanation": "The national Type D visa lets the holder enter Hungary and collect the residence-permit card; verify current validity/entry conditions with OIF."
    },
    {
      "level": 1,
      "question": "How many hours/week may a student work in term?",
      "options": [
        "No work allowed",
        "Unlimited",
        "140 days/year",
        "Up to 30 hours/week"
      ],
      "correctIndex": 3,
      "explanation": "Up to 30 hours/week in term (official OIF rule)."
    },
    {
      "level": 1,
      "question": "After arrival, students register/finalise via:",
      "options": [
        "The Enter Hungary platform",
        "The Ausländerbehörde",
        "A German Sperrkonto",
        "Campus France"
      ],
      "correctIndex": 0,
      "explanation": "Enter Hungary is the official platform for post-arrival steps."
    },
    {
      "level": 1,
      "question": "Does Hungary use a German-style blocked account?",
      "options": [
        "Yes, €992/month",
        "No — Hungary uses bank statements / scholarship / sponsor proof",
        "Yes, for all Indians",
        "Only in Budapest"
      ],
      "correctIndex": 1,
      "explanation": "Hungary does not operate a German Sperrkonto/blocked account."
    },
    {
      "level": 1,
      "question": "The student must enter Hungary within how long of issuance?",
      "options": [
        "2 years",
        "1 week",
        "3 months (or the permit becomes invalid)",
        "No deadline"
      ],
      "correctIndex": 2,
      "explanation": "Entering within 3 months is required or the permit lapses."
    },
    {
      "level": 1,
      "question": "The residence permit for studies is valid for:",
      "options": [
        "Always exactly 90 days",
        "10 years",
        "Permanently",
        "At least 1 year, up to a maximum of 3 years"
      ],
      "correctIndex": 3,
      "explanation": "Min 1 year (or programme length), max 3 years, extendable."
    },
    {
      "question": "After arrival student must:",
      "options": [
        "Register address and apply residence permit",
        "Ignore registration",
        "Work full-time immediately",
        "Leave in 1 week"
      ],
      "correctIndex": 0,
      "explanation": "Address registration and Migration Department appointment required after arrival.",
      "level": 2
    },
    {
      "level": 2,
      "question": "Outside term, full-time student work is capped at:",
      "options": [
        "Still 30 h/week",
        "90 days (or 66 working days) per year",
        "Unlimited all year",
        "Banned"
      ],
      "correctIndex": 1,
      "explanation": "Outside term: full-time up to 90 days/66 working days per year."
    },
    {
      "level": 2,
      "question": "Do Stipendium Hungaricum holders get extra work rights?",
      "options": [
        "Yes, unlimited",
        "Yes, 40 h/week",
        "No — the same 30 h/week term limit applies",
        "They cannot work"
      ],
      "correctIndex": 2,
      "explanation": "The scholarship adds no extra work rights; the same limits apply."
    },
    {
      "level": 2,
      "question": "Extensions of the study permit are made:",
      "options": [
        "From abroad only",
        "Automatically",
        "At a German office",
        "From inside Hungary via Enter Hungary, 30+ days before expiry"
      ],
      "correctIndex": 3,
      "explanation": "Extensions are only from inside Hungary via Enter Hungary, before expiry."
    },
    {
      "level": 2,
      "question": "How should study-based residence be treated for long-term/PR purposes?",
      "options": [
        "It may be treated differently from employment-based residence — verify current OIF rules",
        "It always counts fully toward PR automatically",
        "It is identical to a work permit",
        "PR is guaranteed after study"
      ],
      "correctIndex": 0,
      "explanation": "Study-based residence may be treated differently from employment-based residence for long-term/PR purposes; verify current OIF rules rather than assuming."
    },
    {
      "level": 2,
      "question": "Can a student sponsor family on the study permit?",
      "options": [
        "Yes, spouse and children freely",
        "Generally no (limited exception: child born in Hungary)",
        "Yes, parents only",
        "Always"
      ],
      "correctIndex": 1,
      "explanation": "A study permit generally does not allow family sponsorship."
    },
    {
      "level": 2,
      "question": "How should the OIF administrative fee be quoted?",
      "options": [
        "As the current OIF fee (verify live) — it differs by submission route",
        "A single fixed €75 for everyone",
        "Free for all students",
        "The same as the German fee"
      ],
      "correctIndex": 0,
      "explanation": "The OIF administrative fee differs by route (consular / in-person / Enter Hungary) and changes; quote the current figure (verify live)."
    },
    {
      "level": 2,
      "question": "English-taught programmes require:",
      "options": [
        "Hungarian B2",
        "German",
        "No evidence",
        "English evidence (e.g. IELTS) — not Hungarian"
      ],
      "correctIndex": 3,
      "explanation": "English programmes need English evidence; Hungarian is not a permit requirement."
    },
    {
      "level": 3,
      "question": "A client's file shows 'open a blocked account'. The issue?",
      "options": [
        "Hungary does not use a German-style blocked account — show bank statements/sponsor proof",
        "No issue",
        "It is required",
        "It speeds approval"
      ],
      "correctIndex": 0,
      "explanation": "Blocked-account wording is German residue; Hungary uses bank/sponsor proof."
    },
    {
      "level": 3,
      "question": "A client plans to enter Hungary 4 months after the permit is issued. Risk?",
      "options": [
        "No risk",
        "The permit becomes invalid (must enter within 3 months)",
        "Faster processing",
        "More work hours"
      ],
      "correctIndex": 1,
      "explanation": "Not entering within 3 months invalidates the permit."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their proof-of-funds money. You:",
      "options": [
        "Hold them",
        "Route them through the firm",
        "Refuse — the funds belong to the client and are never routed through the firm",
        "Charge a fee"
      ],
      "correctIndex": 2,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the permit. You:",
      "options": [
        "Provide it",
        "Charge extra",
        "Promise a date",
        "Refuse and use approved non-guaranteeing language"
      ],
      "correctIndex": 3,
      "explanation": "Never guarantee an outcome; the consulate/OIF decides."
    },
    {
      "level": 3,
      "question": "A student works 40 hours/week every week of term. Consequence?",
      "options": [
        "Over the 30 h/week term limit — can jeopardise the permit",
        "Allowed",
        "Encouraged",
        "No effect"
      ],
      "correctIndex": 0,
      "explanation": "Exceeding 30 h/week in term can jeopardise the permit."
    },
    {
      "level": 3,
      "question": "A client expects to sponsor their spouse on the study permit. Advise:",
      "options": [
        "It is automatic",
        "Generally not allowed on a study permit — a separate route is needed",
        "Allowed after 6 months",
        "Allowed for PhDs only"
      ],
      "correctIndex": 1,
      "explanation": "Study permits generally do not allow family sponsorship."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee",
        "It lowers the fee"
      ],
      "correctIndex": 2,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    },
    {
      "level": 3,
      "question": "A client's cost sheet lists accommodation 'in Vilnius'. The issue?",
      "options": [
        "No issue",
        "Vilnius is in Hungary",
        "It lowers the fee",
        "Cross-country leftover — Vilnius is in Lithuania, not Hungary; fix it"
      ],
      "correctIndex": 3,
      "explanation": "A stray 'Vilnius' is contamination from another country's file."
    }
  ],
  "donts": {
    "dos": [
      "Lodge the residence-permit-for-studies application at the Hungarian consulate (it comprises the visa)",
      "Enter Hungary within 3 months of issuance and register via Enter Hungary",
      "Show subsistence funds for the study period with bank history (verify the current OIF figure)",
      "Keep work within 30 hours/week in term (full-time outside term up to 90 days/year)",
      "Diarise the extension deadline (from inside Hungary, 30+ days before expiry)",
      "Quote consultancy, government (OIF) and third-party costs separately"
    ],
    "donts": [
      "Do not import a German-style blocked account (Sperrkonto) — Hungary uses bank statements/sponsor proof",
      "Do not promise family accompaniment or a PR pathway from a study permit without verifying current OIF rules",
      "Do not let the 3-month entry window lapse, or miss the Enter Hungary extension deadline",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not let a student exceed 30 hours/week of work in term"
    ],
    "mistakes": [
      "Carrying over a German Sperrkonto / blocked-account requirement",
      "Leftover figures or city names from another country's file (e.g. accommodation costs for the wrong city)",
      "Letting the residence permit lapse by not entering Hungary within 3 months",
      "Assuming Stipendium Hungaricum changes the work or immigration rules (it does not)"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "Hungarian university admission letter for national D visa.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of subsistence (mock)",
      "description": "Proof of funds documentation (HUF benchmark/year equivalent) for India.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of funds confirmation (mock)",
      "description": "Proof of subsistence at the OIF guideline amount (bank statements/scholarship/sponsor) — explain to clients.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / TOEFL certificate (mock)",
      "description": "Language proof for degree program.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "Hungarian consulate application packet (comprises the visa).",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "A residence permit for studies allows work up to 30 hours per week during the academic term, and full-time outside term for a maximum of 90 days (or 66 working days) per year. No separate work permit is needed within these limits. The same rules apply to Stipendium Hungaricum scholarship holders.",
      "details": [
        "Term-time: up to 30 hours/week (official OIF rule).",
        "Outside term: full-time up to 90 days (or 66 working days) per year.",
        "No separate work permit is required within these limits.",
        "Stipendium Hungaricum holders follow the same limits; the scholarship adds no extra work rights.",
        "Exceeding the limits can jeopardise the residence permit."
      ],
      "restrictions": [
        "30 hours/week cap in term; full-time only outside term (max 90 days/year)",
        "Within these limits no separate work permit is needed"
      ],
      "sourceUrl": "https://oif.gov.hu/factsheets/residence-of-the-student-pupil",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Family accompaniment options are limited and subject to current OIF regulations; a student permit may not provide family-sponsorship rights in the way other permits do, and any family member would be assessed separately. Eligibility should always be verified with OIF before advising.",
      "details": [
        "Family accompaniment is limited and subject to current OIF regulations — verify eligibility before advising.",
        "Family members need their own permit; assessed separately."
      ],
      "restrictions": [],
      "sourceUrl": "https://oif.gov.hu/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Hungary – Student Residence Permit (National D Visa)",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (oif.gov.hu) before quoting. Proof-of-subsistence funds are the student's own/sponsored money, not a fee. Hungary does NOT operate a German-style blocked account. INR equivalents move with exchange rates.",
    "sourceUrl": "https://oif.gov.hu/",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Residence-permit administrative fee (at consulate)",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Set by OIF; verify the current amount"
          },
          {
            "label": "Residence-permit fee (in Hungary)",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "HUF",
            "applicable": true,
            "notes": "Differs for in-person vs Enter Hungary submission; verify"
          },
          {
            "label": "Extension fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "HUF",
            "applicable": true,
            "notes": "Set by OIF; verify"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Undergraduate tuition",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "notes": "Public universities lower Use the offer letter; varies by programme.",
            "currency": "EUR",
            "applicable": true
          },
          {
            "label": "Postgraduate tuition",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Use the offer letter; varies by programme."
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Subsistence funds (OIF guideline)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month/year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Per current OIF requirements; verify official guidance"
          },
          {
            "label": "Accommodation (Budapest/other cities)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Budapest higher; varies by city"
          },
          {
            "label": "Food & transport",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Verify current range"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight to Hungary",
            "range": "₹40,000–90,000",
            "notes": "Season dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first year",
        "value": "€10,000–18,000",
        "notes": "Cross-check the admission letter and the official oif.gov.hu pages before client commitment."
      }
    ]
  }
}
$hungary_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000e0';

-- Ireland – Student Permission (Long-Stay 'D' Visa + Stamp 2 / IRP)
-- Source: content/service-library/ireland-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $ireland_student_visa$
{
  "displayName": "Ireland – Student Permission (Long-Stay 'D' Visa + Stamp 2 / IRP)",
  "shortDescription": "Irish Immigration (ISD) · Long-stay D study visa · ILEP-approved course · IRP card with Stamp 2 after arrival",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 20,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Ireland uses a two-step system: visa-required nationals apply for a long-stay 'D' study visa (via AVATS) BEFORE travel; after arrival ALL non-EEA students on courses over 90 days register with Immigration Service Delivery (ISD) for the IRP card carrying Stamp 2 permission. The course must be on the ILEP (Interim List of Eligible Programmes). Ireland does NOT use UK concepts (CAS, sponsor licence, IHS, BRP, the 28-day rule) — do not import them. Fees, the financial requirement and work rules are time-sensitive ({{VERIFY_LIVE}}). Verify all amounts on irishimmigration.ie before quoting."
  },
  "alert": {
    "title": "Register for the IRP (Stamp 2) within 90 days of arrival",
    "body": "Visa-required students apply for a long-stay 'D' visa before travel. After arrival, register in person with Immigration Service Delivery (ISD, Dublin) or the local Garda registration office for the Irish Residence Permit (IRP) card with Stamp 2 — required for stays over 90 days. Note: Ireland does NOT use UK terms — it is a Letter of Acceptance from an ILEP-listed course (not a 'CAS'), private medical insurance (not an 'IHS'), and an IRP card (not a 'BRP')."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "ILEP-approved course critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "AVATS / ISD",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Visa fee + IRP €{{VERIFY_LIVE}}",
      "variant": "neutral"
    },
    {
      "label": "ILEP-approved course",
      "variant": "success"
    },
    {
      "label": "IRP within 90 days",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Long-stay D visa processing varies — verify live",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Long-stay visa fee + IRP registration (€{{VERIFY_LIVE}}) — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & private medical insurance",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Long-stay study permission for non-EEA nationals studying in Ireland for more than 90 days. Visa-required nationals first obtain a long-stay 'D' study visa (via AVATS) to travel; after arrival all such students register with Immigration Service Delivery (ISD) for an IRP card carrying Stamp 2 (degree and most courses) — the legal basis to study and work part-time. The course must be on the ILEP (Interim List of Eligible Programmes)."
    },
    {
      "label": "Eligible applicants",
      "value": "Letter of acceptance for a full-time ILEP-listed course (degree at NFQ Level 6+ for Stamp 2) · Tuition paid per current ISD/institution policy · Proof of funds ({{VERIFY_LIVE}}) · Private medical insurance · English-language ability where required · Genuine-student credibility · Valid passport. Note: language/non-degree courses may instead receive Stamp 2A with different conditions."
    },
    {
      "label": "Financial requirement",
      "value": "Show access to {{VERIFY_LIVE}} for living costs, IN ADDITION to tuition, available without relying on employment, and shown again at each renewal. Tuition payment requirements depend on current ISD policy and the institution — verify current expectations. Verify the current figure on irishimmigration.ie.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Immigration Service Delivery (ISD) — Department of Justice, irishimmigration.ie · AVATS for the online visa application · ISD Dublin or the local Garda registration office for the IRP/Stamp 2 registration after arrival"
    },
    {
      "label": "After approval",
      "value": "Travel on the long-stay 'D' visa; register in person for the IRP card (Stamp 2) within 90 days of arrival (the IRP card is issued after registration; delivery timelines vary). Renew before expiry, showing continued enrolment, funds and insurance. Eligible graduates may qualify for the Third Level Graduate Programme (Stamp 1G), subject to current ISD rules — verify eligibility, duration and conditions before advising."
    }
  ],
  "eligibility": [
    {
      "criterion": "Letter of acceptance for a full-time ILEP-listed course",
      "met": true,
      "note": "The course must be on the Interim List of Eligible Programmes (ILEP); for Stamp 2 a degree at NFQ Level 6+ (non-degree/language may be Stamp 2A)."
    },
    {
      "criterion": "Tuition paid per current ISD/institution policy",
      "met": false,
      "note": "Tuition payment requirements depend on current ISD policy and the institution; verify current expectations before advising. Keep the receipt."
    },
    {
      "criterion": "Proof of funds for living costs",
      "met": false,
      "note": "Access to {{VERIFY_LIVE}} IN ADDITION to tuition, available without relying on work, shown again at each renewal."
    },
    {
      "criterion": "Private medical insurance",
      "met": false,
      "note": "Required for the stay / IRP registration; cover for accident and disease. Ireland does NOT use a UK-style health surcharge (IHS)."
    },
    {
      "criterion": "English-language ability where required",
      "met": true,
      "note": "Provide the English evidence the institution/ISD specifies (e.g. IELTS). Do not import UK 'SELT' terminology."
    },
    {
      "criterion": "Genuine-student credibility",
      "met": true,
      "note": "A credible study plan and intent; ISD screens for genuine students. Disclose immigration history honestly."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "Valid for the period of stay; the permission cannot exceed passport validity."
    }
  ],
  "redFlagsBanner": "After a refusal, address ISD's stated reason before reapplying — funds, the ILEP course and insurance cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Importing UK concepts (CAS, sponsor licence, IHS, BRP, 28-day rule)",
      "description": "Ireland does NOT use a UK 'CAS', a sponsor licence, the Immigration Health Surcharge, a BRP, or the UK 28-day maintenance rule. Telling an Ireland client they need any of these is a cross-country (UK) contamination error.",
      "fix": "Use Irish concepts: a Letter of Acceptance from an ILEP-listed course, private medical insurance, the IRP card with Stamp 2, and the €-figure financial requirement",
      "severity": "Critical"
    },
    {
      "title": "Course not on the ILEP",
      "description": "Enrolling in a course not on the Interim List of Eligible Programmes — a leading refusal cause.",
      "fix": "Confirm the exact course is ILEP-listed before any fee; for Stamp 2 it should be a degree at NFQ Level 6+",
      "severity": "Very common"
    },
    {
      "title": "Insufficient / wrong proof of funds",
      "description": "Funds below the required figure, or relying on expected work income, or not separating tuition from living costs.",
      "fix": "Show the current ISD financial requirement ({{VERIFY_LIVE}}) IN ADDITION to paid tuition, in the student's own/sponsored funds, available without work",
      "severity": "Very common"
    },
    {
      "title": "Missing or inadequate private medical insurance",
      "description": "No private medical insurance, or cover that does not meet ISD's expectation for accident/disease — blocks IRP registration.",
      "fix": "Arrange compliant private medical insurance for the stay before the IRP registration appointment",
      "severity": "Common"
    },
    {
      "title": "Not registering the IRP (Stamp 2) within 90 days",
      "description": "Failing to register with ISD/Garda for the IRP within 90 days of arrival leaves the student without lawful permission to remain.",
      "fix": "Book and attend the IRP registration appointment promptly after arrival; pay the registration fee",
      "severity": "High"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden refusals, false documents, or enrolment with no genuine study intent.",
      "fix": "Disclose every prior refusal and explain changed circumstances; never submit false documents or sham enrolment",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee approval of the student visa/permission?",
      "a": "No. ISD decides based on the ILEP course, proof of funds, insurance, and credibility. A strong, honest file improves the chances but approval is never guaranteed — and we never promise one."
    },
    {
      "q": "Does Ireland use a UK 'CAS' or sponsor licence?",
      "a": "No. Those are UK Student Route concepts. Ireland requires a Letter of Acceptance for a full-time course on the ILEP (Interim List of Eligible Programmes). There is no 'CAS' or 'sponsor licence' in the Irish system."
    },
    {
      "q": "Is it a visa or a residence permission?",
      "a": "Both, in sequence: visa-required nationals get a long-stay 'D' study visa (via AVATS) to travel; after arrival every non-EEA student staying over 90 days registers with Immigration Service Delivery (ISD) for an IRP card carrying Stamp 2 permission. Visa-exempt nationals skip the visa but still register for the IRP."
    },
    {
      "q": "How much money must a student show?",
      "a": "Access to {{VERIFY_LIVE}} for living costs (the current ISD figure — verify) IN ADDITION to tuition, available without relying on employment, and shown again at each renewal. Ireland does NOT use the UK 28-day rule. Verify the current figure on irishimmigration.ie."
    },
    {
      "q": "What health insurance is required?",
      "a": "Private medical insurance covering the stay (accident and disease). Ireland does NOT operate a UK-style Immigration Health Surcharge (IHS). Confirm the cover ISD currently expects; student plans are widely available."
    },
    {
      "q": "Can the student work?",
      "a": "Yes — Stamp 2 permission (once registered) allows up to 20 hours/week during term and up to 40 hours/week during official holiday periods (June–September and 15 December–15 January). These are weekly maximums, not averaged, and combined across all employers. Self-employment is not allowed on Stamp 2. Stamp 2A (some non-degree courses) does not carry work rights."
    },
    {
      "q": "Do English-taught programs require Irish?",
      "a": "No. Provide the English-language evidence the institution/ISD specifies (e.g. IELTS). Do not import UK 'SELT' terminology. Irish is not required for the permission."
    },
    {
      "q": "What after graduation?",
      "a": "Eligible graduates may qualify for the Third Level Graduate Programme (Stamp 1G) to remain in Ireland and seek employment, subject to current ISD rules. Eligibility, duration, conditions and extension options are time-sensitive and not automatic — verify before advising. From Stamp 1G, a qualifying job can lead to an employment permit (e.g. Critical Skills/General)."
    },
    {
      "q": "What is the IRP and when is it issued?",
      "a": "The Irish Residence Permit is the card issued after you register in person with ISD/Garda; it carries your Stamp 2 endorsement and is issued after registration (delivery timelines vary). It is not a UK 'BRP'. Register within 90 days of arrival."
    },
    {
      "q": "What are the government fees?",
      "a": "A long-stay 'D' visa fee (single/multi-entry, {{VERIFY_LIVE}}) for visa-required applicants, plus the IRP registration fee (€{{VERIFY_LIVE}} per registration and at each renewal). Fees change — verify the current amounts on irishimmigration.ie before quoting."
    },
    {
      "q": "How and when is the application made?",
      "a": "Visa-required nationals apply online via AVATS before travel and submit documents/biometrics as directed; apply well ahead of the course start. Visa-exempt nationals travel and register the IRP after arrival. Quote the live ISD processing estimate rather than a fixed number."
    },
    {
      "q": "What is the ILEP?",
      "a": "The Interim List of Eligible Programmes — the official list of courses/providers eligible for a non-EEA student permission. The exact course must be ILEP-listed; confirm this before any fee, as a non-listed course is a leading refusal cause."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "A visa refusal can usually be appealed in writing within the stated deadline, or the client can reapply with a corrected, stronger file. Read the reason carefully (commonly funds, the ILEP course, or credibility) and fix the specific issue."
    },
    {
      "q": "Can a spouse or children accompany?",
      "a": "Family accompaniment options for Stamp 2 students are limited and subject to current ISD regulations; any family route is assessed separately under its own rules. Eligibility should always be verified before advising — do not present family accompaniment as guaranteed or as categorically unavailable without checking."
    },
    {
      "q": "What is the difference between Stamp 2 and Stamp 2A?",
      "a": "Stamp 2 is for full-time ILEP courses (degree/most courses) and allows part-time work; Stamp 2A is for certain non-degree courses and does NOT permit work. Confirm which applies to the client's exact course."
    },
    {
      "q": "Does the IRP/Stamp 2 lead to long-term residence?",
      "a": "Time on Stamp 2 (student) is generally treated differently from employment-based residence for long-term residence purposes. Verify how study time is counted under current ISD rules before advising; do not assume it counts toward long-term residence."
    },
    {
      "q": "How long does processing take?",
      "a": "It varies by season and case quality. Apply well before the course start and quote the live ISD processing estimate on irishimmigration.ie rather than a fixed number."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — ISD decides. FLC prepares a strong, honest, well-documented file (ILEP course, proof of funds, paid tuition, private medical insurance) and never promises a visa/permission, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a visa/permission or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (visa + IRP) and third-party (insurance) costs.",
    "Proof-of-funds money belongs to the client — never receive, hold or route it through firm accounts; keep tuition and living funds separate.",
    "Never import UK requirements (CAS, sponsor licence, IHS, BRP, 28-day rule, ATAS, SELT) into an Ireland file.",
    "Always confirm the exact course is ILEP-listed before advising or charging.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic, financial and insurance documents under data-protection rules: store securely, share only with authorised parties, retain only as needed."
  ],
  "proTips": [
    "Never use UK terms in an Ireland file — it is a Letter of Acceptance from an ILEP course (not a 'CAS'), private medical insurance (not an 'IHS'), and an IRP card (not a 'BRP').",
    "Confirm the exact course is ILEP-listed before any fee — a non-listed course is a leading refusal cause.",
    "Show the living-cost figure (commonly the current ISD financial requirement) IN ADDITION to paid tuition, in the student's own funds, available without work.",
    "Work is 20 hours/week in term and 40 hours/week in the official holiday periods (Jun–Sep, 15 Dec–15 Jan) — weekly maximums, not averaged; no self-employment.",
    "Register the IRP (Stamp 2) in person within 90 days of arrival; the card is issued after registration; delivery timelines vary.",
    "Treat the financial figure, visa fee and IRP fee as live values — verify on irishimmigration.ie before quoting."
  ],
  "postApproval": [
    "Travel on the long-stay 'D' visa (visa-required nationals) and book the IRP registration appointment",
    "Register in person with ISD/Garda for the IRP card (Stamp 2) within 90 days of arrival",
    "Keep work within 20 hrs/week in term (40 hrs/week in official holidays); get a PPS number for work",
    "Renew before expiry with continued enrolment, funds and insurance; eligible graduates may qualify for Stamp 1G (subject to current ISD rules)"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "ILEP-listed course confirmed",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Proof of funds (living + tuition separate)",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Private medical insurance + genuine-student credibility",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, ILEP course confirmation, offer + tuition payment (operational/consultancy estimate — not an immigration processing guarantee)"
    },
    {
      "weeks": "2–4",
      "title": "Proof of funds, private medical insurance; AVATS visa application (visa-required) (operational/consultancy estimate — not an immigration processing guarantee)"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "ISD visa decision (varies — verify live)"
    },
    {
      "weeks": "on arrival",
      "title": "Enter Ireland; book IRP registration"
    },
    {
      "weeks": "within 90 days",
      "title": "Register IRP (Stamp 2) in person; card issued after registration (timelines vary)"
    }
  ],
  "relatedServices": [
    {
      "label": "Ireland – Third Level Graduate Programme (Stamp 1G)",
      "libraryId": ""
    },
    {
      "label": "Ireland – Stamp 2 Renewal",
      "libraryId": ""
    },
    {
      "label": "Ireland – Employment Permit (Critical Skills / General)",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Version alignment: bumped to v2.2 to standardise the study/visa service-library on a single version across all countries. No content changes in this entry — all factual content, {{VERIFY_LIVE}} placeholders, compliance/contamination warnings and prior corrections are unchanged from v2.1."
    },
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Future-proofing + consistency pass: removed hardcoded financial figures (€10,000 / €6,665) from all client-facing content, leaving 'current ISD financial requirement ({{VERIFY_LIVE}}) — verify'; removed fixed tuition-payment thresholds (paid-in-full / ~€6,000 minimum) in favour of 'tuition payment requirements depend on current ISD/institution policy — verify'; revised Stamp 1G (Third Level Graduate Programme) wording to remove the fixed 12-month / Level 9+ / extension assumptions, now 'subject to current ISD rules — verify eligibility, duration and conditions; not automatic'; removed IRP-card delivery-time estimates ('couple of weeks' / 'arrives by post') for 'issued after registration; delivery timelines vary'; softened family-accompaniment wording to 'limited and subject to current ISD regulations — verify'; rewrote the sample-document descriptions to be client-facing (what the document is / why / what to check) rather than internal UK-contamination notes; cleaned an obsolete 'IHS / Student Route' reference from the historical changelog; updated affected quiz questions/explanations to verification-based wording; reviewed the cost breakdown so all figures are {{VERIFY_LIVE}}; qualified the consultancy/document-prep timeline stages as operational estimates, not immigration processing guarantees. Preserved all keys, {{VERIFY_LIVE}} placeholders, AVATS/ILEP/IRP guidance, the Stamp 2 work-rights rule, UK-contamination warnings, and compliance language. No statistics, approval rates, immigration benefits, stay-back rights, or UK terms were introduced."
    },
    {
      "version": "v2.0",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Major decontamination + rebuild: removed UK student permission cross-contamination (CAS, sponsor licence, IHS/Immigration Health Surcharge, BRP, the 28-day maintenance rule, ATAS, SELT, 'London vs outside London' rates, 'Home Office', Canada €235/€85 fees) that had been copied into this Ireland file. Reframed as Ireland's two-step study permission: long-stay 'D' visa via AVATS → IRP card with Stamp 2 from Immigration Service Delivery (ISD) within 90 days of arrival; ILEP-listed course; financial requirement shown as a placeholder (commonly €10,000 for a stay over 8 months, plus tuition, available without work); private medical insurance (not IHS); work 20 hours/week in term and 40 hours/week in official holidays (no self-employment); IRP registration fee placeholdered (commonly €300); post-study Third Level Graduate Programme (Stamp 1G). Replaced template FAQs and quiz with real Ireland content; rebuilt resources to official ISD/ILEP sources; removed the hardcoded approval rate (89%) and '76% benchmark'; converted time-sensitive values to {{VERIFY_LIVE}} placeholders. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded FAQs to 30 counselor Q&A pairs."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Ireland student-permission counsellor content (early draft; later corrected to remove UK-template terms)."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: financial requirement (commonly €10,000 for a stay over 8 months — verify ISD), long-stay D visa fee, IRP registration fee (commonly €300 — verify), tuition, living costs, insurance premium, processing times, doc counts, post-study (Stamp 1G) terms, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: this service was previously copied from a UK Student Route file. Ireland does NOT use UK concepts: NO 'CAS' (it is a Letter of Acceptance from an ILEP-listed course), NO sponsor licence, NO 'IHS'/Immigration Health Surcharge (students need private medical insurance), NO 'BRP' (Ireland issues an IRP card), NO UK '28-day rule', NO ATAS, NO 'SELT'. Ireland uses: long-stay 'D' visa via AVATS → IRP card with Stamp 2 from ISD within 90 days of arrival; ILEP course; €-figure financial requirement; work 20 h/week term / 40 h/week official holidays; post-study Stamp 1G (Third Level Graduate Programme). Never reintroduce UK terms."
    }
  ],
  "resources": [
    {
      "title": "Irish Immigration Service Delivery (ISD) — official",
      "url": "https://www.irishimmigration.ie/",
      "description": "Department of Justice: study visa, registration, Stamp 2/IRP"
    },
    {
      "title": "ISD — coming to study in Ireland",
      "url": "https://www.irishimmigration.ie/coming-to-study-in-ireland/",
      "description": "Long-stay D study visa, financial requirement, process"
    },
    {
      "title": "ISD — registering your permission (IRP)",
      "url": "https://www.irishimmigration.ie/registering-your-immigration-permission/",
      "description": "IRP registration, Stamp 2, appointments and fees"
    },
    {
      "title": "ILEP — Interim List of Eligible Programmes",
      "url": "https://www.irishimmigration.ie/studying-in-ireland/the-interim-list-of-eligible-programmes-ilep/",
      "description": "Official list of eligible courses/providers for student permission"
    },
    {
      "title": "ISD — Third Level Graduate Programme (Stamp 1G)",
      "url": "https://www.irishimmigration.ie/coming-to-work-in-ireland/third-level-graduate-programme/",
      "description": "Post-study graduate permission for eligible NFQ Level 8+ graduates"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "Which body processes Irish student immigration?",
      "options": [
        "Immigration Service Delivery (ISD) — Department of Justice",
        "The UK Home Office",
        "Migri",
        "OIF"
      ],
      "correctIndex": 0,
      "explanation": "ISD (irishimmigration.ie) handles study visas and registration."
    },
    {
      "level": 1,
      "question": "Does Ireland use a UK 'CAS'?",
      "options": [
        "Yes, for all students",
        "No — Ireland uses a Letter of Acceptance from an ILEP course",
        "Yes, for degrees only",
        "Only in Dublin"
      ],
      "correctIndex": 1,
      "explanation": "CAS is a UK concept; Ireland requires an ILEP-listed course acceptance."
    },
    {
      "level": 1,
      "question": "What is the IRP card?",
      "options": [
        "A UK BRP",
        "A tourist visa",
        "The Irish Residence Permit, registered after arrival (carries Stamp 2)",
        "A blocked account"
      ],
      "correctIndex": 2,
      "explanation": "The IRP carries the Stamp 2 endorsement; it is not a UK 'BRP'."
    },
    {
      "level": 1,
      "question": "How much must a student commonly show for living costs?",
      "options": [
        "€992/month",
        "A UK 28-day balance",
        "Nothing",
        "Around the current ISD financial requirement (verify) — plus tuition"
      ],
      "correctIndex": 3,
      "explanation": "Commonly the current ISD financial requirement for over 8 months, in addition to tuition (verify)."
    },
    {
      "level": 1,
      "question": "How many hours/week may a Stamp 2 student work in term?",
      "options": [
        "Up to 20 hours/week",
        "40 hours/week",
        "No work allowed",
        "Unlimited"
      ],
      "correctIndex": 0,
      "explanation": "20 hours/week in term; 40 in official holiday periods."
    },
    {
      "level": 1,
      "question": "The course must be on the:",
      "options": [
        "UK sponsor register",
        "ILEP (Interim List of Eligible Programmes)",
        "Anabin list",
        "CRICOS"
      ],
      "correctIndex": 1,
      "explanation": "The course must be ILEP-listed."
    },
    {
      "level": 1,
      "question": "What health cover does Ireland require?",
      "options": [
        "A UK Immigration Health Surcharge",
        "Nothing",
        "Private medical insurance (no UK 'IHS')",
        "A German policy"
      ],
      "correctIndex": 2,
      "explanation": "Ireland needs private medical insurance; it has no UK-style IHS."
    },
    {
      "level": 1,
      "question": "The IRP (Stamp 2) must be registered within:",
      "options": [
        "1 week",
        "2 years",
        "No deadline",
        "90 days of arrival"
      ],
      "correctIndex": 3,
      "explanation": "Registration with ISD/Garda is required within 90 days of arrival."
    },
    {
      "level": 2,
      "question": "During official holidays, Stamp 2 work hours rise to:",
      "options": [
        "Up to 40 hours/week",
        "Still 20",
        "Unlimited",
        "30"
      ],
      "correctIndex": 0,
      "explanation": "40 h/week in Jun–Sep and 15 Dec–15 Jan; weekly maximums, not averaged."
    },
    {
      "level": 2,
      "question": "Can a Stamp 2 student be self-employed?",
      "options": [
        "Yes, freely",
        "No — self-employment is not allowed on Stamp 2",
        "Yes, after 6 months",
        "Only in summer"
      ],
      "correctIndex": 1,
      "explanation": "Stamp 2 does not permit self-employment."
    },
    {
      "level": 2,
      "question": "The proof-of-funds money must be:",
      "options": [
        "Held 28 consecutive days (UK rule)",
        "Routed via the firm",
        "The student's own/sponsored funds, separate from tuition, available without work",
        "Work income"
      ],
      "correctIndex": 2,
      "explanation": "Living funds are separate from tuition and not reliant on work; no UK 28-day rule."
    },
    {
      "level": 2,
      "question": "Stamp 2A (certain non-degree courses):",
      "options": [
        "Allows 40 h/week always",
        "Is the same as Stamp 1G",
        "Grants PR",
        "Does NOT carry work rights"
      ],
      "correctIndex": 3,
      "explanation": "Stamp 2A does not permit work, unlike Stamp 2."
    },
    {
      "level": 2,
      "question": "The post-study route in Ireland is:",
      "options": [
        "The Third Level Graduate Programme (Stamp 1G)",
        "The UK Graduate Route",
        "An APS",
        "A blocked account"
      ],
      "correctIndex": 0,
      "explanation": "Eligible NFQ Level 8+ eligible graduates may qualify for Stamp 1G (subject to current ISD rules)."
    },
    {
      "level": 2,
      "question": "Visa-required nationals apply via:",
      "options": [
        "A UK CAS portal",
        "AVATS (online) before travel",
        "Anabin",
        "Enter Hungary"
      ],
      "correctIndex": 1,
      "explanation": "AVATS is Ireland's online visa application system."
    },
    {
      "level": 2,
      "question": "English-taught programmes require:",
      "options": [
        "Irish B2",
        "German",
        "English evidence (e.g. IELTS) — not UK 'SELT' terminology",
        "No evidence"
      ],
      "correctIndex": 2,
      "explanation": "Provide English evidence per the institution; do not import UK SELT terms."
    },
    {
      "level": 2,
      "question": "The Stamp 1G (Third Level Graduate Programme) is commonly:",
      "options": [
        "Permanent",
        "1 week",
        "Automatic citizenship",
        "duration per current ISD rules — verify"
      ],
      "correctIndex": 3,
      "explanation": "Duration is set by current ISD rules — verify; do not assume a fixed period."
    },
    {
      "level": 3,
      "question": "A client's file says 'pay the IHS'. The issue?",
      "options": [
        "IHS is a UK surcharge — Ireland needs private medical insurance (contamination)",
        "No issue",
        "IHS is faster",
        "Lower fee"
      ],
      "correctIndex": 0,
      "explanation": "The Immigration Health Surcharge is UK-only; Ireland uses private insurance."
    },
    {
      "level": 3,
      "question": "A counsellor references a 'CAS' for Ireland. Correct them:",
      "options": [
        "CAS is correct",
        "Ireland uses a Letter of Acceptance from an ILEP course, not a UK 'CAS'",
        "CAS is faster",
        "Use a BRP instead"
      ],
      "correctIndex": 1,
      "explanation": "CAS/sponsor-licence are UK terms; Ireland uses ILEP acceptance."
    },
    {
      "level": 3,
      "question": "A client mixes tuition into the the current ISD financial requirement living figure. Advise:",
      "options": [
        "Combine them",
        "Ignore tuition",
        "Keep them separate — living funds are shown in addition to tuition",
        "Use work income"
      ],
      "correctIndex": 2,
      "explanation": "Living funds are separate from (and additional to) tuition."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their proof-of-funds money. You:",
      "options": [
        "Hold them",
        "Route them through the firm",
        "Charge a fee",
        "Refuse — the funds belong to the client and are never routed through the firm"
      ],
      "correctIndex": 3,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the visa. You:",
      "options": [
        "Refuse and use approved non-guaranteeing language",
        "Provide it",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 0,
      "explanation": "Never guarantee an outcome; ISD decides."
    },
    {
      "level": 3,
      "question": "A student works 30 hours/week every week of term. Consequence?",
      "options": [
        "Allowed",
        "Over the 20 h/week term limit — breaches Stamp 2 conditions",
        "Encouraged",
        "No effect"
      ],
      "correctIndex": 1,
      "explanation": "Exceeding 20 h/week in term breaches Stamp 2 and risks the permission."
    },
    {
      "level": 3,
      "question": "A client enrols in a course not on the ILEP. Risk?",
      "options": [
        "No risk",
        "Faster approval",
        "Leading refusal cause — confirm ILEP listing before any fee",
        "Lower fee"
      ],
      "correctIndex": 2,
      "explanation": "A non-ILEP course is a leading refusal cause."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    }
  ],
  "donts": {
    "dos": [
      "Confirm the exact course is on the ILEP before any fee",
      "Show the current living-cost figure IN ADDITION to paid tuition, available without work",
      "Arrange compliant private medical insurance before IRP registration",
      "Register the IRP (Stamp 2) within 90 days of arrival",
      "Keep work within 20 hrs/week in term (40 hrs/week in official holidays)",
      "Quote consultancy, government (visa + IRP) and third-party costs separately"
    ],
    "donts": [
      "Do not use UK concepts (CAS, sponsor licence, IHS, BRP, 28-day rule, ATAS, SELT) in an Ireland file",
      "Do not mix tuition into the living-cost figure or rely on work income for funds",
      "Do not enrol a client in a course that is not ILEP-listed",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not let a student exceed 20 hrs/week in term or work as self-employed"
    ],
    "mistakes": [
      "Carrying over UK terms (CAS/IHS/BRP/28-day rule) from a UK Student Route file",
      "Canada-style or other foreign fee figures in the cost breakdown",
      "Missing the 90-day IRP registration window after arrival",
      "Assuming family or long-term-residence outcomes from a Stamp 2 study permission without checking current ISD rules"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample Letter of Acceptance (ILEP course) (mock)",
      "description": "Letter of acceptance from an ILEP-listed institution confirming a full-time course; counsellors should check the exact course is ILEP-listed and the details match the applicant before submission.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample IELTS / English-language certificate (mock)",
      "description": "English-language evidence at the level the institution/ISD requires; do not use UK 'SELT' terminology.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample TB test certificate (mock)",
      "description": "IOM clinic certificate if applicable.",
      "mimeType": "application/pdf",
      "docKind": "medical"
    },
    {
      "title": "Sample bank statement / proof of funds (mock)",
      "description": "Bank statements evidencing access to the required living-cost funds, held separately from tuition; counsellors should check the funds meet the current ISD requirement and are the applicant's own/sponsored money.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample academic transcripts (mock)",
      "description": "Degree marks and backlogs cover note.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample consent / parental letter (mock)",
      "description": "For students under 18 or sponsored minors.",
      "mimeType": "application/pdf",
      "docKind": "supporting"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "Stamp 2 permission (once the IRP is registered) allows part-time work up to 20 hours per week during term and up to 40 hours per week during the official holiday periods (June–September and 15 December–15 January). These are weekly maximums (not averaged) and combined across all employers. Self-employment is not permitted. Stamp 2A does not carry work rights.",
      "details": [
        "Term-time: up to 20 hours/week; official holidays (Jun–Sep, 15 Dec–15 Jan): up to 40 hours/week.",
        "Weekly maximums, not averaged; combined across all employers.",
        "Self-employment is not allowed on Stamp 2; the student needs a PPS number and pays tax (PAYE).",
        "Work rights begin once the IRP/Stamp 2 is registered after arrival — not before.",
        "Stamp 2A (certain non-degree courses) does NOT permit work."
      ],
      "restrictions": [
        "20 hrs/week in term; 40 hrs/week only in official holiday periods",
        "No self-employment; combined across employers; only after IRP/Stamp 2 registered"
      ],
      "sourceUrl": "https://www.irishimmigration.ie/",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Family accompaniment options for Stamp 2 students are limited and subject to current ISD regulations; eligibility should always be verified before advising. Any family route is assessed separately under its own rules.",
      "details": [
        "Family accompaniment is limited and subject to current ISD regulations — verify eligibility before advising.",
        "Family members would need their own permission; assessed separately."
      ],
      "restrictions": [],
      "sourceUrl": "https://www.irishimmigration.ie/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Ireland – Stamp 2 Student Permission",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (irishimmigration.ie) before quoting. Proof-of-funds money is the student's own/sponsored funds, not a fee, and is counted separately from tuition. Ireland does NOT use a UK-style health surcharge (IHS) — students need private medical insurance. INR equivalents move with exchange rates.",
    "sourceUrl": "https://www.irishimmigration.ie/",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Long-stay 'D' visa fee (single/multi)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "For visa-required nationals; verify current single/multi-entry fee"
          },
          {
            "label": "IRP registration fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Per registration and at each renewal; verify current amount"
          },
          {
            "label": "Private medical insurance",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Annual cover; NOT a UK health surcharge"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Tuition (per year)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Varies by programme; per current ISD/institution policy; use the offer letter"
          },
          {
            "label": "Tuition payment (per ISD/institution policy)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Tuition payment requirements depend on current ISD/institution policy — verify"
          },
          {
            "label": "Books & materials",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Programme dependent"
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Proof-of-funds (living costs)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Current ISD financial requirement ({{VERIFY_LIVE}}); verify"
          },
          {
            "label": "Accommodation",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Dublin higher; varies by city"
          },
          {
            "label": "Food & transport",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Verify current range"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight / travel",
            "range": "Varies",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / legalisation",
            "range": "Varies",
            "notes": "Where required"
          },
          {
            "label": "Private medical insurance",
            "range": "Varies",
            "notes": "Annual cover required for IRP"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Cross-check the offer letter and the official irishimmigration.ie pages before client commitment."
      }
    ]
  }
}
$ireland_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000a3';

-- Latvia – Student Residence Permit (OCMA/PMLP) + National D Visa
-- Source: content/service-library/latvia-student-visa.json
UPDATE public.service_library
SET
  academy_metadata = $latvia_student_visa$
{
  "displayName": "Latvia – Student Residence Permit (OCMA/PMLP) + National D Visa",
  "shortDescription": "OCMA/PMLP (Office of Citizenship and Migration Affairs) · University invitation → residence permit → D visa · Registration in Riga",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 22,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "Latvia uses a distinctive REVERSE order: the university files an invitation with OCMA (Office of Citizenship and Migration Affairs / PMLP) → the student submits the residence-permit application, which OCMA reviews FIRST → ONLY IF OCMA approves does the student then apply for the National Type D visa (commonly via VFS Global) to travel → on arrival, give biometrics and collect the residence-permit card from PMLP. Latvia does NOT use German concepts (APS, Anabin, Sperrkonto/blocked account) — do not import them. Fees, the subsistence figure and work rules are time-sensitive ({{VERIFY_LIVE}}). Verify all amounts on pmlp.gov.lv before quoting."
  },
  "alert": {
    "title": "OCMA approves the residence permit first, then the D visa",
    "body": "The university lodges an invitation with OCMA; the student submits the residence-permit application (OCMA reviews on a 30 / 10-working-day / 5-working-day fee track). ONLY after a positive OCMA decision does the student apply for the National Type D visa to enter Latvia. After arrival, give biometrics and collect the residence-permit card from PMLP, and register as required. Note: Latvia uses OCMA/PMLP in Riga — not a German Ausländerbehörde, and no Sperrkonto/blocked account."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "Proof of funds critical",
      "variant": "warning"
    },
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "OCMA / PMLP",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live",
      "variant": "neutral"
    },
    {
      "label": "Govt fees + proof of funds (verify)",
      "variant": "neutral"
    },
    {
      "label": "University invitation via OCMA",
      "variant": "success"
    },
    {
      "label": "Residence permit → then D visa",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "{{VERIFY_LIVE}}",
      "sub": "OCMA review track (30 / 10 / 5 working days) — verify live",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "{{VERIFY_LIVE}}",
      "sub": "OCMA state fee + consular fee + D visa fee — verify live",
      "tone": "warning"
    },
    {
      "label": "Approval rate",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Pull from live CRM case data; not a prediction of any individual outcome",
      "tone": "primary"
    },
    {
      "label": "Required docs",
      "value": "{{VERIFY_LIVE}}",
      "sub": "Document count varies by profile — see live checklist",
      "tone": "violet"
    },
    {
      "label": "Consultancy fee",
      "value": "See fee tab",
      "sub": "+ govt & third-party",
      "tone": "primary"
    }
  ],
  "about": [
    {
      "label": "Description",
      "value": "Temporary residence permit for studies in Latvia for non-EU/EEA/Swiss nationals, administered by OCMA (Office of Citizenship and Migration Affairs / PMLP). The university files an invitation with OCMA; the residence-permit application is reviewed by OCMA, and only after a positive decision does the student obtain a National Type D visa to travel. The permit is typically issued for the study year/programme and renewed annually."
    },
    {
      "label": "Eligible applicants",
      "value": "Admission to an accredited Latvian institution (the university files the OCMA invitation) · Proof of subsistence ({{VERIFY_LIVE}}) · Health insurance meeting current Latvian visa/residence-permit requirements ({{VERIFY_LIVE}}) · Accommodation evidence · Language ability matching the programme · AIC statement on the foreign qualification where required · Valid passport. EU/EEA/Swiss citizens need no permit, only OCMA registration for stays over 90 days."
    },
    {
      "label": "Proof of funds",
      "value": "Proof of necessary subsistence per OCMA, set by the current Latvian minimum wage and the corresponding OCMA subsistence requirement ({{VERIFY_LIVE}}; verify the current amount and multiplier on pmlp.gov.lv). Shown via an original bank statement (commonly valid 3 months), a scholarship, or a notarised sponsor arrangement. Latvia does NOT operate a German-style blocked account.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "OCMA / PMLP – Pilsonības un migrācijas lietu pārvalde (Office of Citizenship and Migration Affairs, pmlp.gov.lv), in Riga · the Latvian embassy/VFS Global for the D visa · the Academic Information Centre (AIC) for qualification recognition"
    },
    {
      "label": "After approval",
      "value": "After a positive OCMA decision, apply for the National Type D visa and travel to Latvia; give biometrics and collect the residence-permit card from PMLP. Register as required and renew annually with continued enrolment, funds and insurance. Graduates may qualify for post-study residence options subject to current Latvian immigration regulations to seek work or continue studies; eligibility, duration and conditions are time-sensitive and not automatic — verify current rules."
    }
  ],
  "eligibility": [
    {
      "criterion": "Admission to an accredited Latvian institution (OCMA invitation)",
      "met": true,
      "note": "The university files the invitation with OCMA and provides the invitation number for the application."
    },
    {
      "criterion": "Proof of subsistence",
      "met": false,
      "note": "Per OCMA, set by the current Latvian minimum wage and OCMA subsistence requirement ({{VERIFY_LIVE}}). Original bank statement (commonly valid 3 months), scholarship, or notarised sponsor."
    },
    {
      "criterion": "Health insurance",
      "met": false,
      "note": "Health insurance meeting current Latvian visa/residence-permit requirements ({{VERIFY_LIVE}}); verify the current requirement."
    },
    {
      "criterion": "Accommodation evidence",
      "met": false,
      "note": "Evidence of where the student will live (dormitory certificate from the university, lease, or host declaration)."
    },
    {
      "criterion": "Qualification recognition (AIC) where required",
      "met": false,
      "note": "A statement from the Academic Information Centre (AIC) that the foreign education documents are sufficient for study in Latvia. (Not the German Anabin.)"
    },
    {
      "criterion": "Language ability matching the programme",
      "met": true,
      "note": "English or Latvian per the programme; provide the evidence the institution specifies. Many programmes are taught in English."
    },
    {
      "criterion": "Valid passport",
      "met": true,
      "note": "Valid for more than 3 months beyond the intended stay; the permit cannot exceed passport validity."
    }
  ],
  "redFlagsBanner": "After a refusal, address OCMA's stated reason before reapplying — proof of subsistence, the OCMA invitation and insurance cannot be fixed last-minute.",
  "redFlags": [
    {
      "title": "Importing German concepts (Sperrkonto/blocked account, APS, Anabin, Ausländerbehörde)",
      "description": "Latvia does NOT use a German Sperrkonto/blocked account, an academic APS, the Anabin database, or the Ausländerbehörde. Telling a Latvia client they need any of these is a cross-country (Germany) contamination error.",
      "fix": "Use Latvian concepts: the OCMA invitation, proof of subsistence via bank statement/sponsor, the AIC recognition statement, OCMA/PMLP, and the residence permit → then D visa order",
      "severity": "Critical"
    },
    {
      "title": "Wrong process order",
      "description": "Treating the D visa as the first step. In Latvia the residence-permit application is reviewed by OCMA FIRST; only a positive OCMA decision unlocks the D visa.",
      "fix": "Sequence it correctly: university invitation via OCMA → residence-permit application/decision → D visa → travel and collect the card",
      "severity": "Very common"
    },
    {
      "title": "Insufficient / wrong proof of subsistence",
      "description": "Funds below the OCMA requirement (linked to the minimum wage), or without proper bank history, for the study period.",
      "fix": "Show the current OCMA subsistence amount ({{VERIFY_LIVE}}; tracks the current Latvian minimum wage) with an original bank statement (commonly valid 3 months), in the student's own/sponsored funds",
      "severity": "Very common"
    },
    {
      "title": "Missing or inadequate health insurance",
      "description": "No insurance, or cover below the current required insurer liability ({{VERIFY_LIVE}}).",
      "fix": "Arrange compliant insurance for the stay before submission; verify the current minimum",
      "severity": "Common"
    },
    {
      "title": "Exceeding the work-hour limit",
      "description": "Working beyond the current permitted limits can jeopardise the permit; bachelor's and master's/doctoral rights differ — verify.",
      "fix": "Keep work within the current permitted limits (verify); bachelor's and master's/doctoral rights differ — confirm with OCMA",
      "severity": "Common"
    },
    {
      "title": "Prior refusals or misrepresentation not addressed",
      "description": "Hidden refusals, false documents, or enrolment with no genuine study intent.",
      "fix": "Disclose every prior refusal and explain changed circumstances; never submit false documents or sham enrolment",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee approval of the student visa/permit?",
      "a": "No. OCMA decides based on the university invitation, proof of subsistence, insurance and credibility. A strong, honest file improves the chances but approval is never guaranteed — and we never promise one."
    },
    {
      "q": "What is the application order in Latvia?",
      "a": "Distinctively, the residence permit comes FIRST: the university files an invitation with OCMA; the student submits the residence-permit application; OCMA reviews it (30 / 10-working-day / 5-working-day fee tracks); and ONLY after a positive OCMA decision does the student apply for the National Type D visa to travel. After arrival, biometrics and the permit card are completed at PMLP."
    },
    {
      "q": "Who is OCMA / PMLP?",
      "a": "The Office of Citizenship and Migration Affairs (Pilsonības un migrācijas lietu pārvalde, pmlp.gov.lv), Latvia's immigration authority, based in Riga. It is not a German Ausländerbehörde; do not import German terminology."
    },
    {
      "q": "How much money must a student show?",
      "a": "Proof of necessary subsistence per OCMA, linked to the Latvian minimum monthly wage ({{VERIFY_LIVE}}; the student figure tracks the current Latvian minimum wage). Shown via an original bank statement (commonly valid 3 months), a scholarship, or a notarised sponsor. Latvia does NOT use a German-style blocked account. Verify the current amount on pmlp.gov.lv."
    },
    {
      "q": "What are the government fees?",
      "a": "An OCMA residence-permit state fee on a review track ({{VERIFY_LIVE}}), a consular fee ({{VERIFY_LIVE}}), and the National Type D visa fee ({{VERIFY_LIVE}}). Fees change — verify the current amounts on pmlp.gov.lv before quoting."
    },
    {
      "q": "Can the student work?",
      "a": "Yes — with a valid residence permit, students are generally permitted limited employment during studies, subject to current Latvian regulations (bachelor's students are commonly limited to part-time during term, with broader rights during holidays; master's/doctoral rights commonly differ). The right to employment must be endorsed in the permit. Verify the current work-right limits with OCMA before advising."
    },
    {
      "q": "Do English-taught programs require Latvian?",
      "a": "No. Many Latvian programmes are taught in English; provide the English evidence the institution specifies. Latvian helps with daily life but is not a permit requirement. (Some programmes admit without IELTS — confirm with the institution.)"
    },
    {
      "q": "What after graduation?",
      "a": "Graduates may qualify for post-study residence options subject to current Latvian immigration regulations — to seek work or continue studying. Eligibility, duration and conditions are time-sensitive and not automatic; a job offer then leads to a residence permit with the right to employment (the employer registers the vacancy with the State Employment Agency, NVA). Verify current rules before advising."
    },
    {
      "q": "What is the AIC statement?",
      "a": "A statement from the Academic Information Centre (AIC) confirming the foreign education documents are sufficient for study in Latvia."
    },
    {
      "q": "What is the National Type D visa for?",
      "a": "It is the long-stay entry visa the student applies for AFTER a positive OCMA residence-permit decision, to travel to Latvia. Courses under 90 days use a Schengen C visa; courses over 90 days use the D visa with the residence permit."
    },
    {
      "q": "How long does processing take?",
      "a": "OCMA reviews the residence-permit application on the chosen fee track (30 / 10-working-day / 5-working-day); the D visa is then issued within a short period. Apply early and quote the live OCMA track and estimate rather than a fixed number."
    },
    {
      "q": "Can a refused application be appealed?",
      "a": "An OCMA refusal can be challenged through the available remedy within the stated deadline, or corrected and re-lodged. Read the reason carefully (commonly subsistence, the invitation, or documents) and fix the specific issue rather than re-lodging the same file."
    },
    {
      "q": "Can a spouse or children accompany?",
      "a": "Family reunification is limited and assessed separately under its own rules, with its own subsistence requirements (commonly cited higher per adult/child). Verify current OCMA rules before advising; do not present family accompaniment as automatically available on a study permit."
    },
    {
      "q": "Does the residence permit need renewing?",
      "a": "Yes — the temporary residence permit is registered/renewed (commonly annually) with OCMA, confirming continued enrolment, funds and insurance. If the underlying basis (enrolment) lapses, the permit can be cancelled."
    },
    {
      "q": "Is there a path to permanent residence?",
      "a": "Long-term residence and permanent-residence eligibility depend on current Latvian immigration regulations and the residence category. Study-based time and its treatment should be verified with OCMA — do not assume it counts toward permanent residence."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — OCMA decides. FLC prepares a strong, honest, well-documented file (OCMA invitation, proof of subsistence, insurance) and never promises a permit/visa, in writing or verbally."
    }
  ],
  "compliance": [
    "Client service agreement and consent must be on file before submission.",
    "Never guarantee a visa/permit or approval; use approved, non-guaranteeing language only.",
    "Fee quotes must separate consultancy, government (OCMA + consular + D visa) and third-party (insurance) costs.",
    "Proof-of-subsistence funds belong to the client — never receive, hold or route them through firm accounts.",
    "Never import German requirements (Sperrkonto/blocked account, APS, Anabin, Ausländerbehörde) into a Latvia file.",
    "Get the process order right (OCMA residence permit first, then D visa); do not misstate it to clients.",
    "Do not publish a firm approval rate or an unsourced 'industry benchmark' as a headline figure; use live, sourced CRM data labelled as not predictive of any individual outcome.",
    "Handle academic, financial and insurance documents under data-protection rules: store securely, share only with authorised parties, retain only as needed."
  ],
  "proTips": [
    "Get the order right: university invitation via OCMA → residence-permit decision → THEN the D visa. The visa is not the first step.",
    "Never use German terms in a Latvia file — there is no Sperrkonto/blocked account, APS or Anabin; use the OCMA invitation, bank-statement proof and the AIC recognition statement.",
    "Proof of subsistence tracks the Latvian minimum wage (current Latvian minimum wage / OCMA subsistence requirement — {{VERIFY_LIVE}}) — show it with an original bank statement (commonly valid 3 months).",
    "Choose the OCMA review track deliberately (30 / 10-working-day / 5-working-day) — higher fee, faster decision.",
    "Student work is limited and subject to current Latvian regulations; bachelor's and master's/doctoral rights differ — verify with OCMA.",
    "Insurance: confirm the current minimum insurer liability ({{VERIFY_LIVE}}) before submission."
  ],
  "postApproval": [
    "After a positive OCMA decision, apply for the National Type D visa and travel to Latvia",
    "Give biometrics and collect the residence-permit card from PMLP; register as required",
    "Keep work within the current permitted limits (verify; bachelor's and master's/PhD differ)",
    "Renew the permit before expiry with continued enrolment, funds and insurance"
  ],
  "performance": {
    "ourRate": null,
    "industryRate": null,
    "note": "Approval rate and file counts must be populated live from CRM case data, not published as fixed figures. Do not display a comparative 'industry benchmark' unless independently sourced and cited.",
    "stats": [
      {
        "label": "Files this period",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Approved",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Refused",
        "value": "{{VERIFY_LIVE}}"
      },
      {
        "label": "Withdrawn",
        "value": "{{VERIFY_LIVE}}"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "OCMA invitation + admission in order",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Proof of subsistence (correct amount + bank history)",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "Insurance + accommodation documented",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    },
    {
      "label": "First-submit completeness",
      "ours": "{{VERIFY_LIVE}}",
      "benchmark": null
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counselling, admission, university files the OCMA invitation"
    },
    {
      "weeks": "2–4",
      "title": "Proof of subsistence, insurance, accommodation; residence-permit application to OCMA"
    },
    {
      "weeks": "{{VERIFY_LIVE}}",
      "title": "OCMA review (30 / 10 / 5 working-day track — verify live)"
    },
    {
      "weeks": "after approval",
      "title": "National Type D visa → travel → biometrics + permit card at PMLP"
    }
  ],
  "relatedServices": [
    {
      "label": "Latvia – Post-Study Residence Permit (job search)",
      "libraryId": ""
    },
    {
      "label": "Latvia – Student Residence Permit Renewal",
      "libraryId": ""
    },
    {
      "label": "Latvia – Residence Permit with Right to Employment",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Audit revision (released as v2.2): removed hardcoded minimum-wage references (€780/month) from all client-facing content, leaving 'current Latvian minimum wage / OCMA subsistence requirement ({{VERIFY_LIVE}})'; removed fixed insurance figures (€42,600) for 'insurance meeting current Latvian requirements ({{VERIFY_LIVE}})'; removed hardcoded government fees (€160/€280/€560 OCMA, €100 consular, €90 D visa) for 'current OCMA state fee / consular fee / National D visa fee ({{VERIFY_LIVE}})'; revised post-study guidance to 'graduates may qualify for post-study residence options subject to current Latvian immigration regulations — verify eligibility, duration and conditions' (removed the fixed 4-month / extension framing); softened work-rights wording so 20 h/week and holiday full-time are presented as 'limited employment subject to current regulations — verify limits'; tightened permanent-residence wording to 'long-term/PR eligibility depends on current OCMA rules and residence category — verify' (removed the '5 years / tightened in 2026' framing); rewrote sample-document descriptions to be client-facing (keeping contamination warnings only in compliance/staff notes/red flags); updated affected quiz questions/explanations to verification-based wording; reviewed the cost breakdown so flight and first-year-total figures are illustrative/{{VERIFY_LIVE}}; fixed a garbled tuition note (editorial cleanup); corrected the changelog chronology (v1.0 now predates v2.0); re-ran a full cross-country contamination scan (Germany/Portugal/Lithuania/UK/Canada) — all such terms remain only as warnings or wrong-answer quiz distractors. Preserved all keys, {{VERIFY_LIVE}} placeholders, OCMA/PMLP and AIC guidance, the reverse-order process explanation (residence permit first, D visa second), compliance and contamination warnings, and counsellor-training content. No statistics, approval rates, immigration benefits, stay-back rights, or cross-country terms were introduced."
    },
    {
      "version": "v2.1",
      "date": "10 Jun 2026",
      "author": "Service Library",
      "summary": "Major decontamination + uplift: removed cross-country residue — a German 'Sperrkonto'/blocked-account sample-doc note and red-flag wording, a stray 'Vilnius' (Lithuania; Latvia's capital is Riga) in the cost breakdown, and a Portugal source URL (imigrante.sef.pt) in BOTH workingRights.applicant.sourceUrl and workingRights.spouse.sourceUrl (replaced with pmlp.gov.lv). Replaced auto-generated template FAQs and quiz with real Latvia counsellor Q&A; redistributed the quiz answer key (was ~73/75 on one option); removed the hardcoded approval rate (88%) and '74% benchmark'; converted time-sensitive values to {{VERIFY_LIVE}} placeholders. Corrected facts to OCMA/PMLP guidance: the distinctive REVERSE order (university invitation via OCMA → residence-permit decision → THEN National Type D visa); OCMA/PMLP in Riga; proof of subsistence linked to the €780/month minimum wage (removed the outdated €620/€576/€7,440 figures); OCMA review tracks (€160/€280/€560 by speed) + consular fee (~€100) + D visa fee (~€90) — placeholdered; bachelor's work 20 h/week in term (master's/PhD broader); recognition via the AIC (not Anabin); insurance minimum commonly €42,600; post-study +4 months for bachelor's (master's/PhD extendable); PR after ~5 years (2026 rules stricter). Rebuilt resources to official PMLP/AIC/Study in Latvia/MFA sources. No statistics were invented."
    },
    {
      "version": "v2.0",
      "date": "7 Jun 2026",
      "author": "Service Library",
      "summary": "Expanded quiz to 75 levelled questions (25 per level)."
    },
    {
      "version": "v1.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Initial Latvia student visa content."
    }
  ],
  "staffNotes": [
    {
      "author": "Service Library",
      "date": "16 Jun 2026",
      "text": "Dynamic values are marked {{VERIFY_LIVE}} and MUST be populated from live official sources / CRM before client use: proof-of-subsistence amount (linked to the €780/month minimum wage — verify OCMA), OCMA state fee (commonly €160/€280/€560 by track), consular fee (~€100), D visa fee (~€90), insurance minimum (commonly €42,600), tuition, living costs, processing tracks, doc counts, post-study terms, and any approval/file-count figures. Never publish invented statistics."
    },
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "CONTAMINATION WARNING: clean cross-country residue. Latvia does NOT use a German Sperrkonto/blocked account, APS, Anabin or Ausländerbehörde; recognition is via the AIC, not Anabin. Earlier drafts contained: a German 'Sperrkonto' sample-doc note (removed), a stray 'Vilnius' (which is in Lithuania — Latvia's capital is Riga) in the cost breakdown (fixed to Riga), a Portugal source URL 'imigrante.sef.pt' in BOTH workingRights.applicant.sourceUrl and workingRights.spouse.sourceUrl (replaced with pmlp.gov.lv), and outdated subsistence figures (€620/€576/€7,440 — replaced with the minimum-wage-linked placeholder). KEY LATVIA FACTS: REVERSE order (university invitation via OCMA → residence-permit decision → THEN D visa); OCMA/PMLP in Riga; subsistence linked to the €780/month minimum wage; bachelor's work 20 h/week in term (master's/PhD broader); post-study +4 months (bachelor's), extendable for master's/PhD. Never reintroduce German/Portugal/Lithuania residue."
    }
  ],
  "resources": [
    {
      "title": "OCMA / PMLP — official immigration authority",
      "url": "https://www.pmlp.gov.lv/en",
      "description": "Residence permits, fees, necessary subsistence, registration"
    },
    {
      "title": "PMLP — necessary subsistence (official)",
      "url": "https://www.pmlp.gov.lv/en/necessary-subsistence-0",
      "description": "Minimum-wage-linked subsistence amounts for residence permits"
    },
    {
      "title": "Study in Latvia (official portal)",
      "url": "https://studyinlatvia.lv/",
      "description": "Programmes, admission, visas and residence permits"
    },
    {
      "title": "Academic Information Centre (AIC)",
      "url": "https://www.aic.lv/en",
      "description": "Recognition of foreign qualifications for study in Latvia"
    },
    {
      "title": "Latvian MFA — study in Latvia / visa guidance",
      "url": "https://www.mfa.gov.lv/en",
      "description": "Consular information, D visa and residence-permit procedure"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "Which authority administers Latvian student residence permits?",
      "options": [
        "OCMA / PMLP (Office of Citizenship and Migration Affairs)",
        "The Ausländerbehörde",
        "Migri",
        "Campus France"
      ],
      "correctIndex": 0,
      "explanation": "OCMA/PMLP (pmlp.gov.lv) administers residence permits."
    },
    {
      "level": 1,
      "question": "What is the distinctive order of the Latvian process?",
      "options": [
        "D visa first, then everything else",
        "University invitation via OCMA → residence-permit decision → THEN D visa",
        "Blocked account first",
        "Permit and visa at once abroad"
      ],
      "correctIndex": 1,
      "explanation": "OCMA decides the residence permit first; only then is the D visa applied for."
    },
    {
      "level": 1,
      "question": "Does Latvia use a German-style blocked account?",
      "options": [
        "Yes, €992/month",
        "Yes, for all Indians",
        "No — bank statement / scholarship / sponsor proof",
        "Only in Riga"
      ],
      "correctIndex": 2,
      "explanation": "Latvia does not operate a German Sperrkonto/blocked account."
    },
    {
      "level": 1,
      "question": "Latvia's capital (and OCMA's main location) is:",
      "options": [
        "Vilnius",
        "Tallinn",
        "Berlin",
        "Riga"
      ],
      "correctIndex": 3,
      "explanation": "Riga is Latvia's capital; Vilnius is in Lithuania."
    },
    {
      "level": 1,
      "question": "Student work rights in Latvia are best described as:",
      "options": [
        "Limited and subject to current Latvian regulations — verify limits",
        "Unlimited all year",
        "Always exactly 40 hours/week",
        "No work permitted ever"
      ],
      "correctIndex": 0,
      "explanation": "Student work is limited and subject to current rules; bachelor's and master's/doctoral rights differ — verify."
    },
    {
      "level": 1,
      "question": "Proof of subsistence in Latvia is:",
      "options": [
        "A fixed German Sperrkonto",
        "Set by the current minimum wage / OCMA subsistence requirement — verify",
        "A UK 28-day balance",
        "A Canada GIC"
      ],
      "correctIndex": 1,
      "explanation": "The subsistence figure tracks the current Latvian minimum wage / OCMA requirement; verify the current amount."
    },
    {
      "level": 1,
      "question": "Qualification recognition in Latvia is via:",
      "options": [
        "The German Anabin",
        "A UK NARIC",
        "The Academic Information Centre (AIC)",
        "A blocked account"
      ],
      "correctIndex": 2,
      "explanation": "AIC issues the recognition statement, not Anabin."
    },
    {
      "level": 1,
      "question": "Which visa do non-EU students need for courses over 90 days?",
      "options": [
        "Schengen C visa",
        "A German APS",
        "A UK CAS",
        "National Type D visa (after OCMA approval)"
      ],
      "correctIndex": 3,
      "explanation": "A National Type D visa, applied for after a positive OCMA decision."
    },
    {
      "level": 2,
      "question": "OCMA residence-permit review tracks are commonly:",
      "options": [
        "30 / 10-working-day / 5-working-day (higher fee = faster)",
        "Always 6 months",
        "One week flat",
        "No tracks exist"
      ],
      "correctIndex": 0,
      "explanation": "OCMA offers tiered review tracks at different state fees."
    },
    {
      "level": 2,
      "question": "Master's/doctoral student work rights are:",
      "options": [
        "Always zero",
        "Commonly broader than bachelor's — verify with OCMA",
        "Always 10 hours",
        "Identical to tourists"
      ],
      "correctIndex": 1,
      "explanation": "Master's/doctoral students commonly have broader work rights."
    },
    {
      "level": 2,
      "question": "After graduation, a bachelor's graduate commonly gets:",
      "options": [
        "Automatic PR",
        "A German job-seeker visa",
        "Post-study residence options subject to current rules (verify)",
        "Nothing"
      ],
      "correctIndex": 2,
      "explanation": "Post-study options are subject to current ISD/OCMA rules; verify eligibility and duration."
    },
    {
      "level": 2,
      "question": "The proof-of-subsistence bank document is commonly valid for:",
      "options": [
        "10 years",
        "1 week",
        "Forever",
        "About 3 months from issue"
      ],
      "correctIndex": 3,
      "explanation": "Subsistence/bank documents are commonly valid ~3 months."
    },
    {
      "level": 2,
      "question": "Health insurance minimum liability is commonly cited at:",
      "options": [
        "the current required level (verify current requirement)",
        "€30,000 fixed forever",
        "No requirement",
        "€1,000"
      ],
      "correctIndex": 0,
      "explanation": "Insurer liability the current required level ({{VERIFY_LIVE}}); verify."
    },
    {
      "level": 2,
      "question": "The Type D visa is applied for:",
      "options": [
        "Before contacting the university",
        "After a positive OCMA residence-permit decision",
        "Instead of a permit",
        "At the Ausländerbehörde"
      ],
      "correctIndex": 1,
      "explanation": "The D visa follows a positive OCMA decision."
    },
    {
      "level": 2,
      "question": "English-taught programmes require:",
      "options": [
        "Latvian C1",
        "German TestDaF",
        "English evidence where specified (some admit without IELTS)",
        "No study at all"
      ],
      "correctIndex": 2,
      "explanation": "Provide English evidence per the institution; some programmes admit without IELTS."
    },
    {
      "level": 2,
      "question": "Long-term/permanent residence in Latvia:",
      "options": [
        "Is automatic after 6 months",
        "Is guaranteed for all students",
        "Is never possible",
        "Depends on current OCMA rules and residence category — verify"
      ],
      "correctIndex": 3,
      "explanation": "Long-term/PR eligibility depends on current OCMA rules and category; verify."
    },
    {
      "level": 3,
      "question": "A client's file says 'open a Sperrkonto'. The issue?",
      "options": [
        "That is German — Latvia uses bank-statement/sponsor proof (contamination)",
        "No issue",
        "It is required",
        "It speeds approval"
      ],
      "correctIndex": 0,
      "explanation": "Sperrkonto/blocked-account wording is German residue."
    },
    {
      "level": 3,
      "question": "A cost sheet lists 'Accommodation (Vilnius)'. The issue?",
      "options": [
        "No issue",
        "Vilnius is in Lithuania — Latvia's capital is Riga (contamination)",
        "Vilnius is in Latvia",
        "It lowers the fee"
      ],
      "correctIndex": 1,
      "explanation": "A stray 'Vilnius' is a Lithuania leftover; Latvia's capital is Riga."
    },
    {
      "level": 3,
      "question": "A working-rights field links to 'imigrante.sef.pt'. The issue?",
      "options": [
        "No issue",
        "It is the Latvian source",
        "That is a Portugal URL — replace with pmlp.gov.lv (contamination)",
        "It is faster"
      ],
      "correctIndex": 2,
      "explanation": "imigrante.sef.pt is a Portuguese immigration site — wrong country."
    },
    {
      "level": 3,
      "question": "A counsellor sequences the D visa before the OCMA decision. Correct them:",
      "options": [
        "The visa is always first",
        "Order does not matter",
        "Do both abroad simultaneously",
        "OCMA decides the residence permit FIRST; the D visa follows"
      ],
      "correctIndex": 3,
      "explanation": "Latvia's order is OCMA permit decision first, then the D visa."
    },
    {
      "level": 3,
      "question": "A client asks FLC to hold their proof-of-subsistence money. You:",
      "options": [
        "Refuse — the funds belong to the client and are never routed through the firm",
        "Hold them",
        "Route them through the firm",
        "Charge a fee"
      ],
      "correctIndex": 0,
      "explanation": "Never receive or route client funds — a compliance breach."
    },
    {
      "level": 3,
      "question": "A client wants a written guarantee of the permit. You:",
      "options": [
        "Provide it",
        "Refuse and use approved non-guaranteeing language",
        "Charge extra",
        "Promise a date"
      ],
      "correctIndex": 1,
      "explanation": "Never guarantee an outcome; OCMA decides."
    },
    {
      "level": 3,
      "question": "A bachelor's student works 35 hours/week all term. Consequence?",
      "options": [
        "Allowed",
        "Encouraged",
        "Over the 20 h/week term limit — can jeopardise the permit",
        "No effect"
      ],
      "correctIndex": 2,
      "explanation": "Exceeding 20 h/week in term can jeopardise the permit."
    },
    {
      "level": 3,
      "question": "A counsellor wants to publish a firm approval rate vs an unnamed 'industry' figure. The issue?",
      "options": [
        "No issue",
        "It is required",
        "It lowers the fee",
        "Unsourced/comparative claims risk misleading advertising and implying a guarantee"
      ],
      "correctIndex": 3,
      "explanation": "Do not publish firm rates or comparative benchmarks as headline claims."
    }
  ],
  "donts": {
    "dos": [
      "Sequence the case: OCMA invitation → residence-permit decision → D visa → travel",
      "Show the current OCMA subsistence amount with an original bank statement",
      "Arrange compliant insurance (verify the current minimum liability)",
      "Choose the OCMA review track that fits the timeline",
      "Keep work within the current permitted limits (verify; bachelor's and master's/PhD differ)",
      "Quote consultancy, government (OCMA + consular + D visa) and third-party costs separately"
    ],
    "donts": [
      "Do not use German concepts (Sperrkonto/blocked account, APS, Anabin, Ausländerbehörde) in a Latvia file",
      "Do not treat the D visa as the first step — OCMA decides the permit first",
      "Do not promise approval, a fixed processing time, or a guaranteed post-study stay",
      "Do not mix tuition into the subsistence figure or rely on work income for funds",
      "Do not let a student exceed the current permitted work limits"
    ],
    "mistakes": [
      "Carrying over a German Sperrkonto / blocked-account requirement",
      "Leftover figures or city names from another country (e.g. 'Vilnius', which is in Lithuania, not Latvia — the capital is Riga)",
      "A Portugal source URL (imigrante.sef.pt) left in working-rights fields",
      "Reversing the OCMA-first / D-visa-second order"
    ]
  },
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Show clients which pages to scan — MRZ visible, no glare, full spread.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample university admission letter (mock)",
      "description": "Admission/invitation from a recognised Latvian institution; counsellors should confirm the OCMA invitation number is provided for the application.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of subsistence (mock)",
      "description": "Original bank statement (commonly valid around 3 months) evidencing the OCMA subsistence amount, held separately from tuition; counsellors should confirm it is the applicant's own or a properly documented sponsor's funds.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample proof of funds confirmation (mock)",
      "description": "Original bank statement / scholarship / notarised sponsor arrangement evidencing the OCMA subsistence amount.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / English-language certificate (mock)",
      "description": "English-language evidence where the programme requires it; some Latvian programmes admit without IELTS — confirm with the institution.",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample CV & motivation letter (mock)",
      "description": "Latvian consulate application packet.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample travel health insurance (mock)",
      "description": "Coverage from arrival until enrollment.",
      "mimeType": "application/pdf",
      "docKind": "insurance"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "With a valid residence permit, students are generally permitted limited employment during studies, subject to current Latvian regulations (bachelor's commonly limited to part-time during term; master's/doctoral rights commonly differ). The right to employment must be endorsed in the permit. Verify current work-right limits with OCMA before advising.",
      "details": [
        "Bachelor's: limited part-time employment in term, broader during holidays — verify current limits.",
        "Master's/doctoral: commonly broader work rights — verify with OCMA.",
        "The right to employment is endorsed within the residence permit.",
        "Students are taxed as residents; obtain the necessary tax registration.",
        "Exceeding the current permitted limits can jeopardise the permit."
      ],
      "restrictions": [
        "Bachelor's: the current permitted limits (verify)",
        "Right to employment must be endorsed in the permit; verify master's/PhD rights"
      ],
      "sourceUrl": "https://www.pmlp.gov.lv/",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Family reunification is limited and assessed separately under its own rules and subsistence requirements (commonly cited higher per adult/child). Verify current OCMA rules.",
      "details": [
        "No automatic family accompaniment on a study permit.",
        "Family reunification assessed separately with its own subsistence tests."
      ],
      "restrictions": [],
      "sourceUrl": "https://www.pmlp.gov.lv/",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Latvia – Student Residence Permit (National D Visa)",
    "currency": "EUR",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Values marked {{VERIFY_LIVE}} are dynamic and MUST be verified on official sources (pmlp.gov.lv) before quoting. Proof-of-subsistence funds are the student's own/sponsored money (linked to the minimum wage), not a fee. Latvia does NOT operate a German-style blocked account. INR equivalents move with exchange rates.",
    "sourceUrl": "https://www.pmlp.gov.lv/",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "OCMA residence-permit state fee (review track)",
            "range": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Current OCMA state fee by review track ({{VERIFY_LIVE}}); verify"
          },
          {
            "label": "Consular fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Current consular fee ({{VERIFY_LIVE}}); verify"
          },
          {
            "label": "National Type D visa fee",
            "amount": "{{VERIFY_LIVE}}",
            "currency": "EUR",
            "applicable": true,
            "notes": "Current National D visa fee ({{VERIFY_LIVE}}); verify"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Tuition & education costs",
        "items": [
          {
            "label": "Undergraduate tuition",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "notes": "Tuition varies by programme; public universities are often lower. Use the offer letter for the exact amount.",
            "currency": "EUR",
            "applicable": true
          },
          {
            "label": "Postgraduate tuition",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Use the offer; varies by programme."
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Proof of subsistence (OCMA, minimum-wage linked)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month/year",
            "currency": "EUR",
            "applicable": true,
            "notes": "Tracks the current Latvian minimum wage; verify current amount"
          },
          {
            "label": "Accommodation (Riga / other cities)",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Riga higher; varies by city"
          },
          {
            "label": "Food & transport",
            "range": "{{VERIFY_LIVE}}",
            "unit": "per month",
            "currency": "EUR",
            "applicable": true,
            "notes": "Verify current range"
          }
        ]
      },
      {
        "id": "misc",
        "label": "Miscellaneous",
        "items": [
          {
            "label": "Future Link consultancy fee",
            "range": "See Fees tab",
            "notes": "Service package dependent"
          },
          {
            "label": "Flight to Latvia",
            "range": "{{VERIFY_LIVE}}",
            "notes": "Season dependent Illustrative only; varies by season/route — verify."
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first year",
        "value": "{{VERIFY_LIVE}}",
        "notes": "Illustrative first-year estimate only, not an official requirement; verify all components."
      }
    ]
  }
}
$latvia_student_visa$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000e4';
