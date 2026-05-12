// Federal Skilled Worker — 67-point eligibility grid (IRCC).
// Independent of CRS. Pass mark = 67.

type Answers = Record<string, any>;

export interface Fsw67Result {
  total: number;
  pass: boolean;
  sections: {
    language: { total: number; max: 28 };
    education: { total: number; max: 25 };
    experience: { total: number; max: 15 };
    age: { total: number; max: 12 };
    arranged_employment: { total: number; max: 10 };
    adaptability: { total: number; max: 10 };
  };
  notes: string[];
}

// IELTS bands → CLB per skill (mirrors calculator.ts table but kept local to avoid import cycle).
const IELTS_CLB: { clb: number; L: number; R: number; W: number; S: number }[] = [
  { clb: 10, L: 8.5, R: 8.0, W: 7.5, S: 7.5 },
  { clb: 9,  L: 8.0, R: 7.0, W: 7.0, S: 7.0 },
  { clb: 8,  L: 7.5, R: 6.5, W: 6.5, S: 6.5 },
  { clb: 7,  L: 6.0, R: 6.0, W: 6.0, S: 6.0 },
  { clb: 6,  L: 5.5, R: 5.0, W: 5.5, S: 5.5 },
  { clb: 5,  L: 5.0, R: 4.0, W: 5.0, S: 5.0 },
  { clb: 4,  L: 4.5, R: 3.5, W: 4.0, S: 4.0 },
];

function ieltsToClb(band: number, skill: "L"|"R"|"W"|"S"): number {
  if (!Number.isFinite(band) || band <= 0) return 0;
  for (const row of IELTS_CLB) if (band >= row[skill]) return row.clb;
  return 0;
}

function clbForSkill(test: string, raw: number, skill: "L"|"R"|"W"|"S"): number {
  const t = (test || "").toUpperCase();
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (t === "IELTS") return ieltsToClb(raw, skill);
  if (t === "CELPIP") return Math.max(0, Math.min(10, Math.floor(raw)));
  // PTE / TEF / TCF: rely on calculator's mapping at a later stage; here keep simple overall conversion.
  return 0;
}

function minClb(a: Answers, lang: "english" | "french"): number {
  const test = a[`${lang}_test`];
  const skills: ("L"|"R"|"W"|"S")[] = ["L","R","W","S"];
  const map = { L: "listening", R: "reading", W: "writing", S: "speaking" } as const;
  let min = Infinity;
  for (const s of skills) {
    const raw = Number(a[`${lang}_${map[s]}`] ?? 0);
    const c = clbForSkill(test, raw, s);
    if (c < min) min = c;
  }
  return Number.isFinite(min) ? min : 0;
}

// Language: max 28 (24 first + 4 second).
function languagePoints(firstClb: number, secondClb: number): number {
  let first = 0;
  if (firstClb >= 9) first = 24;
  else if (firstClb >= 8) first = 20;
  else if (firstClb >= 7) first = 16;
  // <7 = 0 — fails FSW minimum.
  const second = secondClb >= 5 ? 4 : 0;
  return Math.min(28, first + second);
}

const EDU_FSW: Record<string, number> = {
  none: 0,
  high_school: 5,
  one_year_diploma: 15,
  two_year_diploma: 19,
  bachelors: 21,
  two_or_more_credentials: 22,
  masters: 23,
  phd: 25,
};

function experiencePoints(years: number): number {
  // IRCC FSW grid for foreign work experience.
  if (years >= 6) return 15;
  if (years >= 4) return 13;
  if (years >= 2) return 11;
  if (years >= 1) return 9;
  return 0;
}

function agePoints(age: number): number {
  if (!Number.isFinite(age) || age < 18) return 0;
  if (age <= 35) return 12;
  if (age === 36) return 11;
  if (age === 37) return 10;
  if (age === 38) return 9;
  if (age === 39) return 8;
  if (age === 40) return 7;
  if (age === 41) return 6;
  if (age === 42) return 5;
  if (age === 43) return 4;
  if (age === 44) return 3;
  if (age === 45) return 2;
  if (age === 46) return 1;
  return 0;
}

function adaptabilityPoints(a: Answers, withSpouse: boolean): number {
  let pts = 0;
  if (a.sibling_in_canada) pts += 5;
  if (Number(a.canadian_work_experience ?? 0) >= 1) pts += 10;
  if (a.canadian_education_credential && a.canadian_education_credential !== "none") pts += 5;
  if (withSpouse && Number(a.spouse_english_overall ?? 0) >= 4) pts += 5;
  return Math.min(10, pts);
}

export function calculateFsw67(a: Answers): Fsw67Result {
  const en = minClb(a, "english");
  const fr = minClb(a, "french");
  const firstClb = Math.max(en, fr);
  const secondClb = Math.min(en, fr);

  const language = languagePoints(firstClb, secondClb);
  const education = EDU_FSW[String(a.highest_education ?? "none")] ?? 0;
  const foreignYears = Math.max(0, Math.floor(Number(a.work_experience_years ?? 0)));
  const experience = experiencePoints(foreignYears);
  const age = agePoints(Math.floor(Number(a.age ?? 0)));
  const arranged = a.job_offer ? 10 : 0;

  const married = ["married", "common_law"].includes(String(a.marital_status));
  const withSpouse = married && !!a.spouse_accompanying;
  const adaptability = adaptabilityPoints(a, withSpouse);

  const total = language + education + experience + age + arranged + adaptability;
  const notes: string[] = [];
  if (firstClb < 7) notes.push("FSW requires CLB 7 in all four abilities of the first official language.");
  if (foreignYears < 1) notes.push("FSW requires at least 1 year of continuous foreign skilled work experience.");
  if (!a.foreign_work_continuous_1yr) notes.push("Confirm at least 1 continuous year in the same NOC occupation.");

  return {
    total,
    pass: total >= 67 && firstClb >= 7 && foreignYears >= 1,
    sections: {
      language: { total: language, max: 28 },
      education: { total: education, max: 25 },
      experience: { total: experience, max: 15 },
      age: { total: age, max: 12 },
      arranged_employment: { total: arranged, max: 10 },
      adaptability: { total: adaptability, max: 10 },
    },
    notes,
  };
}