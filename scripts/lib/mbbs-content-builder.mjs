/** Build academy_metadata JSON for MBBS institutions from registry config. */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TUITION_BY_ID = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../content/service-library/mbbs-tuition-data.json"), "utf8"),
);

function fmtUsd(n) {
  return n.toLocaleString("en-US");
}

function fmtRub(n) {
  return n.toLocaleString("en-US");
}

export function buildFullCostBreakdown(inst) {
  const t = TUITION_BY_ID[inst.libraryId];
  const currency = t?.currency ?? (inst.archetype === "russia_specialist" ? "RUB" : "USD");
  const verifyHost = inst.tuitionUrl.replace(/^https?:\/\//, "");

  if (t?.archetype === "caribbean_md") {
    const adminRange = t.adminPerSem
      ? `${fmtUsd(t.adminPerSem)}/sem × 10`
      : t.adminBasicPerSem && t.adminClinicalPerSem
        ? `${fmtUsd(t.adminBasicPerSem)}/sem (basic) · ${fmtUsd(t.adminClinicalPerSem)}/sem (clinical)`
        : "Per catalog";
    const totalRange =
      t.totalTuitionAndAdmin != null
        ? fmtUsd(t.totalTuitionAndAdmin)
        : t.totalTuitionOnly != null
          ? fmtUsd(t.totalTuitionOnly)
          : "Sum of 10 semesters";

    return {
      title: `Full cost breakdown — ${inst.institutionName}`,
      currency: "USD",
      lastVerified: "Jun 2026",
      disclaimer: `Indicative structure for counselor discussions. Tuition changes each academic year — always quote from ${inst.tuitionUrl} before client commitment.`,
      sourceUrl: inst.tuitionUrl,
      sections: [
        {
          id: "fees",
          label: "University & administrative fees",
          items: [
            {
              label: "MD tuition — basic science (per semester)",
              range: fmtUsd(t.basicTuitionPerSem),
              notes: "Terms 1–5",
              currency: "USD",
            },
            {
              label: "MD tuition — clinical (per semester)",
              range: fmtUsd(t.clinicalTuitionPerSem),
              notes: "Terms 6–10",
              currency: "USD",
            },
            {
              label: "Application / seat deposit",
              range: fmtUsd(t.applicationFee),
              currency: "USD",
            },
            {
              label: "Student services / admin fees",
              range: adminRange,
              currency: "USD",
            },
            { label: "Visa & immigration fees", range: "Varies", notes: "Consulate + permits" },
          ],
        },
        {
          id: "tuition",
          label: "Program costs",
          items: [
            {
              label: "Total program tuition (indicative)",
              range: totalRange,
              notes: t.rateNote,
              currency: "USD",
            },
            { label: "Books & equipment", range: "1,000–3,000", unit: "per year", currency: "USD" },
            {
              label: "USMLE exam fees",
              range: `${fmtUsd(t.usmleStep1)} + ${fmtUsd(t.usmleStep2)}`,
              notes: "Step 1 + Step 2 CK",
              currency: "USD",
            },
          ],
        },
        {
          id: "living",
          label: "Living costs",
          items: [
            {
              label: `Housing (${inst.city})`,
              range: "See university / local market",
              unit: "per month",
              currency: "USD",
            },
            { label: "Food & personal", range: "Varies by city", unit: "per month", currency: "USD" },
            {
              label: "Health insurance",
              range: "Mandatory",
              notes: "Verify university requirements",
              currency: "USD",
            },
            {
              label: "Clinical years (US cities)",
              range: "Varies by rotation city",
              unit: "per month",
              notes: "Higher in major metros",
              currency: "USD",
            },
          ],
        },
        {
          id: "misc",
          label: "Miscellaneous",
          items: [
            { label: "Future Link consultancy fee", range: "See Fees tab" },
            { label: "Flights India ↔ destination", range: "₹50,000–2,00,000+" },
            { label: "Medical exam & police clearance", range: "₹5,000–15,000" },
            { label: "Forex / wire transfer charges", range: "Bank dependent" },
          ],
        },
      ],
      totals: [
        {
          label: "Indicative total program budget",
          value: `From USD $${totalRange} tuition + living costs`,
          notes: `Use ${verifyHost.split("/")[0]} tuition page; add 15% buffer for currency and fee increases.`,
        },
      ],
    };
  }

  if (t?.archetype === "georgia_md") {
    return {
      title: `Full cost breakdown — ${inst.institutionName}`,
      currency: "USD",
      lastVerified: "Jun 2026",
      disclaimer: `Indicative structure for counselor discussions. Tuition changes each academic year — always quote from ${inst.tuitionUrl} before client commitment.`,
      sourceUrl: inst.tuitionUrl,
      sections: [
        {
          id: "fees",
          label: "University & administrative fees",
          items: [
            {
              label: "MD tuition (annual)",
              range: fmtUsd(t.annualTuition),
              notes: t.rateNote,
              currency: "USD",
            },
            { label: "Application fee", range: "See official site", currency: "USD" },
            { label: "Registration / admin fees", range: "Per catalog", currency: "USD" },
            { label: "Visa & immigration fees", range: "Varies", notes: "Consulate + permits" },
          ],
        },
        {
          id: "tuition",
          label: "Program costs",
          items: [
            {
              label: "Total program tuition (indicative)",
              range: fmtUsd(t.totalProgramTuition),
              notes: `${t.programYears} years × $${fmtUsd(t.annualTuition)}/year`,
              currency: "USD",
            },
            { label: "Books & equipment", range: "Varies", unit: "per year", currency: "USD" },
          ],
        },
        {
          id: "living",
          label: "Living costs",
          items: [
            {
              label: `Housing (${inst.city})`,
              range: "400–800",
              unit: "per month",
              currency: "USD",
              notes: "Tbilisi/Batumi market rates",
            },
            { label: "Food & personal", range: "200–400", unit: "per month", currency: "USD" },
            {
              label: "Health insurance",
              range: "Mandatory",
              notes: "Verify university requirements",
              currency: "USD",
            },
          ],
        },
        {
          id: "misc",
          label: "Miscellaneous",
          items: [
            { label: "Future Link consultancy fee", range: "See Fees tab" },
            { label: "Flights India ↔ Georgia", range: "₹40,000–1,50,000+" },
            { label: "Medical exam & police clearance", range: "₹5,000–15,000" },
            { label: "Forex / wire transfer charges", range: "Bank dependent" },
          ],
        },
      ],
      totals: [
        {
          label: "Indicative total program budget",
          value: `From USD $${fmtUsd(t.totalProgramTuition)} tuition + living costs`,
          notes: `Use ${verifyHost.split("/")[0]} tuition page; add 15% buffer for currency and fee increases.`,
        },
      ],
    };
  }

  if (t?.archetype === "russia_specialist") {
    return {
      title: `Full cost breakdown — ${inst.institutionName}`,
      currency: "RUB",
      lastVerified: "Jun 2026",
      disclaimer: `Indicative structure for counselor discussions. Tuition changes each academic year — always quote from ${inst.tuitionUrl} before client commitment.`,
      sourceUrl: inst.tuitionUrl,
      sections: [
        {
          id: "fees",
          label: "University & administrative fees",
          items: [
            {
              label: "Tuition (annual)",
              range: fmtRub(t.annualTuition),
              notes: t.rateNote,
              currency: "RUB",
            },
            { label: "Application fee", range: "See synergy.ru", currency: "RUB" },
            { label: "Dormitory / housing", range: "Varies", unit: "per month", currency: "RUB" },
            { label: "Visa & immigration fees", range: "Varies", notes: "Consulate + registration" },
          ],
        },
        {
          id: "tuition",
          label: "Program costs",
          items: [
            {
              label: "Total program tuition (indicative)",
              range: fmtRub(t.totalProgramTuition),
              notes: `${t.programYears} years × ₽${fmtRub(t.annualTuition)}/year`,
              currency: "RUB",
            },
            { label: "Books & equipment", range: "Varies", unit: "per year", currency: "RUB" },
          ],
        },
        {
          id: "living",
          label: "Living costs",
          items: [
            {
              label: `Housing (${inst.city})`,
              range: "See university / local market",
              unit: "per month",
              currency: "RUB",
            },
            { label: "Food & personal", range: "Varies", unit: "per month", currency: "RUB" },
            {
              label: "Health insurance",
              range: "Mandatory",
              notes: "Required for visa",
              currency: "RUB",
            },
          ],
        },
        {
          id: "misc",
          label: "Miscellaneous",
          items: [
            { label: "Future Link consultancy fee", range: "See Fees tab" },
            { label: "Flights India ↔ Moscow", range: "₹50,000–2,00,000+" },
            { label: "Medical exam & police clearance", range: "₹5,000–15,000" },
            { label: "Forex / wire transfer charges", range: "Bank dependent" },
          ],
        },
      ],
      totals: [
        {
          label: "Indicative total program budget",
          value: `From ₽${fmtRub(t.totalProgramTuition)} tuition + living costs`,
          notes: `Use ${verifyHost.split("/")[0]} tuition page; add 15% buffer for currency and fee increases.`,
        },
      ],
    };
  }

  return {
    title: `Full cost breakdown — ${inst.institutionName}`,
    currency,
    lastVerified: "Jun 2026",
    disclaimer: `Indicative structure for counselor discussions. Tuition changes each academic year — always quote from ${inst.tuitionUrl} before client commitment.`,
    sourceUrl: inst.tuitionUrl,
    sections: [
      {
        id: "fees",
        label: "University & administrative fees",
        items: [
          {
            label: "Tuition (annual / per semester)",
            range: "See official tuition page",
            notes: `Verify on ${verifyHost.split("/")[0]}`,
            currency,
          },
        ],
      },
    ],
    totals: [],
  };
}

function indiaPathway(inst) {
  return {
    fmgeNext:
      "Indian citizens with foreign medical degrees must qualify FMGE (transitioning to NExT) and meet NMC requirements before registration in India.",
    details: [
      "Verify institution status on NMC foreign medical institutions list before enrollment.",
      `Degree pathway: ${inst.degreeLabel} — set client expectations early vs Indian 5.5-year MBBS.`,
      "Internship/clinical hours must meet NMC criteria — verify with current NMC notifications.",
      "Never guarantee FMGE/NExT pass or India registration.",
    ],
    sourceUrl: "https://www.nmc.org.in/",
  };
}

function hostCountryPathway(inst) {
  if (inst.archetype === "russia_specialist") {
    return {
      summary:
        "Graduates may pursue medical licensing in Russia after completing state exams and internship requirements — verify current Federal Service for Supervision of Healthcare rules.",
      details: [
        "6-year specialist (специалитет) General Medicine programme.",
        "Clinical training at partner hospitals in Moscow and Russia.",
        "Russian language proficiency may be required for clinical years on Russian-medium tracks — verify with admissions.",
        "Migration registration required after arrival — maintain valid student residence.",
      ],
      sourceUrl: inst.website,
    };
  }
  if (inst.archetype === "georgia_md") {
    return {
      summary:
        "Graduates may pursue medical licensing in Georgia after meeting national requirements — verify with Ministry of Health and university registrar.",
      details: [
        "6-year English-taught MD programme with clinical training at Georgian partner hospitals.",
        "Student residence permit required — renew per migration rules.",
        "Some graduates pursue USMLE or other international licensing — case-specific; no guarantees.",
      ],
      sourceUrl: inst.website,
    };
  }
  return {
    summary: `Basic science in ${inst.city}; verify local student immigration rules during campus years.`,
    details: [
      `Maintain valid student status in ${inst.country} during basic science semesters.`,
      "Clinical years primarily in the United States — separate US visa strategy required.",
    ],
    sourceUrl: inst.website,
  };
}

function usCanadaPathway(inst) {
  if (inst.archetype === "caribbean_md") {
    return {
      summary:
        "Graduates eligible for USMLE Step 1 & Step 2 CK; residency match via NRMP. Canadian elective sites may be available — verify on official graduate outcomes page.",
      details: [
        `Basic science on ${inst.city} → US clinical rotations → USMLE → NRMP Match.`,
        "MCAT may be required or strongly recommended — verify current admissions policy.",
        "Residency placement statistics published on university site — quote published data only.",
      ],
      sourceUrl: `${inst.website}`,
    };
  }
  if (inst.archetype === "georgia_md") {
    return {
      summary:
        "Some Georgian medical universities offer USMLE preparation — verify whether graduates commonly pursue US residency vs Georgia/EU/India pathways.",
      details: [
        "Do not assume automatic US residency eligibility.",
        "Verify whether university publishes USMLE pass rates or match statistics.",
        "Indian return pathway via FMGE/NExT remains primary counsel for most Indian clients.",
      ],
      sourceUrl: inst.website,
    };
  }
  return {
    summary:
      "Russia pathway graduates typically pursue licensing in Russia, CIS countries, or return to India via FMGE/NExT — US residency is not the default pathway.",
    details: [
      "Verify whether degree is listed in WDOMS and recognised in target practice countries.",
      "Do not promise US residency without verified individual eligibility.",
    ],
    sourceUrl: "https://www.wdoms.org/",
  };
}

function documentChecklistSections(inst) {
  const admission = {
    id: "admission",
    label: "Admission documents",
    items: [
      `Completed online application (${inst.shortName} portal)`,
      "Official transcripts (10th, 12th, bachelor's / pre-med as required)",
      "NEET scorecard (Indian applicants — if required under current NMC rules)",
      "English proficiency evidence (if requested)",
      "Personal statement / motivation letter",
      "Letters of recommendation (per university requirements)",
      "CV / resume",
      "Passport copy — valid 6+ months beyond program",
      "Application fee payment proof (if applicable)",
    ],
  };

  const visaLabel =
    inst.archetype === "caribbean_md"
      ? `Visa & immigration (${inst.city} — basic science years)`
      : inst.archetype === "russia_specialist"
        ? "Visa & immigration (Russia — student visa)"
        : "Visa & immigration (Georgia — student residence)";

  const visaItems =
    inst.archetype === "russia_specialist"
      ? [
          "University admission / enrollment letter",
          "Invitation letter for Russian student visa (if applicable)",
          "Proof of tuition payment or financial guarantee",
          "Bank statements / sponsor affidavit (seasoned funds)",
          "Medical insurance / health certificate",
          "HIV test certificate (if required by consulate)",
          "Police clearance (if required)",
          "Passport valid 6+ months beyond stay",
          "Visa application per Russian consulate guidance",
          "Migration registration within 7 days of arrival in Russia",
        ]
      : inst.archetype === "georgia_md"
        ? [
            "University admission / enrollment letter",
            "Proof of tuition payment or financial guarantee",
            "Bank statements / sponsor affidavit",
            "Medical insurance proof",
            "Police clearance (if required)",
            "Passport valid 6+ months",
            "Georgia long-stay D5 / student visa application",
            "Accommodation confirmation in Georgia",
            "Travel insurance (recommended)",
          ]
        : [
            "University admission / enrollment letter",
            "Proof of tuition payment or financial guarantee",
            "Bank statements / sponsor affidavit",
            "Medical insurance proof",
            "Police clearance (if required)",
            "Passport valid 6+ months",
            `Student visa / permit for ${inst.country}`,
            "Passport photographs per consulate specs",
            "Accommodation confirmation",
          ];

  const visa = { id: "visa", label: visaLabel, items: visaItems };

  const clinical =
    inst.archetype === "caribbean_md"
      ? {
          id: "clinical",
          label: "US clinical years (additional)",
          items: [
            "US visa strategy documented (typically F-1 or as advised by university)",
            "SEVIS / I-20 if applicable for US clinical portion",
            "Health insurance for US clinical sites",
            "Background checks for hospital affiliations",
            "Updated financial proof for US rotation city living costs",
          ],
        }
      : null;

  const family = {
    id: "family",
    label: "Family dependants (if applicable)",
    items: [
      "Marriage certificate (spouse)",
      "Birth certificates (children)",
      "Additional funds proof for dependants",
      "Dependant visa applications per jurisdiction",
      "Health insurance for dependants",
    ],
  };

  return clinical ? [admission, visa, clinical, family] : [admission, visa, family];
}

function buildFaqs(inst) {
  const verifyHost = inst.website.replace(/^https?:\/\//, "");
  const pairs = [
    ["Program duration?", inst.programDuration],
    ["Intakes?", (inst.intakes ?? []).join(", ")],
    ["English medium?", inst.mediumOfInstruction],
    ["Is it MBBS or MD?", inst.degreeLabel],
    ["FMGE/NExT required for India?", "Yes for Indian licensure — verify current NMC process."],
    ["NEET required for Indian students?", "Verify current NMC rules for foreign medical study."],
    ["Tuition amount?", `Always verify on official site: ${inst.tuitionUrl}`],
    ["How to apply?", inst.applyUrl],
    ["Admission requirements?", inst.requirementsUrl],
    ["Can we guarantee approval?", "No — never guarantee admission, visa, licensing, or residency."],
    ["NMC recognition?", "Verify institution on NMC list at time of enrollment."],
    ["WHO listing?", "Check World Directory of Medical Schools (WDOMS)."],
    ["Part-time work?", "Maintain full-time student status — verify local work restrictions."],
    ["Spouse can accompany?", "Case-by-case — verify dependant visa rules before promising."],
    ["Where to practice after graduation?", "See Practice tab — India FMGE/NExT plus host-country options."],
    ["Document checklist?", "See Checklist tab — admission, visa, and clinical sections."],
    ["Official website?", verifyHost],
    ["City / campus?", `${inst.city}, ${inst.regionLabel}`],
    ["Accreditation?", "Verify on official university site before quoting clients."],
    ["Consultancy fee?", "See Fees tab — separate from university tuition."],
    ["Total budget estimate?", "Use Full cost breakdown tab + official tuition page."],
    ["Scholarships?", "Check official admissions page for current offerings."],
    ["Housing?", "Confirm with university student services / housing office."],
    ["Clinical training location?", inst.clinicalNotes ?? "Verify on official site."],
    ["Related programmes?", "See Programs tab for additional medical tracks."],
    ["Who is the authority?", `${inst.shortName} admissions + ${inst.country} immigration authorities.`],
    ["Can spouse work?", "Verify local immigration rules — do not promise employment."],
    ["Health insurance?", "Mandatory for most international students — verify requirements."],
    ["Police clearance?", "Obtain if required by university or consulate checklist."],
    ["Age limit?", "Verify with admissions — typically 17+ for medical programmes."],
    ["Recognition in India?", "Foreign degree + FMGE/NExT + NMC process — verify current rules."],
  ];
  return pairs.map(([q, a]) => ({ q, a }));
}

function buildQuiz(inst) {
  const city = inst.city;
  const country = inst.country;
  return [
    {
      level: 1,
      question: `${inst.shortName} is located in which country?`,
      options: ["India", country, "Canada", "UK"],
      correctIndex: 1,
      explanation: `${inst.regionLabel}.`,
    },
    {
      level: 1,
      question: "Indian licensure after foreign medical degree requires?",
      options: ["Nothing", "FMGE/NExT + NMC process", "Only university letter", "Agent certificate"],
      correctIndex: 1,
      explanation: "Verify current NMC rules.",
    },
    {
      level: 1,
      question: "Official tuition source?",
      options: ["Agent brochure", "Official university website", "Social media", "Guess"],
      correctIndex: 1,
      explanation: "Always official fee page.",
    },
    {
      level: 2,
      question: "Primary campus city?",
      options: [city, "Mumbai", "London", "Toronto"],
      correctIndex: 0,
      explanation: `${city}, ${country}.`,
    },
    {
      level: 2,
      question: "Can counselors guarantee admission?",
      options: ["Yes always", "Never", "If paid extra", "For top students only"],
      correctIndex: 1,
      explanation: "Compliance — no guarantees.",
    },
    {
      level: 2,
      question: "Program duration?",
      options: ["2 years", inst.programDuration.split(" ")[0] + " years", "10 years", "1 year"],
      correctIndex: 1,
      explanation: inst.programDuration,
    },
    {
      level: 3,
      question: "Before enrollment, NMC list should be?",
      options: ["Ignored", "Verified on nmc.org.in", "Assumed valid", "Checked after graduation"],
      correctIndex: 1,
      explanation: "Verify at admission year.",
    },
    {
      level: 3,
      question: "Consultancy fee vs tuition?",
      options: ["Same payment", "Separate — never commingle", "Optional bribe", "Included in tuition"],
      correctIndex: 1,
      explanation: "Compliance — separate invoices.",
    },
  ];
}

export function buildMbbsMetadata(inst) {
  const verifyHost = inst.website.replace(/^https?:\/\//, "");
  const isMd = inst.archetype === "caribbean_md";

  return {
    displayName: inst.displayName,
    shortDescription: inst.shortDescription,
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
      summary: `Verify current tuition, intake dates, and admission requirements on ${verifyHost} before quoting clients. Indian students: confirm NEET eligibility and NMC guidance separately.`,
    },
    alert: isMd
      ? {
          title: "MD vs MBBS naming",
          body: `${inst.shortName} awards a Doctor of Medicine (MD) — counsel Indian clients on FMGE/NExT pathway; do not describe as Indian-style MBBS without explaining licensing steps.`,
        }
      : {
          title: "Foreign medical degree pathway",
          body: `Verify NMC recognition and FMGE/NExT requirements before quoting ${inst.institutionName} to Indian clients.`,
        },
    tags: [
      { label: "Active institution", variant: "success" },
      { label: inst.country, variant: "neutral" },
      { label: (inst.intakes ?? []).slice(0, 2).join(" · "), variant: "neutral" },
      { label: `Verify tuition on ${verifyHost.split("/")[0]}`, variant: "warning" },
    ],
    chips: [
      { label: inst.programDuration.split(":")[0], variant: "neutral" },
      { label: inst.mediumOfInstruction.split("—")[0].trim(), variant: "success" },
      { label: inst.city, variant: "neutral" },
      { label: "Verify official fees", variant: "warning" },
    ],
    kpis: [
      { label: "Program duration", value: inst.programDuration.split("(")[0].trim(), sub: inst.degreeLabel, tone: "primary" },
      { label: "Tuition", value: "See Fees tab", sub: `Official ${verifyHost.split("/")[0]} rates`, tone: "warning" },
      { label: "Medium", value: "English", sub: inst.mediumOfInstruction.includes("Russian") ? "Also Russian tracks" : "Verify on site", tone: "success" },
      { label: "Required docs", value: "18+", sub: "Admission + visa", tone: "violet" },
      { label: "Consultancy fee", value: "See Fees tab", sub: "Future Link package", tone: "primary" },
    ],
    about: [
      {
        label: "Description",
        value: `${inst.institutionName} (${inst.shortName}) offers ${inst.degreeLabel}. ${inst.clinicalNotes ?? ""}`.trim(),
        link: inst.relatedPrograms[0]?.sourceUrl ?? inst.website,
      },
      {
        label: "Eligible applicants",
        value: `Meet ${inst.shortName} admission requirements · English proficiency where required · Indian applicants: verify NEET eligibility with current NMC rules`,
      },
      {
        label: "Accreditation highlight",
        value: inst.accreditation[0],
        warning: true,
      },
      {
        label: "Key authority",
        value: `${inst.institutionName} (admissions) · ${inst.country} immigration authorities for study permit / visa`,
      },
      {
        label: "After graduation",
        value: isMd
          ? "USMLE · NRMP residency match · FMGE/NExT for India practice · Verify licensing in target country"
          : "FMGE/NExT for India · Host-country licensing exams · Verify WDOMS and NMC list status",
      },
    ],
    mbbs: {
      isDefaultLanding: false,
      institutionName: inst.institutionName,
      shortName: inst.shortName,
      city: inst.city,
      country: inst.country,
      regionLabel: inst.regionLabel,
      website: inst.website,
      established: inst.established,
      accreditation: inst.accreditation,
      mediumOfInstruction: inst.mediumOfInstruction,
      programDuration: inst.programDuration,
      clinicalTrainingNotes: inst.clinicalNotes,
      campusNotes: inst.campusNotes,
      intakes: inst.intakes,
      relatedPrograms: inst.relatedPrograms,
      familyOptions: {
        spouseCanAccompany: `Possible subject to ${inst.country} dependant visa rules — verify current immigration policy before client commitment.`,
        spouseWorkRights: `Spouse work authorization varies by ${inst.country} rules — do not promise employment without visa approval.`,
        childrenCanAccompany: "Case-by-case — verify dependant visa rules and schooling availability.",
        childrenNotes: "Plan schooling and childcare before family relocation.",
        additionalFundsRequired: "Additional living funds and health insurance for each dependant — verify with admissions.",
        visaRoute: `Student visa/residence for principal applicant; dependants require separate permits per ${inst.country} rules.`,
        restrictions: [
          "Do not promise spouse work without visa approval",
          "Verify all family immigration with official sources",
          "Clinical years may require separate visa strategy (if applicable)",
        ],
        sourceUrl: inst.applyUrl,
        lastVerified: "Jun 2026",
      },
      practicePathways: {
        summary: `Graduates of ${inst.institutionName} must verify licensing pathways in India (FMGE/NExT), host country, and any international targets on official sources.`,
        india: indiaPathway(inst),
        hostCountry: hostCountryPathway(inst),
        usCanada: usCanadaPathway(inst),
        recognition: {
          who: "Verify World Directory of Medical Schools (WDOMS) listing and WFME recognition chain.",
          nmc: "Counselors must verify current NMC eligible colleges list — status can change; check before each intake.",
          sourceUrls: [inst.website, "https://www.nmc.org.in/", "https://www.wdoms.org/"],
        },
        restrictions: [
          "Never guarantee licensure, residency match, or India registration",
          "Verify NMC list at time of admission",
        ],
        lastVerified: "Jun 2026",
      },
      documentChecklistSections: documentChecklistSections(inst),
    },
    workingRights: {
      applicant: {
        summary: `During study in ${inst.country}, students must maintain valid student immigration status. Paid employment rules vary — verify local regulations before advising clients to work.`,
        details: [
          "Unauthorized work may violate visa/residence conditions.",
          "University may offer limited on-campus roles — verify with student services.",
          inst.archetype === "caribbean_md"
            ? "US clinical years governed by US student visa rules."
            : `Maintain migration registration and valid residence permit in ${inst.country}.`,
        ],
        restrictions: ["Never advise clients to work illegally to fund tuition"],
        sourceUrl: inst.applyUrl,
        lastVerified: "Jun 2026",
      },
      spouse: {
        summary: `Spouse/partner work rights depend on ${inst.country} dependant visa conditions — verify before promising employment.`,
        details: ["Plan finances assuming limited spouse income unless visa explicitly permits work."],
        restrictions: ["Do not promise spouse employment without visa approval"],
        sourceUrl: inst.applyUrl,
        lastVerified: "Jun 2026",
      },
    },
    fullCostBreakdown: buildFullCostBreakdown(inst),
    eligibility: [
      { criterion: "Meet university academic entry requirements", met: true },
      { criterion: "English proficiency (if required)", met: true },
      { criterion: "NEET qualified (Indian applicants — verify current NMC rule)", met: false, note: "Check NMC notification at admission year" },
      { criterion: "Financial capacity for full program", met: true },
      { criterion: "Age and health requirements met", met: true },
    ],
    redFlagsBanner: "If client expects guaranteed licensure or residency without exams, reset expectations before taking fees.",
    redFlags: [
      { title: "NMC list not verified", description: "Enrollment without checking current NMC foreign medical institutions list.", fix: "Verify on nmc.org.in before contract", severity: "Very common" },
      { title: "Outdated tuition quotes", description: "Quoting from agent brochures instead of official site.", fix: `Open ${inst.tuitionUrl} during counseling call`, severity: "Common" },
      { title: "Guaranteed licensure promise", description: "Agents promising FMGE pass or residency match.", fix: "No guarantees — cite official stats only", severity: "High" },
      { title: "Family relocation without visa plan", description: "Spouse/children without dependant visa strategy.", fix: "Immigration counsel before promising family join", severity: "Common" },
      { title: "Wrong degree naming", description: "Misrepresenting MD vs MBBS equivalency for India.", fix: "Explain FMGE/NExT pathway clearly", severity: "High" },
    ],
    faqs: buildFaqs(inst),
    compliance: [
      "Client agreement and consent before submission",
      "Never guarantee admission, visa, licensure, or residency match",
      `Quote tuition only from official ${verifyHost.split("/")[0]} fee page`,
      "Verify NMC foreign medical institutions list each intake season",
    ],
    proTips: [
      `Open ${inst.tuitionUrl} during every counseling call`,
      "Explain FMGE/NExT for India practice early",
      "Download accreditation page for client file",
      "Separate consultancy fee from university payments on invoices",
    ],
    postApproval: [
      "Confirm enrollment letter and visa timeline",
      "Explain campus location and living cost expectations",
      "Set FMGE/NExT expectations for India-return pathway",
      "Schedule pre-departure document review",
    ],
    timeline: inst.processFlow.map((p) => ({ weeks: p.weeks, title: p.title })),
    resources: [
      { title: `${inst.shortName} — Home`, url: inst.website, description: "Official website" },
      { title: "How to apply", url: inst.applyUrl, description: "Admissions portal" },
      { title: "Admission requirements", url: inst.requirementsUrl, description: "Entry criteria" },
      { title: "Tuition and fees", url: inst.tuitionUrl, description: "Official fee schedule" },
      { title: "NMC India", url: "https://www.nmc.org.in/", description: "Foreign medical graduates" },
      { title: "World Directory of Medical Schools", url: "https://www.wdoms.org/", description: "WHO directory" },
    ],
    donts: {
      dos: [`Verify tuition on ${verifyHost.split("/")[0]}`, "Explain FMGE/NExT for India practice", "Use official accreditation links"],
      donts: ["Do not guarantee licensure or residency", "Do not promise spouse work without visa approval", "Do not mislabel degree equivalency"],
      mistakes: ["Outdated tuition quotes", "Skipping NMC list check", "Ignoring clinical-year living costs"],
    },
    quiz: buildQuiz(inst),
    changelog: [{ version: "v1.0", date: "10 Jun 2026", author: "Service Library", summary: `Initial ${inst.shortName} MBBS section from official sources.` }],
    staffNotes: [{ author: "Documentation team", date: "10 Jun 2026", text: "Re-verify tuition and NMC list each intake season." }],
    sampleDocs: [
      { title: "Sample NEET scorecard (mock)", description: "Indian applicant — verify current NMC NEET requirement.", docKind: "academic" },
      { title: "Sample passport bio page", description: "Full validity for visa processing.", docKind: "identity" },
      { title: "Sample bank statement (mock)", description: "Seasoned funds for tuition + living.", docKind: "financial" },
      { title: "Sample transcript", description: "Official academic records for admission.", docKind: "academic" },
    ],
  };
}

export function buildChecklistSpec(inst, meta) {
  const sections = (meta.mbbs.documentChecklistSections ?? []).map((sec, idx) => ({
    id: String.fromCharCode(65 + idx),
    title: sec.label,
    items: sec.items.map((item) => ({
      title: item,
      badge: /NEET|if required|if applicable|dependant|spouse|children/i.test(item) ? "IF APPLICABLE" : "REQUIRED",
    })),
  }));

  sections.push({
    id: String.fromCharCode(65 + sections.length),
    title: "Fees & submission",
    items: [
      { title: `Tuition quote verified on ${inst.tuitionUrl}`, note: "Never quote from agent brochures alone.", badge: "REQUIRED" },
      { title: "Consultancy fee invoice separate from university payment", badge: "REQUIRED" },
      { title: "Client reviewed, signed, and dated this checklist", badge: "REQUIRED" },
      { title: "NMC foreign medical institutions list checked (Indian clients)", badge: "RECOMMENDED" },
      { title: "Application lodged; confirmation saved on client file", badge: "REQUIRED" },
    ],
  });

  return {
    slug: inst.slug,
    displayName: inst.displayName,
    title: "Document Checklist",
    subtitle: `${inst.shortName} · Admission, visa & enrollment`,
    streamLabel: inst.degreeLabel,
    updatedLabel: "Updated June 2026",
    verifyUrl: inst.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    website: "futurelinkconsultants.com",
    policyBanner: meta.policyAlert.summary,
    metaFields: [
      { key: "client_name", label: "Client name", placeholder: "Full name as on passport" },
      { key: "file_id", label: "File ID", placeholder: "FLC-2026-XXXX" },
      { key: "intake", label: "Target intake", placeholder: (inst.intakes ?? []).join(" · ") },
      { key: "pathway", label: "Applicant pathway", placeholder: "Direct · NEET · Transfer" },
      { key: "institution", label: "Institution", placeholder: inst.institutionName },
      { key: "submission_date", label: "Submission date", placeholder: "yyyy-mm-dd" },
    ],
    sections,
  };
}

export function buildSubmissionItems(inst) {
  const prefix = inst.slug.replace("mbbs-", "").replace(/-/g, "_").slice(0, 12);
  return [
    { key: `${prefix}_application`, label: `${inst.shortName} application submitted`, mandatory: true, sort: 1 },
    { key: `${prefix}_transcripts`, label: "Official transcripts collected", mandatory: true, sort: 2 },
    { key: `${prefix}_neet_nmc`, label: "NEET / NMC rules verified (Indian applicants)", mandatory: false, sort: 3 },
    { key: `${prefix}_lor_personal`, label: "Personal statement & letters of recommendation", mandatory: true, sort: 4 },
    { key: `${prefix}_admission_letter`, label: "Admission / enrollment letter received", mandatory: true, sort: 5 },
    { key: `${prefix}_tuition_proof`, label: "Tuition payment or financial guarantee", mandatory: true, sort: 6 },
    { key: `${prefix}_visa`, label: `${inst.country} student visa / permit filed`, mandatory: true, sort: 7 },
    { key: `${prefix}_insurance`, label: "Health insurance proof", mandatory: true, sort: 8 },
    { key: `${prefix}_clinical_plan`, label: "Clinical-year / licensing strategy documented", mandatory: false, sort: 9 },
    { key: `${prefix}_fees_collected`, label: "Consultancy fee collected (separate from tuition)", mandatory: true, sort: 10 },
    { key: `${prefix}_client_approval`, label: "Client approval on final file", mandatory: true, sort: 11 },
    { key: `${prefix}_quality_review`, label: "Quality review sign-off", mandatory: true, sort: 12 },
  ];
}
