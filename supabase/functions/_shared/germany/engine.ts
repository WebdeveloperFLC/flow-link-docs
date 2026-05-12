// Germany Chancenkarte + pathway engine (Deno-compatible mirror of src/lib/assessment/germany).
// Keep this in sync with the client-side engine.

export type Tier = { when?: Record<string, unknown>; threshold?: number; points?: number; label?: string };
export type Rule = { factor: string; label: string; tiers: Tier[]; max_points: number; order_index: number; is_active: boolean };
export type Shortage = { label: string; keywords: string[]; is_active: boolean };

const CEFR = ["none", "A1", "A2", "B1", "B2", "C1", "C2"];
const cefrIdx = (v: unknown) => CEFR.indexOf(String(v ?? "none"));
const EDU = ["none", "secondary", "diploma", "bachelor", "master", "phd"];
const eduIdx = (v: unknown) => EDU.indexOf(String(v ?? "none"));

function ageFromDob(dob: unknown): number {
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return 0;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a >= 0 && a < 120 ? a : 0;
}

function matchClause(answers: Record<string, any>, when: Record<string, unknown>): boolean {
  for (const [k, expected] of Object.entries(when)) {
    if (k.endsWith("_gte")) { const a = Number(answers[k.slice(0,-4)]); if (!Number.isFinite(a) || a < Number(expected)) return false; continue; }
    if (k.endsWith("_lte")) { const a = Number(answers[k.slice(0,-4)]); if (!Number.isFinite(a) || a > Number(expected)) return false; continue; }
    if (k.endsWith("_in")) {
      const arr = Array.isArray(expected) ? expected : [];
      const a = answers[k.slice(0,-3)];
      if (Array.isArray(a)) { if (!a.some((x: unknown) => arr.includes(x))) return false; }
      else if (!arr.includes(a)) return false;
      continue;
    }
    const got = answers[k];
    if (Array.isArray(expected)) { if (!expected.includes(got)) return false; }
    else if (typeof expected === "boolean") { const t = got === true || got === "yes" || got === "true"; if (t !== expected) return false; }
    else if (got !== expected) return false;
  }
  return true;
}

function bestTier(answers: Record<string, any>, tiers: Tier[]): { points: number; label: string } | null {
  let best: { points: number; label: string } | null = null;
  for (const t of tiers) {
    if (typeof t.points !== "number") continue;
    if (!matchClause(answers, t.when ?? {})) continue;
    if (!best || t.points > best.points) best = { points: t.points, label: t.label ?? "" };
  }
  return best;
}

function detectShortage(answers: Record<string, any>, list: Shortage[]): boolean {
  if (answers.de_demand_occupation === true) return true;
  const occ = String(answers.de_occupation ?? "").toLowerCase();
  if (!occ) return false;
  for (const s of list) {
    if (!s.is_active) continue;
    for (const kw of s.keywords ?? []) if (kw && occ.includes(String(kw).toLowerCase())) return true;
    if (s.label && occ.includes(s.label.toLowerCase())) return true;
  }
  return false;
}

function basePass(answers: Record<string, any>) {
  const failures: string[] = [];
  const rec = ["full","partial"].includes(String(answers.de_recognition_status));
  const anabin = ["H+","H+-"].includes(String(answers.de_anabin_status));
  const voc = answers.de_vocational_qualification === true && Number(answers.de_vocational_duration_years ?? 0) >= 2;
  if (!(rec || anabin || voc)) failures.push("No recognised degree or vocational qualification (>= 2 years).");
  const funds = Number(answers.de_blocked_account_eur ?? 0) >= 12324 || answers.de_sponsor_support === true;
  if (!funds) failures.push("Proof of funds missing — blocked account >= 12,324 EUR or sponsor required.");
  if (answers.de_passport_valid !== true) failures.push("Valid passport (>= 12 months) required.");
  const lang = cefrIdx(answers.de_german_level) >= cefrIdx("A1") ||
               cefrIdx(answers.de_english_cefr) >= cefrIdx("B2") ||
               Number(answers.de_english_score ?? 0) >= 6;
  if (!lang) failures.push("Language baseline missing — German A1 or English B2 required.");
  return failures;
}

export function scoreChancenkarte(answersIn: Record<string, any>, rules: Rule[], shortage: Shortage[]) {
  const answers = { ...answersIn };
  if (detectShortage(answersIn, shortage)) answers.de_demand_occupation = true;
  const factors = rules.filter((r) => r.is_active && r.factor !== "pass_threshold");
  const tRule = rules.find((r) => r.factor === "pass_threshold");
  const threshold = Number(tRule?.tiers?.[0]?.threshold ?? 6);
  const factorResults = factors.sort((a,b) => a.order_index - b.order_index).map((r) => {
    const best = bestTier(answers, r.tiers ?? []);
    const pts = best ? Math.min(best.points, r.max_points || best.points) : 0;
    return { factor: r.factor, label: r.label, points: pts, max: r.max_points, reason: best?.label ?? "—" };
  });
  const total = factorResults.reduce((s,f) => s + f.points, 0);
  const baseFailures = basePass(answers);
  return { total, threshold, factors: factorResults, basePass: baseFailures.length === 0, baseFailures, passes: total >= threshold && baseFailures.length === 0 };
}

export function evaluatePathways(answers: Record<string, any>, ck: ReturnType<typeof scoreChancenkarte>) {
  const out: { code: string; label: string; status: "eligible"|"partial"|"not_eligible"; reasons: string[]; gaps: string[] }[] = [];
  const status = (gaps: string[], reasons: string[]) => gaps.length === 0 ? "eligible" : gaps.length <= 2 ? "partial" : "not_eligible";

  // Opportunity Card
  {
    const reasons: string[] = []; const gaps: string[] = [...ck.baseFailures];
    if (ck.passes) reasons.push(`Chancenkarte ${ck.total}/${ck.threshold} pts`);
    else if (ck.basePass) gaps.push(`Need ${ck.threshold} Chancenkarte points (currently ${ck.total}).`);
    out.push({ code: "de_chancenkarte", label: "Opportunity Card (Chancenkarte)", status: status(gaps, reasons), reasons, gaps });
  }
  // Job Seeker
  {
    const reasons: string[] = []; const gaps: string[] = [];
    if (eduIdx(answers.de_highest_education) >= eduIdx("bachelor")) reasons.push("Bachelor+ degree.");
    else gaps.push("Bachelor degree required.");
    if (["full","partial"].includes(String(answers.de_recognition_status)) || ["H+","H+-"].includes(String(answers.de_anabin_status))) reasons.push("Recognition in place.");
    else gaps.push("Start ZAB Statement of Comparability.");
    if (Number(answers.de_blocked_account_eur ?? 0) >= 12324 || answers.de_sponsor_support === true) reasons.push("Proof of funds.");
    else gaps.push("Proof of funds required.");
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    out.push({ code: "de_job_seeker", label: "Job Seeker Visa", status: status(gaps, reasons), reasons, gaps });
  }
  // Ausbildung
  {
    const reasons: string[] = []; const gaps: string[] = [];
    if (cefrIdx(answers.de_german_level) >= cefrIdx("B1")) reasons.push("German >= B1.");
    else gaps.push("German B1 required.");
    if (answers.de_ausbildung_offer === true) reasons.push("Ausbildung contract confirmed.");
    else gaps.push("Confirmed Ausbildung contract needed.");
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    out.push({ code: "de_ausbildung", label: "Ausbildung", status: status(gaps, reasons), reasons, gaps });
  }
  // Skilled Worker
  {
    const reasons: string[] = []; const gaps: string[] = [];
    if (answers.de_job_offer === true) reasons.push("Qualified job offer.");
    else gaps.push("Qualified job offer required.");
    if (["full","partial"].includes(String(answers.de_recognition_status)) || answers.de_vocational_qualification === true) reasons.push("Recognition / vocational in place.");
    else gaps.push("Recognised qualification required.");
    if (cefrIdx(answers.de_german_level) >= cefrIdx("B1")) reasons.push("German >= B1.");
    else gaps.push("German B1 typically required.");
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    out.push({ code: "de_skilled_worker", label: "Skilled Worker", status: status(gaps, reasons), reasons, gaps });
  }
  // Blue Card
  {
    const reasons: string[] = []; const gaps: string[] = [];
    const salary = Number(answers.de_bluecard_salary_eur ?? answers.de_annual_salary_eur ?? 0);
    const rec = String(answers.de_recognition_status) === "full" || String(answers.de_anabin_status) === "H+";
    if (rec) reasons.push("Recognised university degree.");
    else gaps.push("Fully recognised university degree required.");
    if (salary >= 48300) reasons.push("Salary meets standard threshold.");
    else if (salary >= 43759.8) reasons.push("Salary meets shortage threshold.");
    else gaps.push("Salary below 43,759.80 EUR threshold.");
    if (Number(answers.de_bluecard_contract_months ?? 0) >= 6) reasons.push("Contract >= 6 months.");
    else gaps.push("Contract >= 6 months required.");
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    out.push({ code: "de_blue_card", label: "EU Blue Card", status: status(gaps, reasons), reasons, gaps });
  }
  return out;
}

export function buildRecommendation(answers: Record<string, any>, ck: ReturnType<typeof scoreChancenkarte>, pathways: ReturnType<typeof evaluatePathways>) {
  const eligible = pathways.filter((p) => p.status === "eligible");
  const partial = pathways.filter((p) => p.status === "partial");
  const overall = eligible.length ? "likely_eligible" : partial.length ? "partial" : "low";
  const bestPathway = eligible[0]?.code ?? (ck.passes ? "de_chancenkarte" : partial[0]?.code ?? null);
  const missing = new Set<string>();
  ck.baseFailures.forEach((x) => missing.add(x));
  pathways.forEach((p) => p.gaps.forEach((g) => missing.add(g)));
  const improvements: { area: string; action: string }[] = [];
  const german = String(answers.de_german_level ?? "none");
  if (cefrIdx(german) < cefrIdx("B2")) improvements.push({ area: "German language", action: `Reach ${cefrIdx(german) < cefrIdx("B1") ? "B1" : "B2"}.` });
  if (!["full","partial"].includes(String(answers.de_recognition_status)) && answers.de_vocational_qualification !== true) improvements.push({ area: "Qualification recognition", action: "Submit ZAB Statement of Comparability (Anabin)." });
  if (Number(answers.de_skilled_experience_years ?? 0) < 2) improvements.push({ area: "Work experience", action: "Document >= 2 years skilled work in last 7 years." });
  return { overall, bestPathway, missingRequirements: Array.from(missing), suggestedImprovements: improvements };
}

export function evaluateGermany(answers: Record<string, any>, rules: Rule[], shortage: Shortage[]) {
  const chancenkarte = scoreChancenkarte(answers, rules, shortage);
  const pathways = evaluatePathways(answers, chancenkarte);
  const recommendation = buildRecommendation(answers, chancenkarte, pathways);
  return { chancenkarte, pathways, recommendation };
}
