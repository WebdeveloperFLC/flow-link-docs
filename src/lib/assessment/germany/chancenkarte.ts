import type { ChancenkarteResult, ChancenkarteRule, ChancenkarteTier, ShortageOccupation } from "./types";

const CEFR_ORDER = ["none", "A1", "A2", "B1", "B2", "C1", "C2"];
const cefrIdx = (v: unknown) => CEFR_ORDER.indexOf(String(v ?? "none"));

function matchClause(answers: Record<string, any>, when: Record<string, unknown>): boolean {
  for (const [k, expected] of Object.entries(when)) {
    // Suffix operators: _gte / _lte / _in
    if (k.endsWith("_gte")) {
      const key = k.slice(0, -4);
      const a = Number(answers[key]);
      if (!Number.isFinite(a) || a < Number(expected)) return false;
      continue;
    }
    if (k.endsWith("_lte")) {
      const key = k.slice(0, -4);
      const a = Number(answers[key]);
      if (!Number.isFinite(a) || a > Number(expected)) return false;
      continue;
    }
    if (k.endsWith("_in")) {
      const key = k.slice(0, -3);
      const arr = Array.isArray(expected) ? expected : [];
      const a = answers[key];
      if (Array.isArray(a)) {
        if (!a.some((x) => arr.includes(x))) return false;
      } else if (!arr.includes(a)) return false;
      continue;
    }
    const got = answers[k];
    if (Array.isArray(expected)) {
      if (!expected.includes(got)) return false;
    } else if (typeof expected === "boolean") {
      const truthy = got === true || got === "yes" || got === "true";
      if (truthy !== expected) return false;
    } else if (got !== expected) {
      return false;
    }
  }
  return true;
}

function bestTier(answers: Record<string, any>, tiers: ChancenkarteTier[]): { points: number; label: string } | null {
  let best: { points: number; label: string } | null = null;
  for (const t of tiers) {
    if (typeof t.points !== "number") continue;
    const when = t.when ?? {};
    if (!matchClause(answers, when)) continue;
    if (!best || t.points > best.points) {
      best = { points: t.points, label: t.label ?? "" };
    }
  }
  return best;
}

export function detectShortageOccupation(
  answers: Record<string, any>,
  shortage: ShortageOccupation[],
): { match: ShortageOccupation | null; label: string | null } {
  if (answers.de_demand_occupation === true) {
    return { match: null, label: "Self-reported shortage occupation" };
  }
  const occ = String(answers.de_occupation ?? "").toLowerCase().trim();
  if (!occ) return { match: null, label: null };
  for (const s of shortage) {
    if (!s.is_active) continue;
    for (const kw of s.keywords ?? []) {
      if (kw && occ.includes(String(kw).toLowerCase())) return { match: s, label: s.label };
    }
    if (s.label && occ.includes(s.label.toLowerCase())) return { match: s, label: s.label };
  }
  return { match: null, label: null };
}

function basePass(answers: Record<string, any>): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  const recognition = ["full", "partial"].includes(String(answers.de_recognition_status));
  const anabin = ["H+", "H+-"].includes(String(answers.de_anabin_status));
  const vocational = answers.de_vocational_qualification === true && Number(answers.de_vocational_duration_years ?? 0) >= 2;
  if (!(recognition || anabin || vocational)) {
    failures.push("No recognised university degree or vocational qualification (>= 2 years).");
  }
  const funds = Number(answers.de_blocked_account_eur ?? 0) >= 12324 || answers.de_sponsor_support === true;
  if (!funds) {
    failures.push("Proof of funds missing — blocked account >= €12,324 or formal sponsor required.");
  }
  if (answers.de_passport_valid !== true) {
    failures.push("Valid passport (>= 12 months) required.");
  }
  const germanA1 = cefrIdx(answers.de_german_level) >= cefrIdx("A1");
  const englishB2 = cefrIdx(answers.de_english_cefr) >= cefrIdx("B2") || Number(answers.de_english_score ?? 0) >= 6;
  if (!(germanA1 || englishB2)) {
    failures.push("Language baseline missing — German A1 or English B2 required.");
  }
  return { ok: failures.length === 0, failures };
}

export function scoreChancenkarte(
  answersIn: Record<string, any>,
  rules: ChancenkarteRule[],
  shortage: ShortageOccupation[] = [],
): ChancenkarteResult {
  // Inject derived shortage flag for the matcher.
  const detected = detectShortageOccupation(answersIn, shortage);
  const answers = { ...answersIn };
  if (detected.match || detected.label) answers.de_demand_occupation = true;

  const factors = rules.filter((r) => r.is_active && r.factor !== "pass_threshold");
  const thresholdRule = rules.find((r) => r.factor === "pass_threshold");
  const threshold = Number(thresholdRule?.tiers?.[0]?.threshold ?? 6);

  const factorResults = factors
    .sort((a, b) => a.order_index - b.order_index)
    .map((r) => {
      const best = bestTier(answers, r.tiers ?? []);
      const points = best ? Math.min(best.points, r.max_points || best.points) : 0;
      return {
        factor: r.factor,
        label: r.label,
        points,
        max: r.max_points,
        reason: best?.label ?? "—",
      };
    });

  const total = factorResults.reduce((s, f) => s + f.points, 0);
  const { ok: basePassOk, failures: baseFailures } = basePass(answers);
  const notes: string[] = [];
  if (detected.label) notes.push(`Detected shortage match: ${detected.label}`);

  return {
    total,
    threshold,
    passes: total >= threshold && basePassOk,
    factors: factorResults,
    basePass: basePassOk,
    baseFailures,
    notes,
  };
}

export { CEFR_ORDER, cefrIdx };
