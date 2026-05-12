// Client-side CRS improvement suggestions derived from the calculator breakdown.
// No DB / no edge call — pure heuristic that mirrors what counselors recommend.

export interface CrsSuggestion {
  area: string;
  action: string;
  potentialGain?: string;
}

function clbMin(crs: any, key: "english" | "french"): number {
  return Number(crs?.clb?.[key] ?? 0);
}

export function suggestCrsImprovements(crs: any, answers: Record<string, any>): CrsSuggestion[] {
  const out: CrsSuggestion[] = [];
  if (!crs) return out;

  const enClb = clbMin(crs, "english");
  const frClb = clbMin(crs, "french");
  const foreignYrs = Number(answers.work_experience_years ?? answers.foreign_skilled_work_years ?? 0);
  const cdnYrs = Number(answers.canadian_work_experience ?? answers.canadian_skilled_work_years ?? 0);
  const edu = String(answers.highest_education ?? "");
  const age = Number(answers.age ?? 0);

  if (enClb > 0 && enClb < 9) {
    out.push({
      area: "Language",
      action: "Retake IELTS/CELPIP to reach CLB 9 in all four modules (Listening, Reading, Writing, Speaking).",
      potentialGain: "+24 to +50 CRS (core language + transferability).",
    });
  } else if (enClb === 0) {
    out.push({
      area: "Language",
      action: "Book and take an approved English test (IELTS General, CELPIP, or PTE Core) — required for Express Entry.",
      potentialGain: "Unlocks 32–136 CRS core points.",
    });
  }

  if (!answers.provincial_nomination) {
    out.push({
      area: "Provincial Nomination",
      action: "Explore PNP streams aligned with your NOC and target province (e.g. Ontario Tech Draws, BC Tech, Alberta Express Entry).",
      potentialGain: "+600 CRS if nominated.",
    });
  }

  if (foreignYrs < 3) {
    out.push({
      area: "Foreign work experience",
      action: "Continue accumulating skilled (NOC TEER 0/1/2/3) foreign work; the transferability tier doubles past 3 years.",
      potentialGain: "Up to +25 transferability CRS.",
    });
  }

  if (cdnYrs < 1) {
    out.push({
      area: "Canadian experience",
      action: "Gain 1+ year of skilled Canadian work — opens the CEC pathway and adds transferability points.",
      potentialGain: "+35 to +80 core + transferability CRS.",
    });
  }

  const cdnEd = String(answers.canadian_education_credential ?? "");
  if (!cdnEd || cdnEd === "none") {
    out.push({
      area: "Canadian study",
      action: "A completed 1–2 year Canadian credential adds +15; a 3-year, Master's or PhD credential adds +30.",
      potentialGain: "+15 to +30 additional CRS.",
    });
  }

  if (["none", "high_school", "one_year_diploma", "two_year_diploma"].includes(edu)) {
    out.push({
      area: "Education",
      action: "Upgrading to a Bachelor's or Master's strongly boosts core education score and transferability.",
      potentialGain: "+30 to +85 core CRS.",
    });
  }

  if (frClb < 7) {
    out.push({
      area: "French",
      action: "Reach NCLC 7 in French (TEF Canada / TCF Canada) for the French-language bonus.",
      potentialGain: "+25 (with weaker English) or +50 (with CLB 5+ English).",
    });
  }

  if (!answers.job_offer) {
    out.push({
      area: "Job offer",
      action: "A valid LMIA-backed Canadian job offer in TEER 0–3 adds CRS and improves pathway options.",
      potentialGain: "+50 (TEER 1–3) or +200 (TEER 0 / senior management).",
    });
  }

  if (!answers.sibling_in_canada) {
    out.push({
      area: "Family ties",
      action: "If you have a Canadian citizen/PR sibling, declare them — only sibling relationships award the bonus.",
      potentialGain: "+15 CRS.",
    });
  }

  if (age >= 30 && age < 35) {
    out.push({
      area: "Age",
      action: "Age points start declining after 29 — submit your profile sooner to preserve full core age score.",
    });
  } else if (age >= 35) {
    out.push({
      area: "Age",
      action: "Age points decline each year past 30; compensate with stronger language and Canadian experience.",
    });
  }

  return out;
}