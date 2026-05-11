// Official CRS calculator (Express Entry).
// Faithful implementation of IRCC's CRS grids — current as of 2024.
// All inputs are tolerant of null/undefined and self-reported scores.

export type Answers = Record<string, any>;

export interface CrsBreakdown {
  total: number;
  withSpouse: boolean;
  sections: {
    core: { total: number; max: number; items: Record<string, number> };
    spouse: { total: number; max: number; items: Record<string, number> };
    transferability: { total: number; max: number; items: Record<string, number> };
    additional: { total: number; max: number; items: Record<string, number> };
  };
  clb: { english: number; french: number };
  notes: string[];
}

// ---------- CLB conversion ----------

const IELTS_CLB: { clb: number; L: number; R: number; W: number; S: number }[] = [
  { clb: 10, L: 8.5, R: 8.0, W: 7.5, S: 7.5 },
  { clb: 9,  L: 8.0, R: 7.0, W: 7.0, S: 7.0 },
  { clb: 8,  L: 7.5, R: 6.5, W: 6.5, S: 6.5 },
  { clb: 7,  L: 6.0, R: 6.0, W: 6.0, S: 6.0 },
  { clb: 6,  L: 5.5, R: 5.0, W: 5.5, S: 5.5 },
  { clb: 5,  L: 5.0, R: 4.0, W: 5.0, S: 5.0 },
  { clb: 4,  L: 4.5, R: 3.5, W: 4.0, S: 4.0 },
];

const TEF_CLB: { clb: number; L: number; R: number; W: number; S: number }[] = [
  { clb: 10, L: 316, R: 263, W: 393, S: 393 },
  { clb: 9,  L: 298, R: 248, W: 371, S: 371 },
  { clb: 8,  L: 280, R: 233, W: 349, S: 349 },
  { clb: 7,  L: 249, R: 207, W: 310, S: 310 },
  { clb: 6,  L: 217, R: 181, W: 271, S: 271 },
  { clb: 5,  L: 181, R: 151, W: 226, S: 226 },
  { clb: 4,  L: 145, R: 121, W: 181, S: 181 },
];

function ieltsBandToClb(band: number, skill: "L" | "R" | "W" | "S"): number {
  if (!Number.isFinite(band) || band <= 0) return 0;
  for (const row of IELTS_CLB) if (band >= row[skill]) return row.clb;
  return 0;
}

function celpipToClb(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.max(0, Math.min(10, Math.floor(score)));
}

function tefToClb(score: number, skill: "L" | "R" | "W" | "S"): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  for (const row of TEF_CLB) if (score >= row[skill]) return row.clb;
  return 0;
}

function skillClb(test: string, band: number, skill: "L" | "R" | "W" | "S"): number {
  const t = (test || "").toUpperCase();
  if (!Number.isFinite(band) || band <= 0) return 0;
  if (t === "IELTS") return ieltsBandToClb(band, skill);
  if (t === "CELPIP") return celpipToClb(band);
  if (t === "PTE") return ptseToClb(band, skill);
  if (t === "TEF") return tefToClb(band, skill);
  if (t === "TCF") return tcfToClb(band, skill);
  return 0;
}

function ptseToClb(score: number, _skill: "L" | "R" | "W" | "S"): number {
  // Simplified PTE Core mapping (overall).
  if (score >= 88) return 10;
  if (score >= 84) return 9;
  if (score >= 76) return 8;
  if (score >= 68) return 7;
  if (score >= 60) return 6;
  if (score >= 51) return 5;
  if (score >= 41) return 4;
  return 0;
}
function tcfToClb(score: number, _skill: "L" | "R" | "W" | "S"): number {
  if (score >= 549) return 10;
  if (score >= 524) return 9;
  if (score >= 499) return 8;
  if (score >= 453) return 7;
  if (score >= 406) return 6;
  if (score >= 369) return 5;
  if (score >= 331) return 4;
  return 0;
}

function minClbAcross(a: Answers, prefix: "english" | "french"): { clb: number; perSkill: Record<string, number> } {
  const test = a[`${prefix}_test`];
  const overall = Number(a[`${prefix}_overall`] ?? 0);
  const skills: ("L" | "R" | "W" | "S")[] = ["L", "R", "W", "S"];
  const map = { L: "listening", R: "reading", W: "writing", S: "speaking" } as const;
  const perSkill: Record<string, number> = {};
  let min = Infinity;
  for (const s of skills) {
    const raw = Number(a[`${prefix}_${map[s]}`] ?? overall ?? 0);
    const c = skillClb(test, raw, s);
    perSkill[map[s]] = c;
    if (c < min) min = c;
  }
  return { clb: Number.isFinite(min) ? min : 0, perSkill };
}

// ---------- CRS grids ----------

// Age (single without spouse) and (with spouse) shown as [single, withSpouse]
const AGE_TABLE: Record<number, [number, number]> = {
  17: [0, 0], 18: [99, 90], 19: [105, 95], 20: [110, 100], 21: [110, 100], 22: [110, 100], 23: [110, 100], 24: [110, 100], 25: [110, 100], 26: [110, 100], 27: [110, 100], 28: [110, 100], 29: [110, 100],
  30: [105, 95], 31: [99, 90], 32: [94, 85], 33: [88, 80], 34: [83, 75], 35: [77, 70], 36: [72, 65], 37: [66, 60], 38: [61, 55], 39: [55, 50],
  40: [50, 45], 41: [39, 35], 42: [28, 25], 43: [17, 15], 44: [6, 5], 45: [0, 0],
};
function ageScore(age: number, withSpouse: boolean): number {
  if (!Number.isFinite(age)) return 0;
  if (age < 18) return 0;
  if (age >= 45) return 0;
  const k = Math.min(45, Math.max(17, Math.floor(age)));
  const row = AGE_TABLE[k] ?? [0, 0];
  return withSpouse ? row[1] : row[0];
}

// Education — core (single, withSpouse)
const EDU_CORE: Record<string, [number, number]> = {
  none: [0, 0],
  high_school: [30, 28],
  one_year_diploma: [90, 84],
  two_year_diploma: [98, 91],
  bachelors: [120, 112],
  two_or_more_credentials: [128, 119],
  masters: [135, 126],
  phd: [150, 140],
};
function eduScore(edu: string, withSpouse: boolean): number {
  const row = EDU_CORE[edu] ?? [0, 0];
  return withSpouse ? row[1] : row[0];
}
// Spouse education contribution
const EDU_SPOUSE: Record<string, number> = {
  none: 0, high_school: 2, one_year_diploma: 6, two_year_diploma: 7,
  bachelors: 8, two_or_more_credentials: 9, masters: 10, phd: 10,
};

// First official language — per-skill by CLB, score per skill
const LANG_FIRST: Record<number, [number, number]> = {
  0:[0,0], 1:[0,0], 2:[0,0], 3:[0,0],
  4: [6, 6], 5: [6, 6],
  6: [9, 8], 7: [17, 16], 8: [23, 22], 9: [31, 29], 10: [34, 32],
};
function firstLangScore(clbPerSkill: Record<string, number>, withSpouse: boolean): number {
  let sum = 0;
  for (const s of ["listening","reading","writing","speaking"]) {
    const clb = Math.min(10, Math.max(0, clbPerSkill[s] ?? 0));
    const row = LANG_FIRST[clb] ?? [0, 0];
    sum += withSpouse ? row[1] : row[0];
  }
  return sum;
}
// Second official language per-skill
function secondLangScore(clbPerSkill: Record<string, number>, withSpouse: boolean): number {
  let sum = 0;
  for (const s of ["listening","reading","writing","speaking"]) {
    const clb = clbPerSkill[s] ?? 0;
    let pts = 0;
    if (clb >= 9) pts = 6;
    else if (clb >= 7) pts = 3;
    else if (clb >= 5) pts = 1;
    sum += withSpouse ? Math.min(pts, 5) : pts;
  }
  return Math.min(sum, withSpouse ? 22 : 24);
}

// Canadian work experience
const CDN_WORK: Record<number, [number, number]> = {
  0: [0, 0], 1: [40, 35], 2: [53, 46], 3: [64, 56], 4: [72, 63], 5: [80, 70],
};
function cdnWorkScore(years: number, withSpouse: boolean): number {
  const y = Math.max(0, Math.min(5, Math.floor(years || 0)));
  const row = CDN_WORK[y] ?? [80, 70];
  return withSpouse ? row[1] : row[0];
}

// Spouse: language (first) per-skill — max 5 per skill, cap 20
function spouseLangScore(perSkill: Record<string, number>): number {
  let sum = 0;
  for (const s of ["listening","reading","writing","speaking"]) {
    const clb = perSkill[s] ?? 0;
    let pts = 0;
    if (clb >= 9) pts = 5;
    else if (clb >= 7) pts = 3;
    else if (clb >= 5) pts = 1;
    sum += pts;
  }
  return Math.min(sum, 20);
}
function spouseCdnWorkScore(years: number): number {
  const y = Math.max(0, Math.min(5, Math.floor(years || 0)));
  return [0, 5, 7, 8, 9, 10][y];
}

// Skill transferability ---
// Education + Language
function edLangPoints(edu: string, clb: number): number {
  const tier = ["bachelors","two_or_more_credentials","masters","phd"].includes(edu) ? "post"
              : ["one_year_diploma","two_year_diploma"].includes(edu) ? "post1plus" : "none";
  if (tier === "none") return 0;
  if (clb >= 9) return tier === "post" ? 50 : 25;
  if (clb >= 7) return tier === "post" ? 25 : 13;
  return 0;
}
function edCdnWorkPoints(edu: string, cdnYears: number): number {
  const tier = ["bachelors","two_or_more_credentials","masters","phd"].includes(edu) ? "post"
              : ["one_year_diploma","two_year_diploma"].includes(edu) ? "post1plus" : "none";
  if (tier === "none" || cdnYears < 1) return 0;
  if (cdnYears >= 2) return tier === "post" ? 50 : 25;
  return tier === "post" ? 25 : 13;
}
function foreignWorkLangPoints(foreignYears: number, clb: number): number {
  if (foreignYears < 1) return 0;
  const cap = foreignYears >= 3 ? 2 : 1;
  if (clb >= 9) return cap === 2 ? 50 : 25;
  if (clb >= 7) return cap === 2 ? 25 : 13;
  return 0;
}
function foreignCdnWorkPoints(foreignYears: number, cdnYears: number): number {
  if (foreignYears < 1 || cdnYears < 1) return 0;
  const cap = foreignYears >= 3 ? 2 : 1;
  if (cdnYears >= 2) return cap === 2 ? 50 : 25;
  return cap === 2 ? 25 : 13;
}
function certQualLangPoints(hasCert: boolean, clb: number): number {
  if (!hasCert) return 0;
  if (clb >= 7) return 50;
  if (clb >= 5) return 25;
  return 0;
}

// Additional points
function additionalPoints(a: Answers, clbEn: number, clbFr: number): { total: number; items: Record<string, number> } {
  const items: Record<string, number> = {};
  // Provincial nomination
  if (a.provincial_nomination) items.provincial_nomination = 600;
  // Job offer
  if (a.job_offer) {
    items.job_offer = String(a.noc_teer).toUpperCase() === "TEER 0" ? 200 : 50;
  }
  // Canadian education
  const ce = a.canadian_education_credential;
  if (ce === "1_or_2_year") items.canadian_education = 15;
  else if (ce === "3_year_or_more" || ce === "masters_or_phd") items.canadian_education = 30;
  // Sibling in Canada
  if (a.sibling_in_canada) items.sibling_in_canada = 15;
  // French bonus: strong French (CLB7+) and weaker English (CLB4 or less) = 25; CLB5+ English = 50
  if (clbFr >= 7) {
    items.french_bonus = clbEn >= 5 ? 50 : 25;
  }
  const total = Object.values(items).reduce((s, n) => s + n, 0);
  return { total: Math.min(total, 600), items };
}

// ---------- Public entry ----------

export function calculateCrs(a: Answers): CrsBreakdown {
  const notes: string[] = [];
  const married = ["married", "common_law"].includes(String(a.marital_status));
  const withSpouse = married && !!a.spouse_accompanying;

  const en = minClbAcross(a, "english");
  const fr = minClbAcross(a, "french");
  // Choose first/second official language (better one is "first")
  const enOverall = Math.min(...["listening","reading","writing","speaking"].map((s) => en.perSkill[s] ?? 0));
  const frOverall = Math.min(...["listening","reading","writing","speaking"].map((s) => fr.perSkill[s] ?? 0));
  const englishIsFirst = enOverall >= frOverall;
  const firstSkills = englishIsFirst ? en.perSkill : fr.perSkill;
  const secondSkills = englishIsFirst ? fr.perSkill : en.perSkill;
  const firstClb = englishIsFirst ? enOverall : frOverall;

  // Core
  const age = Number(a.age ?? 0);
  const edu = String(a.highest_education ?? "none");
  const cdnYears = Math.max(0, Math.floor(Number(a.canadian_work_experience ?? 0)));
  const foreignYears = Math.max(0, Math.floor(Number(a.work_experience_years ?? 0)));

  const coreItems = {
    age: ageScore(age, withSpouse),
    education: eduScore(edu, withSpouse),
    first_language: firstLangScore(firstSkills, withSpouse),
    second_language: secondLangScore(secondSkills, withSpouse),
    canadian_work: cdnWorkScore(cdnYears, withSpouse),
  };
  const coreTotal = Object.values(coreItems).reduce((s, n) => s + n, 0);

  // Spouse
  const spouseItems: Record<string, number> = { education: 0, language: 0, canadian_work: 0 };
  if (withSpouse) {
    spouseItems.education = EDU_SPOUSE[String(a.spouse_education ?? "none")] ?? 0;
    const spouseEnTest = a.spouse_english_test ?? a.english_test ?? "IELTS";
    const spouseOverall = Number(a.spouse_english_overall ?? 0);
    const spouseSkills = { listening: spouseOverall, reading: spouseOverall, writing: spouseOverall, speaking: spouseOverall };
    const sCLB: Record<string, number> = {};
    for (const s of Object.keys(spouseSkills)) {
      sCLB[s] = skillClb(spouseEnTest, (spouseSkills as any)[s], "L");
    }
    spouseItems.language = spouseLangScore(sCLB);
    spouseItems.canadian_work = spouseCdnWorkScore(Number(a.spouse_canadian_work_years ?? 0));
  }
  const spouseTotal = Object.values(spouseItems).reduce((s, n) => s + n, 0);

  // Transferability
  const transItems = {
    education_language: edLangPoints(edu, firstClb),
    education_cdn_work: edCdnWorkPoints(edu, cdnYears),
    foreign_work_language: foreignWorkLangPoints(foreignYears, firstClb),
    foreign_work_cdn_work: foreignCdnWorkPoints(foreignYears, cdnYears),
    certificate_qualification: certQualLangPoints(!!a.certificate_of_qualification, firstClb),
  };
  const transTotal = Math.min(100, Object.values(transItems).reduce((s, n) => s + n, 0));

  // Additional
  const additional = additionalPoints(a, enOverall, frOverall);

  const total = coreTotal + spouseTotal + transTotal + additional.total;

  if (firstClb < 7) notes.push("Most Express Entry programs require first-language CLB 7+.");
  if (foreignYears < 1 && cdnYears < 1) notes.push("At least 1 year of skilled work experience is required for FSW/CEC.");
  if (age < 18 || age >= 45) notes.push("Age points are 0 outside 18–44.");

  return {
    total,
    withSpouse,
    sections: {
      core: { total: coreTotal, max: withSpouse ? 460 : 500, items: coreItems },
      spouse: { total: spouseTotal, max: 40, items: spouseItems },
      transferability: { total: transTotal, max: 100, items: transItems },
      additional: { total: additional.total, max: 600, items: additional.items },
    },
    clb: { english: enOverall, french: frOverall },
    notes,
  };
}
