import type { ChancenkarteResult, DePathwayResult } from "./types";
import { cefrIdx } from "./chancenkarte";

const EDU_ORDER = ["none", "secondary", "diploma", "bachelor", "master", "phd"];
const eduIdx = (v: unknown) => EDU_ORDER.indexOf(String(v ?? "none"));

function eligible(reasons: string[], gaps: string[]): DePathwayResult["status"] {
  if (gaps.length === 0) return "eligible";
  if (gaps.length <= 1 && reasons.length > 0) return "partial";
  return gaps.length <= 2 ? "partial" : "not_eligible";
}

export function evaluateGermanyPathways(
  answers: Record<string, any>,
  chancenkarte: ChancenkarteResult,
): DePathwayResult[] {
  const results: DePathwayResult[] = [];

  // ---------- Opportunity Card (Chancenkarte) ----------
  {
    const reasons: string[] = [];
    const gaps: string[] = [...chancenkarte.baseFailures];
    if (chancenkarte.passes) {
      reasons.push(`Chancenkarte points ${chancenkarte.total}/${chancenkarte.threshold} ✓`);
    } else if (chancenkarte.basePass) {
      gaps.push(`Need ${chancenkarte.threshold} Chancenkarte points (currently ${chancenkarte.total}).`);
    }
    results.push({
      code: "de_chancenkarte",
      label: "Opportunity Card (Chancenkarte)",
      status: eligible(reasons, gaps),
      reasons, gaps,
    });
  }

  // ---------- Job Seeker Visa ----------
  {
    const reasons: string[] = [];
    const gaps: string[] = [];
    if (eduIdx(answers.de_highest_education) >= eduIdx("bachelor")) {
      reasons.push("Bachelor or higher degree on record.");
    } else {
      gaps.push("Bachelor degree (or equivalent) required.");
    }
    const recognised = ["full", "partial"].includes(String(answers.de_recognition_status)) ||
      ["H+", "H+-"].includes(String(answers.de_anabin_status));
    if (recognised) reasons.push("Qualification recognition in place.");
    else gaps.push("Recognition pending — start ZAB Statement of Comparability.");
    if (Number(answers.de_blocked_account_eur ?? 0) >= 12324 || answers.de_sponsor_support === true) {
      reasons.push("Proof of funds available.");
    } else {
      gaps.push("Proof of funds (~€12,324 blocked account or sponsor) required.");
    }
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    results.push({
      code: "de_job_seeker", label: "Job Seeker Visa",
      status: eligible(reasons, gaps), reasons, gaps,
    });
  }

  // ---------- Ausbildung ----------
  {
    const reasons: string[] = [];
    const gaps: string[] = [];
    if (cefrIdx(answers.de_german_level) >= cefrIdx("B1")) reasons.push("German ≥ B1 ✓");
    else gaps.push("German B1 required for Ausbildung.");
    if (answers.de_ausbildung_offer === true) reasons.push("Ausbildung contract / placement confirmed.");
    else gaps.push("Confirmed Ausbildung contract not yet provided.");
    const age = Number(answers.de_age ?? 0) || ageFromDob(answers.de_dob);
    if (age > 0 && age >= 35) gaps.push("Most Ausbildung programmes prefer applicants under 35.");
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    results.push({
      code: "de_ausbildung", label: "Ausbildung",
      status: eligible(reasons, gaps), reasons, gaps,
    });
  }

  // ---------- Skilled Worker (§18a/§18b) ----------
  {
    const reasons: string[] = [];
    const gaps: string[] = [];
    if (answers.de_job_offer === true) reasons.push("Qualified job offer in place.");
    else gaps.push("Qualified job offer in Germany required.");
    const recognised = ["full", "partial"].includes(String(answers.de_recognition_status)) ||
      answers.de_vocational_qualification === true;
    if (recognised) reasons.push("Recognition in place (ZAB or vocational).");
    else gaps.push("ZAB-recognised degree or recognised vocational training required.");
    if (cefrIdx(answers.de_german_level) >= cefrIdx("B1")) reasons.push("German ≥ B1 ✓");
    else gaps.push("German B1 typically required (English may suffice under §18b for some employers).");
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    results.push({
      code: "de_skilled_worker", label: "Skilled Worker (§18a/§18b)",
      status: eligible(reasons, gaps), reasons, gaps,
    });
  }

  // ---------- EU Blue Card ----------
  {
    const reasons: string[] = [];
    const gaps: string[] = [];
    const salary = Number(answers.de_bluecard_salary_eur ?? answers.de_annual_salary_eur ?? 0);
    const recognised = ["full"].includes(String(answers.de_recognition_status)) ||
      String(answers.de_anabin_status) === "H+";
    if (recognised) reasons.push("Recognised university degree.");
    else gaps.push("Fully recognised university degree (Anabin H+) required.");
    if (salary >= 48300) reasons.push(`Salary €${salary.toLocaleString()} meets standard threshold.`);
    else if (salary >= 43759.8) reasons.push(`Salary €${salary.toLocaleString()} meets shortage threshold (€43,759.80).`);
    else gaps.push("Job offer salary below shortage threshold (€43,759.80).");
    const months = Number(answers.de_bluecard_contract_months ?? 0);
    if (months >= 6) reasons.push("Contract ≥ 6 months.");
    else gaps.push("Contract ≥ 6 months required.");
    if (answers.de_passport_valid !== true) gaps.push("Valid passport required.");
    results.push({
      code: "de_blue_card", label: "EU Blue Card",
      status: eligible(reasons, gaps), reasons, gaps,
    });
  }

  return results;
}
