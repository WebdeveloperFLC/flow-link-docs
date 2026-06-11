#!/usr/bin/env node
/**
 * Fix Malta/Germany/Schengen template remnants in Cyprus + Lithuania visa JSON.
 * Run: node scripts/fix-cyprus-lithuania-copy.mjs
 * Then: node scripts/generate-cyprus-lithuania-artifacts.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");

function replaceAll(obj, pairs) {
  let s = JSON.stringify(obj);
  for (const [from, to] of pairs) {
    s = s.split(from).join(to);
  }
  return JSON.parse(s);
}

const CYPRUS_STUDENT = [
  [
    "Academic Evaluation Centre verification for Indian academic documents—mandatory for most Indian student visa applicants.",
    "Police Clearance Certificate (PCC) from India with MEA apostille and Cyprus Embassy attestation — mandatory for Cyprus student visa applicants.",
  ],
  ["Typically required living funds (12 months × €992). Verify current amount before opening account.", "Benchmark €7,000–€10,000 bank balance with 3–6 months history. No official published minimum — verify with university and VFS."],
  ["12 × €992 monthly requirement.", "€7,000–€10,000 financial proof benchmark with consistent bank history."],
  [
    "National visa (Type D) for study at a recognised Cypriot university or preparatory course. After entry, convert to residence permit at local CRMD district office.",
    "Two-stage route: Entry Permit via VFS India before travel, then Temporary Residence Permit (Pink Slip) at CRMD within 7–10 days of arrival.",
  ],
  [
    "University admission (Zulassung) or conditional admission · Proof of funds or scholarship · PCC apostilled + Cyprus Embassy attested · Health insurance · Motivation letter",
    "Unconditional offer from CRMD-recognised institution · PCC apostilled + Cyprus Embassy attested · Medical panel · Financial proof €7,000–€10,000+ · Health insurance · Motivation letter",
  ],
  ["University admission (Zulassung)", "Unconditional university offer letter"],
  ["Cypriot Embassy/Consulate in India · Federal Foreign Office · Local CRMD district office after arrival", "CRMD Cyprus (crmd.moi.gov.cy) · VFS Global Cyprus India · Cyprus Embassy in India (PCC attestation)"],
  ["Enter Cyprus; register address; apply for residence permit at CRMD district office within visa validity.", "Travel on Entry Permit; register at university; apply for Pink Slip at CRMD within 7–10 days; register with GHS (gesy.org.cy)."],
  ["6–12w — After complete file + PCC apostille", "4–8w — After complete file + PCC apostille"],
  ["15 — + PCC apostille & financial proof (€7,000–€10,000+)", "18 — + PCC apostille & medical panel"],
  ["Complete PCC apostille before embassy slot; track processing on PCC apostille website", "Start PCC → MEA apostille → Cyprus Embassy attestation immediately; allow 4–6 weeks"],
  ["Visa appointment booked without admission documentation.", "PCC submitted without MEA apostille or Cyprus Embassy attestation."],
  ["Verify institution on Anabin", "Verify institution on moec.gov.cy — South Cyprus (EU) only, not TRNC"],
  ["Cyprus university Zulassung for national visa.", "CRMD-recognised South Cyprus university offer letter for Entry Permit."],
  ["Admission from recognised Cypriot institution", "Unconditional offer from CRMD-recognised institution"],
  ["Cypriot or English per program", "English per program (IELTS 5.5–6.5 typical; some waive)"],
  ["+ financial proof (€7,000–€10,000+) required living funds", "+ financial proof €7,000–€10,000+"],
  ["Amount below required monthly sum or not from recognised provider.", "Bank balance below €7,000 or inconsistent 3–6 month history."],
  ["Academic Evaluation Centre certificate for India.", "PCC apostille + Cyprus Embassy attestation certificate for India."],
];

const CYPRUS_VISITOR_EXTRA = [
  ["Cyprus national visa", "Cyprus visitor visa"],
  ["Cyprus national travel history", "Cyprus travel history"],
  ["Standard adult Cyprus national fee", "Standard adult Cyprus visitor visa fee"],
  ["Cyprus national requirement", "Cyprus visitor visa requirement"],
  ["Disclose prior Cyprus national refusals", "Disclose prior visa refusals"],
  ["Prior Cyprus national overstay not disclosed", "Prior Cyprus overstay not disclosed"],
  ["Cyprus national short-stay short-stay visa", "Cyprus short-stay visitor visa"],
  ["Spouse on Cyprus national cannot work", "Spouse on Cyprus visitor visa cannot work"],
  ["affect Cyprus national:", "affect a Cyprus visitor visa:"],
  [
    "Country of main destination or first entry if equal stays—follow Cyprus embassy requirements.",
    "Apply via Cyprus Embassy in India or VFS Global (visa.vfsglobal.com/cyprus/india). Cyprus is the sole destination.",
  ],
  [
    "National short-stay visa for tourism, family visits, or business trips to Cyprus. Cyprus is NOT in the Schengen Area — this visa does NOT allow travel to Schengen countries..",
    "National short-stay visa for tourism, family visits, or business trips to the Republic of Cyprus via VFS India. Cyprus is EU but NOT Schengen — this visa does NOT allow travel to other Schengen countries.",
  ],
];

const LITHUANIA_STUDENT_EXTRA = [
  ["apply for residence permit at Ausländerbehörde within visa validity.", "apply for temporary residence permit at Migration Department (migracija.lt) within visa validity."],
  ["convert to residence permit at local Ausländerbehörde", "apply for temporary residence permit at Migration Department (migracija.lt)"],
  ["convert to residence permit at local Ausländerbehörd", "apply for temporary residence permit at Migration Department (migracija.lt)"],
  ["What is APS:", "What is proof of funds for Lithuania:"],
  ["Lithuania university Zulassung for national visa.", "Lithuanian university admission letter for national D visa."],
  ["Academic Evaluation Centre certificate for India.", "Proof of funds documentation (€6,912/year equivalent) for India."],
  ["or preparatory course. After entry, apply for temporary residence permit at Migration Department (migracija.lt).", "After entry, apply for temporary residence permit at Migration Department (migracija.lt)."],
];

const CYPRUS_VISITOR = [
  ["Cyprus national Area", "Schengen Area"],
  ["other Cyprus national countries", "Schengen countries"],
  ["multiple Cyprus national countries", "Schengen countries on this Cyprus visa"],
  ["main Cyprus national destination", "Cyprus Embassy/VFS India"],
  ["Cyprus national-compliant", "adequate travel"],
  ["Cyprus national history", "immigration history"],
  ["future Cyprus national applications", "future Cyprus visa applications"],
  ["Cyprus national standard", "VFS Cyprus India"],
  ["Adult Cyprus national visa", "Adult Cyprus visitor visa"],
  ["Cyprus national short-stay visa", "Cyprus short-stay visitor visa"],
  ["Prior Cyprus national refusals", "Prior visa refusals"],
  ["Hidden refusals from other Cyprus national states", "Undisclosed prior visa refusals (Cyprus or other countries)"],
  ["Cyprus national rules", "Cyprus embassy requirements"],
  ["Cyprus national approval", "Cyprus visitor visa approval"],
  ["affect Cyprus national?", "affect a Cyprus visitor visa application?"],
  ["valid across Cyprus national for entire trip", "for the entire stay in Cyprus"],
  ["Valid for entire Cyprus national stay", "Recommended €30,000+ coverage for entire trip"],
  ["Cyprus national insurance", "travel insurance"],
  ["recent Cyprus national travel", "recent Cyprus travel"],
  ["Cyprus national Type C", "Cyprus national short-stay"],
  ["Cyprus national visitor", "Cyprus national"],
  ["Cyprus national-compliant insurance", "travel insurance"],
  ["Apply at main destination embassy per Cyprus national rules", "Apply via Cyprus Embassy or VFS Global Cyprus India"],
  ["visa validity period day rule", "visa validity dates"],
  ["visa validity period rule", "visa validity dates"],
  ["Max 90 days in any 180-day Cyprus national period", "Respect visa validity dates on the approved visa"],
  [
    "Country of main destination or first entry if equal stays—follow Cyprus national rules.",
    "Apply via Cyprus Embassy in India or VFS Global (visa.vfsglobal.com/cyprus/india). Cyprus is the sole destination.",
  ],
  [
    "Yes on single visa if main destination rule followed; respect visa validity period limit.",
    "No. This visa is valid for the Republic of Cyprus only. A separate Schengen visa is required for France, Germany, Italy, etc.",
  ],
  [
    "National short-stay visa for tourism, family visits, or business trips to Cyprus. Cyprus is NOT in the Cyprus national Area — this visa does NOT allow travel to other Cyprus national countries..",
    "National short-stay visa for tourism, family visits, or business trips to the Republic of Cyprus via VFS India. Cyprus is EU but NOT Schengen — this visa does NOT allow travel to other Schengen countries.",
  ],
  [
    "Temporary visit purpose · Travel insurance €30,000+ · Funds for trip · Strong ties to India · Clean Cyprus national history",
    "Temporary visit purpose · Travel insurance (recommended €30,000+) · Funds for trip · Strong ties to India · Clean immigration history",
  ],
  [
    "Apply at embassy of main Cyprus national destination. If Cyprus is primary stay, apply via Cypriot mission.",
    "Apply via Cyprus Embassy or VFS Global Cyprus India. Main-destination Schengen rules do not apply — Cyprus is the only destination.",
  ],
  [
    "Respect visa validity and visa validity period rule. Overstay affects future Cyprus national applications.",
    "Respect visa validity dates. Overstay affects future Cyprus and Schengen applications.",
  ],
  ["2–4w — Cyprus national standard", "2–4w — VFS Cyprus India"],
  ["Can we guarantee Cyprus national approval?", "Can we guarantee Cyprus visitor visa approval?"],
  ["Does prior UK/US refusal affect Cyprus national?", "Does prior UK/US refusal affect a Cyprus visitor visa?"],
  ["Wrong embassy application", "Wrong application channel"],
  ["Applied Cyprus but main destination is another country.", "Client applied for Cyprus visa but intends to travel primarily to Schengen states."],
];

const LITHUANIA_STUDENT = [
  ["Lithuaniany", "Lithuania"],
  ["APS required", "Proof of funds required"],
  ["After complete file + APS", "After complete file complete"],
  ["+ APS & proof of funds", "+ proof of funds €6,912"],
  ["proof of funds and APS cannot be rushed last minute.", "proof of funds and admission letter cannot be rushed last minute."],
  ["APS not completed", "Proof of funds insufficient"],
  ["Complete APS before embassy slot; track processing on APS website", "Open blocked account or show €6,912 equivalent with 3–6 month bank history before embassy slot"],
  ["Visa appointment booked without admission documentation.", "Proof of funds below €576/month × 12 or inconsistent bank history."],
  ["What is APS?", "What is proof of funds for Lithuania?"],
  [
    "Academic Evaluation Centre verification for Indian academic documents—mandatory for most Indian student visa applicants.",
    "Typically €576/month × 12 months (€6,912/year) living funds or equivalent. Verify current amount on migracija.lt before quoting.",
  ],
  ["Typically required living funds (12 months × €992). Verify current amount before opening account.", "Typically €576/month × 12 (€6,912/year). Verify current amount on migracija.lt before quoting."],
  ["required living funds for 2026 (12 × €992/month)", "€576/month × 12 months (€6,912/year)"],
  ["required living funds for 2026 or equivalent", "€6,912/year or equivalent with 3–6 month bank history"],
  ["12 × €992 monthly requirement.", "€576/month × 12 = €6,912 annual living funds."],
  ["Apply at Ausländerbehörde soon after arrival and registration.", "Apply at Migration Department (migracija.lt) soon after arrival and university registration."],
  ["Limited working hours permitted—verify current rules for students in Lithuaniany.", "Part-time work permitted during studies — verify current rules on migracija.lt."],
  [
    "National visa (Type D) for study at a recognised Lithuanian university or preparatory course. After entry, convert to residence permit at local Ausländerbehörde.",
    "National visa (Type D) for study at a recognised Lithuanian university. After entry, apply for temporary residence permit at Migration Department (migracija.lt).",
  ],
  [
    "University admission (Zulassung) or conditional admission · Proof of funds or scholarship · admission documentation (India) · Health insurance · Motivation letter",
    "University admission letter · Proof of funds (€576/month × 12) · Health insurance · Motivation letter · Valid passport · Language proficiency as required",
  ],
  ["University admission (Zulassung)", "University admission letter"],
  ["admission documentation (India)", "Proof of funds (€576/month × 12)"],
  ["Lithuanian Embassy/Consulate in India · Federal Foreign Office · Local Ausländerbehörde after arrival", "Lithuanian Embassy/Consulate in India · VFS Global Lithuania · Migration Department (migracija.lt) after arrival"],
  ["Enter Lithuaniany; register address; apply for residence permit at Ausländerbehörde within visa validity.", "Enter Lithuania; register address; apply for temporary residence permit at Migration Department within visa validity."],
  ["Private unrecognised college or expired Zulassung.", "Private unrecognised college or institution not listed for international students."],
  ["Verify Anabin/institution recognition before fees", "Verify institution on studyinlithuania.lt before collecting fees"],
  ["Generic letter not explaining study plan and Lithuaniany choice.", "Generic letter not explaining study plan and Lithuania choice."],
  ["18-month job-seeker residence permit or Opportunity Card", "Graduate job-search temporary residence permit (verify on migracija.lt)"],
  ["Start APS 3–4 months before intended intake", "Confirm proof of funds and admission letter 3–4 months before intended intake"],
  ["Guide on Ausländerbehörde appointment after arrival", "Guide on Migration Department (migracija.lt) appointment after arrival"],
  ["APS timing", "Proof of funds timing"],
  ["Counseling, admission review, APS initiation", "Counseling, admission review, funds documentation"],
  ["APS processing, proof of funds, documents", "Proof of funds, insurance, document compilation"],
  ["Lithuania – Job Seeker Visa", "Lithuania – Graduate job-search permit"],
  ["Lithuania – Opportunity Card", "Lithuania – Student extension"],
  ["APS backlog is real—do not promise winter intake without APS timeline confirmation.", "Proof-of-funds and admission timing matter—do not promise intake without confirming €6,912 equivalent."],
  ["APS mandatory for India.", "Proof of funds €6,912/year mandatory for student visa."],
  ["Anmeldung and Ausländerbehörde required.", "Address registration and Migration Department appointment required after arrival."],
  ["Track APS", "Track proof of funds"],
  ["Do not book embassy without APS", "Do not book embassy without proof of funds"],
  ["APS applied too late for intake", "Proof of funds documentation too late for intake"],
  ["Start APS early", "Confirm proof of funds early"],
  ["Verify institution on Anabin", "Verify institution on studyinlithuania.lt"],
  ["Obtain required TestDaF/IELTS/Goethe per admission", "Obtain required IELTS/TOEFL or Lithuanian certificate per admission"],
  ["TestDaF", "IELTS/TOEFL"],
];

const LITHUANIA_VISITOR = [
  ["Lithuaniany", "Lithuania"],
];

const FILES = {
  "cyprus-student-visa.json": [...CYPRUS_STUDENT],
  "cyprus-visitor-visa.json": [...CYPRUS_VISITOR, ...CYPRUS_VISITOR_EXTRA],
  "lithuania-student-visa.json": [...LITHUANIA_STUDENT, ...LITHUANIA_STUDENT_EXTRA],
  "lithuania-visitor-visa.json": LITHUANIA_VISITOR,
};

for (const [file, pairs] of Object.entries(FILES)) {
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const fixed = replaceAll(meta, pairs);
  fixed.updatedLabel = "Updated 10 Jun 2026";
  if (fixed.changelog?.length) {
    fixed.changelog.unshift({
      version: fixed.version ?? "v2.0",
      date: "10 Jun 2026",
      author: "Service Library",
      summary: "Copy fix: removed Malta/Germany/Schengen template remnants.",
    });
  }
  fs.writeFileSync(fp, JSON.stringify(fixed, null, 2) + "\n");
  console.log(`Fixed ${file}`);
}

console.log("Done. Run: node scripts/generate-cyprus-lithuania-artifacts.mjs");
