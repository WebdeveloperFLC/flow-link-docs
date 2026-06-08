/**
 * Coaching service_library registry — additive expansion.
 * IDs 071–074: existing IELTS (do not change).
 * IDs 075+: new / enriched coaching rows.
 */

export const IELTS_TEST_REFERENCE_ID = "b2000001-0001-4000-8000-000000000071";

/** @typedef {import('./coaching-content-builder.mjs')} CoachingContentBuilder */

/**
 * @typedef {object} CoachingRegistryEntry
 * @property {string} id
 * @property {string} jsonFile
 * @property {string} service
 * @property {string} sub_service
 * @property {number} display_order
 * @property {string} family
 * @property {string} displayName
 * @property {string} shortDescription
 * @property {string} policySummary
 * @property {string} [variantLabel]
 * @property {string} [duration]
 * @property {string} [batchType]
 * @property {boolean} [booksIncluded]
 * @property {string} [learningLevel]
 * @property {number} [learningMinutes]
 * @property {string} [testFamily]
 * @property {object} [alert]
 * @property {string} [alertBody]
 * @property {Array} [tags]
 * @property {Array} [chips]
 * @property {Array} [kpis]
 * @property {string} [description]
 * @property {string} [idealFor]
 * @property {string} [delivery]
 * @property {string} [afterCourse]
 * @property {Array} [faqs]
 * @property {Array} [resources]
 * @property {Array} [relatedIds]
 * @property {string[]} [relatedLabels]
 * @property {string} [checklistSlug]
 * @property {string} [checklistHtml]
 * @property {boolean} [skipContent] — existing hand-authored JSON
 * @property {string} [phase] — A | B | C
 */

const engPolicy = (test) =>
  `Verify ${test} exam fee and dates on the official booking portal before quoting. Coaching fee is separate. Never guarantee a score.`;

/** Existing IELTS rows — metadata already in repo; included for SQL/checklist generation. */
const IELTS_EXISTING = [
  {
    id: IELTS_TEST_REFERENCE_ID,
    jsonFile: "coaching-ielts-test-reference.json",
    service: "IELTS",
    sub_service: "Test Reference",
    display_order: 71,
    family: "IELTS",
    displayName: "IELTS — International English Language Testing System",
    shortDescription: "IDP India · Academic & General Training · Band 0–9",
    policySummary: engPolicy("IELTS"),
    skipContent: true,
    phase: "B",
    checklistHtml: "/specimens/coaching/ielts-test-reference.html",
  },
  {
    id: "b2000001-0001-4000-8000-000000000072",
    jsonFile: "coaching-ielts-academic-regular.json",
    service: "IELTS",
    sub_service: "Academic Regular (with books)",
    display_order: 72,
    family: "IELTS",
    displayName: "IELTS Academic Regular (with books)",
    shortDescription: "Academic module · 8–10 week regular batch · Books included",
    policySummary: engPolicy("IELTS Academic"),
    booksIncluded: true,
    skipContent: true,
    phase: "B",
    checklistSlug: "ielts-academic-regular",
    checklistHtml: "/specimens/coaching/ielts-academic-regular-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-000000000073",
    jsonFile: "coaching-ielts-academic-crash.json",
    service: "IELTS",
    sub_service: "Academic Crash Course",
    display_order: 73,
    family: "IELTS",
    displayName: "IELTS Academic Crash Course",
    shortDescription: "Academic module · 4–6 week intensive",
    policySummary: engPolicy("IELTS Academic"),
    duration: "4–6 weeks",
    batchType: "Crash",
    skipContent: true,
    phase: "B",
    checklistSlug: "ielts-academic-crash",
    checklistHtml: "/specimens/coaching/ielts-academic-crash-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-000000000074",
    jsonFile: "coaching-ielts-gt-regular.json",
    service: "IELTS",
    sub_service: "General Regular (with books)",
    display_order: 74,
    family: "IELTS",
    displayName: "IELTS General Regular (with books)",
    shortDescription: "General Training · 8–10 week batch · Books included",
    policySummary: engPolicy("IELTS GT"),
    booksIncluded: true,
    skipContent: true,
    phase: "B",
    checklistSlug: "ielts-gt-regular",
    checklistHtml: "/specimens/coaching/ielts-gt-regular-checklist.html",
  },
];

const IELTS_NEW = [
  {
    id: "b2000001-0001-4000-8000-000000000075",
    jsonFile: "coaching-ielts-academic-regular-nb.json",
    service: "IELTS",
    sub_service: "Academic Regular (without books)",
    display_order: 75,
    family: "IELTS",
    displayName: "IELTS Academic Regular (without books)",
    shortDescription: "Academic module · 8–10 week regular batch · Materials provided",
    policySummary: engPolicy("IELTS Academic"),
    booksIncluded: false,
    duration: "8–10 weeks",
    batchType: "Regular",
    phase: "B",
    checklistSlug: "ielts-academic-regular-nb",
    checklistHtml: "/specimens/coaching/ielts-academic-regular-nb-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-000000000076",
    jsonFile: "coaching-ielts-gt-regular-nb.json",
    service: "IELTS",
    sub_service: "General Regular (without books)",
    display_order: 76,
    family: "IELTS",
    displayName: "IELTS General Regular (without books)",
    shortDescription: "General Training · 8–10 week batch · Materials provided",
    policySummary: engPolicy("IELTS GT"),
    booksIncluded: false,
    duration: "8–10 weeks",
    phase: "B",
    checklistSlug: "ielts-gt-regular-nb",
    checklistHtml: "/specimens/coaching/ielts-gt-regular-nb-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-000000000077",
    jsonFile: "coaching-ielts-gt-crash.json",
    service: "IELTS",
    sub_service: "General Crash Course",
    display_order: 77,
    family: "IELTS",
    displayName: "IELTS General Crash Course",
    shortDescription: "General Training · 4–6 week intensive",
    policySummary: engPolicy("IELTS GT"),
    duration: "4–6 weeks",
    batchType: "Crash",
    phase: "B",
    checklistSlug: "ielts-gt-crash",
    checklistHtml: "/specimens/coaching/ielts-gt-crash-checklist.html",
  },
];

const ENGLISH_PROFICIENCY = [
  {
    id: "b2000001-0001-4000-8000-0000000000b5",
    jsonFile: "coaching-pte-academic.json",
    service: "PTE Academic",
    sub_service: "English Proficiency",
    display_order: 110,
    family: "PTE",
    testFamily: "PTE",
    displayName: "PTE Academic",
    shortDescription: "Pearson · Computer-based · 2-year validity · Accepted globally",
    policySummary: engPolicy("PTE Academic"),
    duration: "6–8 weeks",
    idealFor: "Students targeting PTE 50–79 for study, work, or migration pathways accepting PTE Academic.",
    resources: [
      { title: "PTE Academic — Official", url: "https://www.pearsonpte.com/", description: "Format, booking, scores" },
    ],
    phase: "B",
    checklistSlug: "pte-academic",
    checklistHtml: "/specimens/coaching/pte-academic-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000b6",
    jsonFile: "coaching-toefl-ibt.json",
    service: "TOEFL iBT",
    sub_service: "English Proficiency",
    display_order: 120,
    family: "TOEFL",
    testFamily: "TOEFL",
    displayName: "TOEFL iBT",
    shortDescription: "ETS · Internet-based · USA admissions focus · 2-year validity",
    policySummary: engPolicy("TOEFL iBT"),
    duration: "6–8 weeks",
    idealFor: "USA F-1 and programs requiring TOEFL iBT. Confirm university minimum before enrollment.",
    resources: [
      { title: "TOEFL — Official", url: "https://www.ets.org/toefl", description: "Registration, format, scores" },
    ],
    phase: "B",
    checklistSlug: "toefl-ibt",
    checklistHtml: "/specimens/coaching/toefl-ibt-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000b7",
    jsonFile: "coaching-celpip-general.json",
    service: "CELPIP General",
    sub_service: "English Proficiency",
    display_order: 130,
    family: "CELPIP",
    testFamily: "CELPIP",
    displayName: "CELPIP General",
    shortDescription: "Canada IRCC · CLB scored · Express Entry & citizenship pathways",
    policySummary: engPolicy("CELPIP-General"),
    duration: "6–8 weeks",
    idealFor: "Canada PR, citizenship, and pathways accepting CELPIP-General (not Academic).",
    resources: [
      { title: "CELPIP — Official", url: "https://www.celpip.ca/", description: "General vs Academic, CLB mapping" },
    ],
    phase: "B",
    checklistSlug: "celpip-general",
    checklistHtml: "/specimens/coaching/celpip-general-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000b8",
    jsonFile: "coaching-duolingo-english-test.json",
    service: "Duolingo English Test",
    sub_service: "English Proficiency",
    display_order: 140,
    family: "Duolingo English Test",
    testFamily: "Duolingo",
    displayName: "Duolingo English Test",
    shortDescription: "Online proctored · Fast results · Growing uni acceptance",
    policySummary: engPolicy("Duolingo English Test"),
    duration: "4–6 weeks",
    idealFor: "Students with university acceptance listing DET; confirm institution and score minimum.",
    resources: [
      { title: "Duolingo English Test", url: "https://englishtest.duolingo.com/", description: "Booking, format" },
    ],
    phase: "B",
    checklistSlug: "duolingo-english-test",
    checklistHtml: "/specimens/coaching/duolingo-english-test-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000b9",
    jsonFile: "coaching-spoken-english.json",
    service: "Spoken English (with books)",
    sub_service: "English Proficiency",
    display_order: 150,
    family: "Spoken English",
    testFamily: "Spoken English",
    displayName: "Spoken English (with books)",
    shortDescription: "Fluency & confidence · Workplace / interview focus · Books included",
    policySummary: "Spoken English builds fluency — not a substitute for IELTS/PTE for visa. Books included where stated.",
    booksIncluded: true,
    duration: "8–10 weeks",
    idealFor: "Students needing confidence, interview prep, or foundation before formal test prep.",
    phase: "B",
    checklistSlug: "spoken-english",
    checklistHtml: "/specimens/coaching/spoken-english-checklist.html",
  },
];

function frenchLevel(level, order, idSuffix) {
  return {
    id: `b2000001-0001-4000-8000-0000000000${idSuffix}`,
    jsonFile: `coaching-french-language-${level.toLowerCase()}.json`,
    service: `French Language ${level}`,
    sub_service: "French Language",
    display_order: order,
    family: "French Language",
    displayName: `French Language ${level}`,
    shortDescription: `CEFR ${level} · DELF/DALF pathway · European Languages`,
    policySummary: `Confirm ${level} target and exam goal (DELF/DALF/TEF) before enrollment. Coaching fee separate from exam fee.`,
    duration: "8–12 weeks",
    learningLevel: level === "A1" || level === "A2" ? "Beginner" : level === "B1" || level === "B2" ? "Intermediate" : "Advanced",
    idealFor: `Students targeting CEFR ${level} for study, work, or Canada/France immigration French requirements.`,
    phase: "C",
    checklistSlug: `french-language-${level.toLowerCase()}`,
    checklistHtml: `/specimens/coaching/french-language-${level.toLowerCase()}-checklist.html`,
  };
}

const FRENCH = [
  {
    id: "b2000001-0001-4000-8000-0000000000ba",
    jsonFile: "coaching-french-language-general.json",
    service: "French Language (General / Custom)",
    sub_service: "French Language",
    display_order: 200,
    family: "French Language",
    displayName: "French Language (General / Custom)",
    shortDescription: "Custom pace · Flexible goals · DELF/DALF/TEF prep",
    policySummary: "Custom French program — document target level and exam on enrollment form.",
    duration: "Flexible",
    phase: "C",
    checklistSlug: "french-language-general",
    checklistHtml: "/specimens/coaching/french-language-general-checklist.html",
  },
  frenchLevel("A1", 201, "bb"),
  frenchLevel("A2", 202, "bc"),
  frenchLevel("B1", 203, "bd"),
  frenchLevel("B2", 204, "be"),
  frenchLevel("C1", 205, "bf"),
  frenchLevel("C2", 206, "c0"),
];

const GERMAN = [
  {
    id: "b2000001-0001-4000-8000-0000000000c1",
    jsonFile: "coaching-german-language-a1-regular.json",
    service: "German Language A1 Regular",
    sub_service: "European Languages",
    display_order: 210,
    family: "German Language",
    displayName: "German Language A1 Regular",
    shortDescription: "CEFR A1 · Goethe/telc pathway · Regular batch",
    policySummary: "A1 foundation for Germany study, Opportunity Card prep, or spouse visa German requirement.",
    duration: "8–10 weeks",
    learningLevel: "Beginner",
    phase: "C",
    checklistSlug: "german-language-a1-regular",
    checklistHtml: "/specimens/coaching/german-language-a1-regular-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000c2",
    jsonFile: "coaching-german-a2-regular.json",
    service: "German A2 Regular (with books)",
    sub_service: "European Languages",
    display_order: 220,
    family: "German Language",
    displayName: "German A2 Regular (with books)",
    shortDescription: "CEFR A2 · Regular batch · Books included",
    policySummary: "A2 for spouse reunion, vocational pathways, and further German study. Books issued at enrollment.",
    booksIncluded: true,
    duration: "8–10 weeks",
    phase: "C",
    checklistSlug: "german-a2-regular",
    checklistHtml: "/specimens/coaching/german-a2-regular-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000c3",
    jsonFile: "coaching-german-a2-crash.json",
    service: "German A2 Crash (with books)",
    sub_service: "European Languages",
    display_order: 230,
    family: "German Language",
    displayName: "German A2 Crash (with books)",
    shortDescription: "CEFR A2 · Intensive 4–6 weeks · Books included",
    policySummary: "Crash A2 only when diagnostic gap is realistic. Never guarantee Goethe/telc pass.",
    booksIncluded: true,
    duration: "4–6 weeks",
    batchType: "Crash",
    phase: "C",
    checklistSlug: "german-a2-crash",
    checklistHtml: "/specimens/coaching/german-a2-crash-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000c4",
    jsonFile: "coaching-german-b1-regular.json",
    service: "German B1 Regular (with books)",
    sub_service: "European Languages",
    display_order: 240,
    family: "German Language",
    displayName: "German B1 Regular (with books)",
    shortDescription: "CEFR B1 · Regular batch · Books included",
    policySummary: "B1 for skilled work, nursing recognition, and advanced study prep in Germany.",
    booksIncluded: true,
    duration: "10–12 weeks",
    phase: "C",
    checklistSlug: "german-b1-regular",
    checklistHtml: "/specimens/coaching/german-b1-regular-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000c5",
    jsonFile: "coaching-german-b1-speaking.json",
    service: "German B1 Speaking",
    sub_service: "European Languages",
    display_order: 250,
    family: "German Language",
    displayName: "German B1 Speaking",
    shortDescription: "B1 speaking focus · Interview & fluency drills",
    policySummary: "Speaking-intensive B1 module — pair with full B1 program if writing/reading gaps exist.",
    duration: "6–8 weeks",
    phase: "C",
    checklistSlug: "german-b1-speaking",
    checklistHtml: "/specimens/coaching/german-b1-speaking-checklist.html",
  },
];

const GRAD_ADMISSIONS = [
  {
    id: "b2000001-0001-4000-8000-0000000000ca",
    jsonFile: "coaching-gre.json",
    service: "GRE",
    sub_service: "Graduate Admissions",
    display_order: 300,
    family: "GRE",
    testFamily: "GRE",
    displayName: "GRE",
    shortDescription: "ETS · Verbal, Quant, AWA · USA grad school admissions",
    policySummary: engPolicy("GRE"),
    duration: "8–12 weeks",
    idealFor: "MS/PhD applicants to USA and other programs requiring GRE General Test.",
    resources: [{ title: "GRE — Official", url: "https://www.ets.org/gre", description: "Registration, format" }],
    phase: "C",
    checklistSlug: "gre",
    checklistHtml: "/specimens/coaching/gre-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000cb",
    jsonFile: "coaching-gmat.json",
    service: "GMAT",
    sub_service: "Graduate Admissions",
    display_order: 310,
    family: "GMAT",
    testFamily: "GMAT",
    displayName: "GMAT",
    shortDescription: "GMAC · Focus Edition · MBA admissions",
    policySummary: engPolicy("GMAT Focus"),
    duration: "8–12 weeks",
    idealFor: "MBA and business master's applicants requiring GMAT.",
    resources: [{ title: "GMAT — Official", url: "https://www.mba.com/", description: "Registration, format" }],
    phase: "C",
    checklistSlug: "gmat",
    checklistHtml: "/specimens/coaching/gmat-checklist.html",
  },
  {
    id: "b2000001-0001-4000-8000-0000000000cc",
    jsonFile: "coaching-sat.json",
    service: "SAT",
    sub_service: "Graduate Admissions",
    display_order: 320,
    family: "SAT",
    testFamily: "SAT",
    displayName: "SAT",
    shortDescription: "College Board · USA undergraduate admissions",
    policySummary: engPolicy("SAT"),
    duration: "8–12 weeks",
    idealFor: "USA undergraduate applicants requiring SAT.",
    resources: [{ title: "SAT — Official", url: "https://satsuite.collegeboard.org/", description: "Registration, format" }],
    phase: "C",
    checklistSlug: "sat",
    checklistHtml: "/specimens/coaching/sat-checklist.html",
  },
];

export const COACHING_REGISTRY = [
  ...IELTS_EXISTING,
  ...IELTS_NEW,
  ...ENGLISH_PROFICIENCY,
  ...FRENCH,
  ...GERMAN,
  ...GRAD_ADMISSIONS,
];

export function registryByPhase(phase) {
  return COACHING_REGISTRY.filter((e) => e.phase === phase);
}

export function registryNeedingScaffold() {
  return COACHING_REGISTRY.filter((e) => !e.skipContent);
}
