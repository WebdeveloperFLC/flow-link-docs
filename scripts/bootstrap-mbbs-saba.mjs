#!/usr/bin/env node
/** Generate mbbs-saba-university.json and SQL seed. Run: node scripts/bootstrap-mbbs-saba.mjs */
import fs from "fs";
import path from "path";

export const SABA_LIBRARY_ID = "b2000001-0001-4000-8000-0000000000d1";

const meta = {
  displayName: "Saba University School of Medicine — Caribbean",
  shortDescription: "MD program · NVAO accredited · Basic science on Saba · Clinical rotations in US & Canada",
  version: "v1.0",
  versionStatus: "Live",
  reviewStatus: "active",
  updatedLabel: "Updated 10 Jun 2026",
  learningLevel: "Advanced",
  learningMinutes: 30,
  navBucket: "mbbs",
  policyAlert: {
    active: true,
    date: "10 Jun 2026",
    summary: "Verify current tuition, intake dates, and admission requirements on saba.edu before quoting clients. Indian students: confirm NEET eligibility and NMC guidance separately.",
  },
  alert: {
    title: "MD vs MBBS naming",
    body: "SUSOM awards a Doctor of Medicine (MD) — counsel Indian clients on FMGE/NExT pathway; do not describe as Indian-style MBBS without explaining licensing steps.",
  },
  tags: [
    { label: "Active institution", variant: "success" },
    { label: "NVAO accredited", variant: "success" },
    { label: "Jan · May · Sep intakes", variant: "neutral" },
    { label: "US clinical rotations", variant: "neutral" },
  ],
  chips: [
    { label: "4-year MD (10 semesters)", variant: "neutral" },
    { label: "English medium", variant: "success" },
    { label: "Saba island basic science", variant: "neutral" },
    { label: "Verify tuition on saba.edu", variant: "warning" },
  ],
  kpis: [
    { label: "Program duration", value: "4 years", sub: "10 semesters", tone: "primary" },
    { label: "Tuition", value: "See Fees tab", sub: "Official saba.edu rates", tone: "warning" },
    { label: "USMLE Step 1 pass", value: "98%", sub: "First-time 2024", tone: "success" },
    { label: "Required docs", value: "18+", sub: "Admission + visa", tone: "violet" },
    { label: "Consultancy fee", value: "See Fees tab", sub: "Future Link package", tone: "primary" },
  ],
  about: [
    {
      label: "Description",
      value: "Saba University School of Medicine (SUSOM), established 1992, offers a 4-year Doctor of Medicine program. Five semesters of basic sciences on the island of Saba (Caribbean Netherlands), followed by five semesters of clinical rotations at affiliated teaching hospitals in the United States, with select elective sites in Canada.",
      link: "https://www.saba.edu/academics/programs/doctor-of-medicine-md-program/",
    },
    {
      label: "Eligible applicants",
      value: "Bachelor's degree or equivalent pre-med foundation · English proficiency · Meet SUSOM admission requirements · Indian applicants: verify NEET eligibility with current NMC rules",
    },
    {
      label: "Accreditation highlight",
      value: "NVAO accreditation — standards deemed comparable to US medical schools by US DOE NCFMEA. Only Caribbean medical school with European NVAO accreditation per SUSOM.",
      warning: true,
    },
    {
      label: "Key authority",
      value: "Saba University School of Medicine (admissions) · Netherlands / Dutch Caribbean immigration for study · US immigration for clinical years",
    },
    {
      label: "After graduation",
      value: "USMLE Steps 1 & 2 CK · NRMP residency match · FMGE/NExT for India practice · Canadian residency pathways for eligible graduates",
    },
  ],
  mbbs: {
    isDefaultLanding: true,
    institutionName: "Saba University School of Medicine",
    shortName: "SUSOM",
    city: "The Bottom",
    country: "Saba",
    regionLabel: "Caribbean (Saba, Dutch Caribbean)",
    website: "https://www.saba.edu/",
    established: "1992",
    accreditation: [
      "Accreditation Organisation of the Netherlands and Flanders (NVAO)",
      "Recognised by World Federation of Medical Education (WFME) via NVAO",
      "US Department of Education NCFMEA — standards comparable to US medical schools",
      "State approvals for clinical rotations in the US — verify current list on saba.edu",
    ],
    mediumOfInstruction: "English",
    programDuration: "4 years (10 semesters): 5 basic science on Saba + 5 clinical in US/Canada",
    clinicalTrainingNotes:
      "Clinical medicine at affiliated US teaching hospitals; select elective rotation sites in Canada. Verify current affiliate list on official site.",
    campusNotes:
      "Compact island campus in The Bottom, Saba. Housing and student life resources published on saba.edu. Basic science years are island-based; clinical years relocate to rotation cities.",
    intakes: ["January", "May", "September"],
    relatedPrograms: [
      {
        name: "Doctor of Medicine (MD) Program",
        degree: "MD",
        duration: "4 years (10 semesters)",
        medium: "English",
        intakes: ["January", "May", "September"],
        summary:
          "Primary program: basic sciences on Saba followed by clinical rotations in the US. USMLE preparation integrated; 98% first-time Step 1 pass rate (2024 per SUSOM).",
        sourceUrl: "https://www.saba.edu/academics/programs/doctor-of-medicine-md-program/",
      },
      {
        name: "Gateway Medical Program",
        degree: "Preparatory",
        duration: "15 weeks",
        summary:
          "Conditional acceptance preparatory course; successful completion leads to next MD entering class. Also offered via Medical University of the Americas (MUA).",
        sourceUrl: "https://www.saba.edu/academics/programs/gateway-medical-program/",
        notes: "For students needing academic preparation before MD entry.",
      },
      {
        name: "Pre-Medical Master's Program",
        degree: "MSc Biomedical Science",
        duration: "8 months",
        summary:
          "Accelerated pre-med for career changers; MSc awarded by Medical University of the Americas (MUA), then apply to SUSOM MD program.",
        sourceUrl: "https://www.saba.edu/academics/programs/pre-medical-masters-program/",
        notes: "Partner institution: MUA (GUS Med & Vet).",
      },
    ],
    familyOptions: {
      spouseCanAccompany:
        "Possible during basic science on Saba but subject to Dutch Caribbean / Netherlands entry rules for dependants — verify current immigration policy.",
      spouseWorkRights:
        "Spouse work authorization on Saba is very limited; small island economy. Do not promise employment. During US clinical years, spouse may need separate US visa strategy.",
      childrenCanAccompany:
        "Case-by-case — verify dependant visa rules and schooling availability on Saba (small island).",
      childrenNotes: "Schooling options limited on Saba; plan carefully for family relocation.",
      additionalFundsRequired:
        "Additional living funds and health insurance for each dependant — verify with admissions and immigration counsel.",
      visaRoute: "Student visa/residence for principal applicant; dependants require separate permits per Dutch Caribbean rules.",
      restrictions: [
        "Do not promise spouse work on Saba",
        "Clinical years in US — family visa strategy differs from island basic science period",
        "Verify all family immigration with official sources before client commitment",
      ],
      sourceUrl: "https://www.saba.edu/admissions/international-applicants/",
      lastVerified: "Jun 2026",
    },
    practicePathways: {
      summary:
        "SUSOM MD graduates pursue residency in the US and Canada; Indian nationals must clear FMGE/NExT for licensure in India. SUSOM publishes USMLE pass rates and residency placement statistics.",
      india: {
        fmgeNext:
          "Indian citizens with foreign MD must qualify FMGE (transitioning to NExT) and meet NMC requirements before provisional/ permanent registration in India.",
        details: [
          "Verify institution status on NMC foreign medical institutions list before enrollment.",
          "Degree is MD (US-style), not 5.5-year Indian MBBS — set client expectations early.",
          "Internship/clinical hours must meet NMC criteria — verify with current NMC notifications.",
          "Never guarantee FMGE/NExT pass or India registration.",
        ],
        sourceUrl: "https://www.nmc.org.in/",
      },
      usCanada: {
        summary:
          "Graduates eligible for USMLE Step 1 & Step 2 CK; 98% first-time pass rate reported for 2024. 99% three-year residency placement rate (2023–26 cohorts per SUSOM).",
        details: [
          "Basic science on Saba → US clinical rotations → USMLE → NRMP Match.",
          "Canadian students may pay tuition in CAD; some elective rotations in Canada.",
          "Residency placement in US and Canada — verify latest match statistics on saba.edu.",
        ],
        sourceUrl: "https://www.saba.edu/graduate-success/",
      },
      recognition: {
        who: "NVAO is recognised by WFME; SUSOM states European accreditation comparable to US standards via NCFMEA.",
        nmc: "Counselors must verify current NMC eligible colleges list — status can change; check before each intake.",
        sourceUrls: [
          "https://www.saba.edu/why-saba/accreditation-and-approvals/",
          "https://www.nmc.org.in/",
          "https://www.wdoms.org/",
        ],
      },
      restrictions: [
        "Never guarantee US residency match or India medical license",
        "Verify NMC list at time of admission",
      ],
      lastVerified: "Jun 2026",
    },
    documentChecklistSections: [
      {
        id: "admission",
        label: "Admission documents",
        items: [
          "Completed SUSOM application (Common Application — saba.edu)",
          "Official transcripts (10th, 12th, bachelor's/pre-med)",
          "NEET scorecard (Indian applicants — if required under current NMC rules)",
          "English proficiency evidence (if requested)",
          "Personal statement / essays per application",
          "Letters of recommendation (per SUSOM requirements)",
          "CV / resume",
          "Passport copy",
          "Application fee payment proof",
        ],
      },
      {
        id: "visa",
        label: "Visa & immigration (basic science — Saba)",
        items: [
          "University admission / enrollment letter",
          "Proof of tuition payment or financial guarantee",
          "Bank statements / sponsor affidavit (seasoned funds)",
          "Medical insurance proof",
          "Police clearance (if required)",
          "Passport valid 6+ months beyond program",
          "Visa application forms per Dutch Caribbean / Netherlands consulate",
          "Passport photographs",
          "Accommodation confirmation on Saba",
        ],
      },
      {
        id: "clinical",
        label: "US clinical years (additional)",
        items: [
          "US visa strategy (typically F-1 or as advised by university for rotations)",
          "SEVIS / I-20 if applicable for US portion",
          "Health insurance for US clinical sites",
          "Background checks for hospital affiliations",
          "Updated financial proof for US living costs",
        ],
      },
      {
        id: "family",
        label: "Family dependants (if applicable)",
        items: [
          "Marriage certificate (spouse)",
          "Birth certificates (children)",
          "Additional funds proof for dependants",
          "Dependant visa applications per jurisdiction",
          "Health insurance for dependants",
        ],
      },
    ],
  },
  workingRights: {
    applicant: {
      summary:
        "During basic science on Saba, students must maintain valid student immigration status. Paid employment is extremely limited on the small island; focus is full-time study. US clinical years governed by US student visa rules.",
      details: [
        "Basic science (Saba): do not assume off-campus work — verify student residence permit conditions.",
        "Clinical rotations (US): F-1 or university-advised status; any employment must comply with US immigration rules.",
        "University may offer limited on-campus roles — verify with SUSOM student services.",
      ],
      restrictions: [
        "Unauthorized work violates visa status in Netherlands/US portions",
        "Never advise clients to work illegally to fund tuition",
      ],
      sourceUrl: "https://www.saba.edu/admissions/international-applicants/",
      lastVerified: "Jun 2026",
    },
    spouse: {
      summary:
        "Spouse/partner work rights are very limited on Saba. US clinical phase requires separate US immigration planning for dependants.",
      details: [
        "Island economy cannot support typical spouse employment expectations.",
        "Plan finances assuming single-earner household during basic science.",
      ],
      restrictions: ["Do not promise spouse employment on Saba or during rotations without visa approval"],
      sourceUrl: "https://www.saba.edu/admissions/international-applicants/",
      lastVerified: "Jun 2026",
    },
  },
  fullCostBreakdown: {
    title: "Full cost breakdown — Saba University School of Medicine",
    currency: "USD",
    lastVerified: "Jun 2026",
    disclaimer:
      "Indicative structure for counselor discussions. Tuition changes each academic year — always quote from https://www.saba.edu/admissions/tuition-and-fees/ before client commitment.",
    sourceUrl: "https://www.saba.edu/admissions/tuition-and-fees/",
    sections: [
      {
        id: "fees",
        label: "University & administrative fees",
        items: [
          { label: "MD tuition (per semester)", range: "See official tuition page", notes: "Verify on saba.edu", currency: "USD" },
          { label: "Application fee", range: "See saba.edu", currency: "USD" },
          { label: "Student services / admin fees", range: "Per catalog", currency: "USD" },
          { label: "Visa & immigration fees", range: "Varies", notes: "Consulate + permits" },
        ],
      },
      {
        id: "tuition",
        label: "Program costs",
        items: [
          { label: "Total MD program tuition", range: "Sum of 10 semesters", notes: "Official fee schedule only", currency: "USD" },
          { label: "Books & equipment", range: "1,000–3,000", unit: "per year", currency: "USD" },
          { label: "USMLE exam fees", range: "Step 1 + Step 2 CK", notes: "During program", currency: "USD" },
        ],
      },
      {
        id: "living",
        label: "Living costs",
        items: [
          { label: "Housing (Saba island)", range: "See housing page", unit: "per semester", notes: "saba.edu/student-experience/housing", currency: "USD" },
          { label: "Food & personal (Saba)", range: "400–700", unit: "per month", currency: "USD" },
          { label: "Clinical years (US cities)", range: "Varies by rotation city", unit: "per month", notes: "Higher in major metros", currency: "USD" },
          { label: "Health insurance", range: "Mandatory", notes: "Verify SUSOM requirements", currency: "USD" },
        ],
      },
      {
        id: "misc",
        label: "Miscellaneous",
        items: [
          { label: "Future Link consultancy fee", range: "See Fees tab" },
          { label: "Flights India ↔ Saba ↔ US rotation cities", range: "₹80,000–2,50,000+" },
          { label: "Medical exam & police clearance", range: "₹5,000–15,000" },
          { label: "Forex / wire transfer charges", range: "Bank dependent" },
        ],
      },
    ],
    totals: [
      {
        label: "Indicative total program budget",
        value: "Calculate from official tuition + 4 years living",
        notes: "Use saba.edu tuition page; add 15% buffer for currency and fee increases.",
      },
    ],
  },
  eligibility: [
    { criterion: "Bachelor's degree or qualifying pre-med coursework", met: true },
    { criterion: "English proficiency (if required)", met: true },
    { criterion: "NEET qualified (Indian applicants — verify current NMC rule)", met: false, note: "Check NMC notification at admission year" },
    { criterion: "Meet SUSOM admission requirements", met: true },
    { criterion: "Financial capacity for full program", met: true },
  ],
  redFlagsBanner: "If client expects guaranteed US residency or India license without FMGE/NExT, reset expectations before taking fees.",
  redFlags: [
    { title: "Guaranteed residency promise", description: "Agents promising US residency or 100% match.", fix: "Quote SUSOM published stats only; no guarantees", severity: "High" },
    { title: "NMC list not verified", description: "Enrollment without checking current NMC foreign medical institutions list.", fix: "Verify on nmc.org.in before contract", severity: "Very common" },
    { title: "Underestimating clinical-year costs", description: "Budgeting only for Saba island living.", fix: "Include US rotation city living costs", severity: "Common" },
    { title: "Family relocation without visa plan", description: "Spouse/children without dependant visa strategy.", fix: "Immigration counsel before promising family join", severity: "Common" },
    { title: "Calling MD an Indian MBBS", description: "Misrepresenting degree equivalency.", fix: "Explain MD + FMGE/NExT pathway clearly", severity: "High" },
  ],
  faqs: Array.from({ length: 30 }, (_, i) => {
    const pairs = [
      ["Is SUSOM accredited?", "NVAO accredited; WFME recognised; US NCFMEA comparable standards — see saba.edu/why-saba/accreditation-and-approvals/"],
      ["Program duration?", "4 years (10 semesters): 5 basic science on Saba + 5 clinical in US."],
      ["Intakes?", "January, May, and September per saba.edu."],
      ["Can Indian students apply after NEET?", "Verify current NMC rules for foreign medical study — NEET qualification may be required."],
      ["Is it MBBS or MD?", "Doctor of Medicine (MD) — US-style medical degree."],
      ["FMGE/NExT required for India?", "Yes for Indian licensure after foreign MD — verify current NMC process."],
      ["USMLE pass rates?", "SUSOM reports 98% first-time Step 1 and Step 2 CK pass (2024)."],
      ["Residency placement?", "SUSOM reports 99% three-year residency placement rate — verify latest on graduate success page."],
      ["Where is basic science?", "Island of Saba, Dutch Caribbean."],
      ["Where are clinical rotations?", "Affiliated US hospitals; select Canada electives."],
      ["English medium?", "Yes — entire MD program in English."],
      ["Can spouse work on Saba?", "Very limited — do not promise spouse employment."],
      ["Tuition amount?", "Always verify current semester rates on saba.edu/admissions/tuition-and-fees/"],
      ["Scholarships?", "Check saba.edu/admissions/scholarships/ for current offerings."],
      ["Gateway program?", "15-week prep for conditionally accepted students."],
      ["Pre-med master's?", "8-month MSc via MUA partner, then apply to MD."],
      ["Housing on Saba?", "See saba.edu/student-experience/housing/"],
      ["Canadian applicants?", "Dedicated CAD tuition option — see Canadian applicants page."],
      ["Can we guarantee approval?", "No — never guarantee admission, visa, residency, or licensure."],
      ["Document checklist?", "See Checklist tab — admission, visa, clinical, family sections."],
      ["US visa for clinical years?", "Plan F-1 or university-guided status for US rotations — case specific."],
      ["NMC recognition?", "Verify institution on NMC list at time of enrollment."],
      ["WHO listing?", "Check World Directory of Medical Schools (WDOMS)."],
      ["Part-time work?", "Not relied upon — maintain full-time student status."],
      ["Total budget estimate?", "Use Full cost breakdown tab + official tuition page."],
      ["How to apply?", "saba.edu/admissions/how-to-apply/ — Common Application."],
      ["Admission requirements?", "saba.edu/admissions/admissions-requirements/"],
      ["Clinical affiliates?", "Verify current hospital list with admissions."],
      ["Match Day outcomes?", "saba.edu/graduate-success/residency-match-day/"],
      ["Who is the authority?", "SUSOM admissions + immigration authorities for Saba and US clinical phases."],
    ];
    const [q, a] = pairs[i] ?? [`FAQ ${i + 1}`, "Verify on saba.edu"];
    return { q, a };
  }),
  compliance: [
    "Client agreement and consent before submission",
    "Never guarantee admission, visa, USMLE pass, residency match, or India license",
    "Quote tuition only from official saba.edu fee page",
    "Verify NMC foreign medical institutions list each intake season",
  ],
  proTips: [
    "Open saba.edu tuition page during every counseling call",
    "Explain MD vs MBBS and FMGE/NExT early",
    "Budget US clinical-year living costs separately from Saba island",
    "Download accreditation page for client file",
  ],
  postApproval: [
    "Confirm enrollment letter and visa timeline",
    "Explain basic science vs clinical phase relocation",
    "Introduce USMLE preparation timeline",
    "Set FMGE/NExT expectations for India-return pathway",
  ],
  timeline: [
    { weeks: "1–4", title: "Application & documents via SUSOM Common Application" },
    { weeks: "4–8", title: "Admission decision & tuition deposit" },
    { weeks: "8–12", title: "Student visa / residence permit (Saba)" },
    { weeks: "12+", title: "Travel, housing, orientation — basic science begins" },
    { weeks: "Year 3+", title: "Transition to US clinical rotations" },
  ],
  resources: [
    { title: "Saba University — Home", url: "https://www.saba.edu/", description: "Official website" },
    { title: "MD Program", url: "https://www.saba.edu/academics/programs/doctor-of-medicine-md-program/", description: "Program structure" },
    { title: "Accreditation & Approvals", url: "https://www.saba.edu/why-saba/accreditation-and-approvals/", description: "NVAO, WFME, NCFMEA" },
    { title: "Tuition and Fees", url: "https://www.saba.edu/admissions/tuition-and-fees/", description: "Official fee schedule" },
    { title: "Admissions Requirements", url: "https://www.saba.edu/admissions/admissions-requirements/", description: "Entry criteria" },
    { title: "International Applicants", url: "https://www.saba.edu/admissions/international-applicants/", description: "Including Indian context" },
    { title: "Graduate Success", url: "https://www.saba.edu/graduate-success/", description: "USMLE & residency outcomes" },
    { title: "Housing", url: "https://www.saba.edu/student-experience/housing/", description: "Living on Saba" },
    { title: "NMC India", url: "https://www.nmc.org.in/", description: "Foreign medical graduates" },
    { title: "World Directory of Medical Schools", url: "https://www.wdoms.org/", description: "WHO directory" },
  ],
  donts: {
    dos: ["Verify tuition on saba.edu", "Explain FMGE/NExT for India practice", "Use official accreditation links"],
    donts: ["Do not guarantee residency", "Do not promise spouse work on Saba", "Do not mislabel MD as Indian MBBS"],
    mistakes: ["Outdated tuition quotes", "Skipping NMC list check", "Ignoring US clinical living costs"],
  },
  quiz: [
    { level: 1, question: "SUSOM awards which degree?", options: ["MBBS", "MD", "BDS", "PhD"], correctIndex: 1, explanation: "Doctor of Medicine (MD)." },
    { level: 1, question: "Basic science campus location?", options: ["Miami", "Saba island", "Toronto", "London"], correctIndex: 1, explanation: "Five semesters on Saba." },
    { level: 1, question: "Primary accreditor cited by SUSOM?", options: ["NVAO", "MCI only", "GMC only", "None"], correctIndex: 0, explanation: "NVAO — European accreditation." },
    { level: 1, question: "Indian licensure after foreign MD requires?", options: ["Nothing", "FMGE/NExT + NMC process", "Only university letter", "State ID"], correctIndex: 1, explanation: "Verify current NMC rules." },
    { level: 2, question: "Clinical rotations primarily in?", options: ["India", "United States", "Saba only", "UK only"], correctIndex: 1, explanation: "US affiliated hospitals." },
    { level: 2, question: "Official tuition source?", options: ["Agent brochure", "saba.edu/admissions/tuition-and-fees/", "Social media", "Guess"], correctIndex: 1, explanation: "Always official fee page." },
    { level: 2, question: "Spouse work on Saba?", options: ["Unlimited", "Very limited — do not promise", "Automatic work permit", "Same as student"], correctIndex: 1, explanation: "Small island; limited economy." },
    { level: 3, question: "Can counselors guarantee US residency?", options: ["Yes always", "Never — cite published stats only", "If paid extra", "For top students only"], correctIndex: 1, explanation: "Compliance — no guarantees." },
  ],
  changelog: [
    { version: "v1.0", date: "10 Jun 2026", author: "Service Library", summary: "Initial SUSOM MBBS section content from saba.edu." },
  ],
  staffNotes: [
    { author: "Documentation team", date: "10 Jun 2026", text: "Re-verify tuition and NMC list each intake season." },
  ],
  sampleDocs: [
    { title: "Sample NEET scorecard (mock)", description: "Indian applicant — verify current NMC NEET requirement.", docKind: "academic" },
    { title: "Sample passport bio page", description: "Full validity for visa processing.", docKind: "identity" },
    { title: "Sample bank statement (mock)", description: "Seasoned funds for tuition + living.", docKind: "financial" },
    { title: "Sample transcript", description: "Official academic records for admission.", docKind: "academic" },
  ],
};

const jsonPath = path.join(process.cwd(), "content/service-library/mbbs-saba-university.json");
fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + "\n");

const jsonEsc = JSON.stringify(meta).replace(/'/g, "''");
const sql = `-- Saba University School of Medicine — MBBS section (Phase 1)
-- Official source: https://www.saba.edu/
-- library_id: ${SABA_LIBRARY_ID}

INSERT INTO public.service_library (
  id, service_category, service, sub_service, display_order, is_active, academy_metadata, process_flow, checklist_text
)
VALUES (
  '${SABA_LIBRARY_ID}',
  'mbbs_services',
  'MBBS',
  'Saba University School of Medicine',
  1,
  true,
  '${jsonEsc}'::jsonb,
  '[
    {"weeks": "1–4", "title": "Application via SUSOM Common Application", "owner": "Counselor"},
    {"weeks": "4–8", "title": "Admission & tuition deposit", "owner": "University"},
    {"weeks": "8–12", "title": "Student visa / residence (Saba)", "owner": "Counselor"},
    {"weeks": "Semester 1", "title": "Basic science on Saba island", "owner": "Student"},
    {"weeks": "Year 3+", "title": "US clinical rotations", "owner": "University"}
  ]'::jsonb,
  '<p>See academy_metadata.mbbs.documentChecklistSections for structured checklist.</p>'
)
ON CONFLICT (id) DO UPDATE SET
  service_category = EXCLUDED.service_category,
  service = EXCLUDED.service,
  sub_service = EXCLUDED.sub_service,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  academy_metadata = EXCLUDED.academy_metadata,
  process_flow = EXCLUDED.process_flow,
  checklist_text = EXCLUDED.checklist_text,
  updated_at = now();

DELETE FROM public.service_library_countries WHERE library_id = '${SABA_LIBRARY_ID}';
INSERT INTO public.service_library_countries (library_id, country) VALUES ('${SABA_LIBRARY_ID}', 'Saba');
`;

const sqlPath = path.join(process.cwd(), "supabase/migrations/20260611150000_mbbs_saba_university.sql");
const allowlistNote = `-- NOTE: If country allow-list error, run first: supabase/migrations/20260611151000_allowlist_mbbs_caribbean.sql

`;
fs.writeFileSync(sqlPath, allowlistNote + sql);

console.log("Wrote", jsonPath);
console.log("Wrote", sqlPath);
