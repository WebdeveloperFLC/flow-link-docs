-- Canada Spouse / Partner Sponsorship academy_metadata v2.1
-- Source: content/service-library/canada-spouse-visa.json

UPDATE public.service_library
SET
  academy_metadata = $metadata$
{
  "displayName": "Canada – Spouse / Partner Sponsorship",
  "shortDescription": "IRCC family sponsorship · Inland & outland · PR pathway for spouses & partners",
  "version": "v2.1",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Advanced",
  "learningMinutes": 25,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "PR fees increased 30 Apr 2026 (official IRCC). Confirm current IRCC spousal sponsorship fees (sponsorship + processing + RPRF + biometrics) and the live processing times on canada.ca before quoting any client — these are time-sensitive and should be pulled from current CRM/IRCC values, not memorised."
  },
  "alert": {
    "title": "Genuine relationship + stream choice are decisive",
    "body": "Officers scrutinise relationship genuineness, and the inland-vs-outland choice changes the client's rights: outland (Family Class) refusals carry an IAD appeal right; inland refusals do NOT (only Federal Court judicial review). Build a chronological, document-backed relationship story and choose the stream deliberately."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "Relationship proof critical",
      "variant": "warning"
    },
    {
      "label": "~16mo outland / ~25mo inland (verify live)",
      "variant": "neutral"
    },
    {
      "label": "Online – IRCC PR Portal",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Processing varies — verify live tool",
      "variant": "neutral"
    },
    {
      "label": "Govt fees ~CAD $1,345 (verify)",
      "variant": "warning"
    },
    {
      "label": "Genuine relationship",
      "variant": "warning"
    },
    {
      "label": "Inland vs outland — appeal rights differ",
      "variant": "success"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "~16–25m",
      "sub": "Outland ~16mo / inland ~25mo — verify live tool (dynamic)",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "CAD $1,345",
      "sub": "$90+$570+$600 PR fees + $85 biometrics — official, verify (dynamic)",
      "tone": "warning"
    },
    {
      "label": "Our approval rate",
      "value": "91%",
      "sub": "vs industry benchmark — should be a live CRM value",
      "tone": "success"
    },
    {
      "label": "Required docs",
      "value": "18",
      "sub": "+ relationship evidence",
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
      "value": "Family class sponsorship allowing a Canadian citizen or permanent resident to sponsor a spouse, common-law, or conjugal partner for permanent residence. Outland applications processed from abroad; inland if partner is in Canada."
    },
    {
      "label": "Eligible applicants",
      "value": "Legally married, or a qualifying common-law (12+ months continuous cohabitation) or conjugal partner · Sponsor is a Canadian citizen, registered Indian, or permanent resident aged 18+ · Sponsor is NOT in default of a prior undertaking and not (other than for disability) on social assistance · Genuine relationship · Medical and security clearances. Note: there is no minimum income (LICO) requirement for sponsoring a spouse/partner federally, except limited cases; Quebec (MIFI) applies its own income test."
    },
    {
      "label": "Inland vs outland",
      "value": "Outland (Family Class): processed via a visa office; the partner can be inside or outside Canada and may travel freely during processing; a refusal carries a full IAD appeal right. Inland (Spouse/Common-Law Partner in Canada): the partner is in Canada and may apply for a Spousal Open Work Permit (SOWP) after the Acknowledgement of Receipt (AOR), but a refusal has NO appeal — only Federal Court judicial review, and leaving Canada risks the application. Conjugal partners are always outland. In 2026 outland is the strategic default for most couples (faster + appeal right + travel flexibility).",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Immigration, Refugees and Citizenship Canada (IRCC)"
    },
    {
      "label": "After approval",
      "value": "Partner receives COPR and completes landing, then can apply for a PR card. The sponsor's undertaking to support the spouse runs 3 years. Relationship genuineness obligations continue; misrepresentation has serious consequences (potential inadmissibility and a 5-year bar)."
    }
  ],
  "eligibility": [
    {
      "criterion": "Sponsor is Canadian citizen or PR aged 18+",
      "met": true,
      "note": "Verify sponsor is a Canadian citizen, registered Indian or PR aged 18+. A PR sponsor must reside in Canada (or show intent to return if a citizen). Critical bar: a sponsor who was themselves sponsored as a spouse/partner cannot sponsor a new spouse until 5 years after becoming a PR."
    },
    {
      "criterion": "Legally valid marriage or qualifying relationship",
      "met": true,
      "note": "Marriage certificate; common-law needs 12+ months cohabitation proof"
    },
    {
      "criterion": "Genuine relationship evidence",
      "met": true,
      "note": "Photos, communication, financial mingling, visits"
    },
    {
      "criterion": "Sponsor eligible — not in default, not on social assistance",
      "met": true,
      "note": "No minimum income for spouse/partner federally (except limited cases); sponsor must not be in default of a prior undertaking and not on social assistance other than for disability. Quebec (MIFI) applies its own income test."
    },
    {
      "criterion": "Medical exam completed",
      "met": false,
      "note": "Panel physician after instructions"
    },
    {
      "criterion": "Police certificates as required",
      "met": false,
      "note": "Based on residence history"
    },
    {
      "criterion": "Biometrics completed",
      "met": false,
      "note": "Both sponsor and applicant if required"
    }
  ],
  "redFlagsBanner": "If refused for relationship genuineness, do not reapply with the same weak evidence. Rebuild a chronological, verifiable relationship narrative first.",
  "redFlags": [
    {
      "title": "Weak relationship evidence",
      "description": "Few photos, no communication logs, short relationship timeline, or inconsistent stories.",
      "fix": "Chronological timeline; chat/call logs; joint finances; visit stamps; affidavits from family",
      "severity": "Very common"
    },
    {
      "title": "Marriage of convenience suspicion",
      "description": "Large age gap without explanation, met only days before marriage, or prior failed sponsorships.",
      "fix": "Honest narrative; explain how relationship developed; strong third-party support",
      "severity": "High"
    },
    {
      "title": "Incomplete sponsor eligibility",
      "description": "Sponsor on social assistance, prior undertaking default, or not meeting residency for PR sponsors.",
      "fix": "Verify sponsor eligibility checklist on canada.ca before fee collection",
      "severity": "High"
    },
    {
      "title": "Wrong stream (inland vs outland)",
      "description": "Choosing inland for a case with any refusal risk forfeits the IAD appeal right (inland has none), or choosing inland when the partner cannot hold valid status. Outland is safer where refusal risk exists.",
      "fix": "Default to outland where any complexity or refusal risk exists (preserves the IAD appeal right and travel flexibility); reserve inland for low-risk cases wanting the SOWP",
      "severity": "High"
    },
    {
      "title": "Missing or inconsistent forms",
      "description": "IMM forms incomplete, dates mismatch across documents, or unsigned declarations.",
      "fix": "Cross-check all dates; dual review before upload",
      "severity": "Common"
    },
    {
      "title": "Undisclosed prior relationships or refusals",
      "description": "Hidden prior marriages, divorces not finalised, prior refusals, or any misrepresentation. The most damaging issue in any file — it can trigger inadmissibility and a 5-year misrepresentation bar.",
      "fix": "Full disclosure; address changed circumstances in cover letter",
      "severity": "Critical"
    },
    {
      "title": "Sponsored-spouse 5-year bar overlooked",
      "description": "Sponsor was themselves sponsored as a spouse/partner and has not yet been a PR for 5 years — they are barred from sponsoring a new spouse.",
      "fix": "Check the sponsor's own immigration history before fee collection; confirm the 5-year period has elapsed",
      "severity": "High"
    },
    {
      "title": "SOWP filed without valid temporary status",
      "description": "An inland/in-Canada spouse applies for the open work permit after their temporary status has lapsed, or travels abroad mid-process and is refused re-entry, cancelling the application.",
      "fix": "Confirm valid status before the SOWP/PR filing; advise against travel on the inland stream; consider outland for travel flexibility",
      "severity": "Common"
    }
  ],
  "faqs": [
    {
      "q": "Can we guarantee PR approval for a genuine marriage?",
      "a": "No. Even genuine couples can face requests for additional evidence or refusal if documentation is weak. We improve file quality but never promise approval."
    },
    {
      "q": "Inland or outland—which is faster?",
      "a": "Outland is generally faster in 2026 (about 16 months vs about 25 months inland, outside Quebec — verify the live IRCC tool) and preserves a full IAD appeal right if refused, plus travel flexibility. Inland lets an in-Canada partner apply for a Spousal Open Work Permit but has no appeal right. For most couples with any complexity, outland is the safer default; assess each case on the partner's status, travel needs and refusal risk."
    },
    {
      "q": "How much relationship evidence is enough?",
      "a": "No fixed amount—officers want a credible chronological story: how you met, communication, visits, marriage, shared life plans. Quality over quantity."
    },
    {
      "q": "Can a sponsored spouse work while waiting?",
      "a": "Yes, if the partner is in Canada: they can apply for a Spousal Open Work Permit (SOWP) after the Acknowledgement of Receipt (AOR) — they no longer have to wait for first-stage (AIP) approval. The SOWP (LMIA-exemption code A74) lets them work for any employer while PR is processed (roughly 4–6 months to issue). They must hold valid temporary status when they apply. Verify current IRCC rules at the time of counselling."
    },
    {
      "q": "What if marriage is recent?",
      "a": "Recent marriages need stronger evidence—communication history before marriage, visit records, photos, and explanation of relationship development."
    },
    {
      "q": "Does sponsor need minimum income?",
      "a": "Spousal sponsorship generally has no LICO requirement for spouse/partner/child, but sponsor must not be on social assistance (except disability) and must meet undertaking obligations."
    },
    {
      "q": "What happens after refusal?",
      "a": "Review the refusal letter and, where possible, the GCMS notes. Outland (Family Class) refusals can be appealed to the Immigration Appeal Division (IAD) within 30 days — a genuine fresh hearing where new evidence and H&C grounds can be argued. Inland refusals have NO appeal, only Federal Court judicial review (a limited review of reasonableness/fairness) or a stronger re-application. Never re-lodge the same weak evidence."
    },
    {
      "q": "Are common-law partners eligible?",
      "a": "Yes, if they have cohabited continuously for at least 12 months. Evidence of shared residence is essential."
    },
    {
      "q": "What is the difference between inland and outland sponsorship?",
      "a": "Outland (Family Class) is processed through a visa office; the partner can be inside or outside Canada, can travel freely during processing, and a refusal carries a full IAD appeal right. Inland (Spouse/Common-Law Partner in Canada) requires the partner to be in Canada with valid status, allows a Spousal Open Work Permit after AOR, but a refusal has no appeal — only judicial review. Conjugal partners must apply outland."
    },
    {
      "q": "Is there a minimum income requirement to sponsor a spouse?",
      "a": "No — federally there is no LICO/minimum income to sponsor a spouse, common-law or conjugal partner (limited exceptions apply, e.g. if a dependent child has their own children). The sponsor must not be in default of a prior undertaking and not on social assistance other than for disability. Quebec applies its own MIFI income test, so verify for Quebec-destined files."
    },
    {
      "q": "How long does the sponsor's financial undertaking last?",
      "a": "For a spouse or partner the undertaking is 3 years from the day they become a PR (dependent children differ). During this period the sponsor is financially responsible; if the sponsored person receives social assistance, the sponsor must repay it and may go into default, which blocks future sponsorships."
    },
    {
      "q": "Can someone sponsor a new spouse if they were sponsored as a spouse themselves?",
      "a": "Not immediately. A person sponsored as a spouse/partner cannot sponsor a new spouse until 5 years after they became a permanent resident, even if the earlier relationship has ended. Always check the sponsor's own immigration history before taking fees."
    },
    {
      "q": "What government fees apply, and which are refundable?",
      "a": "Per the official IRCC fee list (effective 30 Apr 2026), the government fees for a spouse with no children are: sponsorship fee CAD $90 + principal-applicant processing fee CAD $570 + Right of Permanent Residence Fee (RPRF) CAD $600 + biometrics CAD $85 = CAD $1,345 total. Only the RPRF is refundable if PR is not finalised; the rest are non-refundable once IRCC opens the file. The RPRF can be deferred (initial payable then CAD $745). Each accompanying dependent child adds CAD $180 (children pay no RPRF); biometrics has a CAD $170 family maximum. Always verify on canada.ca before quoting — fees change."
    },
    {
      "q": "How long does a Spousal Open Work Permit take, and who qualifies?",
      "a": "A partner physically in Canada with valid status can apply for the SOWP (code A74) after the AOR; it typically issues in about 4–6 months and allows work for any employer while PR is processed. It is not automatic and depends on maintaining valid status. Verify the current SOWP processing time on the live IRCC tool."
    },
    {
      "q": "Does a recent marriage or a large age gap mean refusal?",
      "a": "No — short courtships and age differences are noted by officers but do not automatically cause refusal. What matters is the quality and consistency of the evidence: how the couple met, pre-marriage communication, visits, the development of the relationship, and a credible chronological narrative. Build extra evidence where the relationship is recent or arranged."
    },
    {
      "q": "Can the couple travel during processing?",
      "a": "Outland: yes, the sponsored person can travel and re-enter (visa permitting). Inland: travel is risky — leaving Canada can jeopardise the application, and if CBSA refuses re-entry the inland application can be cancelled. If travel matters, outland is usually the better stream."
    },
    {
      "q": "Are same-sex and conjugal partners eligible?",
      "a": "Yes. Canadian law recognises same-sex spouses, common-law and conjugal partners, including where the relationship could not be conducted openly in the partner's home country — which can itself be central evidence in a conjugal case. Conjugal partner applications are always processed outland."
    },
    {
      "q": "What relationship evidence is strongest?",
      "a": "A credible chronological story beats volume: how the couple met, sustained communication (with dated logs), visits with travel stamps, photos in context, joint finances or shared responsibilities, and consistent statements from both partners. Affidavits from family/friends help. Avoid anything fabricated — inconsistencies are the leading refusal trigger."
    },
    {
      "q": "What does FLC actually guarantee?",
      "a": "Nothing about the outcome — IRCC decides. Even a genuine marriage can face requests for evidence or refusal if the file is weak. FLC prepares a strong, honest, well-documented file and never promises a PR result, in writing or verbally."
    },
    {
      "q": "When should consultancy fees be collected versus lodging the application?",
      "a": "Follow office policy: a signed service agreement and initial fee at engagement, milestone payments during the file build, and the balance before or at IRCC submission. Quote consultancy, government and third-party costs on separate lines and never promise approval in fee discussions."
    }
  ],
  "compliance": [
    "Spousal sponsorship requires licensed RCIC or lawyer for paid representation in Canada—confirm credentials",
    "Client service agreement and consent must be on file before submission",
    "Never guarantee PR approval; marriage alone does not ensure success",
    "Fee quotes must separate consultancy, government, medical, and biometrics"
  ],
  "proTips": [
    "Build a relationship timeline document before collecting forms",
    "Cross-check every date across marriage cert, photos, and travel history",
    "For recent marriages, include pre-marriage communication evidence",
    "Verify sponsor eligibility before taking full fees",
    "Save relationship evidence binder separately for RFI responses",
    "Default to outland where any refusal risk exists — it preserves the IAD appeal right that inland lacks.",
    "Check the sponsor's own history for the 5-year sponsored-spouse bar BEFORE taking fees.",
    "Confirm the partner holds valid temporary status before any inland/SOWP filing; advise against mid-process travel on the inland stream.",
    "Treat the CAD $1,345 official fee total and processing times as live values — verify on canada.ca and pull from current CRM data, never quote from memory."
  ],
  "postApproval": [
    "Send COPR and landing instructions to client in writing",
    "Remind client of PR card application after landing",
    "Explain the sponsor's 3-year undertaking for a spouse/partner (financial responsibility; repaying any social assistance received)",
    "Register for post-landing settlement briefing if offered"
  ],
  "performance": {
    "ourRate": 91,
    "industryRate": 82,
    "stats": [
      {
        "label": "Files this year",
        "value": "47"
      },
      {
        "label": "Approved",
        "value": "43"
      },
      {
        "label": "Refused",
        "value": "3"
      },
      {
        "label": "Withdrawn",
        "value": "1"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Our rate vs industry",
      "ours": 91,
      "benchmark": 82
    },
    {
      "label": "Relationship evidence quality",
      "ours": 88,
      "benchmark": 72
    },
    {
      "label": "Form accuracy",
      "ours": 94,
      "benchmark": 78
    },
    {
      "label": "Complete checklist first submit",
      "ours": 90,
      "benchmark": 75
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counseling, sponsor eligibility check, fee agreement"
    },
    {
      "weeks": "2–6",
      "title": "Relationship evidence collection, forms, medical/police"
    },
    {
      "weeks": "6–8",
      "title": "Quality review & IRCC submission"
    },
    {
      "weeks": "8–12",
      "title": "Acknowledgement of receipt (AOR)"
    },
    {
      "weeks": "~16–25m",
      "title": "Processing to decision — ~16mo outland / ~25mo inland (verify live tool; varies)"
    }
  ],
  "relatedServices": [
    {
      "label": "Canada – Visitor Visa (TRV)",
      "libraryId": ""
    },
    {
      "label": "Canada – Express Entry PR",
      "libraryId": ""
    },
    {
      "label": "Canada – Work Permit",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.1",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Gold-standard content pass: replaced auto-generated template FAQs and quiz questions with real counsellor Q&A; corrected the inland-vs-outland appeal-rights asymmetry (IAD for outland only), the SOWP rule (after AOR, code A74, not AIP), the no-minimum-income fact, and the 5-year sponsored-spouse bar; updated government fees to the official CAD $1,345 total (sponsorship $90 + processing $570 + RPRF $600 + biometrics $85, effective 30 Apr 2026) and processing to ~16mo outland/~25mo inland; flagged fees, processing times and approval rate as values that should be dynamic/CRM-sourced; varied the quiz answer key across positions."
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
      "summary": "Initial counselor content for Canada spousal sponsorship with 2026 fee notes."
    }
  ],
  "staffNotes": [
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "Arranged marriages need extra care—build pre-marriage communication evidence and family affidavits without appearing fabricated."
    },
    {
      "author": "Quality",
      "date": "16 Jun 2026",
      "text": "Mandatory dual review for all spousal files—date mismatches are the top internal QA finding."
    }
  ],
  "resources": [
    {
      "title": "IRCC — Sponsor your spouse, partner or child",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children.html",
      "description": "Official sponsorship requirements and application guide"
    },
    {
      "title": "IRCC — Check processing times",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
      "description": "Live spousal sponsorship processing estimates (inland vs outland; updated weekly) — quote this, not a fixed number"
    },
    {
      "title": "IRCC — Application fees",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-application-fees.html",
      "description": "Current sponsorship, processing, RPRF and biometrics fees — verify before every client quote (PR fees rose ~31 Mar 2026)"
    },
    {
      "title": "IRCC — Biometrics",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/biometrics/facts.html",
      "description": "Biometrics requirements for family class"
    },
    {
      "title": "IRCC — Medical exams",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/medical-exams.html",
      "description": "When and how to complete immigration medical exam"
    },
    {
      "title": "IRB — Immigration Appeal Division (sponsorship appeals)",
      "url": "https://irb.gc.ca/en/immigration-appeals/Pages/index.aspx",
      "description": "Where outland (Family Class) sponsorship refusals are appealed within 30 days — verify current process and deadlines"
    }
  ],
  "quiz": [
    {
      "question": "What is a leading refusal reason in spousal sponsorship?",
      "options": [
        "Weak or inconsistent relationship evidence",
        "Passport colour",
        "Hotel bookings",
        "Language test scores"
      ],
      "correctIndex": 0,
      "explanation": "Officers must be satisfied the relationship is genuine.",
      "level": 1
    },
    {
      "question": "Common-law partners must generally show:",
      "options": [
        "1 month cohabitation",
        "12+ months continuous cohabitation",
        "No evidence needed",
        "Only wedding photos"
      ],
      "correctIndex": 1,
      "explanation": "IRCC requires at least 12 months of continuous cohabitation for common-law.",
      "level": 1
    },
    {
      "question": "Can counselors guarantee PR for genuine marriages?",
      "options": [
        "Yes, always",
        "Yes, if married 5+ years",
        "No, never guarantee approval",
        "Yes, if sponsor is citizen"
      ],
      "correctIndex": 2,
      "explanation": "Firm policy: never guarantee immigration outcomes.",
      "level": 1
    },
    {
      "question": "Inland sponsorship may allow the partner to:",
      "options": [
        "Skip medical exam",
        "Work without any permit immediately",
        "Leave Canada permanently without impact",
        "Apply for open work permit in many cases while awaiting decision"
      ],
      "correctIndex": 3,
      "explanation": "Inland stream has specific work permit options—verify current rules.",
      "level": 1
    },
    {
      "question": "Before submission, counselors must verify:",
      "options": [
        "Sponsor eligibility and complete relationship timeline",
        "Only marriage certificate",
        "Client's school marks",
        "Hotel reservations in Canada"
      ],
      "correctIndex": 0,
      "explanation": "Sponsor eligibility and relationship narrative are foundational.",
      "level": 1
    },
    {
      "level": 1,
      "question": "Who may be sponsored under spouse/partner sponsorship?",
      "options": [
        "Any friend the sponsor wishes to bring to Canada",
        "A spouse, common-law partner (12+ months cohabitation), or conjugal partner",
        "Only a legally married spouse, never a partner",
        "Any relative under the age of 18"
      ],
      "correctIndex": 1,
      "explanation": "The class covers spouses, qualifying common-law partners, and conjugal partners."
    },
    {
      "level": 1,
      "question": "How long must common-law partners have cohabited to qualify?",
      "options": [
        "At least 3 months",
        "At least 6 months",
        "At least 12 continuous months",
        "No cohabitation needed"
      ],
      "correctIndex": 2,
      "explanation": "Common-law status requires at least 12 months of continuous cohabitation, with proof."
    },
    {
      "level": 1,
      "question": "Is there a minimum income requirement to sponsor a spouse federally?",
      "options": [
        "Yes, the sponsor must meet LICO like the parents program",
        "Yes, CAD $40,000 minimum",
        "Only if the spouse has a job offer",
        "No minimum income in most cases, but the sponsor cannot be on social assistance (except disability)"
      ],
      "correctIndex": 3,
      "explanation": "Spousal sponsorship has no LICO requirement in most cases; Quebec applies its own test."
    },
    {
      "level": 1,
      "question": "Which stream preserves a right of appeal to the IAD if refused?",
      "options": [
        "Outland (Family Class)",
        "Inland (Spouse in Canada class)",
        "Both equally",
        "Neither"
      ],
      "correctIndex": 0,
      "explanation": "Outland refusals can be appealed to the IAD; inland refusals cannot."
    },
    {
      "level": 1,
      "question": "What is the sponsor's undertaking period for a spouse/partner?",
      "options": [
        "20 years",
        "3 years",
        "10 years",
        "No undertaking"
      ],
      "correctIndex": 1,
      "explanation": "The undertaking for a spouse/partner runs 3 years from the date they become a PR."
    },
    {
      "level": 1,
      "question": "When can an in-Canada spouse apply for a Spousal Open Work Permit?",
      "options": [
        "Only after PR is granted",
        "Before submitting anything",
        "After the Acknowledgement of Receipt (AOR)",
        "Never"
      ],
      "correctIndex": 2,
      "explanation": "Since 2019 the SOWP is available after AOR, not after first-stage approval."
    },
    {
      "level": 1,
      "question": "Which document proves a common-law relationship?",
      "options": [
        "A single photograph",
        "A verbal statement only",
        "A marriage certificate",
        "Evidence of 12+ months continuous cohabitation (joint lease, bills, statutory declaration)"
      ],
      "correctIndex": 3,
      "explanation": "Cohabitation evidence over the full 12-month period is essential for common-law cases."
    },
    {
      "level": 1,
      "question": "Conjugal partner applications must be filed:",
      "options": [
        "Outland (Family Class) only",
        "Inland only",
        "Either stream",
        "No application needed"
      ],
      "correctIndex": 0,
      "explanation": "Conjugal partner cases are processed outland."
    },
    {
      "level": 2,
      "question": "A sponsor was themselves sponsored as a spouse 3 years ago. Can they now sponsor a new spouse?",
      "options": [
        "Yes, immediately",
        "No — they must wait 5 years from becoming a PR",
        "Yes, after 1 year",
        "Only if remarried abroad"
      ],
      "correctIndex": 1,
      "explanation": "A previously sponsored spouse is barred from sponsoring a new spouse for 5 years after becoming a PR."
    },
    {
      "level": 2,
      "question": "Which government fee is refundable if PR is not finalised?",
      "options": [
        "The processing fee",
        "The sponsorship fee",
        "The Right of Permanent Residence Fee (RPRF)",
        "The biometrics fee"
      ],
      "correctIndex": 2,
      "explanation": "Only the RPRF is refundable; the other government fees are non-refundable once the file opens."
    },
    {
      "level": 2,
      "question": "Per the official IRCC fee list, roughly what is the total government fee for a spouse with no children (2026)?",
      "options": [
        "About CAD $150",
        "About CAD $5,000",
        "No fee",
        "About CAD $1,345 ($90+$570+$600+$85 biometrics) — verify on canada.ca"
      ],
      "correctIndex": 3,
      "explanation": "Effective 30 Apr 2026: sponsorship $90 + processing $570 + RPRF $600 + biometrics $85 = $1,345; always verify the live figure."
    },
    {
      "level": 2,
      "question": "An in-Canada spouse on the inland stream travels abroad mid-process and is denied re-entry. What happens?",
      "options": [
        "The inland application can be cancelled",
        "Nothing — travel is always safe",
        "The fee is doubled",
        "PR is granted faster"
      ],
      "correctIndex": 0,
      "explanation": "Leaving Canada on the inland stream is risky; denied re-entry can cancel the application."
    },
    {
      "level": 2,
      "question": "What is the strongest single factor in a spousal file?",
      "options": [
        "The number of photos alone",
        "A credible, consistent, document-backed relationship narrative",
        "A high sponsor income",
        "A short courtship"
      ],
      "correctIndex": 1,
      "explanation": "Officers assess genuineness; a coherent evidenced story matters more than volume."
    },
    {
      "level": 2,
      "question": "For a case with refusal risk, which stream is the safer default in 2026?",
      "options": [
        "Inland — it is always faster",
        "Neither",
        "Outland — it preserves the IAD appeal right and travel flexibility",
        "Whichever is cheaper"
      ],
      "correctIndex": 2,
      "explanation": "Outland keeps the appeal right and is generally faster in 2026."
    },
    {
      "level": 2,
      "question": "What LMIA-exemption code applies to the Family Class Spousal Open Work Permit?",
      "options": [
        "C41",
        "C42",
        "A75",
        "A74"
      ],
      "correctIndex": 3,
      "explanation": "A74 is the Family Class sponsorship SOWP code; C41/C42 are spouses of workers/students."
    },
    {
      "level": 2,
      "question": "What must the sponsor NOT be, to remain eligible?",
      "options": [
        "In default of a prior undertaking or on social assistance (other than disability)",
        "Over 30 years old",
        "Employed full-time",
        "A homeowner"
      ],
      "correctIndex": 0,
      "explanation": "Default on a prior undertaking or social assistance (non-disability) breaks eligibility."
    },
    {
      "level": 2,
      "question": "How quickly must an outland refusal be appealed to the IAD?",
      "options": [
        "Within 1 year",
        "Within 30 days of the refusal",
        "Within 7 days",
        "There is no deadline"
      ],
      "correctIndex": 1,
      "explanation": "The IAD Notice of Appeal is due within 30 days of receiving the refusal."
    },
    {
      "level": 2,
      "question": "Does a large age gap automatically cause refusal?",
      "options": [
        "Yes, always",
        "Only for outland",
        "No — it is noted but the quality of evidence decides the case",
        "Only for inland"
      ],
      "correctIndex": 2,
      "explanation": "Age gaps and short courtships are noted but not automatically fatal."
    },
    {
      "level": 3,
      "question": "A couple has thin evidence and real refusal risk but wants the SOWP. Best counsel?",
      "options": [
        "Always file inland for the work permit",
        "Guarantee approval",
        "Hide the weak evidence",
        "Explain the trade-off: inland gives the SOWP but no appeal right; for a risky file, outland's IAD appeal may matter more"
      ],
      "correctIndex": 3,
      "explanation": "Stream choice trades SOWP access against appeal rights; risk should drive the decision."
    },
    {
      "level": 3,
      "question": "An inland application is refused. What recourse exists?",
      "options": [
        "No IAD appeal — only Federal Court judicial review or a stronger re-application",
        "An automatic IAD appeal",
        "Re-entry at the border",
        "Nothing at all"
      ],
      "correctIndex": 0,
      "explanation": "Inland refusals have no appeal; only judicial review or re-application."
    },
    {
      "level": 3,
      "question": "A client omitted a prior divorce that is not yet finalised. Risk?",
      "options": [
        "None",
        "Misrepresentation (A40) — possible inadmissibility and a 5-year bar; the marriage may also be invalid",
        "Faster processing",
        "Lower fee"
      ],
      "correctIndex": 1,
      "explanation": "Undisclosed/unfinalised prior marriage risks misrepresentation and a void marriage."
    },
    {
      "level": 3,
      "question": "A sponsor quotes the client the old CAD $1,150 government-fee total. The issue?",
      "options": [
        "Too high",
        "No issue",
        "Outdated — per the official IRCC list (30 Apr 2026) the total is about CAD $1,345; verify the live figure",
        "Fees are never quoted"
      ],
      "correctIndex": 2,
      "explanation": "The official total is now about CAD $1,345 (effective 30 Apr 2026); always verify on canada.ca."
    },
    {
      "level": 3,
      "question": "A genuine couple asks for a written guarantee of PR. You:",
      "options": [
        "Provide the guarantee",
        "Charge extra for it",
        "Promise a timeline",
        "Refuse and use approved non-guaranteeing language; even genuine cases can be refused on weak evidence"
      ],
      "correctIndex": 3,
      "explanation": "Never guarantee outcomes; genuineness alone does not ensure approval."
    },
    {
      "level": 3,
      "question": "A conjugal partner client wants to file inland for the work permit. Correct advice?",
      "options": [
        "Conjugal cases must be filed outland — inland is not available",
        "File inland anyway",
        "Either stream is fine",
        "No application is needed"
      ],
      "correctIndex": 0,
      "explanation": "Conjugal partner applications are outland only."
    },
    {
      "level": 3,
      "question": "The sponsored spouse received social assistance during the undertaking. Consequence for the sponsor?",
      "options": [
        "Nothing",
        "The sponsor must repay it and may go into default, blocking future sponsorships",
        "The PR is revoked automatically",
        "The fee is refunded"
      ],
      "correctIndex": 1,
      "explanation": "Undertaking default arises if the sponsor doesn't repay social assistance received."
    },
    {
      "level": 3,
      "question": "Why might outland be recommended even when the spouse is already in Canada?",
      "options": [
        "It is cheaper",
        "It avoids biometrics",
        "Faster in 2026, preserves the IAD appeal right, and allows travel — using the dual-intent framework",
        "It removes the medical exam"
      ],
      "correctIndex": 2,
      "explanation": "Outland can be used for a spouse in Canada and offers appeal rights and travel flexibility."
    },
    {
      "level": 3,
      "question": "A file has a short courtship and arranged marriage. Best practice?",
      "options": [
        "Hide the arrangement",
        "Submit with no extra evidence",
        "Guarantee approval",
        "Build pre-marriage communication evidence and credible family affidavits without anything fabricated"
      ],
      "correctIndex": 3,
      "explanation": "Arranged/short-courtship cases need extra genuine, consistent evidence."
    }
  ],
  "donts": {
    "dos": [
      "Build chronological relationship timeline with verifiable evidence",
      "Verify sponsor eligibility before fee collection",
      "Cross-check all dates across forms and documents",
      "Disclose all prior relationships, refusals, and marriages",
      "Prepare for RFI with evidence binder ready",
      "Choose inland vs outland deliberately — weigh the IAD appeal right (outland only) against SOWP access (inland)",
      "Check the sponsor's own immigration history for the 5-year sponsored-spouse bar"
    ],
    "donts": [
      "Do not guarantee PR approval for any relationship type",
      "Do not submit fabricated photos or communication logs",
      "Do not hide prior failed sponsorships or refusals",
      "Do not choose inland/outland without assessing partner's legal status",
      "Do not quote fees without checking current IRCC fee page",
      "Do not default to inland for a risky file — it forfeits the IAD appeal right",
      "Do not let an in-Canada partner travel mid-process on the inland stream without a status/re-entry review"
    ],
    "mistakes": [
      "Few relationship photos with no context or dates",
      "Date mismatches between marriage cert and application forms",
      "Missing police certificates for required countries",
      "Sponsor on social assistance without eligibility check",
      "Generic relationship letter not matching actual timeline",
      "Overlooking the 5-year bar where the sponsor was themselves a sponsored spouse",
      "Quoting an old fee total — official spouse sponsorship fees are $90+$570+$600+$85=$1,345 (30 Apr 2026)"
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
      "title": "Sample marriage certificate (mock)",
      "description": "Registered marriage proof — explain translation and notarization if needed.",
      "mimeType": "application/pdf",
      "docKind": "relationship"
    },
    {
      "title": "Sample relationship timeline & photos guide (mock)",
      "description": "Collage layout for chat logs, travel photos, and ceremony pictures.",
      "mimeType": "application/pdf",
      "docKind": "relationship"
    },
    {
      "title": "Sample sponsor / undertaking letter (mock)",
      "description": "Sponsor income, accommodation, and maintenance commitment.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample bank statement (mock)",
      "description": "6-month statement with name, account number, and closing balance — explain seasoning.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample chat / communication evidence (mock)",
      "description": "Redacted WhatsApp or email excerpts — privacy-safe specimen.",
      "mimeType": "image/jpeg",
      "docKind": "relationship"
    }
  ],
  "navBucket": "visa",
  "workingRights": {
    "applicant": {
      "summary": "A sponsored spouse/partner physically in Canada with valid status may apply for a Spousal Open Work Permit (SOWP, LMIA-exemption code A74) after the Acknowledgement of Receipt (AOR), allowing work for any employer while the PR application is processed.",
      "details": [
        "SOWP is available after AOR — the applicant no longer waits for first-stage (AIP) approval.",
        "The applicant must hold valid temporary status when applying; the SOWP typically issues in about 4–6 months.",
        "Conditions printed on the permit must be followed; PGWP/other permits are separate."
      ],
      "restrictions": [
        "Must hold valid status to apply; cannot work until the permit is issued",
        "On the inland stream, leaving Canada can jeopardise both the SOWP and the PR application"
      ],
      "sourceUrl": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Canadian citizen/permanent resident sponsor does not need work authorization in Canada. Foreign partner receives open work permit when SOWP approved.",
      "details": [
        "Dependent children may have separate study/work rules — assess age and status."
      ],
      "restrictions": [],
      "sourceUrl": "https://www.canada.ca/en/immigration-refugees-citizenship.html",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Canada – Spouse / Partner Sponsorship",
    "currency": "CAD",
    "lastVerified": "16 Jun 2026",
    "disclaimer": "Indicative costs for counsellor discussions only. Government fees are taken from the official IRCC fee list (effective 30 Apr 2026) and should be re-verified on canada.ca before quoting — these change. There is NO living-funds/proof-of-funds requirement for spousal sponsorship (that is a study-permit concept); the sponsor signs a financial undertaking instead. INR equivalents move with exchange rates.",
    "sourceUrl": "https://ircc.canada.ca/english/information/fees/fees.asp",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Sponsorship fee",
            "amount": 90,
            "unit": "per application",
            "currency": "CAD",
            "applicable": true,
            "notes": "Paid by the sponsor. Non-refundable. (was $85 before 30 Apr 2026)"
          },
          {
            "label": "Principal applicant processing fee",
            "amount": 570,
            "unit": "per applicant",
            "currency": "CAD",
            "applicable": true,
            "notes": "Sponsored spouse/partner. Non-refundable. (was $545)"
          },
          {
            "label": "Right of Permanent Residence Fee (RPRF)",
            "amount": 600,
            "currency": "CAD",
            "applicable": true,
            "notes": "Refundable if withdrawn/refused. May be deferred (initial payable then $745). (was $575)"
          },
          {
            "label": "Biometrics",
            "amount": 85,
            "unit": "per person",
            "currency": "CAD",
            "applicable": true,
            "notes": "Family maximum $170"
          },
          {
            "label": "Accompanying dependent child",
            "amount": 180,
            "unit": "per child",
            "currency": "CAD",
            "applicable": true,
            "notes": "No RPRF for children. (was $175)"
          }
        ]
      },
      {
        "id": "tuition",
        "label": "Clearances & document costs",
        "items": [
          {
            "label": "Immigration medical exam (IME)",
            "range": "200–400",
            "unit": "per person",
            "currency": "CAD",
            "applicable": true,
            "notes": "Paid to an IRCC panel physician; valid 12 months"
          },
          {
            "label": "Police certificates",
            "range": "25–100+",
            "unit": "per country",
            "currency": "CAD",
            "applicable": true,
            "notes": "For each country of residence since age 18"
          }
        ]
      },
      {
        "id": "living",
        "label": "Settlement context (no IRCC proof-of-funds requirement)",
        "items": [
          {
            "label": "No living-funds / proof-of-funds requirement",
            "applicable": false,
            "currency": "CAD",
            "notes": "Spousal sponsorship has no LICO/POF test (except limited cases / Quebec MIFI). Sponsor signs a 3-year undertaking instead."
          },
          {
            "label": "Accommodation (context only)",
            "range": "1,000–2,200",
            "unit": "per month",
            "currency": "CAD"
          },
          {
            "label": "Food & personal (context only)",
            "range": "400–700",
            "unit": "per month",
            "currency": "CAD"
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
            "label": "Document translation / notarisation",
            "range": "Varies",
            "notes": "Certified translation for non-English/French documents"
          },
          {
            "label": "Courier & VFS premium services",
            "range": "Optional"
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
        "label": "Total government fees (spouse, no children)",
        "amount": 1345,
        "currency": "CAD",
        "notes": "Sponsorship $90 + processing $570 + RPRF $600 + biometrics $85. Verify on canada.ca before quoting."
      },
      {
        "label": "Initial payable if RPRF deferred",
        "amount": 745,
        "currency": "CAD",
        "notes": "RPRF $600 paid later before PR is finalised."
      }
    ]
  }
}
$metadata$::jsonb,
  updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-000000000012';
