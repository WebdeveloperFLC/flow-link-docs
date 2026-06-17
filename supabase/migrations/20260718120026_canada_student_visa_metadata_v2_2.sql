-- Canada Student Visa academy_metadata v2.2
-- Source: content/service-library/canada-student-visa.json
-- Regenerate: node scripts/generate-visa-metadata-sql-split.mjs (visa-metadata-seed) or this inline generator

UPDATE public.service_library
SET
  academy_metadata = $metadata$
{
  "displayName": "Canada – Student Visa (Study Permit — Outside Canada)",
  "shortDescription": "IRCC study permit · Regular stream (SDS closed 8 Nov 2024) · DLI + PAL/CAQ required",
  "version": "v2.2",
  "versionStatus": "Live",
  "reviewStatus": "active",
  "updatedLabel": "Updated 16 Jun 2026",
  "learningLevel": "Intermediate",
  "learningMinutes": 20,
  "policyAlert": {
    "active": true,
    "date": "16 Jun 2026",
    "summary": "SDS closed 8 Nov 2024 — all applicants now use the regular study permit stream. Verify current IRCC study permit fee, biometrics fee, proof-of-funds amount, and Quebec (MIFI) funds on canada.ca / quebec.ca before quoting any client."
  },
  "alert": {
    "title": "SDS is closed — use the regular stream",
    "body": "The Student Direct Stream and Nigeria Student Express ended 8 Nov 2024. Do not promise SDS fast-track (~20-day) processing. Every file now goes through the regular stream; quote the live IRCC processing-time tool, not a fixed number."
  },
  "tags": [
    {
      "label": "Active service",
      "variant": "success"
    },
    {
      "label": "SDS closed — regular stream",
      "variant": "warning"
    },
    {
      "label": "8–12 weeks (verify live tool)",
      "variant": "neutral"
    },
    {
      "label": "Online – IRCC secure account",
      "variant": "neutral"
    }
  ],
  "chips": [
    {
      "label": "Regular stream only",
      "variant": "warning"
    },
    {
      "label": "Biometrics required",
      "variant": "neutral"
    },
    {
      "label": "DLI letter mandatory",
      "variant": "success"
    },
    {
      "label": "PAL/CAQ where applicable",
      "variant": "warning"
    }
  ],
  "kpis": [
    {
      "label": "Processing time",
      "value": "8–12w",
      "sub": "Regular stream; varies by visa office — verify live tool",
      "tone": "primary"
    },
    {
      "label": "Government fee",
      "value": "CAD $150",
      "sub": "+ CAD $85 biometrics (verify fee page)",
      "tone": "warning"
    },
    {
      "label": "Our approval rate",
      "value": "87%",
      "sub": "~72% industry benchmark",
      "tone": "success"
    },
    {
      "label": "Required docs",
      "value": "14",
      "sub": "+ conditional items",
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
      "value": "A Canada study permit authorizes international students to study full-time at a Designated Learning Institution (DLI). This service covers first-time applicants applying from outside Canada before travel—typically online through an IRCC secure account—with biometrics, medical, PAL/TAL, or Quebec CAQ where applicable."
    },
    {
      "label": "Who should use this pathway",
      "value": "Students with a valid LOA from a Canadian DLI who will apply from their country of residence (not already in Canada as a visitor seeking a status change). Counsellors assess funds and their source, academics, genuine-student intent, PAL/CAQ need, and PGWP-eligibility of the DLI/program before submission."
    },
    {
      "label": "Application stream (SDS closed)",
      "value": "Since 8 Nov 2024 there is one stream: the regular study permit. The Student Direct Stream (SDS) and Nigeria Student Express (NSE) are closed and no longer offer fast-track processing. A GIC and upfront tuition payment are no longer SDS requirements, but a GIC and a paid tuition receipt remain strong, officer-friendly evidence of funds and genuineness. Build every file as a complete, well-documented regular-stream application.",
      "warning": true
    },
    {
      "label": "Key authority",
      "value": "Immigration, Refugees and Citizenship Canada (IRCC). Applications are assessed by the visa office responsible for the applicant's country of residence. CBSA issues the physical study permit at the port of entry."
    },
    {
      "label": "After approval",
      "value": "Client receives a port of entry (POE) letter of introduction and, if required, a temporary resident visa (TRV) vignette. The study permit is printed at entry. Counselor must brief the client on enrollment deadlines, permit conditions, work limits, address updates, and PGWP planning."
    }
  ],
  "eligibility": [
    {
      "criterion": "Letter of acceptance (LOA) from a DLI",
      "met": true,
      "note": "Purpose: proves admission to a real program. Importance: core eligibility—officer will not approve without it. Common mistakes: expired LOA, wrong DLI number, start date already passed. Best practice: verify DLI on canada.ca; match LOA program, dates, and tuition to the application and SOP."
    },
    {
      "criterion": "Valid passport (6+ months beyond intended stay recommended)",
      "met": true,
      "note": "Purpose: identity and travel document for permit length. Importance: permit cannot exceed passport validity. Common mistakes: soon-to-expire passport, name mismatch with LOA. Best practice: renew passport before applying if validity is short."
    },
    {
      "criterion": "Proof of financial support (tuition + living costs)",
      "met": true,
      "note": "Purpose: shows the student can pay for study and living without unauthorized work. Importance: top refusal factor after genuineness (R220). Common mistakes: recent unexplained deposits, only savings with no income trail, sitting exactly on the minimum. Best practice: 4–6 months statements from one account, tuition receipts, and ideally a buffer of ~1.1–1.25× the minimum; document the source of every large credit. A GIC remains a clean way to show living funds though it is no longer an SDS requirement."
    },
    {
      "criterion": "Parent or sponsor financial documents (if sponsored)",
      "met": false,
      "note": "Purpose: links sponsor capacity to student funds. Importance: officers match deposits to sponsor income. Common mistakes: sponsor ITR missing, no relationship proof, funds in sponsor account with no affidavit. Best practice: ITR 2–3 years, employment letter, bank statements, affidavit, and clear explanation of why sponsor pays."
    },
    {
      "criterion": "Language proficiency evidence (DLI / genuineness)",
      "met": false,
      "note": "Purpose: shows ability to succeed in the program and supports a genuine-student finding. Importance: there is no single federal band since SDS closed, but most DLIs require IELTS/TOEFL/PTE/CELPIP/Duolingo for admission, and a weak score undermines genuineness. Common mistakes: expired test, wrong module (GT vs Academic), score below the DLI minimum. Best practice: confirm the DLI's required test and band before booking; remember any test the institution accepts for admission is now acceptable for the permit."
    },
    {
      "criterion": "Study plan / statement of purpose (SOP)",
      "met": false,
      "note": "Purpose: explains why Canada, why this course, why now, and career plan. Importance: central to genuine student assessment. Common mistakes: generic template, course unrelated to past study/work, no gap explanation. Best practice: customized SOP linking academics, work history, and post-study intent; address any refusals or gaps directly."
    },
    {
      "criterion": "Academic transcripts, degrees, and resume",
      "met": true,
      "note": "Purpose: establishes education background and progression. Importance: supports course fit and credibility. Common mistakes: missing backlogs explanation, inconsistent dates vs forms. Best practice: certified copies, backlog/credential explanation letter where needed."
    },
    {
      "criterion": "Provincial Attestation Letter (PAL/TAL) if required",
      "met": false,
      "note": "Purpose: provincial allocation for many post-secondary study permits. Importance: application may be incomplete without it unless exempt. Common mistakes: applying before DLI issues PAL, wrong province. Best practice: confirm with DLI whether PAL/TAL is issued and upload before submission."
    },
    {
      "criterion": "Quebec Acceptance Certificate (CAQ) for Quebec studies",
      "met": false,
      "note": "Purpose: Quebec approval before IRCC can finalize permit. Importance: mandatory for most Quebec programs. Common mistakes: submitting to IRCC before CAQ approval. Best practice: obtain CAQ first, then complete IRCC study permit application."
    },
    {
      "criterion": "Biometrics completed after BIL",
      "met": false,
      "note": "Purpose: identity verification. Importance: file may stall if BIL expires. Common mistakes: missing 30-day window, no VAC appointment proof. Best practice: book VAC immediately after BIL; keep receipt and upload confirmation."
    },
    {
      "criterion": "Immigration medical exam (if required)",
      "met": false,
      "note": "Purpose: admissibility screening. Importance: required where the client will study/work in healthcare, childcare or primary/secondary education, has lived in designated countries, or for longer stays. Common mistakes: non-panel physician, expired eMedical. Best practice: use an IRCC panel physician and upload the IMM 1017B / upfront sheet as instructed; the exam is valid 12 months, so book early."
    },
    {
      "criterion": "Genuine student intent and home-country ties",
      "met": true,
      "note": "Purpose: officer must believe applicant will leave Canada when authorized stay ends (dual intent allowed but plan must be credible). Importance: refusal if study appears pretext for migration. Common mistakes: weak ties, employment gap unexplained. Best practice: document family, property, job offer potential, or career return plan in India/home country."
    }
  ],
  "redFlagsBanner": "Stop and strengthen the file before submission if any red flag below applies. After a refusal, never re-lodge the same package—address the officer's stated reason with new evidence in writing.",
  "redFlags": [
    {
      "title": "Unexplained large recent deposits",
      "description": "Sudden credits in the last 3–6 months with no ITR, sale deed, loan sanction, or gift deed to support them. Officers treat this as borrowed or temporary funds.",
      "fix": "Document source with affidavits, ITR, and transaction trail; season funds early; a GIC remains a clean way to show living funds (no longer an SDS requirement)",
      "severity": "Very common"
    },
    {
      "title": "Weak source of funds",
      "description": "Sponsor income cannot logically support tuition plus living costs, or only fixed deposits with no banking history.",
      "fix": "Match funds to sponsor ITR and employment; show liquid and accessible money; avoid unexplained third-party transfers",
      "severity": "Very common"
    },
    {
      "title": "Course or program mismatch",
      "description": "Proposed program does not follow from prior education or work (e.g., unrelated field jump, lower qualification without reason).",
      "fix": "Rewrite SOP to justify progression; consider pathway program or aligned specialization",
      "severity": "Common"
    },
    {
      "title": "Significant unexplained study gap",
      "description": "Multi-year gap after last qualification with no employment, training, or family responsibility explained.",
      "fix": "Add gap explanation letter with payslips, business records, or skill certificates for the gap period",
      "severity": "Common"
    },
    {
      "title": "Weak academic background for chosen program",
      "description": "Low grades, many backlogs, or failed subjects without explanation for demanding program.",
      "fix": "Address backlogs honestly; show remedial courses, work experience, or conditional admission terms",
      "severity": "Common"
    },
    {
      "title": "Multiple previous refusals without material change",
      "description": "Canada or other-country refusals re-submitted with same finances, SOP, or course choice.",
      "fix": "Disclose all refusals; attach cover letter addressing each reason; change course, funds, or stream where needed",
      "severity": "High"
    },
    {
      "title": "Generic or copied SOP",
      "description": "Template language, wrong college name, or no personal career narrative.",
      "fix": "Custom SOP per client: course modules, faculty, city choice, and realistic post-study plan",
      "severity": "High"
    },
    {
      "title": "Insufficient home-country ties",
      "description": "Young applicant with no property, employment, family, or return pathway documented.",
      "fix": "Document family dependency, business, assets, or career opportunities at home; avoid over-emphasizing PR intent in SOP",
      "severity": "High"
    },
    {
      "title": "Inconsistent employment or education history",
      "description": "Dates on resume, IMM forms, and SOP do not match; undeclared jobs or education.",
      "fix": "Cross-check all forms; use single master timeline; disclose all study and work periods",
      "severity": "Medium"
    },
    {
      "title": "Undisclosed prior refusal / misrepresentation",
      "description": "A prior Canada/US/UK/Schengen/Australia refusal or any inaccurate statement omitted from the IMM forms. This is the single most damaging issue in any file.",
      "fix": "Disclose every prior refusal and explain it honestly in a cover letter; never conceal history — concealment risks an A40 misrepresentation finding and a 5-year ban",
      "severity": "Critical"
    },
    {
      "title": "Income cannot generate the savings shown",
      "description": "Declared sponsor/applicant income is too low to plausibly produce the bank balance presented, inviting an R220 source probe even when the money is real.",
      "fix": "Reconcile income to savings with ITRs, salary slips and a one-page funds narrative; document any one-off inflows (sale, maturity, gift, loan)",
      "severity": "Very common"
    },
    {
      "title": "Ineligible PGWP field or PPP college where PGWP is the goal",
      "description": "Client enrols in a public-private partnership program, or a college/non-degree program outside the eligible field-of-study list, but expects a PGWP.",
      "fix": "Verify PGWP-eligibility (DLI type AND field of study) on canada.ca BEFORE any deposit; switch program/DLI or reset PR expectations honestly",
      "severity": "High"
    },
    {
      "title": "Graduate certificate assumed PAL-exempt",
      "description": "Only degree master's/doctoral students at public DLIs are PAL-exempt (from 1 Jan 2026). Graduate certificates, diplomas and microprograms still need a PAL.",
      "fix": "Confirm PAL need against the exemption list; attach exemption proof only where it genuinely applies, otherwise secure the PAL early",
      "severity": "High"
    }
  ],
  "faqs": [
    {
      "q": "Who can apply for a Canada Study Permit from outside Canada?",
      "a": "A foreign national with a valid LOA from a DLI who meets financial, admissibility, and genuine-student requirements. They apply from their country of residence (or as IRCC instructs) before travel. They must be able to study full-time, pay tuition and living costs, and comply with temporary resident rules."
    },
    {
      "q": "What financial documents should a first-time applicant show?",
      "a": "Typically: 4–6 months bank statements from one account, tuition payment receipts or proof of ability to pay the first year, proof of living funds per IRCC guidelines, sponsor ITR and employment letters if parents pay, and affidavits explaining large deposits. A GIC certificate remains strong (though no longer an SDS requirement). Every credit should be traceable to lawful income or assets."
    },
    {
      "q": "Can parents sponsor a student's study permit application?",
      "a": "Yes—most Indian students are sponsored by parents or close family. IRCC expects relationship proof, sponsor income evidence (ITR, salary slips), bank statements, and a clear statement of why the sponsor is paying. Funds should align with sponsor capacity, not just account balance."
    },
    {
      "q": "How much money must a student demonstrate?",
      "a": "First-year tuition (per the LOA) PLUS living costs PLUS travel. Outside Quebec the living-cost minimum is CAD 22,895 for a single applicant (since 1 Sep 2025), rising with family size, and is in addition to tuition and travel. Quebec (MIFI) sets a higher, separate amount assessed at the CAQ stage — VERIFY the current single-applicant figure on quebec.ca, as 2026 sources conflict. Show a buffer above the minimum and document the source of all funds. Always confirm the live amount on canada.ca before quoting."
    },
    {
      "q": "Are study gaps acceptable?",
      "a": "Yes, if explained credibly. Gaps should be covered in the SOP and supporting documents (employment letters, business records, caregiving, health, or upskilling). Unexplained multi-year gaps without activity are a common refusal reason."
    },
    {
      "q": "What are the most common refusal reasons for study permits?",
      "a": "Insufficient or unseasoned funds, weak genuine-student/SOP, course mismatch, undisclosed prior refusals, missing PAL/CAQ, and poor document consistency. Counselors should pre-screen these before submission."
    },
    {
      "q": "Can a spouse accompany the student to Canada?",
      "a": "Often yes, but the spouse needs their own application (visitor record or open work permit if eligible under current SOWP rules). Extra funds and relationship evidence are required. Assess SOWP eligibility by program level and duration before promising work rights."
    },
    {
      "q": "Can children accompany the student?",
      "a": "Yes—minor children may need study permits or visitor records depending on age and schooling plans. Each dependant needs funds, medical, and biometrics as applicable. Family applications must be consistent on forms and finances."
    },
    {
      "q": "Is IELTS mandatory for a Canada study permit?",
      "a": "There is no single federal language requirement since SDS closed (8 Nov 2024). Most DLIs require English/French proof (IELTS/TOEFL/PTE/CELPIP/Duolingo) for admission, and any test the institution accepts is now acceptable for the permit. A weak score still undermines genuineness, so confirm the DLI's required test and band before advising a client they can skip it."
    },
    {
      "q": "Can a student work while studying in Canada?",
      "a": "Eligible full-time students at participating DLIs may work on-campus anytime and off-campus up to 24 hours per week during regular academic sessions (full-time in scheduled breaks), if permit conditions allow. Co-op requires a separate co-op work permit. Verify current IRCC work rules at counseling."
    },
    {
      "q": "What happens after graduation?",
      "a": "After completing an eligible program at a DLI, the graduate may apply for a Post-Graduation Work Permit (PGWP), then potentially permanent residence through Express Entry or PNP. PGWP length depends on program duration. Plan this pathway in counseling but do not guarantee PR."
    },
    {
      "q": "Can a student apply after a previous refusal?",
      "a": "Yes, with a stronger file. Disclose all prior refusals on IMM forms, attach a cover letter addressing each refusal reason, and show material change (new funds, course, improved SOP, or corrected documents). Re-submitting unchanged documents usually fails again."
    },
    {
      "q": "How does IRCC evaluate funds and source of money?",
      "a": "Officers look at sufficiency (tuition + living), accessibility, history (seasoning), and whether deposits match sponsor income or applicant earnings. Large recent transfers without documentation are heavily scrutinized."
    },
    {
      "q": "What makes a strong study plan or SOP?",
      "a": "Clear link between past education/work and chosen program; specific reasons for Canada and that DLI; realistic career outcome; explanation of gaps and refusals; temporary intent with credible home ties. It must read personal—not copied from the internet."
    },
    {
      "q": "Which documents matter most for approval?",
      "a": "LOA from DLI, financial package (statements + sponsor ITR), SOP, academics, PAL/CAQ if required, language scores per the DLI's requirement, and consistent IMM forms. Weak finances or a generic SOP can undermine an otherwise complete file."
    },
    {
      "q": "Is the Student Direct Stream (SDS) still available?",
      "a": "No. SDS and the Nigeria Student Express closed on 8 Nov 2024; applications submitted on/after that time are processed under the regular study permit stream. Do not promise SDS fast-track (~20-day) timelines or label a file 'SDS'. Build every file as a complete regular-stream application with seasoned, well-documented funds and a strong study plan."
    },
    {
      "q": "When must biometrics be completed?",
      "a": "After receiving the Biometric Instruction Letter (BIL), usually within 30 days. Book the nearest VAC immediately. Missing the window can delay or jeopardize processing."
    },
    {
      "q": "Is a medical exam required for every applicant?",
      "a": "No. Required where the client will study/work in healthcare, childcare or primary/secondary education, has lived in certain countries of residence, or for longer stays. Follow the IRCC medical instructions in the applicant's document checklist—only panel physicians count; the exam is valid 12 months."
    },
    {
      "q": "What if the LOA start date is approaching or has passed?",
      "a": "Apply urgently with explanation. If the intake date has passed, obtain a deferral or new LOA from the DLI before submission. Stale LOAs raise credibility concerns."
    },
    {
      "q": "What is a Provincial Attestation Letter (PAL) and when is it needed?",
      "a": "A provincial document for many post-secondary study permit applicants showing allocation under intake caps. Exemptions exist (e.g. certain levels, family already in Canada). Confirm with DLI whether PAL/TAL is issued before lodging."
    },
    {
      "q": "Does Quebec require a CAQ before IRCC can approve?",
      "a": "Yes for most studies in Quebec. The student obtains CAQ from Quebec immigration first, then applies to IRCC for the study permit. Do not submit incomplete Quebec files."
    },
    {
      "q": "What government fees apply for a study permit from India?",
      "a": "Study permit application fee CAD $150 plus biometrics CAD $85 (family biometric cap CAD $170) for most applicants — verify on the IRCC fee page. Indian passport holders receive a TRV (no separate eTA). Quebec adds a CAQ processing fee (reported ~CAD $135 from 1 Jan 2026 — verify on quebec.ca). Medical, VAC service charges, language test, and courier are additional. Quote government, consultancy and third-party costs on separate lines."
    },
    {
      "q": "How long does IRCC processing usually take?",
      "a": "Typically 8–12 weeks in the regular stream, varying by visa office, application volume, and how quickly biometrics and any medical are completed. Since SDS closed there is no fast-track equivalent — always quote the live IRCC processing-time tool rather than a fixed number, and never promise a date."
    },
    {
      "q": "What happens at the port of entry after approval?",
      "a": "Client carries POE letter, LOA, funds proof, and approval documents. CBSA officer interviews and, if satisfied, prints the study permit. Client must check permit conditions (school, work, expiry) before leaving the counter."
    },
    {
      "q": "Can dependants apply together with the principal student?",
      "a": "Yes—family can be linked in planning, but each person needs correct forms, fees, biometrics, and financial support showing ability to support the whole family in Canada."
    },
    {
      "q": "What if funds were recently deposited into the bank account?",
      "a": "Explain every deposit with source documents (property sale, FD break, loan, gift deed). Without proof, officers may refuse for unseasoned funds. Advise clients to plan finances months before applying."
    },
    {
      "q": "How should we address a prior Canada or other-country refusal?",
      "a": "Full disclosure on forms, copy of refusal letter, and a written explanation of what changed (new course, stronger funds, corrected documents). Quality team should review all refusal cases before re-lodgement."
    },
    {
      "q": "Is a co-op or internship program allowed on a standard study permit?",
      "a": "Yes. From 1 Apr 2026 a separate co-op work permit is NOT required where the mandatory placement is 50% or less of the program — it runs under the study permit. Placements above 50% still need separate work authorisation. Confirm with the DLI whether the placement is an integral program requirement and check its proportion of total program length."
    },
    {
      "q": "What conditions must the student maintain after arrival?",
      "a": "Enroll at DLI, make academic progress, respect work limits on permit, notify IRCC of address changes, and not overstay. Dropping to part-time or changing schools without following IRCC rules can affect future PGWP and status."
    },
    {
      "q": "When should consultancy fees be collected versus lodging the application?",
      "a": "Follow office policy: typically agreement and initial fee at engagement, document milestone payments during file build, and balance before or at IRCC submission. Never promise approval in fee discussions."
    },
    {
      "q": "Can my child definitely get PR after studying in Canada?",
      "a": "No one can guarantee PR. The realistic pathway is study → PGWP (if the DLI/program is eligible) → skilled Canadian work → Express Entry (Canadian Experience Class) or a Provincial Nominee Program. Each step has its own rules and can change. Frame study as a strong first step, never a PR guarantee, and assess each client's options individually."
    },
    {
      "q": "How much can a student realistically earn working 24 hours a week, and will it cover rent?",
      "a": "Off-campus work is capped at 24 hours/week during academic terms (full-time during scheduled breaks, with a 180-day annual cap on full-time break work). Part-time wages supplement living costs but rarely cover Toronto or Vancouver rent on their own. Counsel families that work supports, not funds, the program — the proof-of-funds requirement exists precisely because students should not rely on work to survive."
    },
    {
      "q": "What happens to our money if the visa is refused?",
      "a": "Government fees (permit + biometrics) are non-refundable, including on refusal. A tuition deposit refund depends entirely on the DLI's policy. A GIC is the student's own money and is returned to them. Have the client acknowledge the non-refundable government fees in writing before lodging."
    },
    {
      "q": "Are public-private partnership (PPP) colleges PGWP-eligible?",
      "a": "No. Students at a private college delivering a public college's licensed curriculum are not PGWP-eligible, and college/non-degree graduates must also be in an eligible field of study. Verify both the DLI type and the field BEFORE any deposit — this is the check that protects PR-focused clients from the worst outcome."
    },
    {
      "q": "What does FLC actually guarantee about the outcome?",
      "a": "Nothing about the outcome — IRCC decides. FLC prepares a strong, honest, compliant file and never promises a visa, PGWP or PR result, in writing or verbally. This no-guarantee position is a hard compliance rule, not a style choice."
    }
  ],
  "compliance": [
    "Paid representation in Canada may require RCIC/L lawyer—confirm who signs client agreement",
    "Client service agreement and consent must be on file before submission",
    "Never guarantee visa approval; use approved-language only in marketing",
    "Fee quotes must separate consultancy, government, and third-party (GIC, medical, biometrics)"
  ],
  "proTips": [
    "Match the chosen course to previous studies or a logical career step—officers refuse illogical program jumps.",
    "Explain every study gap in the SOP with supporting proof (job, business, training, or family responsibility).",
    "Build a source-of-funds file: statements, ITR, salary slips, and a one-page funds narrative for the officer.",
    "Submit tuition payment receipts or deposit proof when available—it strengthens genuine-student and financial cases.",
    "Address previous refusals in a cover letter before submission—never hide them on IMM forms.",
    "Write a customized SOP for each client; never reuse templates across students or colleges.",
    "Cross-check names, dates, and course titles across LOA, SOP, resume, and IMM 1294 before upload.",
    "Verify DLI status and PAL/CAQ requirements on official sites before collecting submission fees.",
    "SDS is closed (8 Nov 2024) — build every file as a complete regular-stream application; never promise ~20-day SDS timelines.",
    "Aim for funds ~1.1–1.25× the published minimum where the client can support it — files sitting exactly on the threshold get refused for no buffer.",
    "Verify PGWP-eligibility (DLI type AND field of study) before any tuition deposit; eligibility is fixed at enrolment, not graduation.",
    "Treat the Quebec funds figure as unverified until checked on quebec.ca — 2026 sources conflict and the gap is large enough to sink a file."
  ],
  "postApproval": [
    "Email the client the POE letter summary, TRV details (if any), and DLI enrollment deadline in writing.",
    "Brief the client on permit conditions: full-time study, work hour limits, and address update obligations.",
    "Explain PGWP eligibility rules (program length, DLI, full-time status) and timeline for after graduation.",
    "Schedule pre-departure briefing: documents to carry, CBSA interview expectations, and first-week enrollment steps.",
    "Register follow-up for spouse/children applications if family is travelling later."
  ],
  "performance": {
    "ourRate": 87,
    "industryRate": 72,
    "stats": [
      {
        "label": "Files this year",
        "value": "143"
      },
      {
        "label": "Approved",
        "value": "124"
      },
      {
        "label": "Refused",
        "value": "12"
      },
      {
        "label": "Withdrawn",
        "value": "7"
      }
    ]
  },
  "approvalFactors": [
    {
      "label": "Our rate vs industry",
      "ours": 87,
      "benchmark": 72
    },
    {
      "label": "Financial documentation",
      "ours": 82,
      "benchmark": 68
    },
    {
      "label": "SOP quality",
      "ours": 79,
      "benchmark": 65
    },
    {
      "label": "Complete checklist first submit",
      "ours": 91,
      "benchmark": 70
    }
  ],
  "timeline": [
    {
      "weeks": "1–2",
      "title": "Counseling & admission check — confirm DLI/LOA, regular-stream readiness, PAL/CAQ need, fee agreement, and issue personalized document checklist"
    },
    {
      "weeks": "2–4",
      "title": "File build — collect academics, SOP, sponsor ITR/statements, language scores, GIC/tuition proof; resolve study gaps and refusal history in writing"
    },
    {
      "weeks": "4–5",
      "title": "Quality review — internal checklist sign-off, complete IMM forms and family information, client approves final PDF package"
    },
    {
      "weeks": "5–6",
      "title": "IRCC submission — pay fees online, lodge application, complete biometrics and upfront medical per BIL; respond to any ADR promptly"
    },
    {
      "weeks": "8–12+",
      "title": "Decision & arrival — IRCC processing, POE letter/TRV issued, pre-departure briefing, travel, CBSA study permit printing, and DLI enrollment"
    }
  ],
  "relatedServices": [
    {
      "label": "Canada – PGWP",
      "libraryId": ""
    },
    {
      "label": "Canada – Visitor Visa",
      "libraryId": ""
    },
    {
      "label": "Canada – Spouse Open Work Permit",
      "libraryId": ""
    }
  ],
  "changelog": [
    {
      "version": "v2.2",
      "date": "16 Jun 2026",
      "author": "Service Library",
      "summary": "Reframed SDS as closed (8 Nov 2024) — regular stream is now the default across alert, about, eligibility, FAQs, quiz, do's/don'ts and staff notes. Corrected the co-op work-permit rule (not required at ≤50% from 1 Apr 2026), confirmed CAD $22,895 funds and 24-hr work cap, flagged the Quebec/MIFI funds figure and CAQ fee for live verification, added PGWP-eligibility and misrepresentation red flags, added real parent/student FAQs, and varied the quiz answer key."
    },
    {
      "version": "v2.1",
      "date": "17 Jun 2026",
      "author": "Service Library",
      "summary": "Gold-standard content pass: replaced template FAQs, expanded eligibility document guidance, practical red flags, pro tips, timeline, and IRCC resources for first-time outside-Canada applicants."
    },
    {
      "version": "v2.0",
      "date": "6 Jun 2026",
      "author": "Service Library",
      "summary": "Added 75 levelled quiz questions (Level 1–3, 25+ each) and expanded counselor content."
    },
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
  "staffNotes": [
    {
      "author": "Documentation team",
      "date": "16 Jun 2026",
      "text": "SDS is CLOSED (8 Nov 2024): there is no fast-track stream — never promise ~20-day processing. Every file is regular stream. A GIC and paid tuition are no longer SDS requirements but remain strong evidence. Prioritise a seasoned funds narrative, sponsor ITR alignment, PAL/CAQ where required, and PGWP-eligibility checks before deposits."
    },
    {
      "author": "Quality",
      "date": "16 Jun 2026",
      "text": "Mandatory second review for any prior Canada/US/UK/Australia refusal. Cross-check IMM 1294 dates against resume and SOP before upload."
    }
  ],
  "resources": [
    {
      "title": "IRCC — Study permit (apply from outside Canada)",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
      "description": "Official eligibility, how to apply online, document checklist, and after-you-apply steps for first-time study permit applicants"
    },
    {
      "title": "Designated Learning Institutions (DLI) list",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html",
      "description": "Verify the college/university DLI number before accepting fees—only DLIs can support a study permit"
    },
    {
      "title": "Student Direct Stream (SDS) — CLOSED 8 Nov 2024 (historical)",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/student-direct-stream.html",
      "description": "HISTORICAL ONLY. SDS and Nigeria Student Express ended 8 Nov 2024; all applicants now use the regular study permit stream. Retained for reference on legacy/in-flight files only. Do not use for new applications."
    },
    {
      "title": "IRCC study permit fees",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/fees.html",
      "description": "Current study permit and biometrics fees—verify before every client quote"
    },
    {
      "title": "IRCC processing times (study permit)",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
      "description": "Select study permit and client's country of residence for realistic timeline counseling"
    },
    {
      "title": "Work while studying & PGWP overview",
      "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work.html",
      "description": "On-campus/off-campus work rules during studies and link to post-graduation work permit information"
    }
  ],
  "quiz": [
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about the basic purpose of a study permit is correct?",
      "options": [
        "A study permit authorizes a foreign national to study at a designated learning institution in Canada.",
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 0,
      "explanation": "The permit is status authorization for studies; it is not the school admission letter itself."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about a designated learning institution is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "The school must be a DLI with a valid DLI number for most post-secondary study permit applications.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 1,
      "explanation": "IRCC normally requires acceptance by a recognized DLI before issuing a study permit."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about the letter of acceptance is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "A valid LOA from the DLI is core evidence that the applicant has been admitted to a real program.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 2,
      "explanation": "The LOA anchors the program, start date, school, and study plan reviewed by the officer."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about the study permit processing fee is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident.",
        "The standard IRCC study permit application fee is CAD $150, separate from biometrics where required."
      ],
      "correctIndex": 3,
      "explanation": "Fees can change, but CAD $150 is the standard study permit fee and biometrics are charged separately."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about biometrics is correct?",
      "options": [
        "Most applicants between 14 and 79 must give biometrics unless an exemption or still-valid biometrics applies.",
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 0,
      "explanation": "Biometrics are identity screening evidence and are not the same as a medical exam."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about proof of funds is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "The applicant must show enough money for tuition, living costs, and travel, using credible documents.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 1,
      "explanation": "Financial sufficiency is a central temporary residence requirement for students."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about a port of entry letter is correct?",
      "options": [
        "A POE letter of introduction is an approval letter used to obtain the actual study permit when entering Canada.",
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 0,
      "explanation": "The POE letter is not itself the permit; the border officer issues the permit document."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about TRV or eTA after approval is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "If required, IRCC normally issues or facilitates the entry document after approving the study permit.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 1,
      "explanation": "The study permit approval and entry document work together but serve different purposes."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about Quebec studies is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "Most students studying in Quebec need a CAQ before IRCC can finalize the study permit.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 2,
      "explanation": "Quebec has an additional provincial acceptance step for many international students."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about provincial or territorial attestation is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident.",
        "Many post-secondary applicants need a PAL or TAL unless an IRCC exemption applies."
      ],
      "correctIndex": 3,
      "explanation": "The attestation supports allocation under Canada's study permit intake controls."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about passport validity is correct?",
      "options": [
        "A study permit cannot normally be issued beyond the passport expiry date.",
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 0,
      "explanation": "Passport validity can shorten the permit even when the program is longer."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about temporary resident intent is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "The applicant must satisfy IRCC they will leave Canada when authorized stay ends, even if they may later seek PR.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 1,
      "explanation": "Dual intent is allowed, but the temporary plan must still be credible."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about medical exams is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "A medical exam may be required based on country of residence, program, work in health settings, or IRCC instructions.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 2,
      "explanation": "Medical requirements are tied to admissibility and public health screening."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about custodianship for minors is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident.",
        "Minor students may need a custodian declaration depending on age, province, and living arrangements."
      ],
      "correctIndex": 3,
      "explanation": "IRCC assesses whether a minor will have proper care and support in Canada."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about work while studying is correct?",
      "options": [
        "Eligible full-time students at participating DLIs may work only within the conditions printed or implied by IRCC rules.",
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 0,
      "explanation": "Work authorization is conditional and does not apply to every student or program."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about program credibility is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "The chosen program should make sense against the applicant's education, employment, and future plans.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 1,
      "explanation": "Officers assess whether the study plan appears genuine and logical."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about family members is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "Spouses or children can apply with the student, but each person must qualify for their own temporary resident document.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 2,
      "explanation": "Accompanying family does not remove the student's burden to prove eligibility."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about misrepresentation is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident.",
        "False documents or withheld refusals can cause refusal and a five-year inadmissibility finding."
      ],
      "correctIndex": 3,
      "explanation": "Accuracy is essential because IRCC cross-checks records and documents."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about language evidence is correct?",
      "options": [
        "Language test results may be required by the school or stream, and can also support study readiness.",
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 0,
      "explanation": "Language evidence helps show the applicant can realistically complete the program."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about admissibility is correct?",
      "options": [
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident.",
        "Criminality, medical issues, security concerns, or prior immigration breaches can make a student inadmissible."
      ],
      "correctIndex": 3,
      "explanation": "Study permit eligibility includes both program-related and admissibility screening."
    },
    {
      "level": 1,
      "question": "In a study permit application made from outside Canada, which statement about final permit issuance is correct?",
      "options": [
        "The final study permit document is usually printed by CBSA at the port of entry for outside-Canada approvals.",
        "It is optional if the applicant writes a detailed cover letter.",
        "It automatically guarantees entry to Canada once the form is submitted.",
        "It is only reviewed after the applicant becomes a permanent resident."
      ],
      "correctIndex": 0,
      "explanation": "Applicants should inspect the printed permit for correct school, work, and expiry conditions."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about creating the online application?",
      "options": [
        "The applicant normally submits the study permit package through an IRCC secure account or portal with digital forms and uploads.",
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 0,
      "explanation": "Online submission creates the file, document checklist, fee payment, and message channel."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about IMM 1294?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "IMM 1294 is the main application form for a study permit made outside Canada.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 1,
      "explanation": "The form captures identity, education, intended study, background, and family information."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about family information form?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "IMM 5707 or IMM 5645 may be required depending on the applicant's country-specific checklist.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 2,
      "explanation": "IRCC uses family details for identity, background, and consistency checks."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about country-specific instructions?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status.",
        "The visa office checklist can require extra documents such as police certificates, education records, or civil documents."
      ],
      "correctIndex": 3,
      "explanation": "A complete application follows both general IRCC requirements and local instructions."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about biometrics timing?",
      "options": [
        "After paying the biometrics fee, IRCC issues a biometrics instruction letter and the applicant books a VAC appointment.",
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 0,
      "explanation": "Biometrics are normally given after the instruction letter, not before the application exists."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about upfront medicals?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "If an upfront medical is used, the applicant uploads the information sheet from a panel physician.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 1,
      "explanation": "Only IRCC panel physician exams are accepted for immigration medical purposes."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about proof of tuition?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status.",
        "Receipts or school account statements should clearly show amounts paid, program, and student identity."
      ],
      "correctIndex": 3,
      "explanation": "Unclear payment proof can weaken the funds assessment."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about bank statements?",
      "options": [
        "Statements should be recent, traceable, and consistent with the applicant's claimed source of funds.",
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 0,
      "explanation": "Large unexplained deposits are often scrutinized for genuineness."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about sponsor documents?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "A sponsor package should connect the sponsor to the applicant and show income, assets, and willingness to pay.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 1,
      "explanation": "Officers need both capacity and credible commitment from a financial sponsor."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about statement of purpose?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "A study plan should explain why the program, school, Canada, timing, and return plan make sense.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 2,
      "explanation": "A strong SOP addresses the officer's core concerns without contradicting the forms."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about education history?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status.",
        "Transcripts, diplomas, and resumes should match the program level and career progression claimed."
      ],
      "correctIndex": 3,
      "explanation": "Consistency between past studies and proposed studies supports genuineness."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about employment evidence?",
      "options": [
        "Employment letters, pay slips, or business records can explain career context and ties to the home country.",
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 0,
      "explanation": "Work history can show why the Canadian program is a rational next step."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about travel history?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "Prior lawful travel can help but is not required; undisclosed refusals or overstays are serious problems.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 1,
      "explanation": "Travel history is weighed with the full temporary resident assessment."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about police certificates?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "Police certificates are provided when requested by IRCC or the visa office checklist.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 2,
      "explanation": "They are part of admissibility screening, not a substitute for biometrics."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about translation requirements?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status.",
        "Documents not in English or French generally need certified translations and copies of the original documents."
      ],
      "correctIndex": 3,
      "explanation": "IRCC must be able to verify and understand every submitted record."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about submission after refusal?",
      "options": [
        "A new application should address the refusal reasons with stronger evidence rather than simply resubmitting the same package.",
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 0,
      "explanation": "Officers can see prior refusals and expect material improvements."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about processing times?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "Published processing times are estimates and do not guarantee a decision before the program start date.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 1,
      "explanation": "Applicants should plan for delays and update IRCC if intake dates change."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about deferred admission?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "If the start date changes, the applicant should provide a deferral or updated LOA through the proper channel.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 2,
      "explanation": "A stale LOA can raise concerns about whether the study plan remains valid."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about passport request?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status.",
        "A passport request usually means IRCC needs the passport to place a visa counterfoil where one is required."
      ],
      "correctIndex": 3,
      "explanation": "It is a late-stage step but applicants should still follow instructions carefully."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about approval package?",
      "options": [
        "The approval package may include a POE letter and, for visa-required nationals, a TRV counterfoil.",
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 0,
      "explanation": "The actual study permit is issued at entry, so the approval documents must be carried."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about entering Canada?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "At the port of entry, the applicant should carry the POE letter, LOA, funds evidence, and updated school documents.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 1,
      "explanation": "CBSA may ask whether the applicant still meets the study permit conditions."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about changing DLIs?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "Post-secondary students must follow IRCC rules for changing schools and ensure the new school is a DLI.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 2,
      "explanation": "School changes can affect compliance reporting and future applications."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about dependant applications?",
      "options": [
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status.",
        "Family member forms and evidence should be submitted consistently with the student's plan and finances."
      ],
      "correctIndex": 3,
      "explanation": "A family package is reviewed for each person's purpose, funds, and admissibility."
    },
    {
      "level": 2,
      "question": "For a study permit application made from outside Canada, what is the correct process point about client information uploads?",
      "options": [
        "Optional client information uploads should be organized, labelled, and used to clarify evidence that does not fit elsewhere.",
        "It should be uploaded only after IRCC has already made the final decision.",
        "It is replaced by buying a return ticket or submitting a travel itinerary.",
        "It can be ignored if the applicant has previously held Canadian status."
      ],
      "correctIndex": 0,
      "explanation": "A clear upload helps the officer review the file efficiently."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with a program that repeats prior education?",
      "options": [
        "The officer may doubt purpose if the applicant cannot explain why a similar or lower-level program is necessary now.",
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 0,
      "explanation": "Study progression should be credible and tied to realistic goals."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with large unexplained deposits?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "The officer may treat sudden funds as borrowed or temporary unless the source is documented.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 1,
      "explanation": "Funds must be available, traceable, and credible for the study period."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with weak home-country ties?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "The officer may refuse if employment, family, assets, or career prospects do not support departure after studies.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 2,
      "explanation": "Temporary intent is assessed alongside the applicant's personal circumstances."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with generic statement of purpose?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review.",
        "A template SOP can undermine credibility because it fails to connect the program to the applicant's real background."
      ],
      "correctIndex": 3,
      "explanation": "Officers look for a coherent, individualized rationale."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with undisclosed visa refusals?",
      "options": [
        "Failure to disclose prior refusals can become misrepresentation even if the study plan is otherwise strong.",
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 0,
      "explanation": "IRCC asks about prior refusals and can compare records across countries."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with questionable DLI or program choice?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "A low-detail or inconsistent school choice can make the officer question whether the applicant is a genuine student.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 1,
      "explanation": "The applicant should show why that DLI and program fit their goals."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with late application close to intake?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "A rushed application may be refused or become impractical if processing cannot finish before the start date.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 2,
      "explanation": "Timing is not an eligibility rule by itself, but it affects credibility and logistics."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with family remaining in Canada after refusal?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review.",
        "If accompanying family plans are unclear, the officer may worry the study plan is mainly a migration strategy."
      ],
      "correctIndex": 3,
      "explanation": "Family circumstances must be explained consistently with temporary residence obligations."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with inconsistent employment dates?",
      "options": [
        "Conflicting resumes, forms, and letters can damage credibility and invite deeper verification.",
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 0,
      "explanation": "Consistency across documents is essential in discretionary temporary resident decisions."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with unverified sponsor income?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "A sponsor with unclear income may not satisfy the officer that funds are truly available for tuition and living costs.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 1,
      "explanation": "Sponsor evidence should show lawful source, liquidity, and relationship."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with course mismatch with career goals?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "The officer may ask why the applicant needs a Canadian credential if the program does not advance their stated career.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 2,
      "explanation": "A persuasive file links studies to a plausible future benefit."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with poor academic performance?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review.",
        "Weak grades are not an automatic refusal, but the applicant should show readiness for the proposed program."
      ],
      "correctIndex": 3,
      "explanation": "Academic history can affect whether the study plan appears realistic."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with language weakness?",
      "options": [
        "If language evidence is weak for the program, the officer may doubt the applicant can complete studies successfully.",
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 0,
      "explanation": "Language readiness supports both admission and genuine student assessment."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with using agents and false documents?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "Documents remain the applicant's responsibility even if an agent prepared the file.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 1,
      "explanation": "Misrepresentation findings can apply when the applicant signs or submits false information."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with expired passport before program end?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "The permit may be shortened, creating future extension risk and avoidable administrative problems.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 2,
      "explanation": "Passport validity should align with the expected study period where possible."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with missing PAL or TAL?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review.",
        "If no exemption applies, missing attestation can make the application incomplete or ineligible for processing."
      ],
      "correctIndex": 3,
      "explanation": "Attestation requirements are a threshold issue for many post-secondary applicants."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with dual intent handled poorly?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "Saying the applicant will never leave Canada can undermine the temporary resident requirement.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 1,
      "explanation": "Dual intent must still include a credible plan to comply if PR is not granted."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with prior overstay or non-compliance?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "Past breaches can weigh heavily against future compliance unless clearly explained and resolved.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 2,
      "explanation": "Officers assess whether the applicant will obey Canadian immigration conditions."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with unrealistic living-cost budget?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review.",
        "Funds that barely cover tuition and ignore rent, food, insurance, and travel may fail the sufficiency test."
      ],
      "correctIndex": 3,
      "explanation": "IRCC expects a realistic financial plan for the whole stay."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with medical inadmissibility concerns?",
      "options": [
        "Medical results can delay or affect approval if they raise public health or excessive demand issues.",
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 0,
      "explanation": "Study permit decisions include admissibility, not only school acceptance."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with changed program after approval?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "A major change at entry can trigger questions about whether the approval basis still exists.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 1,
      "explanation": "The applicant should carry updated documents and comply with school-change rules."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with work being the real purpose?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "If the file emphasizes wages over education, the officer may doubt the applicant is a bona fide student.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 2,
      "explanation": "Study permits are for study first, with work only as a conditional benefit."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with documents that cannot be verified?",
      "options": [
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review.",
        "Unverifiable employment, bank, or school records can lead to refusal or procedural fairness concerns."
      ],
      "correctIndex": 3,
      "explanation": "Authenticity is a core officer concern in high-volume temporary resident processing."
    },
    {
      "level": 3,
      "question": "Officer perspective in a study permit application made from outside Canada: what is the key issue with port of entry inconsistencies?",
      "options": [
        "A different story at the airport can cause CBSA to question admissibility or decline to issue the permit.",
        "It is harmless because officers approve cases when the applicant is polite.",
        "It can be fixed after refusal by sending documents to the visa office informally.",
        "It matters only at the airport and not during the paper or online review."
      ],
      "correctIndex": 0,
      "explanation": "The approval letter does not remove the need to satisfy entry examination."
    }
  ],
  "sampleDocs": [
    {
      "title": "Sample passport bio page (mock)",
      "description": "Purpose: identity verification. Show full MRZ, no glare. Mistake: cropped edges. Best practice: scan colour copy matching LOA name exactly.",
      "mimeType": "image/jpeg",
      "docKind": "identity"
    },
    {
      "title": "Sample LOA / DLI letter (mock)",
      "description": "Purpose: proof of admission. Must show DLI number, program, tuition, and start date. Mistake: expired intake. Best practice: verify DLI on canada.ca before file build.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample GIC certificate (mock)",
      "description": "Purpose: living-funds proof via GIC (optional but officer-friendly; no longer an SDS requirement). Mistake: non-recognised bank. Best practice: use a recognised bank's GIC and keep the certificate on file.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample IELTS / PTE TRF (mock)",
      "description": "Purpose: language ability for DLI admission and genuineness. Mistake: Academic vs GT wrong module, expired test. Best practice: confirm the DLI's required test and minimum band (no single federal band since SDS closed).",
      "mimeType": "image/jpeg",
      "docKind": "language"
    },
    {
      "title": "Sample SOP specimen (mock)",
      "description": "Purpose: genuine student narrative. Mistake: generic template. Best practice: course-specific reasoning, gap explanation, and career link.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample academic transcripts (mock)",
      "description": "Purpose: education history. Mistake: hiding backlogs. Best practice: certified transcripts plus backlog explanation if applicable.",
      "mimeType": "application/pdf",
      "docKind": "academic"
    },
    {
      "title": "Sample sponsor affidavit (mock)",
      "description": "Purpose: links parent funds to student. Mistake: no ITR attached. Best practice: affidavit + sponsor ITR + bank statements + relationship proof.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Sample bank statement (mock)",
      "description": "Purpose: liquidity and seasoning. Mistake: only 1-month statement. Best practice: 4–6 months with explanation for large credits.",
      "mimeType": "application/pdf",
      "docKind": "financial"
    },
    {
      "title": "Document checklist — outside Canada (specimen)",
      "description": "Future Link branded 30-item study permit checklist for outside-Canada applicants. Use for counselor sign-off before IRCC upload.",
      "mimeType": "application/pdf",
      "docKind": "checklist",
      "url": "/specimens/checklists/canada-student-visa.html"
    }
  ],
  "navBucket": "visa",
  "donts": {
    "dos": [
      "Match course choice to prior education or credible career progression",
      "Explain study gaps in the SOP with supporting documents",
      "Use seasoned funds with ITR-linked sponsor evidence and a one-page funds narrative",
      "Submit tuition receipts and organized, single-account bank statements",
      "Disclose and address all prior refusals in writing",
      "Customize the SOP and cross-check all forms for consistency against the passport",
      "Verify DLI, PGWP-eligibility, PAL, and CAQ before IRCC submission"
    ],
    "donts": [
      "Do not promise SDS or ~20-day fast-track processing — SDS closed 8 Nov 2024",
      "Do not promise approval timelines or PGWP/PR outcomes",
      "Do not use an expired LOA or wrong tuition on forms",
      "Do not hide refusals or misrepresent employment history (A40 risk)",
      "Do not quote IRCC or Quebec fees without checking the current fee pages",
      "Do not submit large unexplained deposits without source proof",
      "Do not enrol a PGWP-focused client in a PPP college or an ineligible field of study"
    ],
    "mistakes": [
      "Recent lump-sum deposits without gift deed, sale deed, maturity or loan proof",
      "Copy-paste SOP with wrong college or program name",
      "Sponsor ITR income too low for claimed tuition and living costs",
      "Inconsistent dates between resume, IMM forms, and SOP",
      "Missing the biometrics (BIL) deadline or PAL/CAQ before submission",
      "Assuming a graduate certificate is PAL-exempt (only degree master's/PhD at public DLIs are)"
    ]
  },
  "workingRights": {
    "applicant": {
      "summary": "Study permit holders may work on-campus anytime. Off-campus work is allowed up to 24 hours per week during regular academic sessions and full-time during scheduled breaks, subject to permit conditions.",
      "details": [
        "From 1 Apr 2026 a separate co-op work permit is NOT needed where the mandatory placement is ≤50% of the program; placements above 50% need separate authorisation.",
        "Off-campus work begins only on/after the study start date printed on the permit — never on arrival or after the LOA.",
        "Full-time work during scheduled breaks is subject to a 180-day-per-calendar-year cap; the student must be enrolled before and after the break.",
        "A SIN from Service Canada is required to work; PGWP is a separate application after eligible program completion."
      ],
      "restrictions": [
        "Cannot work for ineligible employers if restricted on permit",
        "Must remain enrolled and making progress at DLI"
      ],
      "sourceUrl": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work.html",
      "lastVerified": "Jun 2026"
    },
    "spouse": {
      "summary": "Spouse/common-law partner may qualify for an open work permit (SOWP) when the student is in an eligible program at a designated learning institution in Canada.",
      "details": [
        "Eligibility depends on program level, duration, and current IRCC policy for SOWP.",
        "Partner applies separately; relationship and principal status must be documented."
      ],
      "restrictions": [
        "Not automatic — assess program eligibility before promising spouse work rights"
      ],
      "sourceUrl": "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/spousal.html",
      "lastVerified": "Jun 2026"
    }
  },
  "fullCostBreakdown": {
    "title": "Full cost breakdown — Canada – Student Visa (Study Permit — Outside Canada)",
    "currency": "CAD",
    "lastVerified": "Jun 2026",
    "disclaimer": "Indicative costs for counselor discussions only. Government fees, tuition, and living amounts change — verify on official websites before quoting clients. Exchange rates affect INR equivalents.",
    "sourceUrl": "https://www.canada.ca/en/immigration-refugees-citizenship.html",
    "sections": [
      {
        "id": "fees",
        "label": "Government & visa fees",
        "items": [
          {
            "label": "Study permit application fee",
            "amount": 150,
            "unit": "per applicant",
            "currency": "CAD",
            "applicable": true,
            "notes": "IRCC study permit fee — verify on fee page before quoting"
          },
          {
            "label": "Biometrics",
            "amount": 85,
            "unit": "per applicant",
            "currency": "CAD",
            "applicable": true
          },
          {
            "label": "Medical exam (if required)",
            "range": "INR 5,000–8,000",
            "notes": "Panel physician",
            "currency": "CAD",
            "applicable": true
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
            "currency": "CAD",
            "applicable": true
          },
          {
            "label": "Tuition deposit already paid",
            "range": "Per LOA/CAS",
            "notes": "Deduct from total funds",
            "currency": "CAD",
            "applicable": true
          },
          {
            "label": "Books & materials",
            "range": "500–1,500",
            "unit": "per year",
            "notes": "Program dependent",
            "currency": "CAD",
            "applicable": true
          }
        ]
      },
      {
        "id": "living",
        "label": "Living costs",
        "items": [
          {
            "label": "Living funds (IRCC guideline, 1 person)",
            "amount": 20635,
            "unit": "per year",
            "notes": "Outside Quebec",
            "currency": "CAD"
          },
          {
            "label": "Accommodation",
            "range": "700–1,400",
            "unit": "per month",
            "currency": "CAD"
          },
          {
            "label": "Food & personal",
            "range": "300–550",
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
            "label": "Flight / travel",
            "range": "₹40,000–1,20,000",
            "notes": "Season and route"
          },
          {
            "label": "Document translation / notary",
            "range": "₹2,000–15,000"
          },
          {
            "label": "Courier & VFS premium services",
            "range": "Optional"
          },
          {
            "label": "Forex / transfer charges",
            "range": "Bank dependent",
            "notes": "GIC, blocked account, tuition transfers"
          }
        ]
      }
    ],
    "totals": [
      {
        "label": "Indicative first-year budget (excl. tuition band)",
        "value": "Counselor to calculate from sections above",
        "notes": "Always cross-check LOA/CAS/Offer of Place and official fee pages before client commitment."
      }
    ]
  }
}
$metadata$::jsonb,
  updated_at = now()
WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';
