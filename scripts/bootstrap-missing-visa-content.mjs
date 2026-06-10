#!/usr/bin/env node
/**
 * Bootstrap academy_metadata JSON for service_library rows missing content.
 * Run: node scripts/bootstrap-missing-visa-content.mjs
 * Then: node scripts/expand-service-quizzes.mjs
 * Then: node scripts/generate-visa-metadata-sql-split.mjs
 *       node scripts/generate-eligibility-questions-sql-split.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");

/** target file, library id, clone from, field overrides */
const MISSING = [
  ["canada-oinp.json", "b2000001-0001-4000-8000-00000000001c", "canada-express-entry-pr.json", {
    displayName: "Canada – OINP (Ontario Provincial Nominee)",
    shortDescription: "IRCC + OINP · Ontario nomination · +600 CRS or base PR stream",
    learningLevel: "Advanced",
    learningMinutes: 24,
    alert: { title: "OINP stream selection", body: "Confirm correct OINP stream (Express Entry, job offer, international student, etc.) and current intake status before filing." },
    eligibility: [
      { criterion: "Eligible OINP stream identified for client profile", met: true },
      { criterion: "OINP EOI submitted or invitation received where required", met: true, note: "Some streams are invitation-only" },
      { criterion: "Job offer meets NOC/TEER and wage requirements if stream requires", met: true },
      { criterion: "Language scores meet OINP and IRCC minimums", met: true },
      { criterion: "Settlement funds and admissibility requirements met", met: false },
      { criterion: "Intent to reside in Ontario demonstrable", met: true },
      { criterion: "No misrepresentation or undeclared refusals", met: true },
    ],
  }],
  ["canada-pnp-program.json", "b2000001-0001-4000-8000-00000000001d", "canada-express-entry-pr.json", {
    displayName: "Canada – Provincial Nominee Program (PNP)",
    shortDescription: "IRCC + provincial nomination · Base or enhanced PNP streams",
    learningLevel: "Advanced",
    learningMinutes: 26,
    alert: { title: "Province-specific rules", body: "Each province has different streams, points, and processing. Never assume one PNP template fits all." },
    eligibility: [
      { criterion: "Target province and stream confirmed against current program guide", met: true },
      { criterion: "Nomination certificate or invitation pathway identified", met: true },
      { criterion: "Work experience and NOC/TEER match stream criteria", met: true },
      { criterion: "Language test meets provincial and federal minimums", met: true },
      { criterion: "Proof of funds where required", met: false },
      { criterion: "Intent to reside in nominating province", met: true },
      { criterion: "Immigration history fully disclosed", met: true },
    ],
  }],
  ["canada-tr-to-pr.json", "b2000001-0001-4000-8000-00000000001e", "canada-express-entry-pr.json", {
    displayName: "Canada – Temporary Resident to PR Pathway",
    shortDescription: "IRCC · In-Canada PR pathways · CEC and eligible TR streams",
    learningLevel: "Advanced",
    learningMinutes: 22,
    alert: { title: "Status at time of application", body: "Verify maintained status, eligible work history in Canada, and correct PR class before advising TR-to-PR filing." },
    eligibility: [
      { criterion: "Valid temporary resident status or eligible restoration", met: true },
      { criterion: "Qualifying Canadian work experience documented (if CEC)", met: true },
      { criterion: "Language scores meet PR program minimums", met: true },
      { criterion: "Eligible PR program stream identified (CEC, spouse, PNP, etc.)", met: true },
      { criterion: "Medical and police certificates as required", met: false },
      { criterion: "No inadmissibility or misrepresentation issues", met: true },
    ],
  }],
  ["canada-spouse-dependent-extension.json", "b2000001-0001-4000-8000-00000000001f", "canada-spouse-dependent-owp.json", {
    displayName: "Canada – Spouse / Dependent Status Extension",
    shortDescription: "IRCC · Extend spouse/dependant temporary status in Canada",
    learningLevel: "Intermediate",
    learningMinutes: 18,
    alert: { title: "Principal status alignment", body: "Extension must align with principal applicant's valid status and expiry timeline." },
    eligibility: [
      { criterion: "Principal applicant holds valid status or approved extension", met: true },
      { criterion: "Relationship still genuine and documented", met: true },
      { criterion: "Application filed before current status expires", met: true },
      { criterion: "Funds and admissibility evidence current", met: false },
      { criterion: "Correct extension form and fees selected", met: true },
    ],
  }],
  ["canada-spouse-dependent-visitor.json", "b2000001-0001-4000-8000-000000000020", "canada-spouse-dependent-owp.json", {
    displayName: "Canada – Spouse / Dependent Visitor Visa",
    shortDescription: "IRCC · TRV for spouse/dependant accompanying principal abroad",
    learningLevel: "Intermediate",
    learningMinutes: 17,
    alert: { title: "Ties and purpose", body: "Visitor visa for dependants requires strong ties, clear temporary purpose, and alignment with principal's plan." },
    eligibility: [
      { criterion: "Principal applicant has clear Canadian pathway or status plan", met: true },
      { criterion: "Genuine temporary purpose for visit documented", met: true },
      { criterion: "Strong ties to home country demonstrated", met: true },
      { criterion: "Funds for visit and return travel", met: true },
      { criterion: "Relationship to principal applicant proven", met: true },
      { criterion: "No undeclared refusals or inadmissibility", met: true },
    ],
  }],
  ["germany-skilled-worker.json", "b2000001-0001-4000-8000-000000000056", "germany-job-seeker.json", {
    displayName: "Germany – Skilled Worker Visa (§18a/§18b)",
    shortDescription: "German Embassy · Qualified employment · Recognition of qualifications",
    learningLevel: "Advanced",
    learningMinutes: 24,
    alert: { title: "Qualification recognition", body: "Verify degree recognition (Anabin/ZAB) and job offer terms before embassy appointment." },
    eligibility: [
      { criterion: "Recognised qualification or equivalent skilled worker profile", met: true },
      { criterion: "Concrete job offer matching qualification (if required)", met: true },
      { criterion: "Salary meets threshold for occupation/region", met: true },
      { criterion: "Health insurance and accommodation plan", met: false },
      { criterion: "German language level per role requirements", met: true, note: "Varies by occupation" },
      { criterion: "Clean immigration and criminal history", met: true },
    ],
  }],
  ["germany-blue-card.json", "b2000001-0001-4000-8000-000000000057", "germany-opportunity-card.json", {
    displayName: "Germany – EU Blue Card",
    shortDescription: "German Embassy · Highly qualified employment · EU Blue Card pathway",
    learningLevel: "Advanced",
    learningMinutes: 22,
    alert: { title: "Salary threshold", body: "Blue Card requires minimum gross salary for the role — verify current annual threshold before quoting." },
    eligibility: [
      { criterion: "University degree recognised in Germany", met: true },
      { criterion: "Job offer meets Blue Card salary threshold", met: true },
      { criterion: "Contract duration and role details documented", met: true },
      { criterion: "Health insurance arranged", met: false },
      { criterion: "Work authorisation route confirmed with employer", met: true },
    ],
  }],
  ["germany-ausbildung.json", "b2000001-0001-4000-8000-000000000058", "germany-student-visa.json", {
    displayName: "Germany – Ausbildung (Vocational Training)",
    shortDescription: "German Embassy · Vocational training contract · Dual education pathway",
    learningLevel: "Intermediate",
    learningMinutes: 20,
    alert: { title: "Training contract required", body: "Ausbildung visa requires signed training contract (Ausbildungsvertrag) with approved employer." },
    eligibility: [
      { criterion: "Signed Ausbildung contract with approved employer", met: true },
      { criterion: "School-leaving certificate meets entry requirements", met: true },
      { criterion: "German language level B1/B2 as required by program", met: true },
      { criterion: "Blocked account or financial proof for living costs", met: false },
      { criterion: "Health insurance coverage arranged", met: false },
      { criterion: "Genuine training intent and career plan", met: true },
    ],
  }],
];

for (const [target, _id, source, overrides] of MISSING) {
  const out = path.join(ROOT, target);
  if (fs.existsSync(out)) {
    console.log(`Skip existing ${target}`);
    continue;
  }
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, source), "utf8"));
  delete src._instructions;
  const meta = { ...src, ...overrides, updatedLabel: "Updated 10 Jun 2026" };
  if (overrides.eligibility) meta.eligibility = overrides.eligibility;
  if (overrides.alert) meta.alert = overrides.alert;
  // Reset quiz — expand-service-quizzes will rebuild to 75
  meta.quiz = (src.quiz ?? []).slice(0, 8).map((q, i) => ({ ...q, level: (i % 3) + 1 }));
  fs.writeFileSync(out, JSON.stringify(meta, null, 2) + "\n");
  console.log(`Created ${target} from ${source}`);
}
