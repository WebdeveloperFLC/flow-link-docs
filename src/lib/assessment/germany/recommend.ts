import type { ChancenkarteResult, DePathwayResult, DeRecommendation } from "./types";
import { cefrIdx } from "./chancenkarte";

const NEXT_CEFR: Record<string, string> = { none: "A1", A1: "A2", A2: "B1", B1: "B2", B2: "C1", C1: "C2" };

export function buildRecommendation(
  answers: Record<string, any>,
  chancenkarte: ChancenkarteResult,
  pathways: DePathwayResult[],
): DeRecommendation {
  const eligible = pathways.filter((p) => p.status === "eligible");
  const partial = pathways.filter((p) => p.status === "partial");

  const overall: DeRecommendation["overall"] =
    eligible.length > 0 ? "likely_eligible" : partial.length > 0 ? "partial" : "low";

  const best =
    eligible[0]?.code ??
    (chancenkarte.passes ? "de_chancenkarte" : partial[0]?.code ?? null);

  // Missing requirements (deduped, prioritised by Chancenkarte base failures + pathway gaps)
  const missing = new Set<string>();
  chancenkarte.baseFailures.forEach((x) => missing.add(x));
  pathways.forEach((p) => p.gaps.forEach((g) => missing.add(g)));

  // Suggested improvements (Chancenkarte impact)
  const improvements: DeRecommendation["suggestedImprovements"] = [];
  const german = String(answers.de_german_level ?? "none");
  if (cefrIdx(german) < cefrIdx("B2")) {
    const target = cefrIdx(german) < cefrIdx("B1") ? "B1" : "B2";
    improvements.push({
      area: "German language",
      action: `Reach ${target} — opens up Skilled Worker and Ausbildung and adds Chancenkarte points.`,
      impactPts: target === "B2" ? 1 : 2,
    });
  }
  const english = String(answers.de_english_cefr ?? "");
  if (cefrIdx(english) < cefrIdx("B2") && Number(answers.de_english_score ?? 0) < 6) {
    improvements.push({ area: "English language", action: "IELTS 6.0+ / English B2 adds 1 Chancenkarte point.", impactPts: 1 });
  }
  if (!["full", "partial"].includes(String(answers.de_recognition_status)) && answers.de_vocational_qualification !== true) {
    improvements.push({ area: "Qualification recognition", action: "Submit ZAB Statement of Comparability (Anabin) — up to 4 points and unlocks Skilled Worker.", impactPts: 4 });
  }
  if (Number(answers.de_skilled_experience_years ?? 0) < 2) {
    improvements.push({ area: "Work experience", action: "Document ≥ 2 years of skilled work in the last 7 years — adds 2 points." });
  }
  if (Number(answers.de_blocked_account_eur ?? 0) < 12324 && answers.de_sponsor_support !== true) {
    improvements.push({ area: "Funds", action: "Open a German blocked account (Sperrkonto) with ≥ €12,324 or secure a sponsor." });
  }

  // Pathway notes
  const pathwayNotes: Record<string, string> = {};
  for (const p of pathways) {
    pathwayNotes[p.code] =
      p.status === "eligible"
        ? "You appear eligible — proceed with document collection."
        : p.status === "partial"
          ? `Close to eligible — ${p.gaps[0] ?? "review missing items"}.`
          : "Not eligible right now — see missing requirements.";
  }

  // Language recommendation
  const languageRecommendation =
    cefrIdx(german) < cefrIdx("B1") ? "B1"
    : cefrIdx(german) < cefrIdx("B2") ? "B2"
    : null;

  // Next actions checklist
  const nextActions: string[] = [];
  if (answers.de_passport_valid !== true) nextActions.push("Renew passport (valid ≥ 12 months).");
  if (!["full"].includes(String(answers.de_recognition_status)) && String(answers.de_anabin_status) !== "H+") {
    nextActions.push("Start ZAB / Anabin recognition for your qualification.");
  }
  if (cefrIdx(german) < cefrIdx("A1")) nextActions.push("Begin German A1 with Goethe-Institut, telc, or ÖSD.");
  else if (cefrIdx(german) < cefrIdx("B1")) nextActions.push("Continue German to B1 and certify with Goethe / telc / ÖSD.");
  if (Number(answers.de_blocked_account_eur ?? 0) < 12324 && answers.de_sponsor_support !== true) {
    nextActions.push("Open a German blocked account (Sperrkonto) or arrange a Verpflichtungserklärung.");
  }
  if (NEXT_CEFR[german]) {/* lint silence */}
  nextActions.push("Compile employer outreach plan for German job market (XING, StepStone, Make-it-in-Germany).");

  return {
    overall,
    bestPathway: best,
    missingRequirements: Array.from(missing),
    suggestedImprovements: improvements,
    pathwayNotes,
    languageRecommendation,
    nextActions,
  };
}
